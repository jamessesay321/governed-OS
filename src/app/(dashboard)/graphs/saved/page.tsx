'use client'

import Link from 'next/link'
import { ArrowLeft, BarChart3, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SavedChartsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/graphs">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saved Charts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your saved and bookmarked chart configurations.
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/graphs/builder">
            <Plus className="size-4" />
            New Graph
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BarChart3 className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No saved charts yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create one in the Graph Builder. Your saved charts will appear here for quick access.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/graphs/builder">
              <Plus className="size-4" />
              Create your first chart
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
