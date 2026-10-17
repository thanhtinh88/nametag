import { prisma } from '@/lib/prisma';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import { formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';
import { getCountryName } from '@/lib/countries';
import type { MapGroup, MapMarker, UnlocatedPerson, UnmappedSubject } from '@/lib/map/types';

export const GET = withAuth(async (request, session) => {
  try {
    const [user, people, pendingCount, failedCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { nameOrder: true, nameDisplayFormat: true, geocodingEnabled: true },
      }),
      prisma.person.findMany({
        where: { userId: session.user.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          surname: true,
          middleName: true,
          nickname: true,
          displayNameOverride: true,
          photo: true,
          addresses: {
            select: {
              id: true,
              type: true,
              streetLine1: true,
              streetLine2: true,
              locality: true,
              region: true,
              postalCode: true,
              country: true,
              latitude: true,
              longitude: true,
              geocodeStatus: true,
            },
          },
          locations: {
            select: {
              id: true,
              type: true,
              label: true,
              latitude: true,
              longitude: true,
            },
          },
          groups: {
            where: { group: { deletedAt: null } },
            select: { group: { select: { id: true, name: true, color: true } } },
          },
        },
      }),
      prisma.personAddress.count({
        where: {
          person: { userId: session.user.id, deletedAt: null },
          OR: [{ geocodeStatus: null }, { geocodeStatus: 'pending' }],
        },
      }),
      prisma.personAddress.count({
        where: {
          person: { userId: session.user.id, deletedAt: null },
          geocodeStatus: 'failed',
        },
      }),
    ]);

    const groupsById = new Map<string, MapGroup>();
    const markers: MapMarker[] = [];
    const unlocatedPeople: UnlocatedPerson[] = [];
    const locatedPersonIds = new Set<string>();
    const personSummaryList: Array<{
      personId: string;
      personName: string;
      groupIds: string[];
      groupColor: string | null;
    }> = [];

    for (const person of people) {
      // formatGraphName honors the user's name display settings (FULL,
      // NICKNAME_PREFERRED, SHORT) and the per-person override, matching how
      // names render in the network graph and page titles.
      const personName = formatGraphName(
        person,
        user?.nameOrder ?? undefined,
        (user?.nameDisplayFormat as NameDisplayFormat | undefined) ?? undefined,
      );
      const groupIds = person.groups.map((pg) => pg.group.id);
      for (const pg of person.groups) {
        groupsById.set(pg.group.id, pg.group);
      }
      const hasPhoto = Boolean(person.photo);
      // First group (in returned order) that has a color, matching how the
      // network graph picks a node's fill/ring color.
      const groupColor = person.groups.find((pg) => pg.group.color)?.group.color ?? null;

      personSummaryList.push({
        personId: person.id,
        personName,
        groupIds,
        groupColor,
      });

      const personFailedCount = person.addresses.filter(
        (address) => address.geocodeStatus === 'failed'
      ).length;
      if (personFailedCount > 0) {
        unlocatedPeople.push({ personId: person.id, personName, failedCount: personFailedCount });
      }

      for (const address of person.addresses) {
        if (address.geocodeStatus !== 'success' || address.latitude === null || address.longitude === null) {
          continue;
        }
        locatedPersonIds.add(person.id);
        const addressText = [
          address.streetLine1,
          address.streetLine2,
          address.locality,
          address.region,
          address.postalCode,
          address.country ? getCountryName(address.country) || address.country : null,
        ]
          .filter((part) => part && part.trim().length > 0)
          .join(', ');

        markers.push({
          id: `addr_${address.id}`,
          source: 'address',
          personId: person.id,
          personName,
          latitude: Number(address.latitude),
          longitude: Number(address.longitude),
          label: address.type,
          city: address.locality,
          region: address.region,
          country: address.country,
          addressText: addressText || null,
          groupIds,
          hasPhoto,
          groupColor,
        });
      }

      for (const location of person.locations) {
        locatedPersonIds.add(person.id);
        markers.push({
          id: `loc_${location.id}`,
          source: 'location',
          personId: person.id,
          personName,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          label: location.label ?? location.type,
          city: null,
          region: null,
          country: null,
          addressText: null,
          groupIds,
          hasPhoto,
          groupColor,
        });
      }
    }

    const cases: Array<{
      id: string;
      title: string;
      status: string;
      latitude: number | null;
      longitude: number | null;
    }> = [];
    const unmappedSubjects: UnmappedSubject[] = [];

    if (prisma.event?.findMany) {
      const events = await prisma.event.findMany({
        where: { userId: session.user.id, deletedAt: null },
        select: {
          id: true,
          title: true,
          status: true,
          addresses: {
            select: {
              id: true,
              type: true,
              streetLine1: true,
              streetLine2: true,
              locality: true,
              region: true,
              postalCode: true,
              country: true,
              latitude: true,
              longitude: true,
              geocodeStatus: true,
            },
          },
          people: {
            where: { deletedAt: null },
            select: {
              personId: true,
              role: true,
              involvementType: true,
              verificationStatus: true,
              confidence: true,
            },
          },
          groups: {
            where: { group: { deletedAt: null } },
            select: { group: { select: { id: true, name: true, color: true } } },
          },
        },
      });

      const caseLinksByPersonId = new Map<
        string,
        Array<{
          eventId: string;
          eventTitle: string;
          eventStatus: string;
          role: string | null;
          involvementType: string;
          verificationStatus: string;
          confidence: string | null;
        }>
      >();

      for (const event of events) {
        for (const pe of event.people ?? []) {
          const existing = caseLinksByPersonId.get(pe.personId) ?? [];
          existing.push({
            eventId: event.id,
            eventTitle: event.title,
            eventStatus: event.status ?? 'PLANNED',
            role: pe.role ?? null,
            involvementType: pe.involvementType ?? 'OTHER',
            verificationStatus: pe.verificationStatus ?? 'HYPOTHESIS',
            confidence: pe.confidence ?? null,
          });
          caseLinksByPersonId.set(pe.personId, existing);
        }

        const groupIds = event.groups.map((eg) => eg.group.id);
        for (const eg of event.groups) {
          groupsById.set(eg.group.id, eg.group);
        }
        const groupColor =
          event.groups.find((eg) => eg.group.color)?.group.color ?? '#ef4444';

        let firstLat: number | null = null;
        let firstLng: number | null = null;

        for (const address of event.addresses) {
          if (
            address.geocodeStatus !== 'success' ||
            address.latitude === null ||
            address.longitude === null
          ) {
            continue;
          }
          const lat = Number(address.latitude);
          const lng = Number(address.longitude);
          if (firstLat === null) {
            firstLat = lat;
            firstLng = lng;
          }
          const addressText = [
            address.streetLine1,
            address.streetLine2,
            address.locality,
            address.region,
            address.postalCode,
            address.country
              ? getCountryName(address.country) || address.country
              : null,
          ]
            .filter((part) => part && part.trim().length > 0)
            .join(', ');

          markers.push({
            id: `evaddr_${address.id}`,
            source: 'event_address',
            personId: event.id,
            personName: `🚨 ${event.title}`,
            latitude: lat,
            longitude: lng,
            label: address.type ?? 'crime scene',
            city: address.locality,
            region: address.region,
            country: address.country,
            addressText: addressText || null,
            groupIds,
            hasPhoto: false,
            groupColor,
            markerType: 'crime_scene',
            eventStatus: event.status ?? 'PLANNED',
          });
        }

        cases.push({
          id: event.id,
          title: event.title,
          status: event.status ?? 'PLANNED',
          latitude: firstLat,
          longitude: firstLng,
        });
      }

      // Attach caseLinks to subject markers when events exist
      for (const marker of markers) {
        if (marker.source !== 'event_address') {
          const links = caseLinksByPersonId.get(marker.personId);
          if (links && links.length > 0) {
            marker.caseLinks = links;
          }
        }
      }

      // Collect subjects that have no located markers on the map
      for (const summary of personSummaryList) {
        if (!locatedPersonIds.has(summary.personId)) {
          const links = caseLinksByPersonId.get(summary.personId);
          unmappedSubjects.push({
            personId: summary.personId,
            personName: summary.personName,
            groupIds: summary.groupIds,
            groupColor: summary.groupColor,
            ...(links && links.length > 0 ? { caseLinks: links } : {}),
          });
        }
      }
      unmappedSubjects.sort((a, b) => a.personName.localeCompare(b.personName));
    }

    const groups = [...groupsById.values()].sort((a, b) => a.name.localeCompare(b.name));
    unlocatedPeople.sort((a, b) => a.personName.localeCompare(b.personName));

    return apiResponse.ok({
      markers,
      groups,
      ...(cases.length > 0 ? { cases } : {}),
      ...(unmappedSubjects.length > 0 ? { unmappedSubjects } : {}),
      pendingCount,
      failedCount,
      unlocatedPeople,
      geocodingEnabled: user?.geocodingEnabled ?? true,
    });
  } catch (error) {
    return handleApiError(error, 'map-markers');
  }
});
