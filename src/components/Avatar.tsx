import Image from 'next/image';

// Deterministic pastel colour per name so different users feel distinct.
function paletteFor(name: string) {
  let hash = 0;
  const seed = name.trim() || '?';
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return {
    bg: `hsl(${hue}, 55%, 82%)`,
    fg: `hsl(${hue}, 38%, 28%)`
  };
}

export function Avatar({
  url, name, size = 36
}: { url: string | null | undefined; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover bg-cream-200"
        style={{ width: size, height: size }}
      />
    );
  }
  const { bg, fg } = paletteFor(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-medium select-none"
      style={{ width: size, height: size, fontSize: size * 0.42, background: bg, color: fg }}
      aria-label={`${name} avatar`}
    >
      {initial}
    </div>
  );
}
