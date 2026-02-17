/**
 * CivilityAI — Chrome storage cache layer
 *
 * Stores toxicity scores keyed by comment hash with a 30-day TTL.
 */

import { CACHE_DURATION } from "./constants.js";

/**
 * Retrieve a cached toxicity score.
 * Returns the numeric score if found and not expired, otherwise null.
 * @param {string} commentHash
 * @returns {Promise<number|null>}
 */
export async function getToxicity(commentHash) {
  return new Promise((resolve) => {
    const key = `civility_${commentHash}`;
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        console.warn("[CivilityAI] cache read error:", chrome.runtime.lastError.message);
        return resolve(null);
      }

      const entry = result[key];
      if (!entry) return resolve(null);

      const age = Date.now() - entry.timestamp;
      if (age > CACHE_DURATION) {
        chrome.storage.local.remove(key);
        return resolve(null);
      }

      resolve(entry.score);
    });
  });
}

/**
 * Store a toxicity score in the cache.
 * @param {string} commentHash
 * @param {number} score  0-100
 * @returns {Promise<void>}
 */
export async function setToxicity(commentHash, score) {
  return new Promise((resolve) => {
    const key = `civility_${commentHash}`;
    chrome.storage.local.set(
      {
        [key]: {
          score,
          timestamp: Date.now(),
        },
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn("[CivilityAI] cache write error:", chrome.runtime.lastError.message);
        }
        resolve();
      }
    );
  });
}
