import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PersonForm from '@/components/PersonForm';
import Navigation from '@/components/Navigation';
import { formatGraphName } from '@/lib/nameUtils';
import { canEnableReminder } from '@/lib/billing/subscription';
import { getTranslations } from 'next-intl/server';
import { getUserDisplayPreferences } from '@/lib/user-preferences';

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const t = await getTranslations('people');

  if (!session?.user) {
    redirect('/login');
  }

  const { id } = await params;

  const [
    person,
    groups,
    relationshipTypes,
    reminderCheck,
    preferences,
    cardDavConnection,
    customFieldTemplates,
    notificationPreferences,
    allPeople,
    allEvents,
    availableGangs,
  ] = await Promise.all([
    prisma.person.findUnique({
      where: {
        id,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        groups: true,
        relationshipToUser: true,
        importantDates: {
          where: { deletedAt: null },
          orderBy: {
            date: 'asc',
          },
        },
        phoneNumbers: true,
        emails: true,
        addresses: true,
        urls: true,
        cardDavMapping: {
          select: { id: true },
        },
        customFieldValues: {
          where: { template: { deletedAt: null } },
          select: { templateId: true, value: true },
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
        vehicles: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        physicalMarks: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        criminalRecords: {
          where: { deletedAt: null },
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
    prisma.group.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
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
      orderBy: {
        label: 'asc',
      },
    }),
    canEnableReminder(session.user.id),
    getUserDisplayPreferences(session.user.id),
    prisma.cardDavConnection.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    }),
    prisma.customFieldTemplate.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }),
    // select is an allowlist: only this column can ever reach this page, so
    // the password hash and other sensitive columns never enter process
    // memory for this request in the first place.
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultReminderLeadDays: true },
    }),
    prisma.person.findMany({
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
        photo: true,
        groups: {
          select: {
            groupId: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
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
    prisma.gang.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        color: true,
        turf: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  if (!person) {
    notFound();
  }

  // Convert Prisma Decimal objects to plain numbers for client components
  const serializedPerson = {
    ...person,
    addresses: person.addresses.map((address) => ({
      ...address,
      latitude: address.latitude === null ? null : Number(address.latitude),
      longitude: address.longitude === null ? null : Number(address.longitude),
    })),
  };

  const { dateFormat, nameOrder, nameDisplayFormat } = preferences;

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        userEmail={session.user.email || undefined}
        userName={session.user.name}
        userNickname={session.user.nickname}
        userPhoto={session.user.photo}
        currentPath="/people"
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="mb-4">
            <Link
              href={`/people/${person.id}`}
              className="text-primary hover:underline text-sm inline-flex items-center gap-1"
            >
              {t('backToPerson', { name: formatGraphName(person, nameOrder, nameDisplayFormat) })}
            </Link>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
            {t('editPerson', { name: formatGraphName(person, nameOrder, nameDisplayFormat) })}
          </h1>

          <PersonForm
            person={serializedPerson}
            customFieldTemplates={customFieldTemplates}
            groups={groups}
            relationshipTypes={relationshipTypes}
            availablePeople={allPeople}
            availableEvents={allEvents}
            availableGangs={availableGangs}
            mode="edit"
            dateFormat={dateFormat}
            hasCardDavConnection={!!cardDavConnection}
            nameOrder={nameOrder}
            nameDisplayFormat={nameDisplayFormat}
            defaultReminderLeadDays={notificationPreferences?.defaultReminderLeadDays ?? 0}
            reminderLimit={{
              canCreate: reminderCheck.allowed,
              current: reminderCheck.current,
              limit: reminderCheck.limit,
              isUnlimited: reminderCheck.isUnlimited,
            }}
          />
        </div>
      </main>
    </div>
  );
}
