import Image from 'next/image';

export function Avatar({ url, name, size = 36 }: { url: string | null | undefined; name: string; size?: number }) {
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
  return (
    <div
      className="rounded-full bg-accent-200 text-accent-800 flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
