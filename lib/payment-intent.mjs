const NON_ACTIONABLE_LANGUAGE = /\b(?:should i|is it safe|what if|how do i|can i|could i|do you think|is it okay to|do not|don't|never|won't|will not|not going to|should not|shouldn't|don't want to|do not want to)\b/i;
const PAYMENT_VERB = /\b(send|pay|transfer)\b/i;

/**
 * Advisory, hypothetical, or negative language is not authorization to draft.
 * A direct request such as "Send 25 USDC to Alex" remains actionable.
 */
export function isNonActionablePaymentText(text) {
  return typeof text === "string" && PAYMENT_VERB.test(text) && NON_ACTIONABLE_LANGUAGE.test(text);
}
