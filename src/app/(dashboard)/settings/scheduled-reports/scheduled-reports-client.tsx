'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Clock, Mail, Calendar, Plus, Trash2, Edit, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScheduledReport {
  id: string;
  org_id: string;
  created_by: string;
  report_type: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  recipients: string[];
  subject_template: string | null;
  include_ai_summary: boolean;
  include_attachments: boolean;
  active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  orgId: string;
  userId: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const REPORT_TYPE_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  kpi_dashboard: 'KPI Dashboard',
  cash_flow: 'Cash Flow Statement',
  income_statement: 'Income Statement',
  balance_sheet: 'Balance Sheet',
  variance: 'Variance Analysis',
  board_pack: 'Board Pack',
  daily_briefing: 'Daily Briefing',
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ScheduledReportsClient({ orgId, userId }: Props) {
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [reportType, setReportType] = useState('executive_summary');
  const [frequency, setFrequency] = useState('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);

  /* ─── Fetch schedules ─── */
  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/schedule');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules ?? []);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  /* ─── Form helpers ─── */
  function resetForm() {
    setReportType('executive_summary');
    setFrequency('weekly');
    setDayOfWeek(1);
    setDayOfMonth(1);
    setTimeOfDay('08:00');
    setRecipients([]);
    setRecipientInput('');
    setSubjectTemplate('');
    setIncludeAiSummary(true);
    setIncludeAttachments(true);
    setEditingSchedule(null);
  }

  function populateForm(schedule: ScheduledReport) {
    setReportType(schedule.report_type);
    setFrequency(schedule.frequency);
    setDayOfWeek(schedule.day_of_week ?? 1);
    setDayOfMonth(schedule.day_of_month ?? 1);
    setTimeOfDay(schedule.time_of_day);
    setRecipients(schedule.recipients ?? []);
    setRecipientInput('');
    setSubjectTemplate(schedule.subject_template ?? '');
    setIncludeAiSummary(schedule.include_ai_summary);
    setIncludeAttachments(schedule.include_attachments);
    setEditingSchedule(schedule);
  }

  function addRecipient() {
    const email = recipientInput.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !recipients.includes(email)) {
      setRecipients((prev) => [...prev, email]);
      setRecipientInput('');
    }
  }

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }

  /* ─── Save / Update ─── */
  async function handleSave() {
    if (recipients.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        report_type: reportType,
        frequency,
        day_of_week: frequency === 'weekly' ? dayOfWeek : null,
        day_of_month: frequency === 'monthly' ? dayOfMonth : null,
        time_of_day: timeOfDay,
        recipients,
        subject_template: subjectTemplate || null,
        include_ai_summary: includeAiSummary,
        include_attachments: includeAttachments,
      };

      let res: Response;
      if (editingSchedule) {
        res = await fetch(`/api/reports/schedule/${editingSchedule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/reports/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        await fetchSchedules();
      }
    } catch {
      // Handle error silently
    } finally {
      setSaving(false);
    }
  }

  /* ─── Toggle active ─── */
  async function toggleActive(schedule: ScheduledReport) {
    try {
      await fetch(`/api/reports/schedule/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !schedule.active }),
      });
      await fetchSchedules();
    } catch {
      // Handle error silently
    }
  }

  /* ─── Delete (soft) ─── */
  async function handleDelete(scheduleId: string) {
    try {
      await fetch(`/api/reports/schedule/${scheduleId}`, { method: 'DELETE' });
      await fetchSchedules();
    } catch {
      // Handle error silently
    }
  }

  /* ─── Helpers ─── */
  function formatNextSend(dateStr: string | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatFrequency(schedule: ScheduledReport): string {
    if (schedule.frequency === 'daily') return `Daily at ${schedule.time_of_day}`;
    if (schedule.frequency === 'weekly' && schedule.day_of_week != null) {
      return `${DAY_LABELS[schedule.day_of_week]}s at ${schedule.time_of_day}`;
    }
    if (schedule.frequency === 'monthly' && schedule.day_of_month != null) {
      return `${schedule.day_of_month}${getOrdinal(schedule.day_of_month)} of month at ${schedule.time_of_day}`;
    }
    return FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency;
  }

  function getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Settings
          </Link>
          <h2 className="text-2xl font-bold mt-1">Scheduled Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automate report delivery to your inbox. Reports are sent as email with optional PDF
            attachment.
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? 'Edit Schedule' : 'New Scheduled Report'}
              </DialogTitle>
              <DialogDescription>
                Configure when and where to send this report automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Report Type */}
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label>Frequency</Label>
                <div className="flex gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                    <button
                      key={f}
                      className={cn(
                        'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                        frequency === f
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border hover:bg-muted',
                      )}
                      onClick={() => setFrequency(f)}
                    >
                      {FREQUENCY_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Picker (conditional) */}
              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={String(dayOfWeek)}
                    onValueChange={(v) => setDayOfWeek(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_LABELS.map((label, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select
                    value={String(dayOfMonth)}
                    onValueChange={(v) => setDayOfMonth(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                          {getOrdinal(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Time Picker */}
              <div className="space-y-2">
                <Label>Time (24h)</Label>
                <Input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                />
              </div>

              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRecipient();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addRecipient}>
                    Add
                  </Button>
                </div>
                {recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recipients.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {recipients.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add at least one recipient email address.
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="ai-summary"
                    checked={includeAiSummary}
                    onCheckedChange={(checked) => setIncludeAiSummary(checked === true)}
                  />
                  <Label htmlFor="ai-summary" className="text-sm font-normal cursor-pointer">
                    Include AI Summary
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="pdf-attach"
                    checked={includeAttachments}
                    onCheckedChange={(checked) => setIncludeAttachments(checked === true)}
                  />
                  <Label htmlFor="pdf-attach" className="text-sm font-normal cursor-pointer">
                    Include PDF Attachment
                  </Label>
                </div>
              </div>

              {/* Custom Subject */}
              <div className="space-y-2">
                <Label>Custom Subject Line (optional)</Label>
                <Input
                  placeholder="e.g. Weekly Financial Summary - {{company_name}}"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || recipients.length === 0}>
                {saving ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {loading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading schedules...</span>
          </div>
        </Card>
      ) : schedules.length === 0 ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-muted p-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No scheduled reports yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first one to automate your reporting.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Next Send</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {REPORT_TYPE_LABELS[schedule.report_type] ?? schedule.report_type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{formatFrequency(schedule)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(schedule.recipients ?? []).slice(0, 2).map((email) => (
                        <Badge key={email} variant="outline" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                      {(schedule.recipients ?? []).length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{schedule.recipients.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {schedule.active ? formatNextSend(schedule.next_send_at) : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={schedule.active}
                      onCheckedChange={() => toggleActive(schedule)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          populateForm(schedule);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
