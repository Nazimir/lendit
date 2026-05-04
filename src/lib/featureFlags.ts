// =====================================================================
// Feature flags
// Flip these on/off to gate features without ripping out code.
// =====================================================================

/**
 * Require phone verification before users can borrow / lend / message.
 *
 * Currently OFF because the SMS provider (Twilio + Africa's Talking)
 * doesn't reliably deliver to Mauritius. When that's resolved, flip
 * this to true and the VerifyGate UI will reappear on gated pages.
 *
 * Note: the verified badge mechanic still works for users who DID
 * verify previously — they keep their green check.
 */
export const REQUIRE_PHONE_VERIFICATION = false;
