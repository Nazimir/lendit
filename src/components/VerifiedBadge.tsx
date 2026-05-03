export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <span title="Phone verified" className="inline-flex items-center" aria-label="Phone verified">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#577559">
        <path d="M12 2l2.4 2.4 3.4-.4.6 3.4 3 1.6-1.6 3 1.6 3-3 1.6-.6 3.4-3.4-.4L12 22l-2.4-2.4-3.4.4-.6-3.4-3-1.6 1.6-3-1.6-3 3-1.6.6-3.4 3.4.4L12 2z" />
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
