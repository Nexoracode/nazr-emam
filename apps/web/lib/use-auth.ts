'use client';

import { useEffect, useState } from 'react';
import { getMe } from './api';
import type { User } from '@nazr-emam/shared';

type AuthState = { loading: true; user: null } | { loading: false; user: User | null };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, user: null });

  useEffect(() => {
    getMe()
      .then((user) => setState({ loading: false, user }))
      .catch(() => setState({ loading: false, user: null }));
  }, []);

  return state;
}
