/**
 * Integration Framework
 *
 * Standard model for all integrations. Every connector follows the same
 * trigger/action pattern, making it easy to add new integrations.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntegrationDefinition {
  id: string;
  name: string;
  icon: string;
  category:
    | 'accounting'
    | 'commerce'
    | 'cloud_storage'
    | 'project_management'
    | 'marketing'
    | 'communication'
    | 'banking';
  status: 'available' | 'connected' | 'coming_soon';
  authType: 'oauth2' | 'api_key' | 'file_upload';
  triggers: IntegrationTrigger[];
  actions: IntegrationAction[];
}

export interface IntegrationTrigger {
  id: string;
  name: string;
  description: string;
  dataShape: string;
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  requiresAuth: boolean;
}

export interface IntegrationConnection {
  id: string;
  orgId: string;
  integrationId: string;
  status: 'active' | 'paused' | 'error' | 'expired';
  credentials: Record<string, unknown>;
  lastSyncAt?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  config: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: 'xero',
    name: 'Xero',
    icon: '/icons/xero.svg',
    category: 'accounting',
    status: 'available',
    authType: 'oauth2',
    triggers: [
      {
        id: 'invoice_created',
        name: 'invoice_created',
        description: 'Fires when a new invoice is created in Xero',
        dataShape: 'Invoice with line items, contact, amounts, and dates',
      },
      {
        id: 'payment_received',
        name: 'payment_received',
        description: 'Fires when a payment is received against an invoice',
        dataShape: 'Payment with amount, date, invoice reference, and bank account',
      },
      {
        id: 'bank_transaction',
        name: 'bank_transaction',
        description: 'Fires when a new bank transaction is recorded',
        dataShape: 'Transaction with date, amount, reference, and account code',
      },
    ],
    actions: [
      {
        id: 'sync_accounts',
        name: 'sync_accounts',
        description: 'Sync chart of accounts from Xero',
        requiresAuth: true,
      },
      {
        id: 'sync_invoices',
        name: 'sync_invoices',
        description: 'Sync all invoices from Xero',
        requiresAuth: true,
      },
      {
        id: 'sync_transactions',
        name: 'sync_transactions',
        description: 'Sync bank transactions from Xero',
        requiresAuth: true,
      },
      {
        id: 'full_sync',
        name: 'full_sync',
        description: 'Full sync of all Xero data (accounts, invoices, transactions)',
        requiresAuth: true,
      },
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '/icons/shopify.svg',
    category: 'commerce',
    status: 'available',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_order',
        name: 'new_order',
        description: 'Fires when a new order is placed on Shopify',
        dataShape: 'Order with line items, customer, totals, and fulfillment status',
      },
      {
        id: 'order_updated',
        name: 'order_updated',
        description: 'Fires when an existing order is updated',
        dataShape: 'Updated order with changed fields',
      },
      {
        id: 'product_created',
        name: 'product_created',
        description: 'Fires when a new product is created',
        dataShape: 'Product with title, variants, prices, and inventory',
      },
    ],
    actions: [
      {
        id: 'sync_orders',
        name: 'sync_orders',
        description: 'Sync all orders from Shopify',
        requiresAuth: true,
      },
      {
        id: 'sync_products',
        name: 'sync_products',
        description: 'Sync all products from Shopify',
        requiresAuth: true,
      },
      {
        id: 'sync_customers',
        name: 'sync_customers',
        description: 'Sync customer data from Shopify',
        requiresAuth: true,
      },
    ],
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    icon: '/icons/google-drive.svg',
    category: 'cloud_storage',
    status: 'available',
    authType: 'oauth2',
    triggers: [
      {
        id: 'file_uploaded',
        name: 'file_uploaded',
        description: 'Fires when a new file is uploaded to the watched folder',
        dataShape: 'File metadata with name, type, size, and folder path',
      },
      {
        id: 'file_modified',
        name: 'file_modified',
        description: 'Fires when an existing file is modified',
        dataShape: 'File metadata with name, modification date, and changed fields',
      },
    ],
    actions: [
      {
        id: 'list_files',
        name: 'list_files',
        description: 'List files in a Google Drive folder',
        requiresAuth: true,
      },
      {
        id: 'download_file',
        name: 'download_file',
        description: 'Download a file from Google Drive',
        requiresAuth: true,
      },
      {
        id: 'upload_file',
        name: 'upload_file',
        description: 'Upload a file to Google Drive',
        requiresAuth: true,
      },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '/icons/stripe.svg',
    category: 'banking',
    status: 'available',
    authType: 'oauth2',
    triggers: [
      {
        id: 'payment_received',
        name: 'payment_received',
        description: 'Fires when a payment is successfully processed',
        dataShape: 'Payment with amount, currency, customer, and metadata',
      },
      {
        id: 'subscription_created',
        name: 'subscription_created',
        description: 'Fires when a new subscription is created',
        dataShape: 'Subscription with plan, customer, interval, and amount',
      },
    ],
    actions: [
      {
        id: 'sync_payments',
        name: 'sync_payments',
        description: 'Sync payment history from Stripe',
        requiresAuth: true,
      },
      {
        id: 'sync_subscriptions',
        name: 'sync_subscriptions',
        description: 'Sync active subscriptions from Stripe',
        requiresAuth: true,
      },
    ],
  },
  {
    id: 'monday',
    name: 'Monday.com',
    icon: '/icons/monday.svg',
    category: 'project_management',
    status: 'available',
    authType: 'oauth2',
    triggers: [
      {
        id: 'item_created',
        name: 'item_created',
        description: 'Fires when a new item is created on a board',
        dataShape: 'Item with name, column values, board, and group',
      },
      {
        id: 'status_changed',
        name: 'status_changed',
        description: 'Fires when an item status is changed',
        dataShape: 'Item with previous status, new status, and changed_at',
      },
    ],
    actions: [
      {
        id: 'sync_boards',
        name: 'sync_boards',
        description: 'Sync boards and items from Monday.com',
        requiresAuth: true,
      },
      {
        id: 'create_item',
        name: 'create_item',
        description: 'Create a new item on a board',
        requiresAuth: true,
      },
    ],
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    icon: '/icons/klaviyo.svg',
    category: 'marketing',
    status: 'available',
    authType: 'api_key',
    triggers: [
      {
        id: 'campaign_sent',
        name: 'campaign_sent',
        description: 'Fires when an email campaign is sent',
        dataShape: 'Campaign with name, recipients, open rate, and click rate',
      },
      {
        id: 'flow_triggered',
        name: 'flow_triggered',
        description: 'Fires when an automation flow is triggered',
        dataShape: 'Flow event with trigger, recipient, and flow name',
      },
    ],
    actions: [
      {
        id: 'sync_campaigns',
        name: 'sync_campaigns',
        description: 'Sync campaign data from Klaviyo',
        requiresAuth: true,
      },
      {
        id: 'sync_lists',
        name: 'sync_lists',
        description: 'Sync subscriber lists from Klaviyo',
        requiresAuth: true,
      },
    ],
  },
  {
    id: 'excel_csv',
    name: 'Excel/CSV Upload',
    icon: '/icons/spreadsheet.svg',
    category: 'accounting',
    status: 'available',
    authType: 'file_upload',
    triggers: [
      {
        id: 'file_uploaded',
        name: 'file_uploaded',
        description: 'Fires when a spreadsheet file is uploaded',
        dataShape: 'File with name, type, sheet names, and row count',
      },
    ],
    actions: [
      {
        id: 'parse_file',
        name: 'parse_file',
        description: 'Parse an uploaded Excel or CSV file',
        requiresAuth: false,
      },
      {
        id: 'map_columns',
        name: 'map_columns',
        description: 'Map spreadsheet columns to standard fields',
        requiresAuth: false,
      },
      {
        id: 'ingest_data',
        name: 'ingest_data',
        description: 'Ingest mapped data into the staging pipeline',
        requiresAuth: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get an integration definition by its ID.
 */
