'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Template = 'light' | 'detailed' | 'custom';
type Permission = 'view' | 'interactive' | 'downloadable' | 'hidden';

interface DataItem {
  id: string;
  label: string;
  section: string;
  included: boolean;
  permission: Permission;
}

const TEMPLATES: Record<Template, { label: string; description: string; items: string[] }> = {
  light: {
    label: 'Light Package',
    description: 'Ideal for first touch. Company overview, key KPIs, revenue trend.',
    items: ['Company Overview', 'Key KPIs', 'Revenue Trend', 'Team', 'Market Opportunity'],
  },
  detailed: {
    label: 'Detailed Package',
    description: 'For serious investors post-meeting. Full financials, scenarios, unit economics.',
    items: ['Company Overview', 'Key KPIs', 'Revenue Trend', 'Full P&L', 'Balance Sheet', 'Cash Flow', 'Scenarios', 'Unit Economics', 'Board Packs', 'Customer Metrics'],
  },
  custom: {
    label: 'Custom',
    description: 'Pick exactly what to share.',
    items: [],
  },
};

const DATA_ITEMS: DataItem[] = [
  { id: '1', label: 'Company Overview', section: 'overview', included: true, permission: 'view' },
  { id: '2', label: 'Key KPIs (last 6 months)', section: 'financials', included: true, permission: 'view' },
  { id: '3', label: 'Revenue Trend Chart', section: 'financials', included: true, permission: 'view' },
  { id: '4', label: 'Full P&L Statement', section: 'financials', included: false, permission: 'view' },
  { id: '5', label: 'Balance Sheet', section: 'financials', included: false, permission: 'view' },
  { id: '6', label: 'Cash Flow Statement', section: 'financials', included: false, permission: 'view' },
  { id: '7', label: 'Base Case Scenario', section: 'scenarios', included: false, permission: 'interactive' },
  { id: '8', label: 'Growth Scenario', section: 'scenarios', included: false, permission: 'interactive' },
  { id: '9', label: 'Unit Economics', section: 'financials', included: false, permission: 'view' },
  { id: '10', label: 'Team & Org Chart', section: 'overview', included: true, permission: 'view' },
  { id: '11', label: 'Board Pack (Latest)', section: 'documents', included: false, permission: 'downloadable' },
  { id: '12', label: 'Pitch Deck', section: 'documents', included: false, permission: 'downloadable' },
];

const PERMISSION_LABELS: Record<Permission, { label: string; color: string }> = {
  view: { label: 'View Only', color: 'bg-slate-100 text-slate-600' },
  interactive: { label: 'Interactive', color: 'bg-blue-50 text-blue-600' },
  downloadable: { label: 'Downloadable', color: 'bg-amber-50 text-amber-600' },
  hidden: { label: 'Hidden', color: 'bg-slate-50 text-slate-400' },
};

export default function RoomBuilderPage() {
  const [step, setStep] = useState(1);
  const [roomName, setRoomName] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [items, setItems] = useState<DataItem[]>(DATA_ITEMS);

  function selectTemplate(t: Template) {
    setTemplate(t);
    const templateItems = TEMPLATES[t].items;
    setItems(prev =>
      prev.map(item => ({
        ...item,
        included: t === 'custom' ? item.included : templateItems.includes(item.label),
      }))
    );
  }

  function toggleItem(id: string) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, included: !item.included } : item
    ));
  }

  function setPermission(id: string, permission: Permission) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, permission } : item
    ));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/investor-portal" className="text-muted-foreground hover:text-foreground">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Room Builder</h2>
          <p className="text-sm text-muted-foreground">Create a curated data room for your investors</p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {step === 1 && 'Name & Template'}
          {step === 2 && 'Select Data'}
          {step === 3 && 'Permissions'}
          {step === 4 && 'Review & Publish'}
        </span>
      </div>

      {/* Step 1: Name & Template */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  placeholder="e.g. Series A — Hoxton Ventures"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Choose a template</h3>
            <div className="grid gap-3">
              {(Object.entries(TEMPLATES) as [Template, typeof TEMPLATES.light][]).map(([key, t]) => (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all ${
                    template === key ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                  onClick={() => selectTemplate(key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{t.label}</h4>
                        <p className="text-sm text-muted-foreground">{t.description}</p>
                      </div>
                      {key === 'light' && (
                        <Badge variant="outline" className="bg-green-50 text-green-600">Recommended</Badge>
                      )}
                    </div>
                    {t.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {t.items.map((item) => (
                          <span key={item} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* AI Recommendation */}
          <Card className="bg-violet-50 border-violet-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-violet-800">AI Recommendation</p>
                  <p className="text-sm text-violet-700 mt-1">
                    For first-touch investor conversations, we recommend the Light Package. Share your key metrics
                    and story without overwhelming. You can always upgrade to the Detailed Package after the first meeting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => setStep(2)}
            disabled={!roomName.trim() || !template}
            className="w-full"
          >
            Next: Select Data
          </Button>
        </div>
      )}

      {/* Step 2: Select Data */}
      {step === 2 && (
        <div className="space-y-4">
          {['overview', 'financials', 'scenarios', 'documents'].map((section) => {
            const sectionItems = items.filter(i => i.section === section);
            return (
              <Card key={section}>
                <CardHeader>
                  <CardTitle className="capitalize text-sm">{section}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sectionItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 py-2 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2"
                    >
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={() => toggleItem(item.id)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm flex-1">{item.label}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button onClick={() => setStep(3)} className="flex-1">Next: Set Permissions</Button>
          </div>
        </div>
      )}

      {/* Step 3: Permissions */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Set permissions for each item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.filter(i => i.included).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex gap-1">
                    {(['view', 'interactive', 'downloadable', 'hidden'] as Permission[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPermission(item.id, p)}
                        className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
                          item.permission === p
                            ? PERMISSION_LABELS[p].color
                            : 'text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {PERMISSION_LABELS[p].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
            <Button onClick={() => setStep(4)} className="flex-1">Next: Review</Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Publish */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Room Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Room Name</span>
                  <p className="font-medium">{roomName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Template</span>
                  <p className="font-medium capitalize">{template}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Items Shared</span>
                  <p className="font-medium">{items.filter(i => i.included).length} items</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Interactive Items</span>
                  <p className="font-medium">{items.filter(i => i.included && i.permission === 'interactive').length}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Included items</h4>
                <div className="flex flex-wrap gap-2">
                  {items.filter(i => i.included).map((item) => (
                    <Badge key={item.id} variant="outline" className={PERMISSION_LABELS[item.permission].color}>
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Readiness prompt */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">Run an AI Readiness Check first?</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Before sharing, we can scan your data for gaps, inconsistencies, and likely investor questions.
                    This typically improves your readiness score by 15-20 points.
                  </p>
                  <Link href="/investor-portal/readiness">
                    <Button size="sm" variant="outline" className="mt-2">
                      Run Readiness Check
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Back</Button>
            <Button className="flex-1">
              Publish Room
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
