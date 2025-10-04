/* ai_client_patch.js
 * Netiquette KI-Bot: automatische, leicht abgesetzte Rückmeldung
 * - Keine Layoutänderung, nur Logik-Erweiterung
 * - Antwort erscheint im bestehenden Chatbereich als Box "Antwort vom Netiquette-Coach"
 * - "Netiquette-Coach tippt …" für exakt 2 Sekunden, dann Antwort
 * Integration: <script src="ai_client_patch.js"></script> direkt vor </body> in index.html
 */

(function(){
  // === Konfiguration ===
  const AI_ENDPOINT = "https://chat-netiquette.vercel.app/api/ask"; // Deine Vercel-URL
  const MIN_LEN = 2;            // Mindestlänge der Schülernachricht
  const TYPING_MS = 2000;       // "Coach tippt …" Dauer: 2 Sekunden
  const TIMEOUT_MS = 12000;     // Netzwerk-Timeout 12s

  // Hilfsfunktionen
  function $(id){ return document.getElementById(id); }
  function getChatContainer(){
    return document.getElementById("chat") || document.body;
  }

  function addCoachTyping(){
    const wrap = document.createElement("div");
    wrap.id = "coach-typing";
    wrap.style.margin = "8px 0";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "8px";

    const dot = document.createElement("span");
    dot.textContent = "🧠";
    dot.setAttribute("aria-hidden","true");

    const p = document.createElement("span");
    p.textContent = "Netiquette-Coach tippt …";
    p.style.fontSize = "12px";
    p.style.opacity = "0.75";

    wrap.appendChild(dot);
    wrap.appendChild(p);
    getChatContainer().appendChild(wrap);
    getChatContainer().scrollTop = getChatContainer().scrollHeight;
    return wrap;
  }

  function removeCoachTyping(){
    const t = document.getElementById("coach-typing");
    if (t && t.parentNode) t.parentNode.removeChild(t);
  }

  function renderCoachReply(text){
    // Leicht abgesetzte Box, ohne globale Styles zu verändern
    const box = document.createElement("div");
    box.style.margin = "6px 0";
    box.style.padding = "8px 10px";
    box.style.borderRadius = "8px";
    box.style.background = "rgba(0,0,0,0.05)"; // sanftes Grau
    box.style.border = "1px solid rgba(0,0,0,0.06)";

    const header = document.createElement("div");
    header.textContent = "Antwort vom Netiquette-Coach";
    header.style.fontWeight = "600";
    header.style.fontSize = "12px";
    header.style.marginBottom = "4px";

    const body = document.createElement("div");
    body.textContent = text;

    box.appendChild(header);
    box.appendChild(body);
    getChatContainer().appendChild(box);
    getChatContainer().scrollTop = getChatContainer().scrollHeight;
  }

  async function askAI(text){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      return (data && data.reply) ? String(data.reply) : "Bitte achte auf respektvolle Sprache 🙂";
    } catch(e){
      clearTimeout(timer);
      return "Kleines Netzwerkproblem – versuch es gleich nochmal 😉";
    }
  }

  // Ursprüngliches handleSend sichern & erweitern
  const input = $("userText");
  const originalHandleSend = window.handleSend;

  window.handleSend = async function(){
    const msg = (input && input.value) ? input.value.trim() : "";
    // Original ausführen (damit die Nachricht sofort erscheint)
    if (typeof originalHandleSend === "function") {
      originalHandleSend.apply(this, arguments);
    }

    if (!msg || msg.length < MIN_LEN) return;
    if (msg.startsWith("/")) return; // einfache Commands ausschließen

    // 1) "Coach tippt …" anzeigen
    const typingEl = addCoachTyping();

    // 2) exakt 2 Sekunden warten
    await new Promise(r => setTimeout(r, TYPING_MS));

    // 3) Antwort anfordern
    const reply = await askAI(msg);

    // 4) Typing entfernen und Antwort anzeigen
    removeCoachTyping();
    renderCoachReply(reply);
  };

  // Enter-Key bleibt wie gehabt über das (überschriebene) handleSend aktiv
})();
