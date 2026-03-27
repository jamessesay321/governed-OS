import { createUntypedServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckpointType = 'post_sync' | 'monthly_review' | 'new_source' | 'onboarding';
export type CheckpointStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface Checkpoint {
  id: string;
  org_id: string;
  type: CheckpointType;
  status: CheckpointStatus;
  data: Record<string, unknown>;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

/**
 * What each checkpoint type verifies:
 *
 * post_sync    - After any data sync, verify data looks correct
 *                (row counts, totals, anomalies detected)
 * monthly_review - End of month, review P&L, verify all transactions
 *                  are categorised correctly
 * new_source   - When a new integration is connected, map accounts
 *                and verify initial data load
 * onboarding   - Initial setup verification: profile complete,
 *                first source connected, accounts mapped
 */

// ---------------------------------------------------------------------------
// Create a new checkpoint
// ---------------------------------------------------------------------------

export async function createCheckpoint(
  orgId: string,
  type: CheckpointType,
  data?: Record<string, unknown>
): Promise<Checkpoint> {
  const supabase = await createUntypedServiceClient();

  // Calculate a sensible due date based on type
  let dueDate: string | null = null;
  const now = new Date();

  switch (type) {
    case 'post_sync':
      // Due within 24 hours
      dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'monthly_review': {
      // Due on the 5th of next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5);
      dueDate = nextMonth.toISOString();
      break;
    }
    case 'new_source':
      // Due within 48 hours
      dueDate = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
      break;
    case 'onboarding':
      // Due within 7 days
      dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
  }

  const checkpointData = buildCheckpointData(type, data);

  const { data: created, error } = await supabase
    .from('checkpoints')
    .insert({
      org_id: orgId,
      type,
      status: 'pending',
      data: checkpointData,
      due_date: dueDate,
    })
    .select('*')
    .single();

  if (error || !created) {
    throw new Error(`Failed to create checkpoint: ${error?.message}`);
  }

  console.log(`[CHECKPOINT] Created ${type} checkpoint for org ${orgId}`);
  return created as Checkpoint;
}

// ---------------------------------------------------------------------------
// Get active (pending / in_progress) checkpoints
// ---------------------------------------------------------------------------

export async function getActiveCheckpoints(orgId: string): Promise<Checkpoint[]> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch checkpoints: ${error.message}`);
  }

  return (data ?? []) as Checkpoint[];
}

// ---------------------------------------------------------------------------
// Get all checkpoints (including completed) for history
// ---------------------------------------------------------------------------

export async function getAllCheckpoints(orgId: string): Promise<Checkpoint[]> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch checkpoints: ${error.message}`);
  }

  return (data ?? []) as Checkpoint[];
}

// ---------------------------------------------------------------------------
// Complete a checkpoint
// ---------------------------------------------------------------------------

export async function completeCheckpoint(
  orgId: string,
  checkpointId: string,
  userId: string
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('checkpoints')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: userId,
    })
    .eq('id', checkpointId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(`Failed to complete checkpoint: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Skip a checkpoint
// ---------------------------------------------------------------------------

export async function skipCheckpoint(
  orgId: string,
  checkpointId: string,
  userId: string
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('checkpoints')
    .update({
      status: 'skipped',
      completed_at: new Date().toISOString(),
      completed_by: userId,
    })
    .eq('id', checkpointId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(`Failed to skip checkpoint: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Start working on a checkpoint (move to in_progress)
// ---------------------------------------------------------------------------

export async function startCheckpoint(
  orgId: string,
  checkpointId: string
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('checkpoints')
    .update({ status: 'in_progress' })
    .eq('id', checkpointId)
    .eq('org_id', orgId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(`Failed to start checkpoint: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Build initial data payload for each checkpoint type
// ---------------------------------------------------------------------------

function buildCheckpointData(
  type: CheckpointType,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...extra };

  switch (type) {
    case 'post_sync':
      return {
        ...base,
        checklist: [
          { label: 'Row counts match expected', done: false },
          { label: 'No duplicate transactions', done: false },
          { label: 'Totals within expected range', done: false },
          { label: 'No anomalies detected', done: false },
        ],
      };
    case 'monthly_review':
      return {
        ...base,
        checklist: [
          { label: 'P&L reviewed and accurate', done: false },
          { label: 'All transactions categorised', done: false },
          { label: 'Balance sheet balances', done: false },
          { label: 'Cash flow statement reviewed', done: false },
          { label: 'Variance explanations added', done: false },
        ],
      };
    case 'new_source':
      return {
        ...base,
        checklist: [
          { label: 'Connection verified', done: false },
          { label: 'Initial data sync completed', done: false },
          { label: 'Account codes mapped', done: false },
          { label: 'Sample transactions reviewed', done: false },
        ],
      };
    case 'onboarding':
      return {
        ...base,
        checklist: [
          { label: 'Company profile completed', done: false },
          { label: 'First data source connected', done: false },
          { label: 'Chart of accounts imported', done: false },
          { label: 'Account mappings verified', done: false },
          { label: 'First monthly data reviewed', done: false },
        ],
      };
  }
}
