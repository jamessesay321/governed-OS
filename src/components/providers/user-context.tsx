'use client';

import { createContext, useContext } from 'react';

export interface UserContextValue {
  userId: string;
  orgId: string;
  role: string;
  displayName: string;
  orgName: string;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: UserContextValue;
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
