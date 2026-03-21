'use client';

import { useUser } from '@/components/providers/user-context';
import { VaultBrowserClient } from './vault-browser-client';

export default function VaultPage() {
  const { orgId, role } = useUser();
  return <VaultBrowserClient orgId={orgId} role={role} />;
}
