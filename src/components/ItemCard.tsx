import Link from 'next/link';
import Image from 'next/image';
import type { ItemWithOwner } from '@/lib/types';

export function ItemCard({ item }: { item: ItemWithOwner }) {
  const cover = item.photos?.[0];
  return (
    <Link href={`/items/${item.id}`} className="card overflow-hidden block hover:shadow-md transition">
      <div className="relative aspect-[4/3] bg-cream-200">
        {cover ? (
          <Image src={cover} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-accent-300 text-sm">No photo</div>
        )}
        {!item.is_available && (
          <div className="absolute top-2 right-2"><span className="pill-rose">On loan</span></div>
        )}
      </div>
      <div className="p-3">
        <div className="font-medium line-clamp-1">{item.title}</div>
        <div className="text-xs text-gray-500 mt-1">
          {item.owner_first_name} · {item.owner_suburb}
        </div>
      </div>
    </Link>
  );
}
