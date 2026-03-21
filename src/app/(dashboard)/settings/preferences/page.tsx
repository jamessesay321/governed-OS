'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Language & Regional Preferences                                     */
/* ------------------------------------------------------------------ */

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', label: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'zh', label: 'Chinese (Simplified)', native: '中文', flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '21/03/2026' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '03/21/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-03-21' },
];

const NUMBER_FORMATS = [
  { value: 'comma-period', label: '1,234,567.89', description: 'Comma thousands, period decimal' },
  { value: 'period-comma', label: '1.234.567,89', description: 'Period thousands, comma decimal' },
  { value: 'space-comma', label: '1 234 567,89', description: 'Space thousands, comma decimal' },
];

const TIMEZONES = [
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
];

export default function PreferencesPage() {
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [numberFormat, setNumberFormat] = useState('comma-period');
  const [timezone, setTimezone] = useState('Europe/London');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Language, regional formatting, and display preferences.
        </p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
          <CardDescription>
            Choose the language for the platform interface. All AI insights and reports will also adapt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all',
                  language === lang.code
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <span className="text-lg">{lang.flag}</span>
                <div>
                  <p className="text-sm font-medium">{lang.label}</p>
                  <p className="text-xs text-muted-foreground">{lang.native}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Date Format */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Format</CardTitle>
          <CardDescription>
            How dates are displayed across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {DATE_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => setDateFormat(fmt.value)}
                className={cn(
                  'flex-1 rounded-lg border px-4 py-3 text-center transition-all',
                  dateFormat === fmt.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <p className="text-sm font-medium">{fmt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt.example}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Number Format */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Number Format</CardTitle>
          <CardDescription>
            How numbers and currency amounts are formatted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {NUMBER_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => setNumberFormat(fmt.value)}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all',
                  numberFormat === fmt.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div>
                  <p className="text-sm font-mono font-medium">{fmt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmt.description}</p>
                </div>
                {numberFormat === fmt.value && (
                  <svg className="h-5 w-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
          <CardDescription>
            Used for scheduling, report timestamps, and agent activity logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full max-w-md rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Notifications</CardTitle>
          <CardDescription>
            Control which email notifications you receive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: 'Weekly financial summary', description: 'A digest of key metrics and AI insights every Monday', defaultChecked: true },
              { label: 'Agent activity reports', description: 'Daily summary of what your AI agents accomplished', defaultChecked: true },
              { label: 'KPI threshold alerts', description: 'Immediate alerts when KPIs breach set thresholds', defaultChecked: true },
              { label: 'Invoice and billing reminders', description: 'Notifications about upcoming payments and invoices', defaultChecked: false },
              { label: 'Product updates and new features', description: 'Learn about platform improvements and new capabilities', defaultChecked: false },
            ].map((item) => (
              <label key={item.label} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={item.defaultChecked}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={cn(
            'rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {saved ? 'Saved' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
