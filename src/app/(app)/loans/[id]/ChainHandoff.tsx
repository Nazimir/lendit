'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/Avatar';
import { ProgressBanner } from '@/components/Spinner';
import { normalizeImage } from '@/lib/imageUpload';
import { passToNextBorrower } from './handoffActions';
import type { BorrowRequest, Profile } from '@/lib/types';

export function ChainHandoff({
  loanId, loanItemId, chainRequest, nextBorrower, isCurrentBorrower
}: {
  loanId: string;
  loanItemId: string;
  chainRequest: BorrowRequest | null;
  nextBorrower: Profile | null;
  isCurrentBorrower: boolean;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!chainRequest || !nextBorrower) return null;

  // Both borrower and lender see the queue card; only the borrower can act on it.
  async function handPassed() {
    if (files.length === 0) { setError('Add at least one handover photo.'); return; }
    setBusy(true); setError(null);

    try {
      // Upload photos to item-photos bucket (we know that one works)
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setError('Not signed in.'); setBusy(false); return; }

      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const isHeic = /\.hei[cf]$/i.test(files[i].name) || /heic|heif/i.test(files[i].type);
        setProgress(
          files.length > 1
            ? `${isHeic ? 'Converting & uploading' : 'Uploading'} photo ${i + 1} of ${files.length}…`
            : `${isHeic ? 'Converting & uploading photo' : 'Uploading photo'}…`
        );
        const f = await normalizeImage(files[i]);
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/handoff-${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await sb.storage.from('item-photos').upload(path, f, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = sb.storage.from('item-photos').getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      setProgress('Passing the item on…');
      const result = await passToNextBorrower({
        loanId,
        chainRequestId: chainRequest!.id,
        photoUrls: urls
      });
      if ('error' in result) { setError(result.error); return; }
      router.replace(`/loans/${result.new_loan_id}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <section className="mt-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Next in line</h3>
      <div className="card p-4 space-y-3 border-2 border-butter-soft">
        <div className="flex items-center gap-3">
          <Link href={`/u/${nextBorrower.id}`} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80">
            <Avatar url={nextBorrower.photo_url} name={nextBorrower.first_name} size={40} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{nextBorrower.first_name}</div>
              <div className="text-xs text-gray-500">{nextBorrower.suburb} · approved by the owner</div>
            </div>
          </Link>
          <Link href={`/messages/${nextBorrower.id}`} className="btn-secondary text-sm py-2 px-3">Message</Link>
        </div>

        {chainRequest.message && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-cream-100 rounded-xl p-3">
            &ldquo;{chainRequest.message}&rdquo;
          </p>
        )}

        {isCurrentBorrower ? (
          <>
            <div>
              <p className="text-sm text-gray-700 mb-2">
                When you&apos;re ready, hand the item to {nextBorrower.first_name} and snap a photo. This
                completes your loan and starts theirs in one step.
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={e => {
                  setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                  e.target.value = '';
                }}
                className="hidden"
                id="handoff-photo"
              />
              {files.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-cream-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center"
                        aria-label="Remove"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label htmlFor="handoff-photo" className={'btn-secondary flex-1 cursor-pointer text-center' + (busy ? ' opacity-50 pointer-events-none' : '')}>
                  {files.length === 0 ? 'Choose photo(s)' : 'Add more'}
                </label>
                <button
                  type="button"
                  disabled={busy || files.length === 0}
                  onClick={handPassed}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {busy ? 'Working…' : `Pass to ${nextBorrower.first_name}`}
                </button>
              </div>
              {progress && <ProgressBanner message={progress} />}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            The current borrower will pass this item directly to {nextBorrower.first_name} when they&apos;re done.
          </p>
        )}
      </div>
    </section>
  );
}
