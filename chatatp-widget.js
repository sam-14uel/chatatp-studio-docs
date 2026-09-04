// (function () {
//   if (window.__chatatpWidgetLoaded) return;
//   window.__chatatpWidgetLoaded = true;

//   const SCRIPT_SRC = "https://esm.sh/@chatatp/studio@0.2.0/web";
//   const API_KEY = "chatatp_sk_Hhu1nwRn5Gr5W9s9bDwSiCswrHaGgSPHaszKiBRkM_I"; // publishable widget / client key
//   const AGENT_ID = "1"; // your agent id
//   const BASE_URL = "https://chatatp-agent-builder-backend.onrender.com";

//   function mount() {
//     if (document.querySelector("chatatp-copilot-button")) return;

//     const el = document.createElement("chatatp-copilot-button");
//     el.setAttribute("apiKey", API_KEY);
//     el.setAttribute("agentId", AGENT_ID);
//     el.setAttribute("mode",
//         "popup");
//     el.setAttribute("position",
//         "right");
//     el.setAttribute("baseUrl", BASE_URL);
//     el.setAttribute("userId",
//         "docs-visitor");
//     el.setAttribute("userDisplayName",
//         "Docs visitor");
//     el.setAttribute("placeholder",
//         "Ask this agent…");
//     el.setAttribute("status-text",
//         "Ask anything about ChatATP Studio.");
//     el.setAttribute("input-placeholder",
//         "Ask your agent…");
//     el.setAttribute("empty-heading",
//         "What do you want to know?");
//     el.setAttribute("empty-subheading",
//         "Ask freely or pick a starter.");
//     el.setAttribute(
//       "quick-actions-json",
//       JSON.stringify([
//             {
//           title: "How do I create an agent?",
//           subtitle: "Walk through setup",
//           prompt: "How do I create an agent in ChatATP Studio?",
//             },
//             {
//           title: "Embed the Copilot",
//           subtitle: "Widget + SDK",
//           prompt: "How do I embed the ChatATP Copilot widget?",
//             },
//         ])
//     );

//     document.body.appendChild(el);
//     }

//   const script = document.createElement("script");
//   script.type = "module";
//   script.src = SCRIPT_SRC;
//   script.async = true;
//   script.onload = mount;
//   document.head.appendChild(script);
// })();