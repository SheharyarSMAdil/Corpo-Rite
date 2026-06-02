(() => {
  if (globalThis.__corporateiteLoaded) return;
  globalThis.__corporateiteLoaded = true;

  const DEBOUNCE_DEFAULT = 700;
  const MIN_CHARS_DEFAULT = 8;

  let settings = {
    enabled: true,
    autoSuggest: false,
    debounceMs: DEBOUNCE_DEFAULT,
    minChars: MIN_CHARS_DEFAULT,
  };

  let toastTimer = null;

  let activeElement = null;
  let debounceTimer = null;
  let requestId = 0;
  let panel = null;
  let hint = null;
  let lastContext = null;
  let mutationObserver = null;
  let observedRoot = null;
  let panelManuallyMoved = false;
  let dragState = null;

  function resolveEditableRoot(el) {
    if (!el || el.closest?.("#corpwrite-root")) return null;

    const tag = el.tagName?.toLowerCase();
    if (tag === "textarea") return !el.disabled && !el.readOnly ? el : null;
    if (tag === "input") {
      const type = (el.type || "text").toLowerCase();
      if (!["text", "search", "email", "url", "tel", ""].includes(type) || el.disabled || el.readOnly) {
        return null;
      }
      return el;
    }

    const root = el.closest?.(
      '[contenteditable="true"][role="textbox"],' +
        '[contenteditable="true"][data-lexical-editor],' +
        '[contenteditable="true"][data-testid="conversation-compose-box-input"],' +
        '[contenteditable="true"]'
    );
    if (root?.isContentEditable) return root;
    return null;
  }

  function isEditable(el) {
    return resolveEditableRoot(el) !== null;
  }

  function isFocusInEditable(el) {
    const active = document.activeElement;
    if (!active || !el) return false;
    return el === active || el.contains(active);
  }

  function isLexicalEditor(el) {
    return el?.isContentEditable && el.hasAttribute?.("data-lexical-editor");
  }

  function getTextFromContentEditable(el) {
    let text = "";
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      text += walker.currentNode.data;
    }
    return text.replace(/\u00a0/g, " ");
  }

  function getText(el) {
    if (!el) return "";
    if (el.isContentEditable) {
      const walked = getTextFromContentEditable(el);
      if (walked) return walked;
      return (el.innerText || el.textContent || "").replace(/\u00a0/g, " ");
    }
    return el.value ?? "";
  }

  function createRangeFromOffsets(root, start, end) {
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let startNode = null;
    let startOff = 0;
    let endNode = null;
    let endOff = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.length;
      if (!startNode && offset + len >= start) {
        startNode = node;
        startOff = Math.max(0, start - offset);
      }
      if (!endNode && offset + len >= end) {
        endNode = node;
        endOff = Math.max(0, end - offset);
        break;
      }
      offset += len;
    }

    if (!startNode) {
      range.selectNodeContents(root);
      range.collapse(false);
      return range;
    }

    range.setStart(startNode, startOff);
    range.setEnd(endNode || startNode, endNode ? endOff : startOff);
    return range;
  }

  function isWhatsAppCompose(el) {
    return el?.dataset?.testid === "conversation-compose-box-input";
  }

  /** WhatsApp Lexical: replace entire compose box (avoids append/duplicate bugs). */
  function replaceWhatsAppCompose(el, text) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const before = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertReplacementText",
      data: text,
    });
    el.dispatchEvent(before);
    if (before.defaultPrevented) return;

    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch {
      inserted = false;
    }
    if (inserted) return;

    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const paste = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      el.dispatchEvent(paste);
      if (paste.defaultPrevented) return;
    } catch {
      // Continue to DOM fallback
    }

    const templateP = el.querySelector("p");
    const templateSpan = el.querySelector("[data-lexical-text]");

    while (el.firstChild) el.removeChild(el.firstChild);

    const p = document.createElement("p");
    if (templateP) {
      p.className = templateP.className;
      if (templateP.dir) p.dir = templateP.dir;
    } else {
      p.dir = "ltr";
    }

    const span = document.createElement("span");
    if (templateSpan) span.className = templateSpan.className;
    span.setAttribute("data-lexical-text", "true");
    span.textContent = text;
    p.appendChild(span);
    el.appendChild(p);

    const endRange = document.createRange();
    const textNode = span.firstChild;
    if (textNode) {
      endRange.setStart(textNode, text.length);
    } else {
      endRange.setStart(span, 0);
    }
    endRange.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(endRange);

    // DOM fallback needs an input signal so WhatsApp syncs internal editor state.
    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertReplacementText",
        data: text,
      })
    );

  }

  /** Generic Lexical: one replacement path only — never stack insert + events. */
  function replaceLexicalRange(el, start, end, text) {
    el.focus();
    const range = createRangeFromOffsets(el, start, end);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);

    const before = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertReplacementText",
      data: text,
    });
    el.dispatchEvent(before);
    if (before.defaultPrevented) return;

    range.deleteContents();
    sel.removeAllRanges();
    sel.addRange(range);

    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const paste = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      el.dispatchEvent(paste);
      if (paste.defaultPrevented) return;
    } catch {
      /* ClipboardEvent may be limited in some contexts */
    }

    document.execCommand("insertText", false, text);
  }

  function replaceContentEditableRange(el, start, end, text) {
    if (isWhatsAppCompose(el)) {
      replaceWhatsAppCompose(el, text);
      return;
    }

    if (isLexicalEditor(el)) {
      replaceLexicalRange(el, start, end, text);
      return;
    }

    el.focus();
    const range = createRangeFromOffsets(el, start, end);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
    range.deleteContents();
    sel.removeAllRanges();
    sel.addRange(range);
    if (!document.execCommand("insertText", false, text)) {
      range.insertNode(document.createTextNode(text));
    }
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }

  function setText(el, text) {
    if (!el) return;
    if (el.isContentEditable) {
      if (isWhatsAppCompose(el)) {
        replaceWhatsAppCompose(el, text);
      } else {
        replaceContentEditableRange(el, 0, getText(el).length, text);
      }
      return;
    }
    const proto = el.tagName === "textarea" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) {
      setter.call(el, text);
    } else {
      el.value = text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getSelectionRange(el) {
    const full = getText(el);
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return { start: full.length, end: full.length, text: full };

      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) {
        return { start: full.length, end: full.length, text: full };
      }

      const pre = range.cloneRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      const start = pre.toString().length;
      const end = start + range.toString().length;
      return { start, end, text: full };
    }
    return { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0, text: el.value ?? "" };
  }

  function getContextForRewrite(el) {
    const full = getText(el);
    const { start, end } = getSelectionRange(el);

    if (start !== end) {
      return { text: full.slice(start, end), mode: "selection", start, end, full };
    }

    const sentenceMatch = extractRecentSentence(full, start);
    if (sentenceMatch) {
      return { text: sentenceMatch.text, mode: "sentence", start: sentenceMatch.start, end: sentenceMatch.end, full };
    }

    const trimmed = full.trim();
    if (trimmed.length >= (settings.minChars || MIN_CHARS_DEFAULT)) {
      const lead = full.length - full.trimStart().length;
      return { text: trimmed, mode: "full", start: lead, end: lead + trimmed.length, full };
    }

    return null;
  }

  function extractRecentSentence(text, caret) {
    const before = text.slice(0, caret);
    const after = text.slice(caret);
    const startRe = /(?:^|[.!?\n])\s*([^\n.!?]*)$/;
    const endRe = /^([^\n.!?]*[.!?]?)/;
    const startMatch = before.match(startRe);
    const endMatch = after.match(endRe);
    if (!startMatch) return null;
    const chunk = (startMatch[1] || "") + (endMatch?.[1] || "");
    const trimmed = chunk.trim();
    if (trimmed.length < (settings.minChars || MIN_CHARS_DEFAULT)) return null;
    const start = caret - (startMatch[1] || "").length;
    const end = caret + (endMatch?.[1]?.length || 0);
    return { text: trimmed, start, end };
  }

  function ensurePanel() {
    if (panel) return panel;
    const root = document.createElement("div");
    root.id = "corpwrite-root";
    root.innerHTML = `
      <div class="corpwrite-panel" role="dialog" aria-label="CorpoRite suggestion" hidden>
        <div class="corpwrite-header">
          <div class="corpwrite-brand">
            <img class="corpwrite-logo" src="${chrome.runtime.getURL("icons/icon16.png")}" alt="" />
            CorpoRite
            <span class="corpwrite-badge" data-formality></span>
          </div>
          <button type="button" class="corpwrite-close" title="Dismiss" aria-label="Dismiss">&times;</button>
        </div>
        <div class="corpwrite-body">
          <div class="corpwrite-label">Original</div>
          <div class="corpwrite-original" data-original></div>
          <div class="corpwrite-label">Suggestion</div>
          <div class="corpwrite-suggestion is-loading" data-suggestion>Improving your text…</div>
          <div class="corpwrite-actions">
            <button type="button" class="corpwrite-btn corpwrite-btn-primary" data-accept disabled>Accept</button>
            <button type="button" class="corpwrite-btn corpwrite-btn-secondary" data-regenerate disabled>Regenerate</button>
            <button type="button" class="corpwrite-btn corpwrite-btn-secondary" data-dismiss>Dismiss</button>
          </div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(root);
    panel = root.querySelector(".corpwrite-panel");

    root.querySelector(".corpwrite-close").addEventListener("click", hidePanel);
    root.querySelector("[data-dismiss]").addEventListener("click", hidePanel);
    root.querySelector("[data-accept]").addEventListener("click", acceptSuggestion);
    root.querySelector("[data-regenerate]").addEventListener("click", () => {
      if (lastContext) requestRewrite(lastContext, true);
    });

    document.addEventListener(
      "mousedown",
      (e) => {
        if (root.contains(e.target)) return;
        if (panel && !panel.hidden && e.target.closest?.(".corpwrite-panel")) return;
        hidePanel();
      },
      true
    );

    initPanelDrag();
    return panel;
  }

  function clampPanelToViewport() {
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - rect.width - 12);
    const maxTop = Math.max(12, window.innerHeight - rect.height - 12);
    const clampedLeft = Math.min(Math.max(rect.left, 12), maxLeft);
    const clampedTop = Math.min(Math.max(rect.top, 12), maxTop);
    panel.style.left = `${clampedLeft}px`;
    panel.style.top = `${clampedTop}px`;
  }

  function onDragMove(e) {
    if (!panel || !dragState) return;
    const nextLeft = e.clientX - dragState.offsetX;
    const nextTop = e.clientY - dragState.offsetY;
    panel.style.left = `${nextLeft}px`;
    panel.style.top = `${nextTop}px`;
    clampPanelToViewport();
  }

  function onDragEnd() {
    dragState = null;
    window.removeEventListener("mousemove", onDragMove, true);
    window.removeEventListener("mouseup", onDragEnd, true);
  }

  function initPanelDrag() {
    if (!panel) return;
    const header = panel.querySelector(".corpwrite-header");
    if (!header) return;

    header.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest(".corpwrite-close") || e.target.closest(".corpwrite-btn")) return;

      const rect = panel.getBoundingClientRect();
      dragState = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
      panelManuallyMoved = true;
      window.addEventListener("mousemove", onDragMove, true);
      window.addEventListener("mouseup", onDragEnd, true);
      e.preventDefault();
    });
  }

  function ensureHint() {
    if (hint) return hint;
    hint = document.createElement("div");
    hint.id = "corpwrite-hint";
    hint.className = "corpwrite-inline-hint";
    hint.textContent = "Alt+Shift+C — CorpoRite";
    document.documentElement.appendChild(hint);
    return hint;
  }

  function positionPanel(el) {
    const p = ensurePanel();
    if (panelManuallyMoved) {
      clampPanelToViewport();
      return;
    }
    const rect = el.getBoundingClientRect();
    const panelHeight = 220;
    let top = rect.bottom + 8;
    if (top + panelHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - panelHeight - 8);
    }
    let left = rect.left;
    const maxLeft = window.innerWidth - 400;
    left = Math.max(12, Math.min(left, maxLeft));
    p.style.top = `${top}px`;
    p.style.left = `${left}px`;
  }

  function showPanel(el, context) {
    const p = ensurePanel();
    positionPanel(el);
    p.hidden = false;
    p.querySelector("[data-original]").textContent = context.text;
    const sug = p.querySelector("[data-suggestion]");
    sug.className = "corpwrite-suggestion is-loading";
    sug.textContent = "Improving your text…";
    p.querySelector("[data-accept]").disabled = true;
    p.querySelector("[data-regenerate]").disabled = true;
  }

  function hidePanel() {
    if (panel) panel.hidden = true;
    lastContext = null;
  }

  function showError(message) {
    const p = ensurePanel();
    const sug = p.querySelector("[data-suggestion]");
    sug.className = "corpwrite-suggestion is-error";
    sug.textContent = message;
    p.querySelector("[data-accept]").disabled = true;
    p.querySelector("[data-regenerate]").disabled = false;
  }

  function showSuggestion(suggestion, context) {
    const p = ensurePanel();
    const sug = p.querySelector("[data-suggestion]");
    const unchanged = suggestion.trim() === context.text.trim();
    if (unchanged) {
      sug.className = "corpwrite-suggestion";
      sug.textContent = "Already polished — no changes needed.";
      p.querySelector("[data-accept]").disabled = true;
    } else {
      sug.className = "corpwrite-suggestion";
      sug.textContent = suggestion;
      p.querySelector("[data-accept]").disabled = false;
    }
    p.querySelector("[data-regenerate]").disabled = false;
    lastContext = { ...context, suggestion };
  }

  function acceptSuggestion() {
    if (!lastContext || !activeElement) return;
    const { start, end, full, suggestion } = lastContext;

    if (activeElement.isContentEditable) {
      if (isWhatsAppCompose(activeElement)) {
        replaceWhatsAppCompose(activeElement, suggestion);
      } else {
        replaceContentEditableRange(activeElement, start, end, suggestion);
      }
    } else {
      setText(activeElement, full.slice(0, start) + suggestion + full.slice(end));
    }
    hidePanel();
  }

  function showToast(message) {
    let node = document.getElementById("corpwrite-toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "corpwrite-toast";
      node.className = "corpwrite-inline-hint";
      document.documentElement.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("is-visible"), 2800);
  }

  function triggerManualSuggest() {
    if (!settings.enabled) {
      showToast("CorpoRite is paused — enable it in the toolbar");
      return;
    }

    const root = resolveEditableRoot(document.activeElement) || activeElement;
    if (!root || !isFocusInEditable(root)) {
      showToast("Click a text field, then press Alt+Shift+C");
      return;
    }

    activeElement = root;
    const context = getContextForRewrite(root);
    if (!context) {
      const min = settings.minChars || MIN_CHARS_DEFAULT;
      showToast(`Type at least ${min} characters first`);
      return;
    }

    clearTimeout(debounceTimer);
    requestRewrite(context, true);
  }

  function isManualShortcut(e) {
    const key = typeof e.key === "string" ? e.key.toLowerCase() : "";
    return e.altKey && e.shiftKey && key === "c";
  }

  async function requestRewrite(context, force) {
    if (!settings.enabled && !force) return;
    const id = ++requestId;
    showPanel(activeElement, context);

    chrome.runtime.sendMessage({ type: "REWRITE", text: context.text }, (response) => {
      if (id !== requestId) return;
      if (chrome.runtime.lastError) {
        showError("Extension error. Reload the page and try again.");
        return;
      }
      if (!response?.ok) {
        if (response?.error === "NO_API_KEY") {
          showError("Add your OpenAI API key in CorpoRite settings.");
        } else {
          showError(response?.error || "Could not generate suggestion.");
        }
        return;
      }
      showSuggestion(response.suggestion, context);
    });
  }

  function detachMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
      observedRoot = null;
    }
  }

  function attachMutationObserver(root) {
    if (!settings.autoSuggest || !isLexicalEditor(root)) return;
    if (observedRoot === root && mutationObserver) return;

    detachMutationObserver();
    observedRoot = root;
    mutationObserver = new MutationObserver(() => {
      if (!settings.enabled || !settings.autoSuggest || !isFocusInEditable(root)) return;
      activeElement = root;
      scheduleRewrite(root);
    });
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function scheduleRewrite(sourceEl) {
    const el = resolveEditableRoot(sourceEl);
    if (!el) return;

    activeElement = el;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const root = resolveEditableRoot(el);
      if (!root || !isFocusInEditable(root)) return;

      const context = getContextForRewrite(root);
      if (!context) {
        hidePanel();
        return;
      }
      requestRewrite(context);
    }, settings.debounceMs || DEBOUNCE_DEFAULT);
  }

  function handleEditableActivity(sourceEl) {
    if (!settings.enabled) return;
    const root = resolveEditableRoot(sourceEl);
    if (!root) return;
    activeElement = root;
    if (!settings.autoSuggest) return;
    attachMutationObserver(root);
    scheduleRewrite(root);
  }

  function onInput(e) {
    handleEditableActivity(e.target);
  }

  function onBeforeInput(e) {
    handleEditableActivity(e.target);
  }

  function onKeyUp(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = typeof e.key === "string" ? e.key : "";
    if (key.length !== 1 && !["Backspace", "Delete", "Enter"].includes(key)) return;
    handleEditableActivity(e.target);
  }

  function onFocusIn(e) {
    const root = resolveEditableRoot(e.target);
    if (!root) return;
    activeElement = root;
    attachMutationObserver(root);
    const h = ensureHint();
    const rect = root.getBoundingClientRect();
    h.style.top = `${Math.max(4, rect.top - 22)}px`;
    h.style.left = `${rect.left}px`;
    h.classList.add("is-visible");
    setTimeout(() => h.classList.remove("is-visible"), 2000);
  }

  function onKeyDown(e) {
    if (isManualShortcut(e)) {
      e.preventDefault();
      triggerManualSuggest();
      return;
    }

    if (!panel || panel.hidden) return;
    if (e.key === "Escape") {
      hidePanel();
      requestId++;
    }
    if (e.key === "Enter" && e.ctrlKey && lastContext?.suggestion) {
      e.preventDefault();
      acceptSuggestion();
    }
  }

  function loadSettings() {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
      if (response?.ok && response.settings) {
        settings = { ...settings, ...response.settings };
        const badge = document.querySelector("#corpwrite-root [data-formality]");
        if (badge && response.settings.formality) {
          badge.textContent = response.settings.formality;
        }
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.corpwrite_settings) {
      settings = { ...settings, ...changes.corpwrite_settings.newValue };
      if (!settings.autoSuggest) detachMutationObserver();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TRIGGER_SUGGEST") triggerManualSuggest();
  });

  document.addEventListener("input", onInput, true);
  document.addEventListener("beforeinput", onBeforeInput, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", clampPanelToViewport);

  loadSettings();
})();
