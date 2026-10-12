const HYPOTHETICAL_LANGUAGE = /\b(?:should i|would you|is it safe|what if|how do i|can i|could i|do you think|is it okay to)\b/i;
const PAYMENT_VERB = /\b(send|pay|transfer)\b/i;

/**
 * Questions about whether/how to pay are advisory, not authorization to draft.
 * An explicit imperative such as "Send 25 USDC to Alex" remains actionable.
 */
export function isHypotheticalPaymentQuestion(text) {
  return typeof text === "string" && PAYMENT_VERB.test(text) && HYPOTHETICAL_LANGUAGE.test(text);
}
