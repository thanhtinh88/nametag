import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiServer } from '@/lib/backend/api-client';
import ImmichSettings from './ImmichSettings';

export default async function ImmichSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [connRes, peopleRes, eventsRes] = await Promise.all([
    apiServer.get<{ connection: any }>('/api/immich/connection').catch(() => null),
    apiServer.get<{ people: any[] }>('/api/people').catch(() => ({ people: [] })),
    apiServer.get<{ events: any[] }>('/api/events').catch(() => ({ events: [] })),
  ]);

  const connection = connRes?.connection || null;
  const linkedPeopleCount = (peopleRes?.people || []).filter(
    (p: any) => p.immichPersonId || p.immichAlbumId
  ).length;
  const linkedEventsCount = (eventsRes?.events || []).filter(
    (e: any) => e.immichAlbumId
  ).length;

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
              lastCheckedAt: connection.lastCheckedAt
                ? new Date(connection.lastCheckedAt).toISOString()
                : null,
              hasApiKey: true,
            }
          : null
      }
      linkedPeopleCount={linkedPeopleCount}
      linkedEventsCount={linkedEventsCount}
    />
  );
}
