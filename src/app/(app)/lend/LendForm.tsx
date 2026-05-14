'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, type Item } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBanner } from '@/components/Spinner';
import { normalizeImage } from '@/lib/imageUpload';
import { createLending } from './actions';

type Phase = 'form' | 'invite';

export function LendForm() {
  return (
    <Suspense fallback={null}>
      <LendInner />
    </Suspense>
  );
}

function LendInner() {
  const router = useRouter();
  const search = useSearchParams();
  const itemParam = search.get('item');

  const [phase, setPhase] = useState<Phase>('form');

  // Existing-item mode state
  const [loadingItem, setLoadingItem] = useState(!!itemParam);
  const [existingItem, setExistingItem] = useState<Item | null>(null);
  const [existingError, setExistingError] = useState<string | null>(null);

  // New-item mode state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [files, setFiles] = useState<File[]>([]);

  // Shared state
  const [days, setDays] = useState('7');
  const [openEnded, setOpenEnded] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientHint, setRecipientHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  useEffect(() => {
    if (!itemParam) return;
    (async () => {
      const sb = createClient();
      const { data, error } = await sb.from('items').select('*').eq('id', itemParam).single();
      if (error || !data) {
        setExistingError('Could not load that listing.');
        setLoadingItem(false);
        return;
      }
      const item = data as Item;
      setExistingItem(item);
      if (item.max_loan_days) setDays(String(item.max_loan_days));
      else setOpenEnded(true);
      setLoadingItem(false);
    })();
  }, [itemParam]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numDays = openEnded ? null : Math.max(1, Math.min(365, parseInt(days || '1', 10) || 1));

    if (existingItem) {
      // Existing item flow — no photo upload, no item creation
      setBusy(true);
      setProgress('Setting up the loan…');
      const result = await createLending({
        existing_item_id: existingItem.id,
        loan_period_days: numDays,
        recipient_email: recipientEmail,
        recipient_hint: recipientHint
      });
      setBusy(false); setProgress(null);
      if ('error' in result) { setError(result.error); return; }
      if (result.mode === 'direct') {
        router.replace(`/loans/${result.loan_id}`);
        router.refresh();
      } else {
        setInviteUrl(`${window.location.origin}${result.invite_url}`);
        setInviteToken(result.token);
        setPhase('invite');
      }
      return;
    }

    // New-item flow
    if (files.length === 0) { setError('Please add at least one photo.'); return; }
    if (!title.trim()) { setError('Give it a title.'); return; }
    setBusy(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not signed in.'); setBusy(false); return; }

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const isHeic = /\.hei[cf]$/i.test(files[i].name) || /heic|heif/i.test(files[i].type);
      setProgress(
        files.length > 1
          ? `${isHeic ? 'Converting & uploading' : 'Uploading'} photo ${i + 1} of ${files.length}…`
          : `${isHeic ? 'Converting & uploading photo' : 'Uploading photo'}…`
      );
      let f: File;
      try { f = await normalizeImage(files[i]); }
      catch (e: any) { setError('Could not read photo: ' + (e?.message || 'unknown')); setBusy(false); setProgress(null); return; }
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from('item-photos').upload(path, f, { upsert: false });
      if (upErr) { setError('Photo upload failed: ' + upErr.message); setBusy(false); setProgress(null); return; }
      const { data: pub } = supabase.storage.from('item-photos').getPublicUrl(path);
      urls.push(pub.publicUrl);
    }

    setProgress('Setting up the loan…');
    const result = await createLending({
      title: title.trim(),
      description: description.trim(),
      category,
      loan_period_days: numDays,
      photo_urls: urls,
      recipient_email: recipientEmail,
      recipient_hint: recipientHint
    });

    setBusy(false); setProgress(null);
    if ('error' in result) { setError(result.error); return; }
    if (result.mode === 'direct') {
      router.replace(`/loans/${result.loan_id}`);
      router.refresh();
    } else {
      setInviteUrl(`${window.location.origin}${result.invite_url}`);
      setInviteToken(result.token);
      setPhase('invite');
    }
  }

  if (phase === 'invite') {
    return <InviteShare url={inviteUrl} hint={recipientHint || recipientEmail} />;
  }

  if (loadingItem) {
    return (
      <main>
        <PageHeader title="Lend in person" back="/listings" />
        <p className="px-4 max-w-2xl mx-auto pt-8 text-sm text-gray-500">Loading listing…</p>
      </main>
    );
  }

  if (existingError) {
    return (
      <main>
        <PageHeader title="Lend in person" back="/listings" />
        <div className="px-4 max-w-2xl mx-auto pt-8">
          <p className="text-sm text-red-600">{existingError}</p>
          <Link href="/lend" className="btn-primary mt-4 inline-block">Lend a new item instead</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <PageHeader title="Lend in person" back={existingItem ? `/listings/${existingItem.id}` : '/listings'} />
      <form onSubmit={onSubmit} className="px-4 max-w-2xl mx-auto pb-8 space-y-4">
        {existingItem ? (
          <div className="card p-4 flex gap-3 items-center">
            <div className="w-16 h-16 rounded-2xl bg-cream-200 overflow-hidden shrink-0">
              {existingItem.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={existingItem.photos[0]} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl line-clamp-1">{existingItem.title}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-70 mt-0.5">
                Lending this from your listings
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-4 space-y-1">
            <h2 className="font-display text-2xl">For when they&apos;re right there with you</h2>
            <p className="text-sm text-gray-600">
              Snap the item, name it, pick the borrower. We&apos;ll set up the loan in one step — no request-and-accept.
            </p>
            <p className="text-xs text-gray-500 pt-1">
              Already listed it?{' '}
              <Link href="/listings" className="text-accent-600 font-medium">Pick from your listings</Link>.
            </p>
          </div>
        )}

        {!existingItem && (
          <>
            <div>
              <label className="label">Photo(s)</label>
              <input
                className="input"
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={e => setFiles(Array.from(e.target.files || []))}
              />
              {files.length > 0 && <p className="text-xs text-gray-500 mt-1">{files.length} photo{files.length > 1 ? 's' : ''} selected</p>}
            </div>

            <div>
              <label className="label">What is it?</label>
              <input className="input" required maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hardback paperback edition of TAZ" />
            </div>

            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input min-h-[64px]" maxLength={300} value={description} onChange={e => setDescription(e.target.value)} placeholder="Anything they should know" />
            </div>
          </>
        )}

        <div>
          <label className="label">Loan period (days)</label>
          <input
            className="input"
            type="number"
            min={1}
            max={365}
            required={!openEnded}
            disabled={openEnded}
            value={openEnded ? '' : days}
            onChange={e => setDays(e.target.value)}
            onBlur={e => { if (!e.target.value && !openEnded) setDays('1'); }}
            placeholder={openEnded ? 'Open-ended — return whenever' : ''}
          />
        </div>
        <label className="flex items-center justify-between card p-4">
          <span className="text-sm">Open-ended (no fixed return date)</span>
          <input type="checkbox" checked={openEnded} onChange={e => setOpenEnded(e.target.checked)} className="h-5 w-5 accent-accent-400" />
        </label>

        <div className="card p-4 space-y-3">
          <h3 className="font-display text-xl">Who&apos;s borrowing this?</h3>
          <div>
            <label className="label">Their first name</label>
            <input className="input" maxLength={40} value={recipientHint} onChange={e => setRecipientHint(e.target.value)} placeholder="e.g. Sam" />
          </div>
          <div>
            <label className="label">Their email</label>
            <input className="input" type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="sam@example.com" />
            <p className="text-[11px] text-gray-500 mt-1">
              If they already have a Partaz account on this email, the loan goes straight into their app. Otherwise we&apos;ll generate an invite link for you to share.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {progress && <ProgressBanner message={progress} />}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Working…' : 'Lend it'}</button>
      </form>
    </main>
  );
}

function InviteShare({ url, hint }: { url: string; hint: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'You can borrow this',
          text: `${hint || 'Hey'} — here's the Partaz invite for the item I'm lending you.`,
          url
        });
      } catch {}
    } else {
      copy();
    }
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&format=svg&margin=0&data=${encodeURIComponent(url)}`;

  return (
    <main>
      <PageHeader title="Send them this" back="/listings" />
      <div className="px-4 max-w-2xl mx-auto pb-8 space-y-4">
        <div className="card p-5 text-center">
          <p className="text-sm text-gray-600 mb-3">
            {hint ? `Show ${hint} this code, or send them the link.` : 'Show them this code, or send them the link.'}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR code" className="mx-auto w-64 h-64 rounded-2xl bg-white p-2 border border-cream-200" />
        </div>
        <div className="card p-4 space-y-3">
          <div className="font-mono text-xs break-all bg-cream-100 rounded-xl p-3">{url}</div>
          <div className="flex gap-2">
            <button onClick={copy} className="btn-secondary flex-1">
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button onClick={share} className="btn-primary flex-1">Share…</button>
          </div>
          <p className="text-[11px] text-gray-500">
            They&apos;ll land on a page that asks them to sign up (just first name + email + password). Once done, the loan appears in their app immediately. Link expires in 7 days.
          </p>
        </div>
      </div>
    </main>
  );
}
