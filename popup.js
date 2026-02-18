/**
 * CivilityAI — Popup script
 * Reads and updates the extension enabled/disabled state.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "civility_enabled";
  const DEFAULT_ENABLED = true;

  const toggle = document.getElementById("toggle");
  const status = document.getElementById("status");

  function setUI(enabled) {
    toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    status.textContent = enabled
      ? "On — comments are being classified."
      : "Off — toxicity detection is disabled.";
  }

  toggle.addEventListener("click", function () {
    const next = toggle.getAttribute("aria-pressed") !== "true";
    chrome.storage.local.set({ [STORAGE_KEY]: next }, function () {
      setUI(next);
    });
  });

  chrome.storage.local.get(STORAGE_KEY, function (result) {
    const enabled = result[STORAGE_KEY] !== false;
    setUI(enabled);
  });
})();
