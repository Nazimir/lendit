# Phase A — Legal posture: notes for legal counsel

This document accompanies the placeholder Terms of Service, Privacy Policy,
and account-deletion flow shipped in the Phase A release. Everything in this
file is flagged for review by qualified counsel before any public launch.

## What was built

1. **Public legal pages** at `/terms`, `/privacy`, `/about`. Each is marked
   "DRAFT — Pending legal review" at the top and contains placeholder
   language. They are accessible without signing in.
2. **18+ and ToS checkbox at signup.** A required checkbox confirms the user
   is at least 18 and agrees to the Terms and Privacy Policy. The form will
   not submit unless it is ticked. The acceptance timestamp is stored on the
   user's profile (`profiles.tos_accepted_at`, `profiles.is_adult_attested`).
3. **Account deletion flow** on the Profile tab. The user types "DELETE" to
   confirm. The action:
   - Refuses if any active loans exist (lender or borrower side).
   - Hard-deletes all chat messages where the user is sender or recipient.
   - Hard-deletes all items the user owns.
   - Anonymises the profile row (first name → "Deleted user", photo, phone,
     suburb cleared) so historical loans and reviews keep their integrity.
   - Sets `is_deleted = true` and `deleted_at = now()`.
   - Signs the user out.
4. **Footer links** to About / Terms / Privacy on every authenticated page.
5. **Header navigation** to the same pages from the legal-page header.

## What needs your input

Please review and rewrite the Terms of Service and Privacy Policy in full.
Specific items that depend on jurisdiction or business decisions and that I
have placeholdered:

### Terms of Service

- **Governing law and venue.** Section 14 currently reads
  `[JURISDICTION]`. This depends on where the operating entity is registered
  and where the bulk of users are expected to be.
- **Liability cap.** Section 9 limits liability to AUD/USD/EUR 100. The
  appropriate cap (or absence of cap) varies by jurisdiction. In some
  consumer-protection regimes (UK Consumer Rights Act, EU Unfair Contract
  Terms Directive) caps below a statutory minimum are unenforceable.
- **Arbitration / class-action waiver.** Not currently included. Common in
  US ToS, often unenforceable in EU/UK consumer contracts. Your call.
- **Indemnification scope.** Section 10 is a standard mutual indemnity. In
  some jurisdictions broad indemnities from consumers to companies are
  unenforceable.
