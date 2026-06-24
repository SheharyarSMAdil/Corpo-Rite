(() => {
  if (globalThis.__corporateiteLoaded) return;
  globalThis.__corporateiteLoaded = true;

  const DEBOUNCE_DEFAULT = 700;
  const MIN_CHARS_DEFAULT = 8;
  const CHAT_CONTEXT_MAX_CHARS = 2000;

  let settings = {
    enabled: true,
    autoSuggest: false,
    restrictToSites: false,
    allowedSites: [],
    useChatContext: true,
    chatContext: "",
    showLauncherIcon: true,
    debounceMs: DEBOUNCE_DEFAULT,
    minChars: MIN_CHARS_DEFAULT,
  };

  let siteAllowed = true;

  let toastTimer = null;

  let activeElement = null;
  let debounceTimer = null;
  let requestId = 0;
  let panel = null;
  let launcher = null;
  let pendingContext = null;
  let hint = null;
  let lastContext = null;
  let mutationObserver = null;
  let observedRoot = null;
  let panelManuallyMoved = false;
  let dragState = null;
  let accepting = false;
  let replacing = false;

  function refreshSiteAllowed() {
    const matcher = globalThis.CorpoRiteSiteMatcher;
    siteAllowed = matcher ? matcher.isUrlAllowed(location, settings) : true;
    if (!siteAllowed) {
      detachMutationObserver();
      if (panel && !panel.hidden) hidePanel();
      else hideLauncher();
    }
  }

  function isLauncherMode() {
    return settings.showLauncherIcon !== false;
  }

  function isLauncherVisible() {
    return launcher && !launcher.hidden;
  }

  function canRunOnThisPage() {
    return settings.enabled && siteAllowed;
  }

  function resolveEditableRoot(el) {
    if (!el || el.closest?.("#corpwrite-root")) return null;

    const tag = el.tagName?.toLowerCase();
    if (tag === "textarea") return !el.disabled && !el.readOnly ? el : null;
    if (tag === "input") {
      const type = (el.type || "text").toLowerCase();
      if (type === "password" || type === "email" || el.disabled || el.readOnly) return null;

      const autocomplete = (el.autocomplete || "").toLowerCase();
      if (autocomplete.includes("password") || autocomplete === "email") return null;

      if (!["text", "search", "url", "tel", ""].includes(type)) return null;
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
    return (
      el?.dataset?.testid === "conversation-compose-box-input" ||
      !!el?.closest?.('[data-testid="conversation-compose-box-input"]')
    );
  }

  function getWhatsAppCompose(el) {
    if (!el) return null;
    if (el.dataset?.testid === "conversation-compose-box-input") return el;
    return el.closest?.('[data-testid="conversation-compose-box-input"]') || null;
  }

  function normalizeCompareText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function textMatches(el, expected) {
    return normalizeCompareText(getText(el)) === normalizeCompareText(expected);
  }

  function selectAllInEditable(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return range;
  }

  function selectSpanInEditor(el, start, end) {
    const range = createRangeFromOffsets(el, start, end);
    const doc = el.ownerDocument;
    const sel = doc?.defaultView?.getSelection();
    if (!sel) return null;
    sel.removeAllRanges();
    sel.addRange(range);
    return { doc, sel, range };
  }

  /**
   * Direct DOM text replacement — Lexical (WhatsApp) ignores programmatic
   * selection and appends via execCommand/beforeinput instead of replacing.
   */
  function replaceTextInRange(doc, sel, range, replacementText) {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    if (
      startContainer === endContainer &&
      startContainer.nodeType === Node.TEXT_NODE
    ) {
      const textNode = startContainer;
      const startOffset = range.startOffset;
      const endOffset = range.endOffset;
      const oldText = textNode.textContent || "";
      textNode.textContent =
        oldText.slice(0, startOffset) + replacementText + oldText.slice(endOffset);

      const newRange = doc.createRange();
      const cursor = startOffset + replacementText.length;
      newRange.setStart(textNode, cursor);
      newRange.setEnd(textNode, cursor);
      sel.removeAllRanges();
      sel.addRange(newRange);
      return;
    }

    range.deleteContents();
    const textNode = doc.createTextNode(replacementText);
    range.insertNode(textNode);

    const newRange = doc.createRange();
    newRange.setStartAfter(textNode);
    newRange.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  function replaceWhatsAppLexicalSpan(compose, text) {
    const lexicalText = compose.querySelector("[data-lexical-text='true']");
    if (!lexicalText) return false;

    if (lexicalText.firstChild?.nodeType === Node.TEXT_NODE) {
      lexicalText.firstChild.textContent = text;
      const doc = compose.ownerDocument;
      const sel = doc?.defaultView?.getSelection();
      if (sel) {
        const newRange = doc.createRange();
        const textNode = lexicalText.firstChild;
        const cursor = text.length;
        newRange.setStart(textNode, cursor);
        newRange.setEnd(textNode, cursor);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else {
      lexicalText.textContent = text;
    }
    return true;
  }

  function getWhatsAppReplaceSpan(ctx, compose) {
    const currentFull = getText(compose);
    const originalSegment = ctx ? getOriginalSegment(ctx) : "";
    const start = ctx?.originalStart ?? ctx?.start ?? 0;
    const end = ctx?.originalEnd ?? ctx?.end ?? currentFull.length;

    if (originalSegment && currentFull.slice(start, end) === originalSegment) {
      return { start, end };
    }

    if (originalSegment) {
      const idx = currentFull.indexOf(originalSegment);
      if (idx >= 0) {
        return { start: idx, end: idx + originalSegment.length };
      }
    }

    return { start: 0, end: currentFull.length };
  }

  /**
   * WhatsApp Web Lexical keeps cursor state internally and ignores
   * programmatic selectAll/insertText — use direct DOM replacement.
   */
  function replaceWhatsAppCompose(el, text, ctx = null) {
    const compose = getWhatsAppCompose(el) || el;
    replacing = true;

    try {
      compose.focus();
      const span = getWhatsAppReplaceSpan(ctx, compose);
      const setup = selectSpanInEditor(compose, span.start, span.end);

      if (setup) {
        replaceTextInRange(setup.doc, setup.sel, setup.range, text);
      }

      if (!textMatches(compose, text)) {
        replaceWhatsAppLexicalSpan(compose, text);
      }

      compose.dispatchEvent(
        new InputEvent("input", { bubbles: true, cancelable: false })
      );
    } finally {
      replacing = false;
    }
  }

  /**
   * Other Lexical editors (Gmail, etc.) — select all, then one insert path.
   */
  function insertReplacementInEditable(el, text) {
    el.focus();
    selectAllInEditable(el);

    document.execCommand("insertText", false, text);
    if (textMatches(el, text)) return;

    selectAllInEditable(el);
    document.execCommand("delete", false, null);
    selectAllInEditable(el);
    document.execCommand("insertText", false, text);
  }

  function replaceEditableFull(el, text) {
    if (isWhatsAppCompose(el)) {
      replaceWhatsAppCompose(el, text);
      return;
    }

    if (isLexicalEditor(el)) {
      replacing = true;
      try {
        insertReplacementInEditable(el, text);
      } finally {
        replacing = false;
      }
      return;
    }

    replaceContentEditableRange(el, 0, getText(el).length, text);
  }

  /** Generic Lexical: delete range, insert once. */
  function replaceLexicalRange(el, start, end, text) {
    el.focus();
    const range = createRangeFromOffsets(el, start, end);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
    range.deleteContents();
    sel.removeAllRanges();
    sel.addRange(range);
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
      replaceEditableFull(el, text);
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
      <button type="button" class="corpwrite-launcher" hidden aria-label="Open CorpoRite suggestion" title="Open CorpoRite">
        <img src="${chrome.runtime.getURL("icons/icon16.png")}" alt="" />
      </button>
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
          <div class="corpwrite-label">Chat context (optional)</div>
          <textarea
            class="corpwrite-context"
            data-chat-context
            rows="3"
            maxlength="2000"
            placeholder="Recent messages, recipient, or topic — e.g. Manager asked for the report by EOD"
          ></textarea>
          <div class="corpwrite-context-actions">
            <button
              type="button"
              class="corpwrite-btn corpwrite-btn-primary corpwrite-btn-compact"
              data-generate-reply
              disabled
              title="Generate a new reply from the conversation context"
            >
              Generate reply
            </button>
            <button
              type="button"
              class="corpwrite-btn corpwrite-btn-secondary corpwrite-btn-compact"
              data-apply-context
              disabled
              title="Regenerate the suggestion using the context above"
            >
              Apply context
            </button>
          </div>
          <div class="corpwrite-label">Original</div>
          <div class="corpwrite-original" data-original></div>
          <div class="corpwrite-label">Suggestion</div>
          <div class="corpwrite-suggestion is-loading" data-suggestion>Improving your text…</div>
          <div class="corpwrite-length-actions">
            <button type="button" class="corpwrite-btn corpwrite-btn-secondary corpwrite-btn-compact" data-extend disabled title="Make the suggestion longer">Extend</button>
            <button type="button" class="corpwrite-btn corpwrite-btn-secondary corpwrite-btn-compact" data-shorten disabled title="Make the suggestion shorter">Shorten</button>
          </div>
          <div class="corpwrite-actions">
            <button type="button" class="corpwrite-btn corpwrite-btn-primary" data-accept disabled>Accept</button>
            <button type="button" class="corpwrite-btn corpwrite-btn-secondary" data-regenerate disabled>Regenerate</button>
            <button type="button" class="corpwrite-btn corpwrite-btn-secondary" data-dismiss>Dismiss</button>
          </div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(root);
    launcher = root.querySelector(".corpwrite-launcher");
    panel = root.querySelector(".corpwrite-panel");

    launcher.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanelFromLauncher();
    });

    root.querySelector(".corpwrite-close").addEventListener("click", hidePanel);
    root.querySelector("[data-dismiss]").addEventListener("click", hidePanel);
    root.querySelector("[data-accept]").addEventListener("mousedown", (e) => {
      e.preventDefault();
      acceptSuggestion();
    });
    root.querySelector("[data-regenerate]").addEventListener("click", () => {
      if (lastContext?.generatedReply) {
        requestGenerateReply();
        return;
      }
      if (lastContext) requestRewrite(lastContext, true, { keepPanel: true, regenerate: true });
    });
    root.querySelector("[data-apply-context]").addEventListener("click", () => {
      requestContextRegenerate();
    });
    root.querySelector("[data-generate-reply]").addEventListener("click", () => {
      requestGenerateReply();
    });
    root.querySelector("[data-extend]").addEventListener("click", () => {
      requestLengthAdjust("extend");
    });
    root.querySelector("[data-shorten]").addEventListener("click", () => {
      requestLengthAdjust("shorten");
    });

    document.addEventListener(
      "mousedown",
      (e) => {
        if (root.contains(e.target)) return;
        dismissUi();
      },
      true
    );

    initPanelDrag();
    return panel;
  }

  function dismissUi() {
    if ((panel && !panel.hidden) || isLauncherVisible()) {
      hidePanel();
      requestId++;
    }
  }

  function positionLauncher(el) {
    ensurePanel();
    if (!launcher || !el) return;
    const rect = el.getBoundingClientRect();
    const size = 36;
    let left = rect.right - size - 4;
    let top = rect.bottom - size - 4;
    if (top + size > window.innerHeight - 12) {
      top = Math.max(12, rect.top - size - 4);
    }
    left = Math.max(12, Math.min(left, window.innerWidth - size - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - size - 12));
    launcher.style.left = `${left}px`;
    launcher.style.top = `${top}px`;
  }

  function showLauncher(el, context) {
    ensurePanel();
    pendingContext = context;
    if (panel) panel.hidden = true;
    positionLauncher(el);
    launcher.hidden = false;
  }

  function hideLauncher() {
    if (launcher) launcher.hidden = true;
    pendingContext = null;
  }

  function openPanelFromLauncher() {
    if (!pendingContext) return;
    const context = pendingContext;
    hideLauncher();
    requestRewrite(context, true, { fromLauncher: true });
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
    const panelHeight = 400;
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

  function setPanelButtonsDisabled(disabled) {
    if (!panel) return;
    panel.querySelector("[data-accept]").disabled = disabled;
    panel.querySelector("[data-regenerate]").disabled = disabled;
    panel.querySelector("[data-generate-reply]").disabled = disabled;
    panel.querySelector("[data-apply-context]").disabled = disabled;
    panel.querySelector("[data-extend]").disabled = disabled;
    panel.querySelector("[data-shorten]").disabled = disabled;
  }

  function setContextActionButtonsEnabled(enabled) {
    if (!panel) return;
    panel.querySelector("[data-generate-reply]").disabled = !enabled;
    panel.querySelector("[data-apply-context]").disabled = !enabled || !lastContext;
  }

  function setPanelLoading(message) {
    const p = ensurePanel();
    const sug = p.querySelector("[data-suggestion]");
    sug.className = "corpwrite-suggestion is-loading";
    sug.textContent = message;
    setPanelButtonsDisabled(true);
  }

  function getPanelChatContext() {
    if (!panel) return "";
    return panel.querySelector("[data-chat-context]")?.value?.trim() ?? "";
  }

  function getDefaultChatContext() {
    if (settings.useChatContext === false) return "";
    return (settings.chatContext || "").trim();
  }

  function getEffectiveChatContext() {
    const panelCtx = getPanelChatContext();
    if (panelCtx) return panelCtx.slice(0, CHAT_CONTEXT_MAX_CHARS);
    return getDefaultChatContext().slice(0, CHAT_CONTEXT_MAX_CHARS);
  }

  function prefillPanelChatContext(force = false) {
    if (!panel) return;
    const field = panel.querySelector("[data-chat-context]");
    if (!field) return;
    if (!force && field.value.trim()) return;
    field.value = getDefaultChatContext();
  }

  function showPanel(el, context) {
    const p = ensurePanel();
    positionPanel(el);
    p.hidden = false;
    prefillPanelChatContext(true);
    p.querySelector("[data-original]").textContent = context.text;
    setPanelLoading("Improving your text…");
    setContextActionButtonsEnabled(false);
  }

  function hidePanel() {
    if (panel) panel.hidden = true;
    hideLauncher();
    lastContext = null;
  }

  function showError(message) {
    const p = ensurePanel();
    const sug = p.querySelector("[data-suggestion]");
    sug.className = "corpwrite-suggestion is-error";
    sug.textContent = message;
    setPanelButtonsDisabled(true);
    panel.querySelector("[data-regenerate]").disabled = false;
    setContextActionButtonsEnabled(Boolean(lastContext));
  }

  function anchorContext(context, prior = null) {
    const sourceFull = prior?.originalFull ?? context.full;
    const sourceStart = prior?.originalStart ?? context.start;
    const sourceEnd = prior?.originalEnd ?? context.end;
    return {
      ...context,
      originalText: prior?.originalText ?? context.text,
      originalStart: sourceStart,
      originalEnd: sourceEnd,
      originalFull: sourceFull,
    };
  }

  function getOriginalSegment(ctx) {
    const start = ctx.originalStart ?? ctx.start;
    const end = ctx.originalEnd ?? ctx.end;
    return (
      ctx.originalText ?? (ctx.originalFull ?? ctx.full)?.slice(start, end) ?? ""
    );
  }

  function buildAcceptReplacement(ctx, el) {
    const { suggestion } = ctx;

    // Generated or context-based replies replace the whole field on accept.
    if (ctx.generatedReply) {
      return suggestion;
    }

    // WhatsApp compose holds a single message — always replace all of it.
    if (isWhatsAppCompose(el)) {
      return suggestion;
    }

    const currentFull = getText(el);
    const originalSegment = getOriginalSegment(ctx);

    // After extend/shorten the field still has the user's original text — swap it entirely.
    if (
      ctx.lengthAdjusted &&
      originalSegment &&
      normalizeCompareText(currentFull) === normalizeCompareText(originalSegment)
    ) {
      return suggestion;
    }

    const start = ctx.originalStart ?? ctx.start;
    const end = ctx.originalEnd ?? ctx.end;

    if (originalSegment && currentFull.slice(start, end) === originalSegment) {
      return currentFull.slice(0, start) + suggestion + currentFull.slice(end);
    }

    if (originalSegment) {
      const idx = currentFull.indexOf(originalSegment);
      if (idx >= 0) {
        return (
          currentFull.slice(0, idx) +
          suggestion +
          currentFull.slice(idx + originalSegment.length)
        );
      }
    }

    if (ctx.lengthAdjusted || ctx.mode === "full") {
      return suggestion;
    }

    return currentFull.slice(0, start) + suggestion + currentFull.slice(end);
  }

  function showSuggestion(suggestion, context, options = {}) {
    const p = ensurePanel();
    const sug = p.querySelector("[data-suggestion]");
    const unchanged = suggestion.trim() === context.text.trim();
    if (unchanged) {
      sug.className = "corpwrite-suggestion";
      sug.textContent = "Already polished — no changes needed.";
      p.querySelector("[data-accept]").disabled = true;
      p.querySelector("[data-extend]").disabled = true;
      p.querySelector("[data-shorten]").disabled = true;
    } else {
      sug.className = "corpwrite-suggestion";
      sug.textContent = suggestion;
      p.querySelector("[data-accept]").disabled = false;
      p.querySelector("[data-extend]").disabled = false;
      p.querySelector("[data-shorten]").disabled = false;
    }
    p.querySelector("[data-regenerate]").disabled = false;
    setContextActionButtonsEnabled(true);
    const prior = options.isLengthAdjust ? lastContext : null;
    lastContext = {
      ...anchorContext(context, prior),
      suggestion,
      targetElement: activeElement,
      lengthAdjusted: Boolean(options.isLengthAdjust || prior?.lengthAdjusted),
      generatedReply: Boolean(options.generatedReply || prior?.generatedReply),
    };
  }

  function getDraftHintForReply() {
    if (lastContext) {
      const original = getOriginalSegment(lastContext);
      if (original) return original;
    }
    const el = activeElement || resolveEditableRoot(document.activeElement);
    return el ? getText(el).trim() : "";
  }

  function requestGenerateReply() {
    const chatContext = getEffectiveChatContext();
    if (!chatContext) {
      showToast("Add chat context above, then click Generate reply");
      return;
    }

    const id = ++requestId;
    setPanelLoading("Generating reply…");

    chrome.runtime.sendMessage(
      {
        type: "GENERATE_REPLY",
        chatContext,
        draftHint: getDraftHintForReply(),
      },
      (response) => {
        if (id !== requestId) return;
        if (chrome.runtime.lastError) {
          showError("Extension error. Reload the page and try again.");
          return;
        }
        if (!response?.ok) {
          if (response?.error === "NO_API_KEY") {
            showError("Add your OpenAI API key in CorpoRite settings.");
          } else {
            showError(response?.error || "Could not generate reply.");
          }
          return;
        }

        const baseContext =
          lastContext ||
          getContextForRewrite(activeElement) || {
            text: getDraftHintForReply(),
            mode: "full",
            start: 0,
            end: getDraftHintForReply().length,
            full: getDraftHintForReply(),
          };

        if (panel) {
          panel.querySelector("[data-original]").textContent =
            baseContext.text || "(generated from context)";
        }

        showSuggestion(response.suggestion, baseContext, { generatedReply: true });
      }
    );
  }

  function requestContextRegenerate() {
    if (!lastContext) return;
    const chatContext = getEffectiveChatContext();
    if (!chatContext) {
      showToast("Add chat context above, then click Apply context");
      return;
    }

    const originalText = getOriginalSegment(lastContext);
    if (!originalText) return;

    const context = {
      ...anchorContext({ ...lastContext, text: originalText }, lastContext),
      lengthAdjusted: false,
    };
    requestRewrite(context, true, { keepPanel: true, applyContext: true });
  }

  function requestLengthAdjust(lengthMode) {
    if (!lastContext?.suggestion) return;
    const context = anchorContext(
      {
        ...lastContext,
        text: lastContext.suggestion,
      },
      lastContext
    );
    requestRewrite(context, true, { lengthMode, keepPanel: true });
  }

  function fallbackCopyToClipboard(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.documentElement.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyToClipboard(text));
      return;
    }
    fallbackCopyToClipboard(text);
  }

  function acceptSuggestion() {
    if (accepting || !lastContext) return;
    accepting = true;

    const { suggestion, targetElement } = lastContext;
    const el = targetElement || activeElement;
    const compose = el ? getWhatsAppCompose(el) : null;

    const finish = () => {
      copyToClipboard(suggestion);
      showToast("Accepted — copied to clipboard");
      accepting = false;
      hidePanel();
    };

    try {
      if (!el) {
        accepting = false;
        return;
      }

      if (compose) {
        compose.focus();
        try {
          replaceWhatsAppCompose(compose, suggestion, lastContext);
        } finally {
          finish();
        }
        return;
      }

      const replacement = buildAcceptReplacement(lastContext, el);
      setText(el, replacement);
      el.focus?.();
      finish();
    } catch {
      accepting = false;
      hidePanel();
    }
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
    if (!siteAllowed) {
      showToast("CorpoRite is not enabled on this website — add it in settings");
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

  async function requestRewrite(context, force, options = {}) {
    if ((!settings.enabled || !siteAllowed) && !force) return;
    const {
      lengthMode = null,
      keepPanel = false,
      regenerate = false,
      applyContext = false,
      fromLauncher = false,
    } = options;

    if (!keepPanel && !fromLauncher && isLauncherMode()) {
      showLauncher(activeElement, context);
      return;
    }

    const id = ++requestId;

    if (keepPanel) {
      const loadingMsg =
        lengthMode === "extend"
          ? "Extending your text…"
          : lengthMode === "shorten"
            ? "Shortening your text…"
            : applyContext
              ? "Applying context…"
              : regenerate
                ? "Regenerating…"
                : "Improving your text…";
      setPanelLoading(loadingMsg);
    } else {
      showPanel(activeElement, context);
    }

    chrome.runtime.sendMessage(
      {
        type: "REWRITE",
        text: context.text,
        lengthMode,
        chatContext: getEffectiveChatContext(),
      },
      (response) => {
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
        showSuggestion(response.suggestion, context, { isLengthAdjust: Boolean(lengthMode) });
      }
    );
  }

  function detachMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
      observedRoot = null;
    }
  }

  function shouldObserveForAutoSuggest(root) {
    return isLexicalEditor(root) || isWhatsAppCompose(root);
  }

  function attachMutationObserver(root) {
    if (!settings.autoSuggest || !siteAllowed || !shouldObserveForAutoSuggest(root)) return;
    const compose = getWhatsAppCompose(root) || root;
    const observeTarget = compose.closest?.(".lexical-rich-text-input") || compose;
    if (observedRoot === observeTarget && mutationObserver) return;

    detachMutationObserver();
    observedRoot = observeTarget;
    mutationObserver = new MutationObserver(() => {
      if (replacing || accepting) return;
      if (!canRunOnThisPage() || !settings.autoSuggest || !isFocusInEditable(compose)) return;
      activeElement = compose;
      scheduleRewrite(compose);
    });
    mutationObserver.observe(observeTarget, {
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
    if (!canRunOnThisPage() || replacing || accepting) return;
    const root = resolveEditableRoot(sourceEl);
    if (!root) return;
    activeElement = getWhatsAppCompose(root) || root;
    if (!settings.autoSuggest) return;
    attachMutationObserver(activeElement);
    scheduleRewrite(activeElement);
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
    if (e.target.closest?.("#corpwrite-root")) return;
    if (!canRunOnThisPage()) return;

    const root = resolveEditableRoot(e.target);
    if (!root) {
      if (panel && !panel.hidden) hidePanel();
      else hideLauncher();
      return;
    }
    activeElement = getWhatsAppCompose(root) || root;
    attachMutationObserver(activeElement);
    if (settings.autoSuggest) scheduleRewrite(activeElement);
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

    if (e.key === "Escape") {
      if (panel && !panel.hidden) {
        hidePanel();
        requestId++;
        return;
      }
      if (isLauncherVisible()) {
        hideLauncher();
        requestId++;
        return;
      }
    }

    if (!panel || panel.hidden) return;
    if (e.key === "Enter" && e.ctrlKey && lastContext?.suggestion) {
      e.preventDefault();
      acceptSuggestion();
    }
  }

  function loadSettings() {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
      if (response?.ok && response.settings) {
        settings = { ...settings, ...response.settings };
        refreshSiteAllowed();
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
      refreshSiteAllowed();
      if (!settings.autoSuggest || !siteAllowed) {
        detachMutationObserver();
      } else if (activeElement) {
        attachMutationObserver(activeElement);
      }
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TRIGGER_SUGGEST") triggerManualSuggest();
  });

  document.addEventListener("input", onInput, true);
  document.addEventListener("beforeinput", onBeforeInput, true);
  document.addEventListener("compositionend", onInput, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", () => {
    clampPanelToViewport();
    if (isLauncherVisible() && activeElement) {
      positionLauncher(activeElement);
    }
  });

  loadSettings();
})();
