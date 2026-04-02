'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type InviteState = 'loading' | 'ready' | 'accepting' | 'success' | 'error' | 'expired' | 'no-token';

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-gray-300 border-t-emerald-600" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [state, setState] = useState<InviteState>(token ? 'loading' : 'no-token');
  const [errorMsg, setErrorMsg] = useState('');
  const [orgId, setOrgId] = useState('');

  // On mount, check if user is authenticated by trying to accept
  useEffect(() => {
    if (!token) return;

    // Attempt to accept immediately — the API checks auth
    const accept = async () => {
      try {
        const res = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          setOrgId(data.orgId);
          setState('success');
          // Redirect to dashboard after brief success message
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }

        if (res.status === 401) {
          // Not logged in — show login prompt
          setState('ready');
          return;
        }

        if (res.status === 410) {
          setState('expired');
          return;
        }

        const data = await res.json();
        if (res.status === 409) {
          // Already a member — just redirect
          setState('success');
          setTimeout(() => router.push('/dashboard'), 1500);
          return;
        }

        setErrorMsg(data.error || 'Something went wrong');
        setState('error');
      } catch {
        setErrorMsg('Failed to process invitation. Please try again.');
        setState('error');
      }
    };

    accept();
  }, [token, router]);

  const handleLoginRedirect = () => {
    // Redirect to login with a return URL back to this invite page
    const returnUrl = `/invite?token=${token}`;
    router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const handleSignupRedirect = () => {
    const returnUrl = `/invite?token=${token}`;
    router.push(`/signup?redirect=${encodeURIComponent(returnUrl)}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-emerald-600">Grove</h1>
        </div>

        <div className="rounded-xl border bg-white p-8 shadow-sm space-y-6">
          {state === 'loading' && (
            <div className="text-center space-y-3">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
              <p className="text-sm text-gray-500">Processing your invitation...</p>
            </div>
          )}

          {state === 'ready' && (
            <>
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">You've been invited to join a team</h2>
                <p className="text-sm text-gray-500">
                  Sign in or create an account to accept this invitation and join your team on Grove.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleLoginRedirect}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  Sign in to accept
                </button>
                <button
                  onClick={handleSignupRedirect}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Create an account
                </button>
              </div>
            </>
          )}

          {state === 'accepting' && (
            <div className="text-center space-y-3">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
              <p className="text-sm text-gray-500">Joining the team...</p>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Welcome to the team!</h2>
              <p className="text-sm text-gray-500">Redirecting you to the dashboard...</p>
            </div>
          )}

          {state === 'expired' && (
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Invitation expired</h2>
              <p className="text-sm text-gray-500">
                This invitation has expired. Please ask the team admin to send a new one.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm text-emerald-600 hover:underline mt-2"
              >
                Go to login
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
              <p className="text-sm text-gray-500">{errorMsg}</p>
              <Link
                href="/login"
                className="inline-block text-sm text-emerald-600 hover:underline mt-2"
              >
                Go to login
              </Link>
            </div>
          )}

          {state === 'no-token' && (
            <div className="text-center space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Invalid invitation link</h2>
              <p className="text-sm text-gray-500">
                This invitation link appears to be incomplete. Please check the link in your email.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm text-emerald-600 hover:underline mt-2"
              >
                Go to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
