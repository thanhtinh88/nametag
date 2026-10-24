import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import BackLink from '@/components/BackLink';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';
import { getTranslations } from 'next-intl/server';
import { customFieldValuesInclude } from '@/lib/prisma-queries';
import PersonDetailsClient from '@/components/PersonDetailsClient';
import type { NameDisplayFormat } from '@/lib/nameUtils';

type TranslationFn = (key: string, values?: Record<string, string | number | Date>) => string;

function getContactReminderDescription(
  person: {
    contactReminderEnabled: boolean;
    contactReminderInterval: number | null;
    contactReminderIntervalUnit: string | null;
  },
  t: TranslationFn
): string | null {
  if (!person.contactReminderEnabled) return null;
  if (person.contactReminderInterval && person.contactReminderIntervalUnit) {
    const unit = person.contactReminderIntervalUnit.toLowerCase();
    const translatedUnit = person.contactReminderInterval === 1 ? t(unit.slice(0, -1)) : t(unit);
    return t('remindAfter', { interval: person.contactReminderInterval, unit: translatedUnit });
  }
  return null;
}

export default async function PersonDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [{ id }, t] = await Promise.all([
    params,
    getTranslations('people'),
  ]);

  // Fetch user profile, person, relationships, groups, and connections in parallel
  const [
    user,
    person,
    allPeople,
    relationshipTypes,
    cardDavConnection,
    latestJournalEntry,
    allEvents,
    immichConnection,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        dateFormat: true,
        nameOrder: true,
        nameDisplayFormat: true,
        language: true,
        name: true,
        surname: true,
        nickname: true,
        photo: true,
      },
    }),
    prisma.person.findUnique({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        relationshipToUser: {
          where: {
            deletedAt: null,
          },
        },
        groups: {
          where: {
            group: {
              deletedAt: null,
            },
          },
          include: {
            group: true,
          },
        },
        relationshipsTo: {
          where: {
            deletedAt: null,
            person: {
              deletedAt: null,
            },
          },
          include: {
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
                nickname: true,
                displayNameOverride: true,
                photo: true,
              },
            },
            relationshipType: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
        importantDates: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            date: 'asc',
          },
        },
        phoneNumbers: true,
        emails: true,
        addresses: true,
        urls: true,
        imHandles: true,
        locations: true,
        customFields: true,
        customFieldValues: customFieldValuesInclude(),
        relationshipsFrom: {
          where: {
            deletedAt: null,
          },
          include: {
            relatedPerson: true,
          },
        },
        events: {
          where: {
            deletedAt: null,
            event: {
              deletedAt: null,
            },
          },
          include: {
            event: {
              include: {
                people: {
                  where: {
                    deletedAt: null,
                    person: {
                      deletedAt: null,
                    },
                  },
                  include: {
                    person: {
                      select: {
                        id: true,
                        name: true,
                        surname: true,
                        nickname: true,
                        displayNameOverride: true,
                        photo: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        cardDavMapping: true,
        vehicles: {
          orderBy: { createdAt: 'desc' },
        },
        physicalMarks: {
          orderBy: { createdAt: 'desc' },
        },
        criminalRecords: {
          orderBy: { incidentDate: 'desc' },
        },
        gangMemberships: {
          include: {
            gang: true,
          },
        },
        bankAccounts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
      },
    }),
    prisma.person.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        NOT: { id },
      },
      select: {
        id: true,
        name: true,
        surname: true,
        nickname: true,
        displayNameOverride: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.relationshipType.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        label: true,
        color: true,
        inverseId: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.cardDavConnection.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    }),
    prisma.journalEntry.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null,
        people: { some: { personId: id } },
      },
      include: {
        people: {
          where: { person: { deletedAt: null } },
          include: {
            person: {
              select: {
                id: true,
                name: true,
                surname: true,
                nickname: true,
                displayNameOverride: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.event.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: [{ startDate: 'desc' }, { title: 'asc' }],
    }),
    prisma.immichConnection.findUnique({
      where: { userId: session.user.id },
      select: { enabled: true },
    }),
  ]);

  const dateFormat = user?.dateFormat || 'DMY';
  const nameOrder = user?.nameOrder;
  const nameDisplayFormat: NameDisplayFormat = (user?.nameDisplayFormat as NameDisplayFormat) || 'FULL';

  if (!person) {
    notFound();
  }

  // Convert Prisma Decimal objects to plain numbers for client components
  const serializedLocations = person.locations.map((loc) => ({
    ...loc,
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
  }));
  const serializedAddresses = person.addresses.map((address) => ({
    ...address,
    latitude: address.latitude === null ? null : Number(address.latitude),
    longitude: address.longitude === null ? null : Number(address.longitude),
  }));

  const serializedPerson = {
    ...person,
    locations: serializedLocations,
    addresses: serializedAddresses,
  };

  // Filter out people who already have a relationship
  const relatedPersonIds = new Set(
    person.relationshipsTo.map((r) => r.personId)
  );
  const availablePeople = allPeople.filter(
    (p) => !relatedPersonIds.has(p.id)
  );

  const contactReminderDesc = getContactReminderDescription(person, t);

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/people"
      />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-page-enter">
        <div className="mb-4">
          <BackLink
            fallbackHref="/people"
            className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1"
          >
            {t('backToPeople')}
          </BackLink>
        </div>

        <PersonDetailsClient
          person={serializedPerson}
          availablePeople={availablePeople}
          relationshipTypes={relationshipTypes}
          hasCardDavConnection={Boolean(cardDavConnection)}
          latestJournalEntry={latestJournalEntry}
          allEvents={allEvents}
          immichConfigured={Boolean(immichConnection?.enabled)}
          dateFormat={dateFormat}
          nameOrder={nameOrder}
          nameDisplayFormat={nameDisplayFormat}
          userLanguage={user?.language || 'vi'}
          contactReminderDesc={contactReminderDesc}
        />
      </main>
    </div>
  );
}
