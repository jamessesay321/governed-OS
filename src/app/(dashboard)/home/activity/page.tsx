'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowLeft, Activity, Bell } from 'lucide-react'

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-8">
      {/* Back Link */}
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Activity Feed
        </h1>
        <p className="mt-1 text-gray-500">
          A log of actions, updates, and events across your workspace.
        </p>
      </div>

      {/* Empty State */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className={cn('mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100')}>
            <Activity className="h-7 w-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700">
            No activity yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Once you start using Grove, your recent actions, system
            events, and notifications will appear here.
          </p>
          <Link
            href="/home/getting-started"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Bell className="h-4 w-4" />
            Complete Setup to Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}
