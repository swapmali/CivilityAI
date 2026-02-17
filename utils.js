/**
 * CivilityAI — Utility functions
 */

/**
 * Generate a simple hash string from comment text for cache keying.
 * Uses a fast non-cryptographic hash (djb2 variant).
 * @param {string} text
 * @returns {string} hex hash string
 */
export function generateHash(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16);
}

/**
 * Debounce a function — delays invocation until `delay` ms of inactivity.
 * @param {Function} fn
 * @param {number} [delay=300]
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Normalize comment text for consistent hashing and classification.
 * Trims whitespace, collapses internal whitespace, and lowercases.
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
