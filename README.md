# CivilityAI

**Bring civility back to the internet.**

CivilityAI is a Chrome Extension that detects toxic comments on **YouTube** and **Instagram** using OpenAI's `gpt-4o-mini` model and automatically blurs them, overlaying a toxicity score badge so you can browse comments with peace of mind.

---

## Features

- **Multi-platform support** — works on both YouTube and Instagram out of the box.
- **AI-powered toxicity detection** — classifies every comment on a 0-100 scale using GPT-4o-mini.
- **Automatic blurring** — toxic comments (score 71-100) are blurred instantly; hover to reveal.
- **Toxicity badges** — color-coded badges (Safe / Mild / Toxic) show the score at a glance.
- **Smart caching** — scores are cached locally for 30 days to minimize API calls.
- **Request deduplication** — duplicate in-flight API calls are collapsed into one.
- **Visibility-gated processing** — only comments scrolled into view are classified (IntersectionObserver).
- **Dynamic comment detection** — new comments loaded via infinite scroll are picked up automatically (MutationObserver).
- **SPA-aware** — handles YouTube and Instagram single-page navigation seamlessly.
- **Secure by design** — your OpenAI API key is stored in a local file that is git-ignored.

---

## Supported Platforms

| Platform | Comment Types Detected |
|-----------|----------------------|
| **YouTube** | All video comments and replies |
| **Instagram** | Post comments, reel comments, modal/dialog comments |

---

## Toxicity Thresholds

| Score Range | Label | Behavior |
|-------------|-------|----------|
| 0 - 40 | Safe | No blur, green badge |
| 41 - 70 | Mild | No auto-blur, amber badge |
| 71 - 100 | Toxic | Auto-blurred, red badge |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/swapmali/CivilityAI.git
cd CivilityAI
```

### 2. Add your OpenAI API key

Create (or edit) the file **`config.local.js`** in the project root:

```js
export const OPENAI_API_KEY = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
```

> **Security note:** `config.local.js` is listed in `.gitignore` and must **never** be committed to version control.

### 3. Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `CivilityAI` project folder.
5. The extension icon should appear in your toolbar.

### 4. Browse YouTube or Instagram

Navigate to any YouTube video or Instagram post with comments. CivilityAI will automatically detect the platform, classify visible comments, and apply overlays.

---

## Architecture

```
content.js          MutationObserver + IntersectionObserver
    │               detects & queues visible comments
    │               (platform-aware: YouTube / Instagram)
    │
    ▼ chrome.runtime.sendMessage
background.js       Service worker — cache lookup, dedup, orchestration
    │
    ├──► cache.js         chrome.storage.local (30-day TTL)
    │
    └──► classifier.js    OpenAI API call (gpt-4o-mini)
              │
              └── config.local.js   API key (git-ignored)
```

### Platform Detection

The content script automatically detects the current platform by inspecting `location.hostname`:

- **YouTube** (`youtube.com`) — uses the `#content-text` selector, which precisely targets comment text elements in YouTube's custom elements.
- **Instagram** (`instagram.com`) — uses structural selectors (`ul li span[dir="auto"]`) combined with heuristic filtering (excluding usernames, buttons, timestamps, and short UI text) since Instagram employs hashed CSS class names that change between deployments.

Both platforms share the same classification pipeline (background worker, cache, classifier) and visual treatment (blur + badge).

### File Reference

| File | Responsibility |
|------|---------------|
| `manifest.json` | Extension metadata, permissions, entry points |
| `content.js` | Platform detection, DOM observation, comment extraction, overlay application |
| `background.js` | Message handler, cache-first logic, request deduplication |
| `classifier.js` | OpenAI API integration, prompt construction, response parsing |
| `cache.js` | Read/write toxicity scores to `chrome.storage.local` |
| `overlay.js` | Blur and badge DOM manipulation (shared module) |
| `selectors.js` | YouTube and Instagram DOM selector constants |
| `constants.js` | App-wide configuration constants |
| `utils.js` | Hash generation, debounce, text normalization |
| `styles.css` | Blur transition and badge styling (platform-aware) |
| `config.local.js` | **Local-only** — your OpenAI API key |

---

## Security

- The OpenAI API key is stored **only** in `config.local.js`, which is excluded from version control via `.gitignore`.
- No API key appears in any committed source file.
- The extension requests only the minimal permissions needed (`storage`, YouTube host, Instagram host, OpenAI host).
- All API communication uses HTTPS.

---

## Instagram: How Comment Detection Works

Instagram uses React with CSS modules, meaning class names are auto-generated hashes that change between builds. CivilityAI avoids relying on class names entirely.

Instead, the extension uses **structural selectors** (`ul li span[dir="auto"]`) to find candidate comment elements, then applies **heuristic filtering** to exclude false positives:

1. Elements inside `<a>` tags are skipped (usernames, hashtag links).
2. Elements inside `<button>` tags are skipped (Like, Reply actions).
3. Elements inside `<time>` tags are skipped (timestamps).
4. Text shorter than 3 characters is skipped (emoji reactions, single chars).
5. Elements that are purely link wrappers are skipped.

This approach is resilient to Instagram's frequent DOM changes while accurately targeting comment text.

---

## License

MIT
