import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createEventSchema, updateEventSchema } from '@/lib/validations';
import { sanitizeName, sanitizeNotes } from '@/lib/sanitize';
import { geocodeEventAddresses } from '@/lib/geocoding/geocode-event';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('event-service');

export type EventInput = z.infer<typeof createEventSchema>;
export type EventUpdateInput = z.infer<typeof updateEventSchema>;

export function eventDetailsInclude() {
  return {
    groups: {
      where: { group: { deletedAt: null } },
      include: { group: true },
    },
    addresses: true,
    urls: true,
    customFields: true,
    people: {
      where: { deletedAt: null, person: { deletedAt: null } },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            surname: true,
            middleName: true,
            secondLastName: true,
            nickname: true,
            displayNameOverride: true,
            photo: true,
            organization: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    },
    relationshipsFrom: {
      where: { deletedAt: null, toEvent: { deletedAt: null } },
      include: {
        toEvent: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    },
    relationshipsTo: {
      where: { deletedAt: null, fromEvent: { deletedAt: null } },
      include: {
        fromEvent: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    },
  };
}

export async function createEvent(userId: string, data: EventInput) {
  const {
    title,
    category,
    status,
    startDate,
    endDate,
    hasTime,
    description,
    photo,
    groupIds,
    addresses,
    urls,
    customFields,
    participants,
  } = data;

  const sanitizedTitle = sanitizeName(title) || title;
  const sanitizedCategory = category ? sanitizeName(category) : null;
  const sanitizedDescription = description ? sanitizeNotes(description) : null;

  const event = await prisma.event.create({
    data: {
      user: { connect: { id: userId } },
      title: sanitizedTitle,
      category: sanitizedCategory,
      status: status ?? 'PLANNED',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      hasTime: hasTime ?? false,
      description: sanitizedDescription,
      photo: photo ?? null,

      // Investigation & Case Management fields
      caseCode: data.caseCode ?? null,
      crimeType: data.crimeType ?? null,
      caseStatus: data.caseStatus ?? 'UNRESOLVED',
      incidentTimeNotes: data.incidentTimeNotes ?? null,
      damageAssessment: data.damageAssessment ? sanitizeNotes(data.damageAssessment) : null,

      groups:
        groupIds && groupIds.length > 0
          ? { create: groupIds.map((groupId) => ({ groupId })) }
          : undefined,
      addresses:
        addresses && addresses.length > 0
          ? {
              create: addresses.map((a) => {
                const hasManualCoords =
                  a.latitude !== null &&
                  a.latitude !== undefined &&
                  a.longitude !== null &&
                  a.longitude !== undefined;
                return {
                  type: a.type,
                  streetLine1: a.streetLine1 ?? null,
                  streetLine2: a.streetLine2 ?? null,
                  locality: a.locality ?? null,
                  region: a.region ?? null,
                  postalCode: a.postalCode ?? null,
                  country: a.country ?? null,
                  ...(hasManualCoords
                    ? {
                        latitude: a.latitude,
                        longitude: a.longitude,
                        geocodeStatus: 'success',
                        geocodedAt: new Date(),
                        geocodeHash: 'manual',
                      }
                    : {}),
                };
              }),
            }
          : undefined,
      urls:
        urls && urls.length > 0
          ? { create: urls.map((u) => ({ type: u.type, url: u.url })) }
          : undefined,
      customFields:
        customFields && customFields.length > 0
          ? {
              create: customFields.map((f) => ({
                key: f.key,
                value: f.value,
                type: f.type ?? null,
              })),
            }
          : undefined,
      people:
        participants && participants.length > 0
          ? {
              create: participants.map((p) => ({
                personId: p.personId,
                role: p.role ? sanitizeName(p.role) : null,
                involvementType: p.involvementType ?? 'SUSPECT',
                verificationStatus: p.verificationStatus ?? 'HYPOTHESIS',
                confidence: p.confidence ?? null,
                reasonForSuspicion: p.reasonForSuspicion ? sanitizeNotes(p.reasonForSuspicion) : null,
                alibi: p.alibi ? sanitizeNotes(p.alibi) : null,
                notes: p.notes ? sanitizeNotes(p.notes) : null,
              })),
            }
          : undefined,
    },
    include: eventDetailsInclude(),
  });

  geocodeEventAddresses(event.id).catch((error: unknown) => {
    log.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        eventId: event.id,
      },
      'Background event geocoding failed'
    );
  });

  return event;
}

