export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  // value is a 0-5 number
  const rounded = Math.round(value * 2) / 2; // half-star rounding
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = rounded >= i ? '#F6D77A' : rounded >= i - 0.5 ? 'url(#half)' : 'none';
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="#F6D77A" strokeWidth={1.5}>
            <defs>
              <linearGradient id="half">
                <stop offset="50%" stopColor="#F6D77A" />
                <stop offset="50%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </span>
  );
}
