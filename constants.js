/**
 * CivilityAI — Application constants
 */

/** Cache duration in milliseconds (30 days) */
export const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000;

/** Toxicity score threshold — comments scoring above this are auto-blurred */
export const TOXIC_THRESHOLD = 70;

/** Mild toxicity lower bound — scores 41-70 are considered mildly toxic */
export const MILD_THRESHOLD = 41;

/** Minimum comment character length to classify (filters UI text, timestamps) */
export const MIN_COMMENT_LENGTH = 3;

/** OpenAI chat completions endpoint */
export const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/** OpenAI model identifier */
export const MODEL_NAME = "gpt-4o-mini";
