/**
 * CivilityAI — DOM selectors for supported platforms
 */

/* ── YouTube ──────────────────────────────────────────────────────── */

/** Primary selector for YouTube comment text elements */
export const YT_COMMENT_TEXT_SELECTOR = "#content-text";

/** Selector for individual comment thread containers */
export const YT_COMMENT_THREAD_SELECTOR = "ytd-comment-thread-renderer";

/** Selector for the comments section container */
export const YT_COMMENTS_SECTION_SELECTOR = "ytd-comments#comments";

/* ── Instagram ────────────────────────────────────────────────────── */

/**
 * Instagram comment text candidates.
 * Comments live inside <li> items within <ul> lists.
 * The actual comment text is in <span dir="auto"> elements.
 * Because Instagram uses hashed CSS class names, we rely on
 * structural and attribute-based selectors for stability.
 */
export const IG_COMMENT_TEXT_SELECTOR = 'ul li span[dir="auto"]';

/**
 * Fallback: captures comment text in post modal dialogs.
 * Used in addition to the primary selector when a modal is present.
 */
export const IG_MODAL_COMMENT_SELECTOR = 'div[role="dialog"] ul li span[dir="auto"]';
