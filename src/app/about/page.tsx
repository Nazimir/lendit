import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'About · LendIt' };

export default function AboutPage() {
  return (
    <LegalPage title="About LendIt" lastUpdated="May 2026">
      <p className="font-script text-2xl text-accent-600 not-italic">
        A community lending library, between people.
      </p>

      <p>
        LendIt is a free peer-to-peer platform for borrowing things you only
        need once in a while. List the drill collecting dust in your cupboard,
        the camping gear you use twice a year, the book you&rsquo;ve already
        read. Borrow from your neighbours instead of buying.
      </p>

      <H>How it works</H>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Sign up</strong> with your first name, suburb, and email.</li>
        <li><strong>List</strong> items you&rsquo;d be happy to lend out.</li>
        <li><strong>Browse</strong> what people near you are sharing.</li>
        <li><strong>Request</strong> something you need with a short message.</li>
        <li>
          <strong>Hand it over</strong> with a quick photo, and the loan
          starts. Return it the same way.
        </li>
        <li>
          <strong>Leave a review</strong> for each other once it&rsquo;s done.
        </li>
      </ul>

      <H>What it is, and isn&rsquo;t</H>
      <p>
        LendIt is free, non-commercial, and built around trust between
        neighbours. It is not a rental marketplace, a delivery service, or an
        insurance product. We don&rsquo;t hold your money or your stuff. We
        just make it easier to find each other.
      </p>

      <H>Safety basics</H>
      <ul className="list-disc pl-6 space-y-2">
        <li>Meet in a public place when you don&rsquo;t know the other person.</li>
        <li>Take photos at handover and return. The app prompts you for both.</li>
        <li>Trust your gut. You can decline any request, no explanation needed.</li>
        <li>Report anything that feels off using the report button.</li>
      </ul>

      <H>Get started</H>
      <p>
        <Link href="/signup" className="text-accent-700 font-medium underline">Create an account</Link>{' '}or{' '}
        <Link href="/login" className="text-accent-700 font-medium underline">sign in</Link>.
      </p>

      <p className="mt-8 text-sm text-gray-500">
        Questions: <a href="mailto:hello@example.com" className="underline">hello@example.com</a>
      </p>
    </LegalPage>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl mt-8 mb-2 text-accent-700">{children}</h2>;
}
