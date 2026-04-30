'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    router.push(`/home${params.toString() ? '?' + params.toString() : ''}`);
  }

  return (
    <form onSubmit={submit} className="relative">
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        className="input pl-11"
        placeholder="Search items…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
    </form>
  );
}
