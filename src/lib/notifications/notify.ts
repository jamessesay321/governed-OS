import { createServiceClient } from '@/lib/supabase/server';
import type { NotificationType } from '@/types';

interface CreateNotificationInput {
  userId: string;
  orgId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
}

/**
 * Create a notification for a user.
 * Uses service role client to bypass RLS for insert.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('notifications' as any).insert({
    user_id: input.userId,
    org_id: input.orgId,
    type: input.type,
    title: input.title,
    body: input.body,
    action_url: input.actionUrl ?? null,
    read: false,
  });

  if (error) {
    console.error('[NOTIFY] Failed to create notification:', error.message, input);
  }
}

/**
 * Get unread notifications for a user.
 */
export async function getUnreadNotifications(userId: string) {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('notifications' as any)
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[NOTIFY] Failed to fetch notifications:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Get all notifications for a user (paginated).
 */
export async function getNotifications(userId: string, limit = 50) {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('notifications' as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[NOTIFY] Failed to fetch notifications:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('notifications' as any)
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('[NOTIFY] Failed to mark as read:', error.message);
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('notifications' as any)
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('[NOTIFY] Failed to mark all as read:', error.message);
  }
}
