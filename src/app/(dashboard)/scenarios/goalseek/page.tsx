'use client';

import { useUser } from '@/components/providers/user-context';
import { GoalseekClient } from './goalseek-client';

export default function GoalseekPage() {
  const { orgId, role } = useUser();
  return <GoalseekClient orgId={orgId} role={role} />;
}
