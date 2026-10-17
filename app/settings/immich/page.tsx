import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ImmichSettings from './ImmichSettings';

export default async function ImmichSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch existing Immich connection without exposing encrypted apiKey
  const connection = await prisma.immichConnection.findUnique({
    where: {
      userId: session.user.id,
    },
    omit: {
      apiKey: true,
    },
  });

  const [linkedPeopleCount, linkedEventsCount] = await Promise.all([
    prisma.person.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
        OR: [
          { immichPersonId: { not: null } },
          { immichAlbumId: { not: null } },
        ],
      },
    }),
    prisma.event.count({
      where: {
        userId: session.user.id,
        deletedAt: null,
        immichAlbumId: { not: null },
      },
    }),
  ]);

  return (
    <ImmichSettings
      connection={
        connection
          ? {
              id: connection.id,
              serverUrl: connection.serverUrl,
              publicUrl: connection.publicUrl,
              enabled: connection.enabled,
              lastError: connection.lastError,
              lastCheckedAt: connection.lastCheckedAt?.toISOString() ?? null,
              hasApiKey: true,
            }
          : null
      }
      linkedPeopleCount={linkedPeopleCount}
      linkedEventsCount={linkedEventsCount}
    />
  );
}

