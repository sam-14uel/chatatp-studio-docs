/**
 * Mintlify-style docs copilot built on @chatatp/studio ChatATPClient.
 * Drop this file (and chatatp-copilot.css) in the Mintlify docs root.
 * Mintlify auto-loads every .js / .css file in the content directory.
 */
(function () {
  if (window.__chatatpCopilotLoaded) return;
  window.__chatatpCopilotLoaded = true;

  const CONFIG = {
    apiKey: "chatatp_sk_sLBAqMaUP0L-8DyoHAobVqPGpSk5UMubjawgcJDkSA0",
    agentId: 1,
    baseUrl: "https://chatatp-agent-builder-backend.onrender.com",
    sdkVersion: "0.2.1",
    title: "Copilot",
    subtitle: "ChatATP Studio support",
    placeholder: "Ask a question about ChatATP Studio…",
    emptyHeading: "How can I help?",
    emptySubheading: "Ask about the SDKs, API, CLI, or how to ship an agent.",
    starters: [
      {
        title: "Create an agent",
        subtitle: "Studio setup walkthrough",
        prompt: "How do I create and configure an agent in ChatATP Studio?",
      },
      {
        title: "Send a first message",
        subtitle: "Python and JavaScript SDK",
        prompt: "Show me how to send my first message with the Python and JavaScript SDKs.",
      },
      {
        title: "Raw HTTP API",
        subtitle: "Auth, base URL, and chat endpoints",
        prompt: "How do I call the Developer API over raw HTTPS instead of the SDK?",
      },
    ],
  };

  const USER_KEY = "catp.docs.user";
  const CONV_KEY = "catp.docs.conversation";

  const sparkle = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.4 5.2L18 9.6l-4.6 1.4L12 16l-1.4-4.99L6 9.6l4.6-1.4L12 3z"/><path d="M18.5 14.5l.6 2.2 2.2.6-2.2.6-.6 2.2-.6-2.2-2.2-.6 2.2-.6.6-2.2z"/></svg>`;
  const closeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  const plusIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
  const sendIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h12M13 6l6 6-6 6"/></svg>`;

  const state = {
    open: false,
    busy: false,
    client: null,
    conversationId: Number(localStorage.getItem(CONV_KEY) || 0) || null,
    userId: localStorage.getItem(USER_KEY) || createUserId(),
    messages: [],
  };
  localStorage.setItem(USER_KEY, state.userId);

  const els = {};

  function createUserId() {
    const id =
      "docs_" +
      (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    return id.slice(0, 64);
  }

  function pageContext() {
    return {
      url: location.href,
      path: location.pathname,
      title: document.title,
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMarkdown(text) {
    const escaped = escapeHtml(text || "");
    const withCode = escaped.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, _lang, body) => {
      return `<pre><code>${body}</code></pre>`;
    });
    const withInline = withCode.replace(/`([^`]+)`/g, "<code>$1</code>");
    const withBold = withInline.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    const withLinks = withBold.replace(
      /\[([^\]]+)\]\((https?:[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
    return withLinks
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function mount() {
    if (document.getElementById("catp-root")) return;

    const root = document.createElement("div");
    root.id = "catp-root";
    root.innerHTML = `
      <div class="catp-float-wrap" id="catp-float">
        <div class="catp-float">
          <span class="catp-float-icon">${sparkle}</span>
          <input class="catp-float-input" id="catp-float-input" placeholder="${escapeHtml(
      CONFIG.placeholder
    )}" autocomplete="off" />
          <button type="button" class="catp-float-send" id="catp-float-send">Ask Copilot</button>
        </div>
        <div class="catp-float-powered">Powered by <a href="https://studio.chat-atp.com" target="_blank" rel="noreferrer">ChatATP Studio</a></div>
      </div>
      <aside class="catp-sidebar" id="catp-sidebar" role="complementary" aria-label="ChatATP Copilot">
        <header class="catp-head">
          <div class="catp-head-title">
            <strong>${escapeHtml(CONFIG.title)}</strong>
            <span>${escapeHtml(CONFIG.subtitle)}</span>
          </div>
          <button type="button" class="catp-icon-btn" id="catp-new" title="New chat">${plusIcon}</button>
          <button type="button" class="catp-icon-btn" id="catp-close" title="Close">${closeIcon}</button>
        </header>
        <div class="catp-messages" id="catp-messages"></div>
        <form class="catp-composer" id="catp-form">
          <div class="catp-composer-box">
            <textarea id="catp-input" rows="1" placeholder="${escapeHtml(
      CONFIG.placeholder
    )}"></textarea>
            <button type="submit" class="catp-send" id="catp-send" disabled>${sendIcon}</button>
          </div>
          <div class="catp-disclaimer">Answers can be wrong. Check the docs when it matters.</div>
          <div class="catp-powered">Powered by <a href="https://studio.chat-atp.com" target="_blank" rel="noreferrer">ChatATP Studio</a></div>
        </form>
      </aside>
    `;
    document.body.appendChild(root);

    els.float = document.getElementById("catp-float");
    els.floatInput = document.getElementById("catp-float-input");
    els.floatSend = document.getElementById("catp-float-send");
    els.sidebar = document.getElementById("catp-sidebar");
    els.messages = document.getElementById("catp-messages");
    els.input = document.getElementById("catp-input");
    els.form = document.getElementById("catp-form");
    els.send = document.getElementById("catp-send");

    document.getElementById("catp-close").addEventListener("click", close);
    document.getElementById("catp-new").addEventListener("click", resetChat);
    els.floatSend.addEventListener("click", submitFromFloat);
    els.floatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitFromFloat();
      }
    });
    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit(els.input.value);
    });
    els.input.addEventListener("input", () => {
      els.input.style.height = "auto";
      els.input.style.height = Math.min(els.input.scrollHeight, 140) + "px";
      els.send.disabled = state.busy || !els.input.value.trim();
    });

    window.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        state.open ? close() : open();
      }
      if (event.key === "Escape" && state.open) close();
    });

    renderMessages();
    injectAskButton();
  }

  function injectAskButton() {
    if (document.getElementById("catp-ask-btn")) return;
    const search =
      document.querySelector("#search-bar-entry") ||
      document.querySelector("[data-search]") ||
      document.querySelector("header nav");
    if (!search) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "catp-ask-btn";
    button.className = "catp-ask-btn";
    button.innerHTML = `${sparkle}<span class="catp-ask-btn-label">Ask Copilot</span><span class="catp-kbd">⌘I</span>`;
    button.addEventListener("click", () => (state.open ? close() : open()));

    const parent = search.parentElement || search;
    parent.appendChild(button);
  }

  function open(prefill) {
    state.open = true;
    els.sidebar.classList.add("open");
    els.float.classList.add("catp-hidden");
    document.documentElement.classList.add("catp-open");
    document.body.classList.add("catp-open");
    if (prefill) els.input.value = prefill;
    els.send.disabled = state.busy || !els.input.value.trim();
    setTimeout(() => els.input.focus(), 50);
  }

  function close() {
    state.open = false;
    els.sidebar.classList.remove("open");
    els.float.classList.remove("catp-hidden");
    document.documentElement.classList.remove("catp-open");
    document.body.classList.remove("catp-open");
  }

  function resetChat() {
    state.conversationId = null;
    state.messages = [];
    localStorage.removeItem(CONV_KEY);
    renderMessages();
    els.input.focus();
  }

  function renderMessages() {
    if (!state.messages.length) {
      els.messages.innerHTML = `
        <div class="catp-empty">
          <div class="catp-empty-mark">${sparkle}</div>
          <h3>${escapeHtml(CONFIG.emptyHeading)}</h3>
          <p>${escapeHtml(CONFIG.emptySubheading)}</p>
          <div class="catp-starters">
            ${CONFIG.starters
          .map(
            (item, index) => `
              <button type="button" class="catp-starter" data-starter="${index}">
                ${escapeHtml(item.title)}
                <small>${escapeHtml(item.subtitle)}</small>
              </button>`
          )
          .join("")}
          </div>
        </div>
      `;
      els.messages.querySelectorAll("[data-starter]").forEach((button) => {
        button.addEventListener("click", () => {
          const item = CONFIG.starters[Number(button.dataset.starter)];
          submit(item.prompt);
        });
      });
      return;
    }

    els.messages.innerHTML = state.messages
      .map((message) => {
        if (message.role === "tool") {
          return `<div class="catp-tools">${escapeHtml(message.content)}</div>`;
        }
        const avatar =
          message.role === "agent"
            ? `<div class="catp-avatar">${sparkle}</div>`
            : "";
        return `
          <div class="catp-row ${message.role}">
            ${avatar}
            <div class="catp-bubble">${message.role === "agent" ? renderMarkdown(message.content) : escapeHtml(message.content)
          }</div>
          </div>
        `;
      })
      .join("");
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function submitFromFloat() {
    const value = els.floatInput.value.trim();
    open();
    if (value) {
      els.floatInput.value = "";
      submit(value);
    }
  }

  async function ensureClient() {
    if (state.client) return state.client;
    const mod = await import(
      `https://esm.sh/@chatatp/studio@${CONFIG.sdkVersion}?bundle`
    );
    const Client = mod.ChatATPClient || mod.default?.ChatATPClient || mod.default;
    state.client = new Client({
      apiKey: CONFIG.apiKey,
      baseUrl: CONFIG.baseUrl,
    });
    return state.client;
  }

  function extractDelta(data) {
    if (data == null) return "";
    if (typeof data === "string") return data;
    return data.text || data.content || data.delta || "";
  }

  async function submit(raw) {
    const text = String(raw || "").trim();
    if (!text || state.busy) return;

    state.busy = true;
    els.send.disabled = true;
    els.input.value = "";
    els.input.style.height = "auto";

    state.messages.push({ role: "user", content: text });
    state.messages.push({ role: "agent", content: "" });
    renderMessages();
    open();

    const context = pageContext();
    const prompt =
      `The user is reading ${context.title} (${context.path}).\n\n` + text;

    try {
      const client = await ensureClient();
      for await (const event of client.chatStream({
        agent_id: CONFIG.agentId,
        external_user_id: state.userId,
        user_display_name: "Docs visitor",
        message: prompt,
        metadata: { source: "mintlify-docs", ...context },
      })) {
        if (event?.conversation?.id) {
          state.conversationId = event.conversation.id;
          localStorage.setItem(CONV_KEY, String(state.conversationId));
        }
        if (event.type === "tool.execution.started") {
          const name = event.data?.name || event.data?.tool || "tool";
          state.messages.push({ role: "tool", content: `Using ${name}…` });
          renderMessages();
        }
        if (event.type === "agent.response.delta") {
          const last = state.messages[state.messages.length - 1];
          if (last?.role === "agent") last.content += extractDelta(event.data);
          renderMessages();
        }
        if (event.type === "agent.response.completed") {
          const last = state.messages[state.messages.length - 1];
          const finalText =
            extractDelta(event.data) ||
            event.data?.agent_message?.content ||
            last.content;
          if (last?.role === "agent") last.content = finalText;
          renderMessages();
        }
        if (event.type === "error") {
          throw new Error(extractDelta(event.data) || "The agent could not answer.");
        }
      }

      const last = state.messages[state.messages.length - 1];
      if (last?.role === "agent" && !last.content) {
        last.content = "I could not generate a reply. Try asking again.";
        renderMessages();
      }
    } catch (error) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === "agent") {
        last.content = error?.message || "Something went wrong talking to the support agent.";
        renderMessages();
      }
    } finally {
      state.busy = false;
      els.send.disabled = !els.input.value.trim();
    }
  }

  function boot() {
    mount();
    injectAskButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  const observer = new MutationObserver(() => injectAskButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();