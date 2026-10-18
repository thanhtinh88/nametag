import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import { haversineDistanceKm } from '@/lib/map/filter-markers';
import { normalizeForSearch } from '@/lib/search';

// GET /api/events/[id]/candidate-suspects
export const GET = withAuth(async (request, session, context) => {
  try {
    const { id: eventId } = await context.params;
    const { searchParams } = new URL(request.url);

    const radiusKmParam = searchParams.get('radiusKm');
    const radiusKm = radiusKmParam && radiusKmParam !== 'all' ? parseFloat(radiusKmParam) : null;
    const matchCrimeType = searchParams.get('matchCrimeType') === 'true';
    const historyOnly = searchParams.get('historyOnly') === 'true';
    const managementFilter = searchParams.get('managementFilter') || 'ALL';
    const query = searchParams.get('q')?.trim() || '';

    // 1. Fetch event
    const event = await prisma.event.findUnique({
      where: { id: eventId, userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        crimeType: true,
        addresses: {
          where: { latitude: { not: null }, longitude: { not: null } },
          select: { latitude: true, longitude: true, locality: true, streetLine1: true },
        },
        people: {
          where: { deletedAt: null },
          select: { personId: true, involvementType: true, verificationStatus: true },
        },
      },
    });

    if (!event) {
      return apiResponse.notFound('Event not found');
    }

    const primarySceneAddress = event.addresses[0] || null;
    const sceneLat = primarySceneAddress?.latitude !== null ? Number(primarySceneAddress?.latitude) : null;
    const sceneLon = primarySceneAddress?.longitude !== null ? Number(primarySceneAddress?.longitude) : null;
    const hasSceneCoordinates = sceneLat !== null && sceneLon !== null;

    const linkedPersonMap = new Map(
      event.people.map((p) => [p.personId, { involvementType: p.involvementType, verificationStatus: p.verificationStatus }])
    );

    // 2. Fetch all candidate people
    const people = await prisma.person.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        nickname: true,
        displayNameOverride: true,
        photo: true,
        managementLevel: true,
        threatLevel: true,
        citizenId: true,
        modusOperandi: true,
        addresses: {
          select: {
            id: true,
            streetLine1: true,
            locality: true,
            latitude: true,
            longitude: true,
          },
        },
        vehicles: {
          where: { deletedAt: null },
          select: { plateNumber: true, brandModel: true, color: true },
        },
        physicalMarks: {
          where: { deletedAt: null },
          select: { type: true, location: true, description: true },
        },
        criminalRecords: {
          where: { deletedAt: null },
          select: { charge: true, sentenceDetail: true, recordType: true },
        },
        gangMemberships: {
          where: { gang: { deletedAt: null } },
          include: { gang: { select: { id: true, name: true, turf: true, color: true } } },
        },
      },
    });

    const normCrimeType = event.crimeType ? normalizeForSearch(event.crimeType) : '';
    const normQuery = query ? normalizeForSearch(query) : '';

    // 3. Process, score, and filter candidates
    const candidates = [];

    for (const person of people) {
      // Management level filter
      if (managementFilter === 'SUSPECTS_ONLY') {
        if (person.managementLevel !== 'KEY_TARGET' && person.managementLevel !== 'SURVEILLANCE') continue;
      } else if (managementFilter === 'KEY_TARGET' && person.managementLevel !== 'KEY_TARGET') {
        continue;
      } else if (managementFilter === 'SURVEILLANCE' && person.managementLevel !== 'SURVEILLANCE') {
        continue;
      }

      // History only filter
      if (historyOnly && person.criminalRecords.length === 0) {
        continue;
      }

      // Calculate distance to scene
      let minDistanceKm: number | null = null;
      let closestAddressText: string | null = null;

      if (hasSceneCoordinates) {
        for (const addr of person.addresses) {
          if (addr.latitude !== null && addr.longitude !== null) {
            const dist = haversineDistanceKm(sceneLat!, sceneLon!, Number(addr.latitude), Number(addr.longitude));
            if (minDistanceKm === null || dist < minDistanceKm) {
              minDistanceKm = dist;
              closestAddressText = [addr.streetLine1, addr.locality].filter(Boolean).join(', ');
            }
          }
        }
      }

      // Radius filter
      if (radiusKm !== null && hasSceneCoordinates) {
        if (minDistanceKm === null || minDistanceKm > radiusKm) {
          continue;
        }
      }

      // Check crime type match
      const matchingCharges: string[] = [];
      if (normCrimeType) {
        for (const record of person.criminalRecords) {
          if (record.charge && normalizeForSearch(record.charge).includes(normCrimeType)) {
            matchingCharges.push(record.charge);
          }
        }
        if (person.modusOperandi && normalizeForSearch(person.modusOperandi).includes(normCrimeType)) {
          matchingCharges.push('Thủ đoạn hoạt động trùng khớp');
        }
      }

      if (matchCrimeType && matchingCharges.length === 0) {
        continue;
      }

      // Free text query filter (name, vehicle, mark, citizenId, alias)
      if (normQuery) {
        const nameMatch = normalizeForSearch(`${person.name} ${person.surname || ''} ${person.nickname || ''}`).includes(normQuery);
        const citizenMatch = person.citizenId ? person.citizenId.includes(query) : false;
        const vehicleMatch = person.vehicles.some((v) =>
          normalizeForSearch(`${v.plateNumber} ${v.brandModel || ''}`).includes(normQuery)
        );
        const markMatch = person.physicalMarks.some((m) =>
          normalizeForSearch(`${m.type} ${m.location} ${m.description || ''}`).includes(normQuery)
        );
        const gangMatch = person.gangMemberships.some((gm) =>
          normalizeForSearch(gm.gang.name).includes(normQuery)
        );
        if (!nameMatch && !citizenMatch && !vehicleMatch && !markMatch && !gangMatch) {
          continue;
        }
      }

      // Compute Match Score & Highlight Reasons
      const matchReasons: string[] = [];
      let score = 0;

      if (minDistanceKm !== null) {
        if (minDistanceKm <= 0.5) {
          score += 40;
          matchReasons.push(`Gần hiện trường (${Math.round(minDistanceKm * 1000)}m)`);
        } else if (minDistanceKm <= 1.5) {
          score += 25;
          matchReasons.push(`Cách hiện trường ${minDistanceKm.toFixed(1)}km`);
        } else if (minDistanceKm <= 3.0) {
          score += 10;
          matchReasons.push(`Cách hiện trường ${minDistanceKm.toFixed(1)}km`);
        }
      }

      if (matchingCharges.length > 0) {
        score += 35;
        matchReasons.push(`Tiền án/thủ đoạn trùng khớp loại án (${matchingCharges[0]})`);
      } else if (person.criminalRecords.length > 0) {
        score += 15;
        matchReasons.push(`Có ${person.criminalRecords.length} tiền án/tiền sự`);
      }

      if (person.managementLevel === 'KEY_TARGET') {
        score += 25;
        matchReasons.push('Đối tượng trọng điểm địa bàn');
      } else if (person.managementLevel === 'SURVEILLANCE') {
        score += 15;
        matchReasons.push('Đối tượng trong diện quản lý/nghi vấn');
      }

      if (person.threatLevel === 'HIGH' || person.threatLevel === 'ARMED_DANGEROUS') {
        score += 10;
        matchReasons.push('Mức độ nguy hiểm cao/có vũ khí');
      }

      if (person.gangMemberships.length > 0) {
        score += 15;
        matchReasons.push(`Băng nhóm: ${person.gangMemberships.map((g) => g.gang.name).join(', ')}`);
      }

      const linkedInfo = linkedPersonMap.get(person.id);

      candidates.push({
        person: {
          id: person.id,
          name: person.name,
          surname: person.surname,
          nickname: person.nickname,
          displayNameOverride: person.displayNameOverride,
          photo: person.photo,
          managementLevel: person.managementLevel,
          threatLevel: person.threatLevel,
          citizenId: person.citizenId,
          vehicles: person.vehicles,
          physicalMarks: person.physicalMarks,
          criminalRecords: person.criminalRecords,
          gangs: person.gangMemberships.map((gm) => gm.gang),
        },
        minDistanceKm: minDistanceKm !== null ? Number(minDistanceKm.toFixed(2)) : null,
        closestAddressText,
        matchReasons,
        score,
        isLinked: Boolean(linkedInfo),
        linkedInvolvementType: linkedInfo?.involvementType ?? null,
        linkedVerificationStatus: linkedInfo?.verificationStatus ?? null,
      });
    }

    // Sort by: unlinked first, then by match score desc, then by distance asc
    candidates.sort((a, b) => {
      if (a.isLinked !== b.isLinked) return a.isLinked ? 1 : -1;
      if (b.score !== a.score) return b.score - a.score;
      if (a.minDistanceKm !== null && b.minDistanceKm !== null) {
        return a.minDistanceKm - b.minDistanceKm;
      }
      return 0;
    });

    return apiResponse.ok({
      candidates,
      crimeScene: {
        hasCoordinates: hasSceneCoordinates,
        latitude: sceneLat,
        longitude: sceneLon,
        locality: primarySceneAddress?.locality ?? null,
        streetLine1: primarySceneAddress?.streetLine1 ?? null,
      },
      crimeType: event.crimeType,
    });
  } catch (error) {
    return handleApiError(error, 'candidate-suspects-fetch');
  }
});
