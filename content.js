/**
 * CivilityAI — Content script (multi-platform)
 *
 * Detects comments on YouTube and Instagram, requests toxicity
 * classification from the background service worker, and applies
 * visual overlays (blur + badge) to toxic comments.
 *
 * NOTE: Content scripts in Manifest V3 cannot use ES module imports.
 * Constants and helpers are inlined to keep the script self-contained.
 */

(function () {
  "use strict";

  /* ================================================================
   * Constants (mirrored from constants.js)
   * ================================================================ */
  const TOXIC_THRESHOLD = 70;
  const MILD_THRESHOLD = 41;
  const MIN_COMMENT_LENGTH = 3;

  /* ================================================================
   * Overlay helpers (mirrored from overlay.js)
   * ================================================================ */
  const BADGE_CLASS = "civility-badge";
  const BLUR_CLASS = "civility-blur";
  const PROCESSED_ATTR = "data-civility-processed";

  function isProcessed(el) {
    return el?.getAttribute(PROCESSED_ATTR) === "true";
  }

  function applyOverlay(commentEl, score) {
    if (!commentEl || score < 0) return;
    if (isProcessed(commentEl)) return;
    commentEl.setAttribute(PROCESSED_ATTR, "true");

    const isToxic = score >= TOXIC_THRESHOLD;
    const isMild = score >= MILD_THRESHOLD && score < TOXIC_THRESHOLD;

    if (isToxic) {
      commentEl.classList.add(BLUR_CLASS);
    }

    const badge = document.createElement("span");
    badge.classList.add(BADGE_CLASS);

    if (isToxic) {
      badge.textContent = `\u26A0\uFE0F Toxic (${score}%)`;
      badge.classList.add("civility-badge--toxic");
    } else if (isMild) {
      badge.textContent = `\u26A1 Mild (${score}%)`;
      badge.classList.add("civility-badge--mild");
    } else {
      badge.textContent = `\u2705 Safe (${score}%)`;
      badge.classList.add("civility-badge--safe");
    }

    commentEl.parentElement?.insertBefore(badge, commentEl.nextSibling);
  }

  /* ================================================================
   * Utilities (mirrored from utils.js)
   * ================================================================ */
  function normalizeText(text) {
    return text.trim().replace(/\s+/g, " ").toLowerCase();
  }

  /* ================================================================
   * Platform detection & configuration
   * ================================================================ */
  function detectPlatform() {
    const host = location.hostname;
    if (host.includes("youtube.com")) return "youtube";
    if (host.includes("instagram.com")) return "instagram";
    return "unknown";
  }

  const PLATFORM = detectPlatform();

  /**
   * Platform-specific configuration.
   *
   * Each platform defines:
   *  - commentSelector : CSS selector to find candidate comment elements
   *  - isValidComment  : heuristic filter to exclude false-positive matches
   */
  const PLATFORM_CONFIG = {
    youtube: {
      commentSelector: "#content-text",
      isValidComment: function () {
        return true;
      },
    },

    instagram: {
      commentSelector: 'ul li span[dir="auto"]',

      /**
       * Instagram's DOM uses hashed CSS class names, so we rely on
       * structural and semantic heuristics to pick real comment text:
       *
       *  1. Must not be inside an <a> (those are usernames / hashtags)
       *  2. Must not be inside a <button> (like, reply actions)
       *  3. Must not be inside a <time> element
       *  4. Must contain meaningful text (>= MIN_COMMENT_LENGTH chars)
       *  5. Must be inside an <li> within a <ul> (comment list structure)
       *  6. Exclude elements that are only emoji (single char after trim)
       */
      isValidComment: function (el) {
        if (el.closest("a")) return false;
        if (el.closest("button")) return false;
        if (el.closest("time")) return false;

        const li = el.closest("li");
        if (!li) return false;

        const text = el.innerText?.trim();
        if (!text || text.length < MIN_COMMENT_LENGTH) return false;

        // Skip if the span has child <a> tags only (hashtag-only comments
        // are fine, but a span that IS a link wrapper is not a comment)
        if (el.children.length > 0 && el.children.length === el.querySelectorAll("a").length) {
          return false;
        }

        return true;
      },
    },
  };

  const config = PLATFORM_CONFIG[PLATFORM];

  if (!config) {
    console.log("[CivilityAI] Unsupported platform:", PLATFORM);
    return;
  }

  console.log(`[CivilityAI] Platform detected: ${PLATFORM}`);

  /* ================================================================
   * Enable/disable state (synced with popup via chrome.storage)
   * ================================================================ */
  const STORAGE_KEY_ENABLED = "civility_enabled";
  let isEnabled = true;

  function removeAllOverlays() {
    document.querySelectorAll(".civility-badge").forEach(function (el) { el.remove(); });
    document.querySelectorAll(".civility-blur").forEach(function (el) { el.classList.remove("civility-blur"); });
    document.querySelectorAll("[" + PROCESSED_ATTR + "]").forEach(function (el) { el.removeAttribute(PROCESSED_ATTR); });
  }

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local" || !changes[STORAGE_KEY_ENABLED]) return;
    const newValue = changes[STORAGE_KEY_ENABLED].newValue;
    isEnabled = newValue !== false;
    if (!isEnabled) {
      removeAllOverlays();
    } else {
      scanForComments(document.body);
    }
  });

  /* ================================================================
   * Processing queue & dedup
   * ================================================================ */
  const processingSet = new Set();

  function processComment(commentEl) {
    if (!isEnabled) return;
    if (isProcessed(commentEl)) return;

    const rawText = commentEl.innerText;
    if (!rawText || rawText.trim().length < MIN_COMMENT_LENGTH) return;

    if (!config.isValidComment(commentEl)) return;

    const normalized = normalizeText(rawText);
    if (processingSet.has(commentEl)) return;
    processingSet.add(commentEl);

    chrome.runtime.sendMessage(
      { type: "CLASSIFY_COMMENT", text: normalized },
      (response) => {
        processingSet.delete(commentEl);

        if (chrome.runtime.lastError) {
          console.warn(
            "[CivilityAI] Message error:",
            chrome.runtime.lastError.message
          );
          return;
        }

        const score = response?.score;
        if (typeof score === "number") {
          applyOverlay(commentEl, score);
        }
      }
    );
  }

  /* ================================================================
   * IntersectionObserver — only process visible comments
   * ================================================================ */
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          processComment(entry.target);
          intersectionObserver.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "200px" }
  );

  /**
   * Scan a subtree for new comment elements and queue them for
   * visibility-gated processing.
   */
  function scanForComments(root) {
    if (!root || !root.querySelectorAll) return;
    const comments = root.querySelectorAll(config.commentSelector);
    for (const el of comments) {
      if (!isProcessed(el)) {
        intersectionObserver.observe(el);
      }
    }
  }

  /* ================================================================
   * MutationObserver — detect dynamically loaded comments
   * ================================================================ */
  let mutationTimer = null;

  const mutationObserver = new MutationObserver((mutations) => {
    // Debounce rapid-fire mutations (Instagram can fire hundreds)
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          scanForComments(node);
        }
      }
    }, 150);
  });

  /* ================================================================
   * SPA navigation handler (YouTube & Instagram both use SPA routing)
   * ================================================================ */
  let lastUrl = location.href;

  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Re-scan the whole page on navigation
      scanForComments(document.body);
    }
  });

  /* ================================================================
   * Bootstrap
   * ================================================================ */
  function startObserving() {
    if (!isEnabled) return;
    scanForComments(document.body);
  }

  function init() {
    chrome.storage.local.get(STORAGE_KEY_ENABLED, function (result) {
      isEnabled = result[STORAGE_KEY_ENABLED] !== false;

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      urlObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      startObserving();
      console.log("[CivilityAI] Content script initialized on " + PLATFORM + " (" + (isEnabled ? "enabled" : "disabled") + ").");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
