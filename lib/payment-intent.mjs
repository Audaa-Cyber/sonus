const ADVISORY_LANGUAGE = /\b(?:should i|should we|is it safe|what if|how do i|can i|could i|do you think|do you want me to|would you like me to|am i supposed to|are you suggesting i|is it okay to|is it a good idea to|i don't think|i do not think|not sure if|not sure whether|wonder if|wonder whether|wondering whether)\b/i;
const NEGATIVE_PAYMENT_LANGUAGE = /\b(?:do not|don't|never|won't|will not|not going to|should not|shouldn't|don't want to|do not want to)\s+(?!forget\b)(?:\w+\s+){0,3}(?:send|pay|transfer)\b/i;
const PAYMENT_REMINDER_LANGUAGE = /\b(?:do not|don't|never)\s+forget to (?:send|pay|transfer)\b/i;
const PAYMENT_VERB = /\b(send|pay|transfer)\b/i;

/**
 * Advisory, hypothetical, or negative language is not authorization to draft.
 * A direct request such as "Send 25 USDC to Alex" remains actionable.
 */
export function isNonActionablePaymentText(text) {
  return typeof text === "string" && PAYMENT_VERB.test(text) &&
    (ADVISORY_LANGUAGE.test(text) || NEGATIVE_PAYMENT_LANGUAGE.test(text) || PAYMENT_REMINDER_LANGUAGE.test(text));
}
