/**
 * Google Drive Connector
 *
 * OAuth flow, file listing, download, and folder watching.
 * Focused on spreadsheet files (xlsx, csv) that feed into the spreadsheet engine.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { updateLastSync } from './framework';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  webViewLink?: string;
}

export interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

export interface DriveWatchChannel {
  id: string;
  resourceId: string;
  expiration: string;
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

/**
 * Build the Google OAuth consent URL for Drive access.
 */
export function buildGoogleDriveAuthUrl(state: string): string {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_DRIVE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 */
export async function exchangeGoogleToken(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token refresh failed: ${text}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function driveFetch<T>(
  accessToken: string,
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`https://www.googleapis.com/drive/v3/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive API error (${endpoint}): ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Spreadsheet MIME types we care about for the import engine.
 */
const SPREADSHEET_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'text/tab-separated-values',
  'application/vnd.google-apps.spreadsheet', // Google Sheets
];

/**
 * List files in Google Drive, optionally filtered to a specific folder.
 * By default only lists spreadsheet-compatible files.
 */
export async function listFiles(
  accessToken: string,
  folderId?: string,
  options?: { allFiles?: boolean; pageToken?: string }
): Promise<DriveFileList> {
  const queryParts: string[] = ['trashed = false'];

  if (folderId) {
    queryParts.push(`'${folderId}' in parents`);
  }

  if (!options?.allFiles) {
    const mimeFilters = SPREADSHEET_MIMES.map((m) => `mimeType = '${m}'`).join(' or ');
    queryParts.push(`(${mimeFilters} or mimeType = 'application/vnd.google-apps.folder')`);
  }

  const params: Record<string, string> = {
    q: queryParts.join(' and '),
    fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink),nextPageToken',
    pageSize: '100',
    orderBy: 'modifiedTime desc',
  };

  if (options?.pageToken) {
    params.pageToken = options.pageToken;
  }

  const result = await driveFetch<DriveFileList>(accessToken, 'files', params);
  return result;
}

/**
 * Download a file's content from Google Drive.
 * For Google Sheets, exports as xlsx. For other files, downloads directly.
 */
export async function downloadFile(
  accessToken: string,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  // First get file metadata
  const metadata = await driveFetch<DriveFile>(
    accessToken,
    `files/${fileId}`,
    { fields: 'id,name,mimeType' }
  );

  let downloadUrl: string;
  let exportMime: string;

  if (metadata.mimeType === 'application/vnd.google-apps.spreadsheet') {
    // Export Google Sheets as xlsx
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    exportMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    exportMime = metadata.mimeType;
  }

  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive download failed: ${response.status} ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName =
    metadata.mimeType === 'application/vnd.google-apps.spreadsheet'
      ? `${metadata.name}.xlsx`
      : metadata.name;

  return { buffer, mimeType: exportMime, fileName };
}

/**
 * Set up a push notification channel to watch a folder for changes.
 * Google Drive will POST to our webhook when files are added/modified.
 *
 * Note: Requires the app to have a publicly reachable webhook URL.
 * Channels expire after ~24 hours and need periodic renewal.
 */
export async function watchFolder(
  orgId: string,
  accessToken: string,
  folderId: string
): Promise<DriveWatchChannel> {
  const channelId = `governed-os-${orgId}-${folderId}-${Date.now()}`;
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/webhook`;

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/watch`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive watch failed: ${response.status} ${text}`);
  }

  const data = await response.json();

  // Store channel info in the connection config
  const supabase = await createUntypedServiceClient();
  await supabase
    .from('integration_connections')
    .update({
      config: {
        watched_folder: folderId,
        channel_id: channelId,
        channel_resource_id: data.resourceId,
        channel_expiration: data.expiration,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('integration_id', 'google_drive');

  await updateLastSync(orgId, 'google_drive');

  return {
    id: channelId,
    resourceId: data.resourceId,
    expiration: data.expiration,
  };
}
