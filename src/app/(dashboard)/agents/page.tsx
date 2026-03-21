'use client';

import { useUser } from '@/components/providers/user-context';
import { AgentsClient } from './agents-client';

export default function AgentsPage() {
  const { orgId } = useUser();
  return <AgentsClient orgId={orgId} />;
}
