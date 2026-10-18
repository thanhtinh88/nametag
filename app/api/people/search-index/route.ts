import { prisma } from '@/lib/prisma';
import { apiResponse, withAuth } from '@/lib/api-utils';

export const GET = withAuth(async (_request, session) => {
  const people = await prisma.person.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      surname: true,
      middleName: true,
      secondLastName: true,
      nickname: true,
      displayNameOverride: true,
      organization: true,
      jobTitle: true,
      notes: true,
      photo: true,
      citizenId: true,
      modusOperandi: true,
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
        select: { charge: true, sentenceDetail: true },
      },
      gangMemberships: {
        where: { gang: { deletedAt: null } },
        include: { gang: { select: { name: true, turf: true } } },
      },
      bankAccounts: {
        where: { deletedAt: null },
        select: { bankName: true, accountNumber: true, accountHolder: true },
      },
      phoneNumbers: { select: { number: true } },
      emails: { select: { email: true } },
      addresses: {
        select: {
          streetLine1: true,
          streetLine2: true,
          locality: true,
          region: true,
          postalCode: true,
          country: true,
        },
      },
      urls: { select: { url: true } },
      imHandles: { select: { handle: true } },
      groups: {
        where: { group: { deletedAt: null } },
        include: { group: { select: { name: true } } },
      },
      customFields: { select: { key: true, value: true } },
      customFieldValues: {
        include: { template: { select: { name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const indexData = people.map((person) => ({
    id: person.id,
    name: person.name,
    surname: person.surname,
    middleName: person.middleName,
    secondLastName: person.secondLastName,
    nickname: person.nickname,
    displayNameOverride: person.displayNameOverride,
    organization: person.organization,
    jobTitle: person.jobTitle,
    notes: person.notes,
    photo: person.photo,
    citizenId: person.citizenId,
    modusOperandi: person.modusOperandi,
    vehicles: (person.vehicles ?? [])
      .map((v) => [v.plateNumber, v.brandModel, v.color].filter(Boolean).join(' '))
      .join(', '),
    physicalMarks: (person.physicalMarks ?? [])
      .map((m) => [m.type, m.location, m.description].filter(Boolean).join(' '))
      .join(', '),
    criminalRecords: (person.criminalRecords ?? [])
      .map((c) => [c.charge, c.sentenceDetail].filter(Boolean).join(' '))
      .join(', '),
    gangs: (person.gangMemberships ?? [])
      .map((gm) => [gm.gang.name, gm.gang.turf].filter(Boolean).join(' '))
      .join(', '),
    bankAccounts: (person.bankAccounts ?? [])
      .map((b) => [b.bankName, b.accountNumber, b.accountHolder].filter(Boolean).join(' '))
      .join(', '),
    phones: person.phoneNumbers.map((p) => p.number).join(' '),
    emails: person.emails.map((e) => e.email).join(' '),
    addresses: person.addresses
      .flatMap((a) => [a.streetLine1, a.streetLine2, a.locality, a.region, a.postalCode, a.country])
      .filter(Boolean)
      .join(' '),
    urls: person.urls.map((u) => u.url).join(' '),
    imHandles: person.imHandles.map((im) => im.handle).join(' '),
    groups: person.groups.map((pg) => pg.group.name).join(' '),
    customFields: [
      ...person.customFields.map((cf) => `${cf.key} ${cf.value}`),
      ...person.customFieldValues.map((cfv) => `${cfv.template.name} ${cfv.value}`),
    ].join(' '),
  }));

  return apiResponse.ok({ people: indexData });
});