export function getIntegration(id: string): IntegrationDefinition | undefined {
  return INTEGRATIONS.find((i) => i.id === id);
}

/**
 * Get all integrations in a given category.
 */
export function getIntegrationsByCategory(
  category: IntegrationDefinition['category']
): IntegrationDefinition[] {
  return INTEGRATIONS.filter((i) => i.category === category);
}

/**
 * Get all connected integrations for an organisation from the database.
 */
export async function getConnectedIntegrations(
  orgId: string
): Promise<IntegrationConnection[]> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active');

  if (error) {
    console.error('[INTEGRATIONS] Failed to fetch connections:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    orgId: row.org_id as string,
    integrationId: row.integration_id as string,
    status: row.status as IntegrationConnection['status'],
    credentials: (row.credentials ?? {}) as Record<string, unknown>,
    lastSyncAt: row.last_sync_at as string | undefined,
    syncFrequency: (row.sync_frequency ?? 'manual') as IntegrationConnection['syncFrequency'],
    config: (row.config ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
  }));
}

/**
 * Create or update an integration connection.
 */
export async function upsertConnection(
  orgId: string,
  integrationId: string,
  data: {
    status?: IntegrationConnection['status'];
    credentials?: Record<string, unknown>;
    syncFrequency?: IntegrationConnection['syncFrequency'];
    config?: Record<string, unknown>;
  }
): Promise<IntegrationConnection> {
  const supabase = await createUntypedServiceClient();

  const { data: row, error } = await supabase
    .from('integration_connections')
    .upsert(
      {
        org_id: orgId,
        integration_id: integrationId,
        status: data.status ?? 'active',
        credentials: data.credentials ?? {},
        sync_frequency: data.syncFrequency ?? 'manual',
        config: data.config ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,integration_id' }
    )
    .select('*')
    .single();

  if (error || !row) {
    throw new Error(`Failed to upsert connection: ${error?.message}`);
  }

  return {
    id: row.id as string,
    orgId: row.org_id as string,
    integrationId: row.integration_id as string,
    status: row.status as IntegrationConnection['status'],
    credentials: (row.credentials ?? {}) as Record<string, unknown>,
    lastSyncAt: row.last_sync_at as string | undefined,
    syncFrequency: (row.sync_frequency ?? 'manual') as IntegrationConnection['syncFrequency'],
    config: (row.config ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
  };
}

/**
 * Update the last sync timestamp for a connection.
 */
export async function updateLastSync(
  orgId: string,
  integrationId: string
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('integration_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('integration_id', integrationId);

  if (error) {
    console.error('[INTEGRATIONS] Failed to update last_sync_at:', error.message);
  }
}
