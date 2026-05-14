'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, QUIRK_QUESTIONS, type Quirks } from '@/lib/types';
import { ProgressBanner } from '@/components/Spinner';
import { Wordmark } from '@/components/Wordmark';
import { Mono, Italic, Rule } from '@/components/typography';
import { normalizeImage } from '@/lib/imageUpload';

export function NewListingForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [maxDays, setMaxDays] = useState('7');
  const [openEnded, setOpenEnded] = useState(false);
  const [extensions, setExtensions] = useState(false);
  const [chainHandoffs, setChainHandoffs] = useState(true);
  const [available, setAvailable] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [quirks, setQuirks] = useState<Quirks>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) { setError('Please add at least one photo.'); return; }
    setBusy(true); setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not signed in.'); setBusy(false); return; }

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      let f: File;
      const isHeic = /\.hei[cf]$/i.test(files[i].name) || /heic|heif/i.test(files[i].type);
      setProgress(
        files.length > 1
          ? `${isHeic ? 'Converting & uploading' : 'Uploading'} photo ${i + 1} of ${files.length}…`
          : `${isHeic ? 'Converting & uploading photo' : 'Uploading photo'}…`
      );
      try { f = await normalizeImage(files[i]); }
      catch (e: any) { setError('Could not read photo: ' + (e?.message || 'unknown error')); setBusy(false); setProgress(null); return; }
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from('item-photos').upload(path, f, { upsert: false });
      if (upErr) { setError('Photo upload failed: ' + upErr.message); setBusy(false); setProgress(null); return; }
      const { data: pub } = supabase.storage.from('item-photos').getPublicUrl(path);
      urls.push(pub.publicUrl);
    }

    setProgress('Publishing listing…');
    const cleanQuirks = Object.fromEntries(
      Object.entries(quirks).filter(([, v]) => v && v.trim().length > 0).map(([k, v]) => [k, v!.trim()])
    );
    const numMaxDays = openEnded ? null : Math.max(1, Math.min(365, parseInt(maxDays || '1', 10) || 1));
    const { data: item, error: insErr } = await supabase.from('items').insert({
      owner_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      photos: urls,
      max_loan_days: numMaxDays,
      extensions_allowed: extensions,
      chain_handoffs_allowed: chainHandoffs,
      is_available: available,
      visibility: isPrivate ? 'private' : 'public',
      quirks: cleanQuirks
    }).select('id').single();

    if (insErr) { setError(insErr.message); setBusy(false); setProgress(null); return; }
    router.replace(`/listings/${item!.id}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10 flex flex-col">
      <div className="w-full max-w-2xl mx-auto">
        {/* Masthead */}
        <div className="flex justify-between items-center mb-10">
          <Wordmark size={22} />
          <div className="flex items-center gap-3">
            <Link href="/listings" className="text-ink-soft hover:text-ink">
              <Mono>← Shelf</Mono>
            </Link>
            <Mono className="text-ink-soft">New entry</Mono>
          </div>
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-display font-extrabold text-[56px] leading-[0.88] tracking-[-0.045em] text-ink text-balance">
            Put it on <Italic>the</Italic> shelf.
          </h1>
          <p className="font-display font-medium text-[16px] leading-[1.4] text-ink-soft mt-4 text-pretty">
            One thing at a time. A photo, a name, a few notes — enough so a neighbour knows what they&apos;re asking for.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 space-y-8">
          {/* The basics */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <Mono className="text-ink-soft">№ 01 · The basics</Mono>
              <Rule className="flex-1 ml-3 mb-1.5" />
            </div>

            <div className="mb-6">
              <label className="label">Title</label>
              <input
                className="input"
                required
                maxLength={80}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Cordless drill, sourdough banneton…"
              />
            </div>
            <div className="mb-6">
              <label className="label">Description</label>
              <textarea
                className="input min-h-[100px]"
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brand, condition, anything to know…"
              />
            </div>
            <div className="mb-6">
              <label className="label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Photos</label>
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
          </section>

          {/* Lending rules */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <Mono className="text-ink-soft">№ 02 · Lending rules</Mono>
              <Rule className="flex-1 ml-3 mb-1.5" />
            </div>

            <div className="mb-6">
              <label className="label">Maximum loan period (days)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={365}
                required={!openEnded}
                disabled={openEnded}
                value={openEnded ? '' : maxDays}
                onChange={e => setMaxDays(e.target.value)}
                onBlur={e => { if (!e.target.value && !openEnded) setMaxDays('1'); }}
                placeholder={openEnded ? 'Open-ended — no fixed return date' : ''}
              />
            </div>

            <ToggleRow
              label="Open-ended (no fixed return date)"
              checked={openEnded}
              onChange={setOpenEnded}
            />
            <ToggleRow
              label="Allow extension requests"
              checked={extensions}
              onChange={setExtensions}
            />
            <ToggleRow
              label="Allow borrower-to-borrower handoffs"
              help="Lets a queued borrower take it directly from the current one (with your approval each time)."
              checked={chainHandoffs}
              onChange={setChainHandoffs}
            />
            <ToggleRow
              label="Available now"
              checked={available}
              onChange={setAvailable}
            />
            <ToggleRow
              label="Keep this listing private"
              help="Only you (and any current borrower) can see it. Won't show up in search or on your public profile."
              checked={isPrivate}
              onChange={setIsPrivate}
            />
          </section>

          {/* Quirks */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <Mono className="text-ink-soft">№ 03 · Give it <Italic>personality</Italic></Mono>
              <Rule className="flex-1 ml-3 mb-1.5" />
            </div>
            <p className="font-display font-medium text-[14px] leading-[1.45] text-ink-soft mb-6">
              All optional. Anything you put here shows up on the listing as little notes — the kind of thing you&apos;d say to a friend when handing the thing over.
            </p>

            {QUIRK_QUESTIONS.map(q => (
              <div key={q.key} className="mb-6">
                <label className="label">{q.label}</label>
                <input
                  className="input"
                  maxLength={120}
                  placeholder={q.placeholder}
                  value={quirks[q.key] || ''}
                  onChange={e => setQuirks(prev => ({ ...prev, [q.key]: e.target.value }))}
                />
                <Mono className="text-ink-soft mt-2 block">{q.helper}</Mono>
              </div>
            ))}
          </section>

          {error && <p className="font-italic italic text-sm text-cat-tools mt-3">{error}</p>}
          {progress && <ProgressBanner message={progress} />}

          <button className="btn-primary w-full mt-2 flex justify-between items-center" disabled={busy}>
            <span>{busy ? 'Publishing…' : <>Put it on the <Italic>shelf</Italic></>}</span>
            <span aria-hidden>→</span>
          </button>
        </form>
      </div>
    </main>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  onChange
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 py-4 cursor-pointer border-t border-ink/15 last:border-b">
      <span className="flex-1">
        <span className="block text-sm text-ink">{label}</span>
        {help && <span className="block text-[12px] text-ink-soft mt-1 leading-snug">{help}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-5 w-5 mt-0.5 shrink-0 accent-ink"
      />
    </label>
  );
}
