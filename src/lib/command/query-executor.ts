/**
 * Query Executor — safely executes Supabase queries from Claude's structured interpretation
 *
 * Takes a structured query plan from Claude and builds parameterised
 * Supabase queries. Never uses raw SQL — all queries go through the
 * Supabase client's query builder for injection safety.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const queryPlanSchema = z.object({
  table: z.enum([
    'normalised_financials',
    'chart_of_accounts',
    'kpi_snapshots',
    'detected_anomalies',
    'sync_log',
    'organisations',
    'number_challenges',
  ]),
  select: z.string().default('*'),
  filters: z.array(
    z.object({
      column: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in']),
      value: z.union([z.string(), z.number(), z.array(z.string())]),
    })
  ).default([]),
  orderBy: z.object({
    column: z.string(),
    ascending: z.boolean().default(false),
  }).optional(),
  limit: z.number().min(1).max(100).default(50),
  aggregate: z.enum(['sum', 'count', 'avg', 'none']).default('none'),
  groupBy: z.string().optional(),
});

export type QueryPlan = z.infer<typeof queryPlanSchema>;

export const resultSchema = z.object({
  type: z.enum(['chart', 'table', 'number', 'text']),
  data: z.unknown(),
  chartType: z.enum(['bar', 'line', 'pie']).optional(),
  title: z.string(),
  summary: z.string().optional(),
});

export type QueryResult = z.infer<typeof resultSchema>;

// ---------------------------------------------------------------------------
// Structured interpretation from Claude
// ---------------------------------------------------------------------------

export const interpretationSchema = z.object({
  queryPlan: queryPlanSchema,
  resultType: z.enum(['chart', 'table', 'number', 'text']),
  chartType: z.enum(['bar', 'line', 'pie']).optional(),
  title: z.string(),
  summary: z.string().optional(),
});

export type QueryInterpretation = z.infer<typeof interpretationSchema>;

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

/**
 * Execute a structured query plan against Supabase.
 * Returns formatted data ready for rendering.
 */
export async function executeQuery(
  interpretation: QueryInterpretation,
  orgId: string
): Promise<QueryResult> {
  const { queryPlan, resultType, chartType, title, summary } = interpretation;

  const supabase = await createServiceClient();

  // Build the query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from(queryPlan.table)
    .select(queryPlan.select)
    .eq('org_id', orgId);

  // Apply filters
  for (const filter of queryPlan.filters) {
    switch (filter.operator) {
      case 'eq':
        query = query.eq(filter.column, filter.value);
        break;
      case 'neq':
        query = query.neq(filter.column, filter.value);
        break;
      case 'gt':
        query = query.gt(filter.column, filter.value);
        break;
      case 'gte':
        query = query.gte(filter.column, filter.value);
        break;
      case 'lt':
        query = query.lt(filter.column, filter.value);
        break;
      case 'lte':
        query = query.lte(filter.column, filter.value);
        break;
      case 'like':
        query = query.like(filter.column, String(filter.value));
        break;
      case 'ilike':
        query = query.ilike(filter.column, String(filter.value));
        break;
      case 'in':
        if (Array.isArray(filter.value)) {
          query = query.in(filter.column, filter.value);
        }
        break;
    }
  }

  // Apply ordering
  if (queryPlan.orderBy) {
    query = query.order(queryPlan.orderBy.column, {
      ascending: queryPlan.orderBy.ascending,
    });
  }

  // Apply limit
  query = query.limit(queryPlan.limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Query execution failed: ${error.message}`);
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  // Format result based on type
  if (resultType === 'number' && rows.length > 0) {
    // For number results, extract the first numeric value
    const firstRow = rows[0];
    const numericKeys = Object.keys(firstRow).filter(
      (k) => typeof firstRow[k] === 'number'
    );
    const value = numericKeys.length > 0 ? firstRow[numericKeys[0]] : rows.length;

    return {
      type: 'number',
      data: { value, rows: rows.length },
      title,
      summary,
    };
  }

  if (resultType === 'chart') {
    return {
      type: 'chart',
      data: rows,
      chartType: chartType ?? 'bar',
      title,
      summary,
    };
  }

  if (resultType === 'text') {
    return {
      type: 'text',
      data: { message: summary ?? title, rows },
      title,
      summary,
    };
  }

  // Default: table
  return {
    type: 'table',
    data: rows,
    title,
    summary,
  };
}
