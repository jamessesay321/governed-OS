import { NextResponse } from 'next/server';
import { getAllThemes } from '@/lib/reports/themes';

// GET /api/reports/themes — List all available report theme presets
export async function GET() {
  const themes = getAllThemes().map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    primaryColor: t.colors.primary,
    accentColor: t.colors.secondary,
  }));

  return NextResponse.json({ themes });
}
