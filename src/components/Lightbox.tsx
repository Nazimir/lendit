'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tap-to-zoom image. Renders an <img> by default; clicking it opens a
 * full-screen overlay with the same source. ESC or clicking the backdrop
 * closes it. Pinch-zoom and panning use the browser's native gestures
 * because the overlay image scrolls inside its container at natural size.
 */
export function Lightbox({
  src,
  alt = '',
  className,
  style
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full h-full p-0 m-0 border-0 cursor-zoom-in"
        aria-label="Open image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} style={style} />
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center hover:bg-white/25"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
          <div
            className="max-h-full max-w-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-w-none select-none"
              style={{ maxHeight: 'min(90vh, 100%)', maxWidth: '90vw', objectFit: 'contain' }}
              draggable={false}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
