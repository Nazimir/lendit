import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Terms of Service · Partaz' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="May 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Partaz
        (the &ldquo;Service&rdquo;), a peer-to-peer platform that lets people
        list items they own, browse what others have listed, and arrange to
        borrow and return those items between themselves at no cost.
      </p>

      <H>1. Eligibility</H>
      <p>
        You must be at least 18 years old to use Partaz. By creating an account
        you confirm that you meet this requirement.
      </p>

      <H>2. The Service is free</H>
      <p>
        Partaz does not facilitate the sale, rental, or exchange of money for
        items. All loans arranged through the Service are intended to be
        non-commercial. We do not act as a buyer, seller, lender, or agent for
        any transaction. We provide the platform only.
      </p>

      <H>3. Your account</H>
      <p>
        You are responsible for keeping your sign-in credentials secure and for
        all activity that occurs under your account. Notify us immediately if
        you suspect unauthorised access.
      </p>

      <H>4. Listings, loans, and your responsibilities</H>
      <p>
        You may only list items that you legally own and have the right to
        lend. You are responsible for the accuracy of your listings, including
        photos, descriptions, condition, and any safety information.
      </p>
      <p>
        When you borrow an item, you are responsible for its safekeeping and
        for returning it in the condition you received it, ordinary use
        excepted. When you lend an item, you do so at your own risk: Partaz
        does not insure items, hold security deposits, or guarantee returns.
      </p>

      <H>5. Prohibited items and conduct</H>
      <p>You may not use Partaz to list, lend, request, or transfer:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Weapons, ammunition, or items designed primarily to cause harm.</li>
        <li>Drugs, prescription medication, or alcohol.</li>
        <li>Vehicles requiring licensing, registration, or insurance.</li>
        <li>Items recalled by a regulator or known to be unsafe.</li>
        <li>Stolen items or items you do not own.</li>
        <li>Pirated software, copyrighted media, or counterfeit goods.</li>
        <li>Adult content or items intended for adult use.</li>
        <li>Items that require professional certification to operate.</li>
        <li>Living things (animals, plants beyond casual gifts).</li>
        <li>Anything illegal in your jurisdiction.</li>
      </ul>
      <p>
        You also agree not to harass, threaten, defraud, or impersonate other
        users; not to circumvent platform safeguards; and not to use the
        Service for commercial activity, advertising, or solicitation
        unrelated to peer-to-peer lending.
      </p>

      <H>6. User content</H>
      <p>
        You retain ownership of the photos, descriptions, messages, and
        reviews you post. You grant Partaz a non-exclusive, worldwide,
        royalty-free licence to host and display this content for the purpose
        of operating the Service.
      </p>

      <H>7. Reviews</H>
      <p>
        Reviews must reflect your honest experience of an actual loan. Reviews
        used to retaliate, coerce, or manipulate other users&rsquo; standing
        may be removed and may result in account suspension.
      </p>

      <H>8. Disclaimer of warranties</H>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;. To the fullest extent permitted by law, we disclaim
        all warranties, express or implied, including any warranties of
        merchantability, fitness for a particular purpose, and
        non-infringement. We do not warrant that the Service will be
        uninterrupted, secure, or free of errors, nor that any item lent
        through the Service is safe, functional, or fit for the use you have
        in mind.
      </p>

      <H>9. Limitation of liability</H>
      <p>
        To the maximum extent permitted by law, Partaz and its operators are
        not liable for any indirect, incidental, special, consequential, or
        punitive damages, or for any loss of items, profits, data, or
        goodwill, arising from your use of the Service or any loan arranged
        through it. Where liability cannot be excluded, our total liability is
        limited to the greater of (a) the fees you have paid us in the
        previous twelve months (which is zero, as the Service is free), and
        (b) AUD $100 / USD $100 / EUR €100 (or local currency equivalent).
      </p>

      <H>10. Indemnification</H>
      <p>
        You agree to indemnify and hold Partaz harmless from any claim arising
        from your use of the Service, your breach of these Terms, or your
        violation of any rights of another user or third party.
      </p>

      <H>11. Suspension and termination</H>
      <p>
        We may suspend or terminate your account at our discretion if we
        believe you have violated these Terms or pose a risk to other users.
        You may delete your account at any time through your profile page,
        provided you have no active loans.
      </p>

      <H>12. Disputes between users</H>
      <p>
        Disputes arising between users about an item, a loan, or any related
        matter are between those users. Partaz may, but is not required to,
        provide records (handover photos, message timestamps) on request.
      </p>

      <H>13. Changes to these Terms</H>
      <p>
        We may update these Terms from time to time. Material changes will be
        notified by email and surfaced in-app. Continued use of the Service
        after the effective date of an update constitutes acceptance.
      </p>

      <H>14. Governing law</H>
      <p>
        These Terms are governed by the laws of [JURISDICTION], without regard
        to conflict-of-law rules. Disputes shall be resolved in the courts of
        [JURISDICTION].
      </p>

      <H>15. Contact</H>
      <p>
        For questions about these Terms, contact us at [legal@example.com].
      </p>

      <p className="mt-8 text-sm text-gray-500 italic">
        This is a placeholder Terms of Service drafted for internal review. It
        has not been reviewed by qualified legal counsel and should not be
        relied upon as a final binding agreement until counsel has reviewed
        and adapted it for the relevant jurisdiction(s).
      </p>
    </LegalPage>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl mt-8 mb-2 text-accent-700">{children}</h2>;
}
