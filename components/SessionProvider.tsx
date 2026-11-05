'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  [key: string]: unknown;
}

export interface SessionData {
  user: UserSession;
}

export interface SessionContextType {
  data: SessionData | null;
  status: 'authenticated' | 'unauthenticated' | 'loading';
  update: (data?: Partial<UserSession>) => Promise<SessionData | null>;
}

const SessionContext = createContext<SessionContextType>({
  data: null,
  status: 'loading',
  update: async () => null,
});

export async function signOut(options?: { callbackUrl?: string; redirect?: boolean }) {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  const callbackUrl = options?.callbackUrl || '/login';
  if (options?.redirect !== false) {
    window.location.href = callbackUrl;
  }
}

export async function signIn(
  provider?: string,
  options?: { email?: string; password?: string; callbackUrl?: string; redirect?: boolean }
) {
  if (provider === 'credentials' || !provider) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: options?.email,
        password: options?.password,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.error || 'Authentication failed', ok: false, status: res.status };
    }

    const callbackUrl = options?.callbackUrl || '/dashboard';
    if (options?.redirect !== false) {
      window.location.href = callbackUrl;
    }

    return { error: null, ok: true, status: 200 };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export default function SessionProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: { user: UserSession } | null;
}) {
  const [session, setSession] = useState<SessionData | null>(
    initialSession ? { user: initialSession.user } : null
  );
  const [status, setStatus] = useState<'authenticated' | 'unauthenticated' | 'loading'>(
    initialSession ? 'authenticated' : 'loading'
  );

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        setSession({ user });
        setStatus('authenticated');
        return { user };
      } else {
        setSession(null);
        setStatus('unauthenticated');
        return null;
      }
    } catch {
      setSession(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  const update = useCallback(
    async (data?: Partial<UserSession>) => {
      if (data && session) {
        const updated = { user: { ...session.user, ...data } };
        setSession(updated);
        return updated;
      }
      return await fetchSession();
    },
    [session, fetchSession]
  );

  useEffect(() => {
    let ignore = false;
    if (!initialSession) {
      fetch('/api/auth/me')
        .then(async (res) => {
          if (!ignore) {
            if (res.ok) {
              const user = await res.json();
              setSession({ user });
              setStatus('authenticated');
            } else {
              setSession(null);
              setStatus('unauthenticated');
            }
          }
        })
        .catch(() => {
          if (!ignore) {
            setSession(null);
            setStatus('unauthenticated');
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [initialSession]);

  return (
    <SessionContext.Provider value={{ data: session, status, update }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
