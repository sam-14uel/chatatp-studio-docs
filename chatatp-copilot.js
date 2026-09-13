/**
 * Mintlify-style docs copilot built on @chatatp/studio ChatATPClient.
 * Drop this file (and chatatp-copilot.css) in the Mintlify docs root.
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
  const ACTIVE_KEY = "catp.docs.active";

  const ICONS = {
    sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.4 5.2L18 9.6l-4.6 1.4L12 16l-1.4-4.99L6 9.6l4.6-1.4L12 3z"/><path d="M18.5 14.5l.6 2.2 2.2.6-2.2.6-.6 2.2-.6-2.2-2.2-.6 2.2-.6.6-2.2z"/></svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
    send: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h12M13 6l6 6-6 6"/></svg>`,
    history: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h16"/></svg>`,
    chevron: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg>`,
    check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>`,
    fail: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
    spin: `<span class="catp-spin" aria-hidden="true"></span>`,
  };

  const state = {
    open: false,
    view: "chat",
    busy: false,
    typing: false,
    client: null,
    visitorId: localStorage.getItem(USER_KEY) || createId("docs"),
    conversationId: Number(localStorage.getItem(ACTIVE_KEY) || 0) || null,
    messages: [],
    threads: [],
    loadingHistory: false,
  };
  localStorage.setItem(USER_KEY, state.visitorId);

  const els = {};

  function createId(prefix) {
    const raw = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
    return `${prefix}_${String(raw).replace(/-/g, "").slice(0, 16)}`;
  }

  function persistActive() {
    if (state.conversationId) localStorage.setItem(ACTIVE_KEY, String(state.conversationId));
    else localStorage.removeItem(ACTIVE_KEY);
  }

  function pageToArray(page) {
    if (!page) return [];
    if (Array.isArray(page)) return page;
    if (typeof page.toArray === "function") return page.toArray();
    return page.data || page.results || page.items || [];
  }

  function mapConversation(row) {
    const id = Number(row.id || row.conversation_id);
    return {
      id,
      conversationId: id,
      title: row.title || row.user_display_name || firstUserText(row) || `Conversation #${id}`,
      preview: row.last_message || row.preview || row.user_display_name || "Open conversation",
      updatedAt: Date.parse(row.last_message_at || row.updated_at || row.created_at || "") || Date.now(),
    };
  }

  function firstUserText(row) {
    if (row && row.last_user_message) return String(row.last_user_message).slice(0, 48);
    const msg = state.messages.find((m) => m.role === "user");
    return msg ? String(msg.content || "").trim() : "";
  }

  async function loadSessions() {
    state.loadingHistory = true;
    render();
    try {
      const client = await ensureClient();
      const page = await client.conversations.list({
        agent_id: CONFIG.agentId,
        external_user_id: state.visitorId,
      });
      const rows = await pageToArray(page);
      state.threads = (rows || [])
        .map(mapConversation)
        .filter((item) => item.id)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (error) {
      console.warn("Could not load conversations", error);
      state.threads = [];
    } finally {
      state.loadingHistory = false;
      render();
    }
  }

  function pageContext() {
    return { url: location.href, path: location.pathname, title: document.title };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pretty(value) {
    if (value == null || value === "") return "—";
    if (typeof value === "string") {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
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

  function statusIcon(status) {
    if (status === "running") return ICONS.spin;
    if (status === "failed") return ICONS.fail;
    return ICONS.check;
  }

  function normalizeTool(raw, fallbackStatus) {
    const ok = raw.ok !== false && raw.status !== "error" && raw.status !== "failed";
    let status = fallbackStatus || raw.status;
    if (status === "started") status = "running";
    if (status === "completed" || status === "success") status = ok ? "success" : "failed";
    if (status === "error") status = "failed";
    if (!status) status = ok ? "success" : "running";
    return {
      id: String(raw.id || raw.tool_call_id || raw.name || Math.random()),
      name: raw.name || raw.tool || "tool",
      request: raw.arguments ?? raw.args ?? raw.request ?? {},
      response: raw.result ?? raw.response ?? raw.output ?? "",
      status,
      open: Boolean(raw.open),
    };
  }

  function mount() {
    if (document.getElementById("catp-root")) return;

    const root = document.createElement("div");
    root.id = "catp-root";
    root.innerHTML = `
      <div class="catp-float-wrap" id="catp-float">
        <div class="catp-float">
          <span class="catp-float-icon">${ICONS.sparkle}</span>
          <input class="catp-float-input" id="catp-float-input" placeholder="${escapeHtml(
            CONFIG.placeholder
          )}" autocomplete="off" />
          <button type="button" class="catp-float-send" id="catp-float-send">Ask Copilot</button>
        </div>
        <div class="catp-float-powered">Powered by <a href="https://studio.chat-atp.com" target="_blank" rel="noreferrer">ChatATP Studio</a></div>
      </div>
      <aside class="catp-sidebar" id="catp-sidebar" role="complementary" aria-label="ChatATP Copilot">
        <header class="catp-head">
          <button type="button" class="catp-icon-btn" id="catp-history" title="Recent chats">${ICONS.history}</button>
          <div class="catp-head-title">
            <strong>${escapeHtml(CONFIG.title)}</strong>
            <span id="catp-status">${escapeHtml(CONFIG.subtitle)}</span>
          </div>
          <button type="button" class="catp-icon-btn" id="catp-new" title="New chat">${ICONS.plus}</button>
          <button type="button" class="catp-icon-btn" id="catp-close" title="Close">${ICONS.close}</button>
        </header>
        <div class="catp-messages" id="catp-messages"></div>
        <form class="catp-composer" id="catp-form">
          <div class="catp-composer-box">
            <textarea id="catp-input" rows="1" placeholder="${escapeHtml(
              CONFIG.placeholder
            )}"></textarea>
            <button type="submit" class="catp-send" id="catp-send" disabled>${ICONS.send}</button>
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
    els.status = document.getElementById("catp-status");
    els.composer = els.form;

    document.getElementById("catp-close").addEventListener("click", close);
    document.getElementById("catp-new").addEventListener("click", resetChat);
    document.getElementById("catp-history").addEventListener("click", toggleHistory);
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
    els.messages.addEventListener("click", onMessageClick);

    window.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        state.open ? close() : open();
      }
      if (event.key === "Escape" && state.open) {
        if (state.view === "history") showChat();
        else close();
      }
    });

    render();
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
    button.innerHTML = `${ICONS.sparkle}<span class="catp-ask-btn-label">Ask Copilot</span><span class="catp-kbd">⌘I</span>`;
    button.addEventListener("click", () => (state.open ? close() : open()));
    (search.parentElement || search).appendChild(button);
  }

  function open(prefill) {
    state.open = true;
    els.sidebar.classList.add("open");
    els.float.classList.add("catp-hidden");
    if (prefill) els.input.value = prefill;
    els.send.disabled = state.busy || !els.input.value.trim();
    setTimeout(() => els.input.focus(), 50);
  }

  function close() {
    state.open = false;
    state.view = "chat";
    els.sidebar.classList.remove("open");
    els.float.classList.remove("catp-hidden");
    render();
  }

  function toggleHistory() {
    if (state.view === "history") {
      state.view = "chat";
      render();
      return;
    }
    state.view = "history";
    render();
    loadSessions();
  }

  function showChat() {
    state.view = "chat";
    render();
    els.input.focus();
  }

  async function resetChat() {
    state.conversationId = null;
    state.messages = [];
    state.view = "chat";
    persistActive();
    render();
    els.input.focus();
    try {
      const client = await ensureClient();
      const created = await client.conversations.create({
        agent_id: CONFIG.agentId,
        external_user_id: state.visitorId,
        user_display_name: "Docs visitor",
      });
      if (created?.id) {
        state.conversationId = Number(created.id);
        persistActive();
      }
    } catch (error) {
      console.warn("Could not create conversation", error);
    }
  }

  function setTyping(on) {
    state.typing = on;
    if (els.status) els.status.textContent = CONFIG.subtitle;
  }

  function currentAgent() {
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      if (state.messages[i].role === "agent") return state.messages[i];
    }
    return null;
  }

  function upsertTool(payload, status) {
    let agent = currentAgent();
    if (!agent) {
      agent = { role: "agent", content: "", tools: [] };
      state.messages.push(agent);
    }
    agent.tools = agent.tools || [];
    const next = normalizeTool(payload, status);
    const index = agent.tools.findIndex((tool) => tool.id === next.id || tool.name === next.name);
    if (index >= 0) agent.tools[index] = { ...agent.tools[index], ...next, open: agent.tools[index].open };
    else agent.tools.push(next);
  }

  function renderTool(tool, messageIndex, toolIndex) {
    const open = tool.open ? "open" : "";
    return `
      <div class="catp-tool ${tool.status} ${open}" data-msg="${messageIndex}" data-tool="${toolIndex}">
        <button type="button" class="catp-tool-head" data-toggle-tool="${messageIndex}:${toolIndex}">
          <span class="catp-tool-caret">${ICONS.chevron}</span>
          <span class="catp-tool-name">${escapeHtml(tool.name)}</span>
          <span class="catp-tool-status" title="${tool.status}">${statusIcon(tool.status)}</span>
        </button>
        <div class="catp-tool-body">
          <div class="catp-tool-pane">
            <div class="catp-tool-label">Request</div>
            <pre>${escapeHtml(pretty(tool.request))}</pre>
          </div>
          <div class="catp-tool-pane">
            <div class="catp-tool-label">Response</div>
            <pre>${escapeHtml(tool.status === "running" ? "Running…" : pretty(tool.response))}</pre>
          </div>
        </div>
      </div>
    `;
  }

  function renderHistory() {
    if (state.loadingHistory) {
      els.messages.innerHTML = `
        <div class="catp-empty">
          <div class="catp-empty-mark">${ICONS.spin}</div>
          <h3>Loading chats</h3>
          <p>Fetching conversations from Studio.</p>
        </div>
      `;
      return;
    }
    if (!state.threads.length) {
      els.messages.innerHTML = `
        <div class="catp-empty">
          <div class="catp-empty-mark">${ICONS.history}</div>
          <h3>No chats yet</h3>
          <p>Ask something and it will show up here.</p>
        </div>
      `;
      return;
    }
    els.messages.innerHTML = `
      <div class="catp-history">
        <div class="catp-history-label">Recent chats</div>
        ${state.threads
          .map((thread) => {
            const when = thread.updatedAt
              ? new Date(thread.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "";
            return `
              <button type="button" class="catp-thread ${thread.id === state.conversationId ? "active" : ""}" data-thread="${thread.id}">
                <strong>${escapeHtml(thread.title || "Conversation")}</strong>
                <small>${escapeHtml(thread.preview || "Open conversation")}</small>
                <em>${escapeHtml(when)}</em>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderChat() {
    if (!state.messages.length) {
      els.messages.innerHTML = `
        <div class="catp-empty">
          <div class="catp-empty-mark">${ICONS.sparkle}</div>
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
      return;
    }

    els.messages.innerHTML = state.messages
      .map((message, index) => {
        if (message.role === "user") {
          return `<div class="catp-row user"><div class="catp-bubble">${escapeHtml(message.content)}</div></div>`;
        }
        const tools = (message.tools || []).map((tool, toolIndex) => renderTool(tool, index, toolIndex)).join("");
        const typing = !message.content && state.typing;
        const body = typing
          ? `<div class="catp-typing"><span class="catp-dots"><i></i><i></i><i></i></span></div>`
          : renderMarkdown(message.content);
        return `
          <div class="catp-row agent">
            <div class="catp-avatar">${ICONS.sparkle}</div>
            <div class="catp-col">
              ${tools}
              ${message.content || typing ? `<div class="catp-bubble">${body}</div>` : ""}
            </div>
          </div>
        `;
      })
      .join("");
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function render() {
    if (!els.messages) return;
    els.composer.classList.toggle("catp-hidden", state.view === "history");
    if (state.view === "history") renderHistory();
    else renderChat();
  }

  function onMessageClick(event) {
    const starter = event.target.closest("[data-starter]");
    if (starter) {
      submit(CONFIG.starters[Number(starter.dataset.starter)].prompt);
      return;
    }
    const thread = event.target.closest("[data-thread]");
    if (thread) {
      openThread(thread.dataset.thread);
      return;
    }
    const toggle = event.target.closest("[data-toggle-tool]");
    if (toggle) {
      const [msgIndex, toolIndex] = toggle.dataset.toggleTool.split(":").map(Number);
      const tool = state.messages[msgIndex]?.tools?.[toolIndex];
      if (tool) {
        tool.open = !tool.open;
        render();
      }
    }
  }

  async function openThread(threadId) {
    const id = Number(threadId);
    if (!id) return;
    state.conversationId = id;
    state.view = "chat";
    persistActive();
    state.messages = [];
    render();
    try {
      const client = await ensureClient();
      const page = await client.messages.list(id);
      const rows = await pageToArray(page);
      state.messages = (rows || []).map((row) => ({
        role: row.sender === "user" || row.role === "user" ? "user" : "agent",
        content: row.content || "",
        tools: Array.isArray(row.tool_calls) ? row.tool_calls.map((tool) => normalizeTool(tool, "success")) : [],
      }));
      render();
    } catch (error) {
      console.warn("Could not load conversation", error);
    }
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
    const mod = await import(`https://esm.sh/@chatatp/studio@${CONFIG.sdkVersion}?bundle`);
    const Client = mod.ChatATPClient || mod.default?.ChatATPClient || mod.default;
    state.client = new Client({ apiKey: CONFIG.apiKey, baseUrl: CONFIG.baseUrl });
    return state.client;
  }

  function extractDelta(data) {
    if (data == null) return "";
    if (typeof data === "string") return data;
    return data.delta || data.text || data.content || "";
  }

  function captureConversation(event) {
    const id =
      event?.conversation?.id ||
      event?.data?.conversation_id ||
      event?.data?.conversation?.id;
    if (!id) return;
    state.conversationId = Number(id);
    persistActive();
  }

  async function submit(raw) {
    const text = String(raw || "").trim();
    if (!text || state.busy) return;

    state.view = "chat";
    state.busy = true;
    els.send.disabled = true;
    els.input.value = "";
    els.input.style.height = "auto";
    setTyping(true);

    state.messages.push({ role: "user", content: text });
    state.messages.push({ role: "agent", content: "", tools: [] });
    persistActive();
    render();
    open();

    const context = pageContext();
    const prompt = `The user is reading ${context.title} (${context.path}).\n\n${text}`;

    try {
      const client = await ensureClient();
      const stream = state.conversationId
        ? client.messages.stream(state.conversationId, { content: prompt })
        : client.chatStream({
            agent_id: CONFIG.agentId,
            external_user_id: state.visitorId,
            user_display_name: "Docs visitor",
            message: prompt,
            metadata: { source: "mintlify-docs", ...context },
          });

      for await (const event of stream) {
        captureConversation(event);
        if (event.type === "tool.execution.started") {
          upsertTool(event.data || {}, "running");
          render();
        }
        if (event.type === "tool.execution.completed") {
          upsertTool(event.data || {}, event.data?.ok === false ? "failed" : "success");
          render();
        }
        if (event.type === "agent.response.delta") {
          const last = currentAgent();
          if (last) last.content += extractDelta(event.data);
          render();
        }
        if (event.type === "agent.response.completed") {
          const last = currentAgent();
          const finalText =
            extractDelta(event.data) || event.data?.agent_message?.content || last?.content;
          if (last) last.content = finalText || last.content;
          if (Array.isArray(event.data?.tool_calls)) {
            event.data.tool_calls.forEach((tool) => upsertTool(tool, "success"));
          }
          setTyping(false);
          persistActive();
          render();
          loadSessions();
        }
        if (event.type === "error") {
          throw new Error(extractDelta(event.data) || event.data?.message || "The agent could not answer.");
        }
      }

      const last = currentAgent();
      if (last && !last.content && !(last.tools || []).length) {
        last.content = "I could not generate a reply. Try asking again.";
      }
    } catch (error) {
      const last = currentAgent();
      if (last) last.content = error?.message || "Something went wrong talking to the support agent.";
    } finally {
      state.busy = false;
      setTyping(false);
      els.send.disabled = !els.input.value.trim();
      persistActive();
      loadSessions();
      render();
    }
  }

  function boot() {
    mount();
    injectAskButton();
    loadSessions().then(() => {
      if (state.conversationId) openThread(state.conversationId);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  const observer = new MutationObserver(() => injectAskButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();