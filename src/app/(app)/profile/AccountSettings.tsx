'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mono, Italic } from '@/components/typography';
import { PasswordInput } from '@/components/PasswordInput';
import type { Profile } from '@/lib/types';

type Row = 'email' | 'password' | 'signoutAll';

export function AccountSettings({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState<Row | null>(null);

  return (
    <section>
      <div className="flex items-baseline justify-between pb-2 mb-4 border-b-[1.5px] border-ink">
        <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-ink">
          Account <Italic>settings</Italic>
        </h2>
        <Mono className="text-ink-soft">Sign-in &amp; security</Mono>
      </div>

      <div className="flex flex-col">
        <AccordionRow
          label="Change email"
          hint={profile.email}
          isOpen={open === 'email'}
          onToggle={() => setOpen(open === 'email' ? null : 'email')}
        >
          <ChangeEmailForm
            currentEmail={profile.email}
            onDone={() => setOpen(null)}
          />
        </AccordionRow>

        <AccordionRow
          label="Change password"
          hint="Keep it long, keep it yours"
          isOpen={open === 'password'}
          onToggle={() => setOpen(open === 'password' ? null : 'password')}
        >
          <ChangePasswordForm
            email={profile.email}
            onDone={() => setOpen(null)}
          />
        </AccordionRow>

        <AccordionRow
          label="Sign out everywhere"
          hint="Ends every other session"
          isOpen={open === 'signoutAll'}
          onToggle={() => setOpen(open === 'signoutAll' ? null : 'signoutAll')}
          last
        >
          <SignOutEverywhere onDone={() => setOpen(null)} />
        </AccordionRow>
      </div>
    </section>
  );
}

/* ───────────────── Row ───────────────── */

function AccordionRow({
  label, hint, isOpen, onToggle, last, children
}: {
  label: string;
  hint?: string;
  isOpen: boolean;
  onToggle: () => void;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={'border-t border-ink/15 ' + (last ? 'border-b border-ink/15' : '')}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 group"
      >
        <div className="text-left min-w-0">
          <div className="font-display font-bold text-[17px] tracking-[-0.015em] text-ink">{label}</div>
          {hint && (
            <Mono className="text-ink-soft mt-0.5 block truncate max-w-[260px]">{hint}</Mono>
          )}
        </div>
        <span
          aria-hidden
          className={
            'shrink-0 ml-3 text-ink-soft group-hover:text-ink transition ' +
            (isOpen ? 'rotate-90' : '')
          }
        >
          →
        </span>
      </button>
      {isOpen && <div className="pb-5 pt-1">{children}</div>}
    </div>
  );
}

/* ───────────────── Change email ───────────────── */

function ChangeEmailForm({ currentEmail, onDone }: { currentEmail: string; onDone: () => void }) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null);
    const next = newEmail.trim().toLowerCase();
    if (!next || next === currentEmail.toLowerCase()) {
      setError('Enter a new email different from your current one.');
      return;
    }
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser(
      { email: next },
      { emailRedirectTo: `${window.location.origin}/profile` }
    );
    setBusy(false);
    if (error) { setError(error.message); return; }
    setInfo(`Confirmation link sent to ${next}. The change kicks in once you click it.`);
    setTimeout(() => { onDone(); router.refresh(); }, 2500);
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-4">
        <label className="label">New email</label>
        <input
          className="input"
          type="email"
          required
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Mono className="text-ink-soft block mb-4 leading-relaxed">
        We&apos;ll send a confirmation link. Your sign-in email only changes once you click it.
      </Mono>
      {error && <p className="font-italic italic text-sm text-cat-tools mb-3">{error}</p>}
      {info && <p className="font-italic italic text-sm text-ink mb-3">{info}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onDone} disabled={busy}>
          Cancel
        </button>
        <button className="btn-primary flex-1 flex justify-between items-center" disabled={busy}>
          <span>{busy ? 'Sending…' : <>Send <Italic>link</Italic></>}</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    </form>
  );
}

/* ───────────────── Change password ───────────────── */

function ChangePasswordForm({ email, onDone }: { email: string; onDone: () => void }) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null);

    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError('New password must be different from the current one.');
      return;
    }

    setBusy(true);
    const sb = createClient();

    // Re-auth with the current password so a hijacked session can't rotate the
    // password on its own. Supabase's updateUser doesn't enforce this natively.
    const { error: reauthErr } = await sb.auth.signInWithPassword({ email, password: current });
    if (reauthErr) {
      setBusy(false);
      setError('Current password is incorrect.');
      return;
    }

    const { error: upErr } = await sb.auth.updateUser({ password: next });
    setBusy(false);
    if (upErr) { setError(upErr.message); return; }

    setInfo('Password updated.');
    setTimeout(() => { onDone(); router.refresh(); }, 1500);
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-4">
        <label className="label">Current password</label>
        <PasswordInput
          autoComplete="current-password"
          required
          value={current}
          onChange={e => setCurrent(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="label">New password</label>
        <PasswordInput
          autoComplete="new-password"
          required
          minLength={8}
          value={next}
          onChange={e => setNext(e.target.value)}
        />
        <Mono className="text-ink-soft mt-2 block">8+ characters</Mono>
      </div>
      <div className="mb-4">
        <label className="label">Confirm new password</label>
        <PasswordInput
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
        />
      </div>
      {error && <p className="font-italic italic text-sm text-cat-tools mb-3">{error}</p>}
      {info && <p className="font-italic italic text-sm text-ink mb-3">{info}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onDone} disabled={busy}>
          Cancel
        </button>
        <button className="btn-primary flex-1 flex justify-between items-center" disabled={busy}>
          <span>{busy ? 'Saving…' : <>Update <Italic>password</Italic></>}</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    </form>
  );
}

/* ───────────────── Sign out everywhere ───────────────── */

function SignOutEverywhere({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    const sb = createClient();
    // global scope revokes refresh tokens across all sessions, including this
    // one — so the user lands on /login afterwards.
    const { error } = await sb.auth.signOut({ scope: 'global' });
    if (error) { setError(error.message); setBusy(false); return; }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm text-ink-soft leading-relaxed mb-4">
        Logs you out on this device <em className="not-italic font-medium text-ink">and</em> every other one. Use this if you&apos;ve been signed in somewhere you shouldn&apos;t be.
      </p>
      {error && <p className="font-italic italic text-sm text-cat-tools mb-3">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onDone} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="btn-danger flex-1 flex justify-between items-center"
        >
          <span>{busy ? 'Signing out…' : <>Sign out <Italic>everywhere</Italic></>}</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