- **Disclaimer of warranties.** Section 8 disclaims merchantability and
  fitness. Some consumer regimes prohibit blanket disclaimers; statutory
  rights may need to be expressly preserved (e.g. "These rights apply in
  addition to any rights you have under [local consumer law]").
- **Prohibited items list.** Section 5 is a starting point. You may want to
  add or remove items based on regional law (e.g. e-cigarettes, knives by
  blade length, certain camping fuels).
- **Dispute-resolution clause.** Section 12 says disputes are between users
  and that LendIt may provide records on request. Consider whether to commit
  to or disclaim a more active mediation role.

### Privacy Policy

- **Data controller identity** (Section 1). Replace `[LEGAL ENTITY NAME]` and
  `[ADDRESS]` with the registered controller details.
- **Lawful basis for processing.** Not currently expressed in GDPR terms.
  Counsel should confirm the legal basis (likely "performance of contract"
  for core service, "legitimate interests" for moderation, "consent" for
  optional channels).
- **Data Protection Officer / EU representative.** Required under GDPR if
  applicable. Not addressed.
- **International transfers.** Section 8 mentions standard contractual
  clauses. Supabase and Vercel both have Data Processing Addenda; counsel
  should confirm which mechanism actually applies and surface it.
- **Retention periods.** Section 6 commits to 30 days for messages after
  account deletion and 12 months for loan photos. Adjust if needed.
- **Cookie policy.** Section 9 says we use only a single auth cookie. If
  Supabase or Vercel adds analytics cookies in future, a fuller cookie
  banner becomes required (especially in EU).
- **Children's policy.** Section 10 says under-18s shouldn't use the
  service and we'll close accounts on report. COPPA (US) and similar regimes
  may require more than that.
- **Right to lodge a complaint.** Section 7 mentions this generically.
  Consider naming the supervising authority (ICO, CNIL, etc.) for the
  primary jurisdictions.
- **Privacy contact email.** Section 12 has `[privacy@example.com]`.

### Both documents

- **Plain-language summaries.** Some jurisdictions (CA, EU) increasingly
  expect a plain-language summary in addition to the full text. Worth a
  conversation.
- **Translations.** If we expect material non-English-speaking users, the
  documents may need to be available in the relevant language(s).
- **Effective date and version log.** Currently shows "Last updated May
  2026". For audit purposes you may want a versioned changelog.

## Items that are intentional product choices, not legal placeholders

These are how the product currently behaves and what the documents reflect.
If counsel disagrees, the product behaviour can be changed.

- **No security deposits, no insurance, no money handling.** Loans are
  free, and the platform takes no payment role.
- **At-your-own-risk lending.** The lender accepts that LendIt does not
  insure their item; the borrower accepts they are responsible for safe
  return.
- **First-name-only public display.** Other users never see full names, exact
  addresses, or phone numbers. Suburb shown to authenticated users only.
- **Reviews are mutual and visible on profiles.** Currently reviews show
  immediately on submission (we've flagged moving to double-blind in
  Phase D of the roadmap).
- **Account deletion is "soft" with anonymisation.** We retain the row for
  FK integrity but scrub identifying data. Messages are hard-deleted.
  Loan history (with name shown as "Deleted user") remains for the
  counter-party.

## Known limitations of the current account-deletion flow

These are technical realities counsel should be aware of:

- **The underlying Supabase auth user is not deleted.** Our server action
  signs the user out and anonymises the profile, but the row in
  `auth.users` persists until manually purged via a Supabase admin call.
  This means a user with their original email and password could in theory
  log back in, though they would have no profile data, no items, no chats.
  Hard deletion of the auth row requires the Supabase service-role API
  key, which we have not wired into Vercel environment variables yet — a
  small follow-up task once counsel confirms the deletion flow is
  acceptable.
- **Reviews left by the deleted user remain.** The reviewer name is shown
  as "Deleted user" but the review text and rating persist. This is a
  product choice — it preserves the integrity of other users' ratings —
  but counsel should confirm it is compatible with right-to-erasure
  obligations in the relevant jurisdiction. In some jurisdictions a hard
  delete of authored content may be required.
- **Loan photos are not deleted on account deletion.** They are tied to
  loans, not directly to the user, and we keep them for the configured
  retention period (currently 12 months) for the counter-party's records.
  Confirm this is acceptable.

## Recommended next legal-related Phase B items

Once counsel has reviewed Phase A, consider these for Phase B:

1. **Cookie consent banner** if any third-party trackers are added in
   future (currently not needed — we use only a session cookie).
2. **Data export self-service** — a button on the profile page that
   produces a JSON or zipped download of all the user's data.
3. **Phone OTP at signup** to harden identity verification (already on the
   roadmap, technical not legal).
4. **Hard-delete via service-role API** once the deletion policy is
   confirmed.
5. **Reports & moderation queue** with a documented response-time SLA.
6. **DSAR (Data Subject Access Request) handling email** for GDPR.

## Operational & policy notes added since Phase A shipped

These were noticed after the initial Phase A build and should be addressed.
None are urgent for internal testing but matter for any wider release.

### Password recovery email — language to add to Privacy Policy

The new password-recovery flow (`/forgot` and `/reset`) sends a one-time
link to the user's registered email address. Counsel should add a line to
the Privacy Policy describing this — something like:

> "If you request a password reset, we send a one-time link to your
> registered email address. The link expires in approximately one hour and
> can be used only once. We do not store the link contents on our servers."

It also belongs in the description of "what data we collect": email
address is now used not only for account login but also for security-
related messages.

### Transactional email provider (operational, not legal)

The current Supabase project sends auth emails (signup confirmation,
password recovery) via Supabase's built-in email service. This service is
**rate-limited to roughly 4 emails per hour per project** on the free tier
and is not guaranteed for production use. Before any wider launch we need
to configure a proper SMTP provider in Supabase (SendGrid, Resend,
Postmark, AWS SES, etc.) under **Authentication → SMTP Settings**.

This is operational infrastructure, but counsel should be aware of the
third-party provider added (the Privacy Policy "third-party processors"
list will need an addition) and any DPA the chosen provider offers.

---

Counsel review of `/terms` and `/privacy` content is the gating item before
any public launch in any jurisdiction. The placeholder language is meant
only to give you a starting structure; please rewrite as needed.
