'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, type Item } from '@/lib/types';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic, Rule } from '@/components/typography';
import { ProgressBanner } from '@/components/Spinner';
import { normalizeImage } from '@/lib/imageUpload';
import { paletteForCategory } from '@/lib/categoryStyle';
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
        setPhase('invite');
      }
      return;
    }

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
      setPhase('invite');
    }
  }

  if (phase === 'invite') {
    return <InviteShare url={inviteUrl} hint={recipientHint || recipientEmail} />;
  }

  if (loadingItem) {
    return (
      <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
        <div className="w-full max-w-2xl mx-auto">
          <Masthead />
          <Mono className="text-ink-soft mt-12 block">Loading listing…</Mono>
        </div>
      </main>
    );
  }

  if (existingError) {
    return (
      <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
        <div className="w-full max-w-2xl mx-auto">
          <Masthead />
          <div className="mt-12 border-y-[1.5px] border-ink py-6">
            <h1 className="font-display font-extrabold text-[40px] leading-[0.9] tracking-[-0.035em] text-ink">
              Couldn&apos;t <Italic>find</Italic> that one.
            </h1>
            <p className="text-sm text-ink-soft mt-3">{existingError}</p>
            <Link href="/lend" className="btn-primary inline-flex mt-6 justify-between items-center">
              <span>Lend something <Italic>new</Italic></span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-2xl mx-auto">
        <Masthead backHref={existingItem ? `/listings/${existingItem.id}` : '/listings'} />

        {/* Headline */}
        <div>
          <h1 className="font-display font-extrabold text-[56px] leading-[0.88] tracking-[-0.045em] text-ink text-balance">
            Hand it <Italic>over</Italic>.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            {existingItem
              ? 'Same shelf entry, one specific neighbour. We’ll skip the request-and-accept.'
              : 'For when they’re right there with you. Snap it, name it, pick the borrower — one step, done.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 space-y-8">
          {existingItem ? (
            <ExistingItemStrip item={existingItem} />
          ) : (
            <section>
              <div className="flex items-end justify-between mb-3">
                <Mono className="text-ink-soft">№ 01 · The thing</Mono>
                <Rule className="flex-1 ml-3 mb-1.5" />
              </div>

              <div className="mb-6">
                <label className="label">Photo(s)</label>
                <input
                  className="input"
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={e => setFiles(Array.from(e.target.files || []))}
                />
                {files.length > 0 && (
                  <Mono className="text-ink-soft mt-2 block">
                    {files.length} photo{files.length > 1 ? 's' : ''} selected
                  </Mono>
                )}
              </div>

              <div className="mb-6">
                <label className="label">What is it?</label>
                <input
                  className="input"
                  required
                  maxLength={80}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Hardback paperback edition of TAZ"
                />
              </div>

              <div className="mb-6">
                <label className="label">Category</label>
                <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input min-h-[64px]"
                  maxLength={300}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Anything they should know"
                />
              </div>

              <div className="mt-4">
                <Mono className="text-ink-soft">
                  Already listed it?{' '}
                  <Link href="/listings" className="text-ink underline">Pick from your shelf</Link>
                </Mono>
              </div>
            </section>
          )}

          {/* Loan period */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <Mono className="text-ink-soft">№ {existingItem ? '01' : '02'} · How long</Mono>
              <Rule className="flex-1 ml-3 mb-1.5" />
            </div>

            <div className="mb-2">
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

            <label className="flex items-center justify-between gap-3 py-4 cursor-pointer border-t border-ink/15">
              <span className="text-sm text-ink">Open-ended (no fixed return date)</span>
              <input
                type="checkbox"
                checked={openEnded}
                onChange={e => setOpenEnded(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-ink"
              />
            </label>
          </section>

          {/* Recipient */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <Mono className="text-ink-soft">№ {existingItem ? '02' : '03'} · Who&apos;s <Italic>borrowing</Italic></Mono>
              <Rule className="flex-1 ml-3 mb-1.5" />
            </div>

            <div className="mb-6">
              <label className="label">Their first name</label>
              <input
                className="input"
                maxLength={40}
                value={recipientHint}
                onChange={e => setRecipientHint(e.target.value)}
                placeholder="e.g. Sam"
              />
            </div>
            <div>
              <label className="label">Their email</label>
              <input
                className="input"
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="sam@example.com"
              />
              <Mono className="text-ink-soft mt-2 block leading-relaxed">
                If they already have a Partaz account on this email, the loan goes straight into their app. Otherwise we&apos;ll generate an invite link for you to share.
              </Mono>
            </div>
          </section>

          {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
          {progress && <ProgressBanner message={progress} />}

          <button className="btn-primary w-full mt-2 flex justify-between items-center" disabled={busy}>
            <span>{busy ? 'Working…' : <>Lend <Italic>it</Italic></>}</span>
            <span aria-hidden>→</span>
          </button>
        </form>
      </div>
    </main>
  );
}

function Masthead({ backHref = '/listings' }: { backHref?: string }) {
  return (
    <div className="flex justify-between items-center mb-10">
      <Wordmark size={22} />
      <div className="flex items-center gap-3">
        <Link href={backHref} className="text-ink-soft hover:text-ink">
          <Mono>← Back</Mono>
        </Link>
        <Mono className="text-ink-soft">Hand-off</Mono>
      </div>
    </div>
  );
}

function ExistingItemStrip({ item }: { item: Item }) {
  const palette = paletteForCategory(item.category);
  return (
    <section>
      <div className="flex items-end justify-between mb-3">
        <Mono className="text-ink-soft">From your shelf</Mono>
        <Rule className="flex-1 ml-3 mb-1.5" />
      </div>
      <div
        className="rounded-2xl p-3 flex items-center gap-3"
        style={{ background: palette.bg, color: palette.ink }}
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-paper-soft shrink-0">
          {item.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Mono style={{ color: palette.ink, opacity: 0.75 }} className="block mb-0.5">
            Lending this entry
          </Mono>
          <div className="font-display font-bold text-[20px] tracking-[-0.02em] line-clamp-1" style={{ color: palette.ink }}>
            {item.title}
          </div>
        </div>
      </div>
    </section>
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
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <div className="flex items-center gap-3">
            <Link href="/listings" className="text-ink-soft hover:text-ink">
              <Mono>← Shelf</Mono>
            </Link>
            <Mono className="text-ink-soft">Invite</Mono>
          </div>
        </div>

        <div>
          <h1 className="font-display font-extrabold text-[56px] leading-[0.88] tracking-[-0.045em] text-ink text-balance">
            Send them <Italic>this</Italic>.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            {hint ? `Show ${hint} the code, or send the link.` : 'Show them the code, or send the link.'}{' '}
            They sign up with first name + email + password and the loan lands in their app.
          </p>
        </div>

        <div className="mt-10 border-y-[1.5px] border-ink py-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR code" className="w-64 h-64 rounded-2xl bg-paper-soft p-2" />
        </div>

        <div className="mt-6">
          <Mono className="text-ink-soft mb-2 block">The link</Mono>
          <div className="font-mono text-xs break-all border border-ink/15 rounded-xl p-3 text-ink">
            {url}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={copy} className="btn-secondary flex-1">
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button onClick={share} className="btn-primary flex-1 flex justify-between items-center">
              <span>Share</span>
              <span aria-hidden>→</span>
            </button>
          </div>
          <Mono className="text-ink-soft mt-3 block leading-relaxed">
            Link expires in 7 days.
          </Mono>
        </div>
      </div>
    </main>
  );
}
