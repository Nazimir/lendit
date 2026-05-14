import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Mono, Italic } from '@/components/typography';
import { MonoBadge } from '@/components/MonoBadge';
import { paletteForCategory } from '@/lib/categoryStyle';
import { grainStyle } from '@/lib/grain';
import { territoryForItem } from '@/lib/personalTerritory';
import type { Item, BorrowRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MyListingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: items } = await supabase
    .from('items').select('*').eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const itemList = (items || []) as Item[];

  // Pending request counts per item
  let pendingByItem: Record<string, number> = {};
  if (itemList.length > 0) {
    const ids = itemList.map(i => i.id);
    const { data: reqs } = await supabase
      .from('borrow_requests')
      .select('id,item_id,status')
      .in('item_id', ids).eq('status', 'pending');
    pendingByItem = (reqs as BorrowRequest[] || []).reduce((acc, r) => {
      acc[r.item_id] = (acc[r.item_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  const outCount = itemList.filter(i => !i.is_available).length;
  const restingCount = itemList.filter(i => i.is_available).length;
  const overdueCount = 0; // TODO: compute from loans with due_at < now

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short'
  }).toUpperCase().replace(',', ' ·');

  const total = itemList.length;
  const countWord = numberWord(total);

  return (
    <main className="max-w-2xl mx-auto pb-8">
      {/* Editorial header */}
      <header className="px-5 pt-12 pb-5 bg-paper border-b-[1.5px] border-ink">
        <div className="flex justify-between items-center">
          <Mono className="text-ink-soft">Your · Shelf</Mono>
          <Mono className="text-ink-soft">{today}</Mono>
        </div>
        <h1 className="mt-3 font-display font-extrabold text-[60px] leading-[0.85] tracking-[-0.045em] text-ink">
          {total === 0 ? <>An <Italic>empty</Italic> shelf.</> : <>{countWord} <Italic>{total === 1 ? 'thing' : 'things'}</Italic>.</>}
        </h1>
        {total > 0 && (
          <p className="font-display font-medium text-[15px] leading-[1.35] text-ink-soft mt-2.5">
            {outCount} out, {restingCount} resting at home
            {overdueCount > 0 && <>. <Italic>{overdueCount} overdue</Italic></>}.
          </p>
        )}
      </header>

      <section className="px-5 pt-5">
        {total === 0 ? (
          <div className="py-10 text-center">
            <p className="font-italic italic text-[18px] text-ink-soft">
              Nothing here yet. Add something a neighbour might want to borrow.
            </p>
            <Link href="/listings/new" className="btn-primary inline-flex justify-between items-center gap-3 mt-6">
              <span>List your first <Italic>thing</Italic></span>
              <span aria-hidden>+</span>
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col">
            {itemList.map(item => (
              <ShelfRow key={item.id} item={item} pending={pendingByItem[item.id] || 0} />
            ))}
          </ul>
        )}
      </section>

      {total > 0 && (
        <section className="px-5 mt-7">
          <Link
            href="/listings/new"
            className="btn-primary w-full flex justify-between items-center"
          >
            <span>List a new <Italic>thing</Italic></span>
            <span aria-hidden>+</span>
          </Link>
          <Mono className="text-ink-soft mt-3 text-center block">· Takes 30 seconds ·</Mono>
          <Link
            href="/lend"
            className="btn-secondary w-full mt-3 flex justify-between items-center"
          >
            <span>Lend something <Italic>in person</Italic></span>
            <span aria-hidden>↗</span>
          </Link>
        </section>
      )}
    </main>
  );
}

function ShelfRow({ item, pending }: { item: Item; pending: number }) {
  const palette = paletteForCategory(item.category);
  // Strip colour comes from the item's own hash so consecutive same-category
  // items on YOUR own shelf still look distinct. The category palette stays
  // visible on the photo background + the mono label.
  const stripPalette = paletteForCategory(territoryForItem(item.id));
  const shortNo = numberFromId(item.id);
  return (
    <li className="grid grid-cols-[12px_52px_64px_1fr_auto] gap-3 items-center py-3.5 border-b border-ink/15">
      <div className="w-3 h-14 self-center" style={{ background: stripPalette.bg }} aria-hidden />
      <div className="font-display font-extrabold text-[24px] leading-[0.85] tracking-[-0.04em] text-ink-soft text-right pr-0.5">
        {shortNo}
      </div>
      <Link
        href={`/listings/${item.id}`}
        className="w-16 aspect-square overflow-hidden relative rounded-2xl"
        style={{ background: palette.bg, ...grainStyle }}
      >
        {item.photos?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </Link>
      <Link href={`/listings/${item.id}`} className="min-w-0">
        <Mono className="text-ink-soft block">{item.category}</Mono>
        <div className="font-display font-bold text-[18px] leading-[1.05] tracking-[-0.02em] text-ink mt-0.5 line-clamp-1">
          {item.title}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
          {item.is_available
            ? <MonoBadge variant="outline" prefix={null}>Available</MonoBadge>
            : <MonoBadge variant="ink" prefix={null}>On loan</MonoBadge>}
          {item.visibility === 'private' && (
            <MonoBadge variant="paper-soft" prefix={null}>Private</MonoBadge>
          )}
          {pending > 0 && (
            <MonoBadge variant="kitchen" prefix={null}>{pending} pending</MonoBadge>
          )}
        </div>
      </Link>
      <Link href={`/listings/${item.id}`} className="font-display font-bold text-[22px] text-ink-soft pl-2">
        ↗
      </Link>
    </li>
  );
}

function numberFromId(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 6);
  const n = parseInt(hex, 16) % 999;
  return n.toString().padStart(3, '0');
}

// Spell out small numbers for editorial headline ("Twelve things", "Three").
function numberWord(n: number): string {
  const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
  if (n <= 12 && n >= 0) return words[n];
  return String(n);
}
