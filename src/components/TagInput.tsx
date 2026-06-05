'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Show autocomplete suggestions pulled from the current user's existing tags. */
  autocomplete?: boolean;
  placeholder?: string;
};

/**
 * Chip-style tag input. The user types a tag, hits Enter or comma to
 * commit it, and the chip appears above the input. Backspace on an empty
 * input deletes the last chip. Each chip has its own × to remove.
 *
 * If `autocomplete` is true, the component asks Supabase for existing
 * tags across the current user's items and suggests near-matches as
 * the user types — keeps people from accidentally creating "lens" and
 * "lenses" as two distinct tags.
 */
export function TagInput({ value, onChange, autocomplete = true, placeholder = 'Add a tag…' }: Props) {
  const [draft, setDraft] = useState('');
  const [allUserTags, setAllUserTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fetch the user's existing tags once on mount — small, fast, fine for now.
  useEffect(() => {
    if (!autocomplete) return;
    (async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('items').select('tags').eq('owner_id', user.id);
      const all = new Set<string>();
      (data ?? []).forEach((row: { tags: string[] | null }) => {
        (row.tags ?? []).forEach(t => all.add(t));
      });
      setAllUserTags(Array.from(all).sort());
    })();
  }, [autocomplete]);

  const normalised = (s: string) => s.trim().toLowerCase();
  const normalisedValue = value.map(normalised);

  const draftMatches = autocomplete && draft.trim().length > 0
    ? allUserTags
        .filter(t => t.includes(normalised(draft)) && !normalisedValue.includes(t))
        .slice(0, 6)
    : [];

  function commit(raw: string) {
    const tag = normalised(raw);
    if (!tag) return;
    if (normalisedValue.includes(tag)) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  }

  function remove(tag: string) {
    onChange(value.filter(t => t !== tag));
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(tag => (
            <Chip key={tag} label={tag} onRemove={() => remove(tag)} />
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="input"
          value={draft}
          onChange={e => { setDraft(e.target.value); setShowSuggestions(true); }}
          onKeyDown={onKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={placeholder}
        />

        {showSuggestions && draftMatches.length > 0 && (
          <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-paper border border-ink/30 shadow-lg max-h-48 overflow-auto">
            {draftMatches.map(t => (
              <li key={t}>
                <button
                  type="button"
                  onMouseDown={() => commit(t)}
                  className="w-full text-left px-3 py-2 hover:bg-paper-soft font-display text-[14px] text-ink"
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-cat-kitchen border border-ink/15 px-2 py-1 text-[12px] font-display text-ink">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-ink-soft hover:text-cat-tools leading-none px-0.5"
      >
        ×
      </button>
    </span>
  );
}

/**
 * Filter version — chip strip that highlights the currently-selected tag.
 * Used at the top of /listings (Mine) and /loans (Sharing) so the user
 * can narrow what they see. Passing null to onSelect means "show all".
 */
export function TagFilterStrip({
  tags, selected, onSelect
}: {
  tags: string[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <FilterChip label="All" active={selected === null} onClick={() => onSelect(null)} />
      {tags.map(t => (
        <FilterChip
          key={t}
          label={t}
          active={selected === t}
          onClick={() => onSelect(selected === t ? null : t)}
        />
      ))}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3 py-1 text-[12px] font-display border transition-colors ' +
        (active
          ? 'bg-ink text-paper border-ink'
          : 'bg-paper text-ink border-ink/25 hover:border-ink')
      }
    >
      {label}
    </button>
  );
}
