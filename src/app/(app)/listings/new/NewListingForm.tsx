'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, QUIRK_QUESTIONS, type Quirks } from '@/lib/types';
import { ProgressBanner } from '@/components/Spinner';
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
    <form onSubmit={onSubmit} className="px-4 max-w-2xl mx-auto pb-8 space-y-4">
      <div>
        <label className="label">Title</label>
        <input className="input" required maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Cordless drill" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-[100px]" required value={description} onChange={e => setDescription(e.target.value)} placeholder="Brand, condition, anything to know…" />
      </div>
      <div>
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
        {files.length > 0 && <p className="text-xs text-gray-500 mt-1">{files.length} photo{files.length > 1 ? 's' : ''} selected</p>}
      </div>
      <div>
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
      <label className="flex items-center justify-between card p-4">
        <span className="text-sm">Open-ended (no fixed return date)</span>
        <input type="checkbox" checked={openEnded} onChange={e => setOpenEnded(e.target.checked)} className="h-5 w-5 accent-accent-400" />
      </label>
      <label className="flex items-center justify-between card p-4">
        <span className="text-sm">Allow extension requests</span>
        <input type="checkbox" checked={extensions} onChange={e => setExtensions(e.target.checked)} className="h-5 w-5 accent-accent-400" />
      </label>
      <label className="flex items-start justify-between card p-4 gap-3">
        <span className="text-sm">
          Allow borrower-to-borrower handoffs
          <span className="block text-[11px] text-gray-500 mt-0.5">
            Lets a queued borrower take it directly from the current one (with your approval each time).
          </span>
        </span>
        <input type="checkbox" checked={chainHandoffs} onChange={e => setChainHandoffs(e.target.checked)} className="h-5 w-5 accent-accent-400 mt-0.5 shrink-0" />
      </label>
      <label className="flex items-center justify-between card p-4">
        <span className="text-sm">Available now</span>
        <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} className="h-5 w-5 accent-accent-400" />
      </label>
      <label className="flex items-start justify-between card p-4 gap-3">
        <span className="text-sm">
          Keep this listing private
          <span className="block text-[11px] text-gray-500 mt-0.5">
            Only you (and any current borrower) can see it. Won&apos;t show up in search or on your public profile.
          </span>
        </span>
        <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="h-5 w-5 accent-accent-400 mt-0.5 shrink-0" />
      </label>

      <div className="card p-4 space-y-4">
        <div>
          <h3 className="font-display text-xl">Give it some personality</h3>
          <p className="text-xs text-gray-500 mt-1">
            All optional. Anything you put here shows up on the listing as little notes.
          </p>
        </div>
        {QUIRK_QUESTIONS.map(q => (
          <div key={q.key}>
            <label className="label">{q.label}</label>
            <input
              className="input"
              maxLength={120}
              placeholder={q.placeholder}
              value={quirks[q.key] || ''}
              onChange={e => setQuirks(prev => ({ ...prev, [q.key]: e.target.value }))}
            />
            <p className="text-[11px] text-gray-500 mt-1">{q.helper}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {progress && <ProgressBanner message={progress} />}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Publishing…' : 'Publish listing'}</button>
    </form>
  );
}
