import Link from 'next/link';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { notFound } from 'next/navigation';
import { getModuleBySlug } from '@/lib/modules/registry';
import { ModuleRenderer } from './module-renderer';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ModulePage({ params }: PageProps) {
  const { slug } = await params;
  const { orgId } = await getUserProfile();

  const mod = getModuleBySlug(slug);
  if (!mod) return notFound();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/modules"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{mod.name}</h1>
          <p className="text-muted-foreground">{mod.description}</p>
        </div>
      </div>

      <ModuleRenderer slug={slug} orgId={orgId} />
    </div>
  );
}