export async function updateEvent(id: string, userId: string, data: EventUpdateInput) {
  const existingEvent = await prisma.event.findUnique({
    where: { id, userId, deletedAt: null },
  });

  if (!existingEvent) {
    return null;
  }

  const {
    title,
    category,
    status,
    startDate,
    endDate,
    hasTime,
    description,
    photo,
    groupIds,
    addresses,
    urls,
    customFields,
    participants,
  } = data;

  const updateData: Prisma.EventUpdateInput = {};

  if (title !== undefined) updateData.title = sanitizeName(title) || title;
  if (category !== undefined) updateData.category = category ? sanitizeName(category) : null;
  if (status !== undefined) updateData.status = status;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
  if (hasTime !== undefined) updateData.hasTime = hasTime;
  if (description !== undefined) {
    updateData.description = description ? sanitizeNotes(description) : null;
  }
  if (photo !== undefined) updateData.photo = photo ?? null;

  // Investigation & Case Management fields
  if (data.caseCode !== undefined) updateData.caseCode = data.caseCode ?? null;
  if (data.crimeType !== undefined) updateData.crimeType = data.crimeType ?? null;
  if (data.caseStatus !== undefined) updateData.caseStatus = data.caseStatus ?? 'UNRESOLVED';
  if (data.incidentTimeNotes !== undefined) updateData.incidentTimeNotes = data.incidentTimeNotes ?? null;
  if (data.damageAssessment !== undefined)
    updateData.damageAssessment = data.damageAssessment ? sanitizeNotes(data.damageAssessment) : null;

  if (groupIds !== undefined) {
    updateData.groups = {
      deleteMany: {},
      create: groupIds.map((groupId) => ({ groupId })),
    };
  }

  if (addresses !== undefined) {
    updateData.addresses = {
      deleteMany: {},
      create: addresses.map((a) => {
        const hasManualCoords =
          a.latitude !== null &&
          a.latitude !== undefined &&
          a.longitude !== null &&
          a.longitude !== undefined;
        return {
          type: a.type,
          streetLine1: a.streetLine1 ?? null,
          streetLine2: a.streetLine2 ?? null,
          locality: a.locality ?? null,
          region: a.region ?? null,
          postalCode: a.postalCode ?? null,
          country: a.country ?? null,
          ...(hasManualCoords
            ? {
                latitude: a.latitude,
                longitude: a.longitude,
                geocodeStatus: 'success',
                geocodedAt: new Date(),
                geocodeHash: 'manual',
              }
            : {}),
        };
      }),
    };
  }

  if (urls !== undefined) {
    updateData.urls = {
      deleteMany: {},
      create: urls.map((u) => ({ type: u.type, url: u.url })),
    };
  }

  if (customFields !== undefined) {
    updateData.customFields = {
      deleteMany: {},
      create: customFields.map((f) => ({
        key: f.key,
        value: f.value,
        type: f.type ?? null,
      })),
    };
  }

  if (participants !== undefined) {
    updateData.people = {
      deleteMany: {},
      create: participants.map((p) => ({
        personId: p.personId,
        role: p.role ? sanitizeName(p.role) : null,
        involvementType: p.involvementType ?? 'SUSPECT',
        verificationStatus: p.verificationStatus ?? 'HYPOTHESIS',
        confidence: p.confidence ?? null,
        reasonForSuspicion: p.reasonForSuspicion ? sanitizeNotes(p.reasonForSuspicion) : null,
        alibi: p.alibi ? sanitizeNotes(p.alibi) : null,
        notes: p.notes ? sanitizeNotes(p.notes) : null,
      })),
    };
  }

  const event = await prisma.event.update({
    where: { id },
    data: updateData,
    include: eventDetailsInclude(),
  });

  geocodeEventAddresses(event.id).catch((error: unknown) => {
    log.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        eventId: event.id,
      },
      'Background event geocoding failed'
    );
  });

  return event;
}

export async function deleteEvent(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.event.findUnique({
    where: { id, userId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.event.update({
      where: { id },
      data: { deletedAt: now },
    }),
    prisma.personEvent.updateMany({
      where: { eventId: id, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.eventRelationship.updateMany({
      where: {
        OR: [{ fromEventId: id }, { toEventId: id }],
        deletedAt: null,
      },
      data: { deletedAt: now },
    }),
  ]);

  return true;
}

