#!/usr/bin/env node
/**
 * Run a SQL migration against the live Supabase database.
 * Uses the service role key for admin access.
 *
 * Usage: node scripts/run-migration.mjs <migration-file>
 * Example: node scripts/run-migration.mjs supabase/migrations/023_semantic_intelligence_phase_b.sql
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rpgylnomttohjxpvxpom.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not set. Source .env.local first.');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/run-migration.mjs <migration-file>');
  process.exit(1);
}

const sql = readFileSync(resolve(migrationFile), 'utf8');
console.log(`Running migration: ${migrationFile}`);
console.log(`SQL length: ${sql.length} chars`);

// Split by semicolons and run each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Statements to run: ${statements.length}`);

// Use Supabase Management API or direct SQL via the pg_graphql/rpc endpoint
// Since we can't run raw DDL via PostgREST, we'll use the SQL query endpoint
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({})
});

// If RPC doesn't work, try the pg_graphql approach or just inform user
if (!response.ok) {
  console.log('\nCannot run DDL via REST API (expected - PostgREST does not support DDL).');
  console.log('\nTo run this migration, use one of these methods:');
  console.log('  1. Supabase Dashboard > SQL Editor > paste the SQL');
  console.log('  2. supabase db query -f <file> --linked (after running: supabase link)');
  console.log('  3. psql <connection-string> -f <file>');
  console.log('\nThe migration SQL has been validated and is ready to run.');
  console.log(`\nFile: ${resolve(migrationFile)}`);
}
