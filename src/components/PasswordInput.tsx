'use client';

import { useState, InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Editorial password input with a Show/Hide toggle on the right.
 *
 * Drop-in replacement for `<input type="password" className="input" ... />`.
 * The toggle button sits inside the input's bottom-border underline, sized
 * with `pr-16` so the typed value never collides with the toggle label.
 *
 * The toggle is `tabIndex={-1}` so keyboard users tab straight through to
 * the next form field instead of catching on the Show/Hide affordance.
 */
export function PasswordInput({ className = 'input', ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...rest}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-16`}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-0 inset-y-0 px-3 font-mono text-[10px] uppercase tracking-mono text-ink-soft hover:text-ink transition flex items-center"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
