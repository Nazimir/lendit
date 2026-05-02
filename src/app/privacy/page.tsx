import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy · LendIt' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="May 2026">
      <p>
        This Privacy Policy explains what personal information LendIt collects,
        how we use it, who we share it with, and what rights you have over it.
      </p>

      <H>1. Who we are</H>
      <p>
        LendIt (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the LendIt
        platform. The data controller for your information is [LEGAL ENTITY
        NAME], registered at [ADDRESS].
      </p>

      <H>2. Information we collect</H>
      <p>When you use LendIt, we collect the following:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Account information:</strong> first name, suburb / town,
          email address, optional phone number, optional profile photo, and
          your password (stored as a hash, not in plaintext).
        </li>
        <li>
          <strong>Listings:</strong> item titles, descriptions, categories,
          photos, optional personality fields, and loan settings you provide.
        </li>
        <li>
          <strong>Activity:</strong> borrow requests, loan history, handover
          and return photos, extension requests, reviews, and karma points.
        </li>
        <li>
          <strong>Communications:</strong> messages you send to other users
          via in-app chat.
        </li>
        <li>
          <strong>Technical information:</strong> session cookies for
          authentication. We do not use third-party advertising trackers.
        </li>
      </ul>

      <H>3. How we use your information</H>
      <p>We use your information to:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Provide and operate the Service.</li>
        <li>Display your listings and profile to other users.</li>
        <li>Facilitate communication between users about loans.</li>
        <li>Enforce our Terms of Service and detect abuse.</li>
        <li>Send transactional notifications (request received, return due, etc.).</li>
        <li>Improve the Service in aggregate, anonymised form.</li>
      </ul>

      <H>4. Who sees what</H>
      <p>
        Other authenticated users of LendIt can see your first name, suburb,
        profile photo, item listings, reviews about you, and reputation
        score. Your full email address, phone number, and exact location are
        never displayed to other users.
      </p>

      <H>5. Sharing with third parties</H>
      <p>
        We use the following third-party services to operate LendIt:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Supabase</strong> (database, authentication, file storage):
          stores your account, listings, messages, and photos.
        </li>
        <li>
          <strong>Vercel</strong> (web hosting): serves the website and
          processes requests on our behalf.
        </li>
      </ul>
      <p>
        We do not sell your personal information. We do not share your data
        with advertisers. We may disclose information if compelled by valid
        legal process.
      </p>

      <H>6. Data retention</H>
      <p>
        We retain account data for as long as your account is active. When you
        delete your account, we anonymise your profile (your first name is
        replaced with &ldquo;Deleted user&rdquo;, your photo and contact
        details are removed) so that historical loan and review records remain
        intact for the people you transacted with. Messages between you and
        other users are deleted within 30 days of account deletion.
      </p>
      <p>
        Photos uploaded as part of completed loans (handover and return
        photos) are retained for up to 12 months after loan completion to
        support any post-hoc disputes, then deleted.
      </p>

      <H>7. Your rights</H>
      <p>
        Depending on your jurisdiction, you have rights including the right
        to access the personal data we hold about you, to correct it, to
        request its deletion, to receive an export, and to lodge a complaint
        with a data-protection authority.
      </p>
      <p>
        You can update most of your data directly in the app (Profile {'>'}
        Edit profile). To request an export or deletion beyond the in-app
        flow, contact [privacy@example.com].
      </p>

      <H>8. International transfers</H>
      <p>
        Our service providers may store data in regions outside your own. We
        rely on standard contractual clauses or equivalent safeguards where
        applicable.
      </p>

      <H>9. Cookies</H>
      <p>
        We use a single session cookie set by Supabase for authentication. We
        do not use marketing or analytics cookies.
      </p>

      <H>10. Children</H>
      <p>
        LendIt is not intended for users under 18. We do not knowingly
        collect personal information from minors. If you believe a minor has
        registered, contact us at [privacy@example.com] and we will close the
        account.
      </p>

      <H>11. Changes to this Policy</H>
      <p>
        Material changes will be communicated by email and surfaced in-app.
      </p>

      <H>12. Contact</H>
      <p>
        Questions about this Policy: [privacy@example.com].
      </p>

      <p className="mt-8 text-sm text-gray-500 italic">
        This is a placeholder Privacy Policy drafted for internal review. It
        has not been reviewed by qualified legal counsel and may not satisfy
        the specific requirements of your jurisdiction (in particular GDPR,
        UK GDPR, CCPA, or LGPD obligations). Replace with a counsel-reviewed
        policy before any public launch.
      </p>
    </LegalPage>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl mt-8 mb-2 text-accent-700">{children}</h2>;
}
