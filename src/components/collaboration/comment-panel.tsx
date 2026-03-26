'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Comment {
  id: string;
  author: string;
  authorInitials: string;
  content: string;
  timestamp: string;
  resolved: boolean;
  isJustification?: boolean;
  replies?: Comment[];
}

interface CommentPanelProps {
  entityType: string;
  entityName: string;
  fieldPath?: string;
  open: boolean;
  onClose: () => void;
}

const DEMO_COMMENTS: Comment[] = [
  {
    id: '1',
    author: 'James Sesay',
    authorInitials: 'JS',
    content: 'Should we revise the growth rate assumption? The market seems to be cooling.',
    timestamp: '2 hours ago',
    resolved: false,
    replies: [
      {
        id: '1a',
        author: 'Sarah Mitchell',
        authorInitials: 'SM',
        content: 'Agreed. I think 3% monthly is more realistic than 5% for Q3.',
        timestamp: '1 hour ago',
        resolved: false,
      },
    ],
  },
  {
    id: '2',
    author: 'System',
    authorInitials: 'AI',
    content: 'Revenue growth rate changed from 5.0% to 3.0%. Justification: "Market cooling, adjusting to conservative estimate based on Q2 pipeline."',
    timestamp: '45 min ago',
    resolved: false,
    isJustification: true,
  },
  {
    id: '3',
    author: 'Marcus Webb',
    authorInitials: 'MW',
    content: 'The COGS percentage looks high compared to industry benchmarks. Can we investigate?',
    timestamp: '3 days ago',
    resolved: true,
  },
];

export function CommentPanel({ entityType, entityName, fieldPath, open, onClose }: CommentPanelProps) {
  const [comments] = useState<Comment[]>(DEMO_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  if (!open) return null;

  const filtered = comments.filter((c) => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-sm">Comments</h3>
          <p className="text-xs text-muted-foreground">
            {entityType}: {entityName}
            {fieldPath && <span className="text-primary ml-1">{fieldPath}</span>}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-4 py-2 border-b">
        {(['all', 'open', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {f === 'all' ? `All (${comments.length})` : f === 'open' ? `Open (${comments.filter(c => !c.resolved).length})` : `Resolved (${comments.filter(c => c.resolved).length})`}
          </button>
        ))}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filtered.map((comment) => (
          <div key={comment.id} className={`space-y-2 ${comment.resolved ? 'opacity-60' : ''}`}>
            <div className={`rounded-lg p-3 ${comment.isJustification ? 'bg-blue-50 border border-blue-100' : 'bg-muted/50'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  comment.isJustification ? 'bg-blue-200 text-blue-700' : 'bg-primary/10 text-primary'
                }`}>
                  {comment.authorInitials}
                </div>
                <span className="text-xs font-medium">{comment.author}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{comment.timestamp}</span>
              </div>
              <p className="text-sm text-foreground">{comment.content}</p>
              {comment.isJustification && (
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 mt-1 font-medium">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Change justification
                </span>
              )}
              {!comment.resolved && !comment.isJustification && (
                <div className="flex gap-2 mt-2">
                  <button className="text-[10px] text-muted-foreground hover:text-foreground">Reply</button>
                  <button className="text-[10px] text-muted-foreground hover:text-foreground">Resolve</button>
                </div>
              )}
              {comment.resolved && (
                <span className="text-[10px] text-green-600 font-medium">Resolved</span>
              )}
            </div>

            {/* Replies */}
            {comment.replies?.map((reply) => (
              <div key={reply.id} className="ml-6 rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
                    {reply.authorInitials}
                  </div>
                  <span className="text-xs font-medium">{reply.author}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{reply.timestamp}</span>
                </div>
                <p className="text-sm text-foreground">{reply.content}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* New comment input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... Use @ to mention"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" disabled={!newComment.trim()}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
