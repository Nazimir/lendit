import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { Italic } from '@/components/typography';

export const metadata = { title: 'About · Partaz' };

export default function AboutPage() {
  return (
    <LegalPage title="About {Partaz}" lastUpdated="May 2026">
      <p className="font-italic italic text-[26px] leading-[1.25] text-ink">
        A community lending library, between people.
      </p>

      <p>
        Partaz is a free peer-to-peer platform for borrowing things you only
        need once in a while. List the drill collecting dust in your cupboard,
        the camping gear you use twice a year, the book you&rsquo;ve already
        read. Borrow from your neighbours instead of buying.
      </p>

      <H>How it works</H>
      <ul>
        <li><strong>Sign up</strong> with your first name, suburb, and email.</li>
        <li><strong>List</strong> items you&rsquo;d be happy to lend out.</li>
        <li><strong>Browse</strong> what people near you are sharing.</li>
        <li><strong>Request</strong> something you need with a short message.</li>
        <li><strong>Hand it over</strong> with a quick photo, and the loan starts. Return it the same way.</li>
        <li><strong>Leave a review</strong> for each other once it&rsquo;s done.</li>
      </ul>

      <H>What it is, and isn&rsquo;t</H>
      <p>
        Partaz is free, non-commercial, and built around trust between
        neighbours. It is not a rental marketplace, a delivery service, or an
        insurance product. We don&rsquo;t hold your money or your stuff. We
        just make it easier to find each other.
      </p>

      <H>Safety basics</H>
      <ul>
        <li>Meet in a public place when you don&rsquo;t know the other person.</li>
        <li>Take photos at handover and return. The app prompts you for both.</li>
        <li>Trust your gut. You can decline any request, no explanation needed.</li>
        <li>Report anything that feels off using the report button.</li>
      </ul>

      <H>Get <Italic>started</Italic></H>
      <p>
        <Link href="/signup">Create an account</Link> or{' '}
        <Link href="/login">sign in</Link>.
      </p>

      <p className="mt-10 text-sm text-ink-soft">
        Questions: <a href="mailto:hello@example.com">hello@example.com</a>
      </p>
    </LegalPage>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2>{children}</h2>;
}
