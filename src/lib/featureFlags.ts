// =====================================================================
// Feature flags
// Flip these on/off to gate features without ripping out code.
// =====================================================================

/**
 * Require phone verification before users can borrow / lend / message.
 *
 * Re-enabled 24 May 2026: Twilio Verify is live and SMS-to-MU
 * delivery confirmed via smoke test. The VerifyGate UI is now
 * active on /lend, /listings/new, /items/[id], etc.
 *
 * If we ever need to bypass again (e.g., SMS outage, budget burnout,
 * carrier issue), flip this back to false — no other code needs to
 * change. The verified-badge mechanic respects the gate either way.
 */
export const REQUIRE_PHONE_VERIFICATION = true;
