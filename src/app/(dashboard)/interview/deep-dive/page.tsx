'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DEEP_DIVE_TOPICS = [
  {
    id: 'revenue',
    title: 'Revenue Model',
    description: 'How do you generate income? Recurring, project-based, or hybrid?',
    icon: '💰',
  },
  {
    id: 'operations',
    title: 'Operations & Costs',
    description: 'Your key cost drivers, team structure, and operational workflow.',
    icon: '⚙️',
  },
  {
    id: 'growth',
    title: 'Growth Strategy',
    description: 'Where you see the biggest opportunities and what\'s holding you back.',
    icon: '📈',
  },
  {
    id: 'compliance',
    title: 'Compliance & Risk',
    description: 'Regulatory requirements, insurance, and risk management.',
    icon: '🛡️',
  },
];

export default function DeepDivePage() {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  if (started) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-xl font-bold mb-2">AI Deep-Dive Interview</h2>
          <p className="text-muted-foreground mb-6">
            This feature uses AI to ask targeted follow-up questions about your business.
            It will analyse your answers to build a richer financial profile.
          </p>
          <Badge variant="outline" className="mb-6">Coming Soon</Badge>
          <p className="text-sm text-muted-foreground mb-6">
            For now, make sure you&apos;ve filled in your Business Profile with as much detail as possible.
            The more context you provide, the better our AI insights will be.
          </p>
          <Button onClick={() => router.push('/interview')}>
            Back to Business Profile
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI Deep-Dive Interview</h1>
        <p className="text-muted-foreground mt-1">
          Select the areas you&apos;d like our AI to explore in more depth. This helps us give you more personalised insights.
        </p>
      </div>

      <div className="grid gap-3 mb-8">
        {DEEP_DIVE_TOPICS.map((topic) => (
          <button
            key={topic.id}
            onClick={() => toggleTopic(topic.id)}
            className={`flex items-start gap-4 rounded-lg border p-4 text-left transition-all ${
              selectedTopics.includes(topic.id)
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-2xl flex-shrink-0">{topic.icon}</span>
            <div>
              <div className="font-medium">{topic.title}</div>
              <div className="text-sm text-muted-foreground">{topic.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/interview')}>
          Back
        </Button>
        <Button
          onClick={() => setStarted(true)}
          disabled={selectedTopics.length === 0}
        >
          Start Deep-Dive ({selectedTopics.length} topics)
        </Button>
      </div>
    </div>
  );
}
