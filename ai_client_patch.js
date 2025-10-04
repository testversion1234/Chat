/* ai_client_patch.js (robust)
 * Fügt KI-Antworten als abgesetzte Box hinzu – unabhängig davon,
 * ob dein Code handleSend() nutzt oder eigene Event-Listener hat.
 */

(function(){
  const AI_ENDPOINT = "https://chat-netiquette.vercel.app/api/ask";
  const MIN_LEN = 2;
  const TYPING_MS = 2000;
  const TIMEOUT_MS = 12000;

  function $(id){ return document.getElementById(id); }
  function chatEl(){ return document.getElementById("chat") || document.body; }

  function addCoachTyping(){
    const wrap = document.createElement("div");
    wrap.id = "coach-typing";
    wrap.style.margin = "8px 0";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "8px";
    const dot = document.createElement("span"); dot.textContent = "🧠";
    const p = document.createElement("span"); p.textContent = "Netiquette-Coach tippt …";
    p.style.fontSize = "12px"; p.style.opacity = "0.75";
    wrap.appendChild(dot); wrap.appendChild(p);
    chatEl().appendChild(wrap); chatEl().scrollTop = chatEl().scrollHeight;
    return wrap;
  }
  function removeCoachTyping(){
    const t = document.getElementById("coach-typing");
    if (t && t.parentNode) t.parentNode.removeChild(t);
  }
  function renderCoachReply(text){
    const box = document.createElement("div");
    box.style.margin = "6px 0"; box.style.padding = "8px 10px";
    box.style.borderRadius = "8px";
    box.style.background = "rgba(0,0,0,0.05)";
    box.style.border = "1px solid rgba(0,0,0,0.06)";
    const header = document.createElement("div");
    header.textContent = "Antwort vom Netiquette-Coach";
    header.style.fontWeight = "600"; header.style.fontSize = "12px";
    header.style.marginBottom = "4px";
    const body = document.createElement("div"); body.textContent = text;
    box.appendChild(header); box.appendChild(body);
    chatEl().appendChild(box);
    chatEl().scrollTop = chatEl().scrollHeight;
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
      const data = await res.json().catch(()=>({}));
      return (data && data.reply) ? String(data.reply) : "Bitte achte auf respektvolle Sprache 🙂";
    } catch(e){
      clearTimeout(timer);
      return "Kleines Netzwerkproblem – versuch es gleich nochmal 😉";
    }
  }

  // zentrale Routine – wird von Click & Enter getriggert
  let lastTriggeredText = ""; // Duplikate vermeiden
  async function maybeTriggerAI(msg){
    const text = (msg||"").trim();
    if (!text || text.length < MIN_LEN) return;
    if (text === lastTriggeredText) return; // doppeltes Event vermeiden
    lastTriggeredText = text;

    const typingEl = addCoachTyping();
    await new Promise(r => setTimeout(r, TYPING_MS));
    const reply = await askAI(text);
    removeCoachTyping();
    renderCoachReply(reply);
  }

  // Hook 1: handleSend überschreiben (falls vorhanden)
  const input = $("userText");
  const originalHandleSend = window.handleSend;
  if (typeof originalHandleSend === "function"){
    window.handleSend = async function(){
      const msg = (input && input.value) ? input.value.trim() : "";
      originalHandleSend.apply(this, arguments);
      maybeTriggerAI(msg);
    };
  }

  // Hook 2: direkter Klick auf sendBtn
  const sendBtn = $("sendBtn");
  if (sendBtn && !sendBtn._aiHooked){
    sendBtn.addEventListener("click", function(){
      const msg = (input && input.value) ? input.value.trim() : "";
      // Wir rufen maybeTriggerAI vor dem Leeren auf – falls original Code erst danach leert,
      // fangen wir den Text trotzdem ab
      maybeTriggerAI(msg);
    }, true); // capture=true: läuft vor evtl. stopPropagation
    sendBtn._aiHooked = true;
  }

  // Hook 3: Enter-Taste im Textfeld
  if (input && !input._aiEnterHooked){
    input.addEventListener("keydown", function(e){
      if (e.key === "Enter"){
        const msg = (input && input.value) ? input.value.trim() : "";
        maybeTriggerAI(msg);
      }
    });
    input._aiEnterHooked = true;
  }

})();