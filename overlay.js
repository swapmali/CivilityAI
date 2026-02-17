/**
 * CivilityAI — Overlay / visual treatment module
 *
 * Applies blur effects and toxicity badges to classified comments
 * on YouTube and Instagram.
 */

import { TOXIC_THRESHOLD, MILD_THRESHOLD } from "./constants.js";

const BADGE_CLASS = "civility-badge";
const BLUR_CLASS = "civility-blur";
const PROCESSED_ATTR = "data-civility-processed";

/**
 * Apply the visual overlay to a comment element based on its toxicity score.
 * Works across YouTube (#content-text) and Instagram (span[dir="auto"]).
 * @param {HTMLElement} commentEl  The comment text element
 * @param {number} score           0-100 toxicity score (-1 means error)
 */
export function applyOverlay(commentEl, score) {
  if (!commentEl || score < 0) return;

  // Prevent duplicate overlays
  if (commentEl.getAttribute(PROCESSED_ATTR) === "true") return;
  commentEl.setAttribute(PROCESSED_ATTR, "true");

  // Determine severity
  const isToxic = score >= TOXIC_THRESHOLD;
  const isMild = score >= MILD_THRESHOLD && score < TOXIC_THRESHOLD;

  // Apply blur for toxic comments
  if (isToxic) {
    commentEl.classList.add(BLUR_CLASS);
  }

  // Create badge
  const badge = document.createElement("span");
  badge.classList.add(BADGE_CLASS);

  if (isToxic) {
    badge.textContent = `⚠️ Toxic (${score}%)`;
    badge.classList.add("civility-badge--toxic");
  } else if (isMild) {
    badge.textContent = `⚡ Mild (${score}%)`;
    badge.classList.add("civility-badge--mild");
  } else {
    badge.textContent = `✅ Safe (${score}%)`;
    badge.classList.add("civility-badge--safe");
  }

  // Insert badge after the comment text element
  commentEl.parentElement?.insertBefore(badge, commentEl.nextSibling);
}

/**
 * Check if a comment element has already been processed.
 * @param {HTMLElement} commentEl
 * @returns {boolean}
 */
export function isProcessed(commentEl) {
  return commentEl?.getAttribute(PROCESSED_ATTR) === "true";
}
