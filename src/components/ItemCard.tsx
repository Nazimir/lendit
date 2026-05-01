import Link from 'next/link';
import Image from 'next/image';
import { paletteForCategory } from '@/lib/categoryStyle';
import type { ItemWithOwner } from '@/lib/types';

export function ItemCard({ item }: { item: ItemWithOwner }) {
  const cover = item.photos?.[0];
  const palette = paletteForCategory(item.category);
  return (
    <Link
      href={`/items/${item.id}`}
      className="rounded-3xl overflow-hidden border-2 hover:-translate-y-0.5 transition shadow-soft block"
      style={{ background: palette.bg, borderColor: palette.accent, color: palette.ink }}
    >
      <div className="relative aspect-[4/3] bg-cream-200">
        {cover ? (
          <Image src={cover} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm opacity-50">No photo</div>
        )}
        <div
          className="absolute top-2 left-2 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: palette.pill, color: palette.ink }}
        >
          {item.category}
        </div>
        {!item.is_available && (
          <div className="absolute top-2 right-2 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-soft text-accent-900">
            On loan
          </div>
        )}
      </div>
      <div className="px-3 pt-2.5 pb-3">
        <div className="font-display text-lg leading-tight line-clamp-1">{item.title}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider mt-1.5 opacity-70 line-clamp-1">
          {item.owner_first_name} · {item.owner_suburb}
        </div>
      </div>
    </Link>
  );
}
