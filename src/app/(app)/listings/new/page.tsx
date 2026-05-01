'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, QUIRK_QUESTIONS, type Quirks } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBanner } from '@/components/Spinner';
import { normalizeImage } from '@/lib/imageUpload';

export default function NewListingPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [maxDays, setMaxDays] = useState(7);
  const [extensions, setExtensions] = useState(false);
  const [available, setAvailable] = useState(true);
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

    // Upload photos (auto-converting HEIC to JPEG for browser compatibility)
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
    // Drop empty quirks so the JSON stays clean
    const cleanQuirks = Object.fromEntries(
      Object.entries(quirks).filter(([, v]) => v && v.trim().length > 0).map(([k, v]) => [k, v!.trim()])
    );
    const { data: item, error: insErr } = await supabase.from('items').insert({
      owner_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      photos: urls,
      max_loan_days: maxDays,
      extensions_allowed: extensions,
      is_available: available,
      quirks: cleanQuirks
    }).select('id').single();

    if (insErr) { setError(insErr.message); setBusy(false); setProgress(null); return; }
    router.replace(`/listings/${item!.id}`);
    router.refresh();
  }

  return (
    <main>
      <PageHeader title="New listing" back="/listings" />
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
          <input className="input" type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files || []))} />
          {files.length > 0 && <p className="text-xs text-gray-500 mt-1">{files.length} photo{files.length > 1 ? 's' : ''} selected</p>}
        </div>
        <div>
          <label className="label">Maximum loan period (days)</label>
          <input className="input" type="number" min={1} max={365} required value={maxDays} onChange={e => setMaxDays(parseInt(e.target.value || '1', 10))} />
        </div>
        <label className="flex items-center justify-between card p-4">
          <span className="text-sm">Allow extension requests</span>
          <input type="checkbox" checked={extensions} onChange={e => setExtensions(e.target.checked)} className="h-5 w-5 accent-accent-400" />
        </label>
        <label className="flex items-center justify-between card p-4">
          <span className="text-sm">Available now</span>
          <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} className="h-5 w-5 accent-accent-400" />
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
    </main>
  );
}
