/**
 * CivilityAI — Background service worker
 *
 * Receives classification requests from the content script, checks cache,
 * deduplicates in-flight requests, calls the classifier, and returns scores.
 */

import { getToxicity, setToxicity } from "./cache.js";
import { classifyToxicity } from "./classifier.js";
import { generateHash, normalizeText } from "./utils.js";

/**
 * In-flight request map to prevent duplicate concurrent API calls.
 * Key: commentHash → Value: Promise<number>
 */
const pendingRequests = new Map();

/**
 * Handle incoming messages from the content script.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "CLASSIFY_COMMENT" || !message.text) {
    return false;
  }

  handleClassification(message.text)
    .then((score) => sendResponse({ score }))
    .catch((err) => {
      console.error("[CivilityAI] background error:", err);
      sendResponse({ score: -1 });
    });

  // Return true to indicate async sendResponse
  return true;
});

/**
 * Orchestrate cache lookup, deduplication, and classification.
 * @param {string} rawText
 * @returns {Promise<number>}
 */
async function handleClassification(rawText) {
  const normalized = normalizeText(rawText);
  const hash = generateHash(normalized);

  // 1. Cache hit
  const cached = await getToxicity(hash);
  if (cached !== null) {
    return cached;
  }

  // 2. Deduplicate in-flight requests
  if (pendingRequests.has(hash)) {
    return pendingRequests.get(hash);
  }

  // 3. Call classifier
  const classifyPromise = (async () => {
    try {
      const score = await classifyToxicity(normalized);
      if (score >= 0) {
        await setToxicity(hash, score);
      }
      return score;
    } finally {
      pendingRequests.delete(hash);
    }
  })();

  pendingRequests.set(hash, classifyPromise);
  return classifyPromise;
}
