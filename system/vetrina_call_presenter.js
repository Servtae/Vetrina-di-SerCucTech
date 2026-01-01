SCT_OK_v1
/* SerCucTech — WhatsApp+Telegram + Presenter + Remote Laser/Marker (P2P codes)
   + SEND/RECV toggles
   + Marker con testo
   + Clear: Local / Remote / All
*/
(() => {
  if (!/\/vetrina\.html(\?|$)/i.test(location.pathname)) return;

  const CONTACT_URL = "/system/contact.json";
  const FALLBACK = { whatsappPhone: "+393208852858", telegramUser: "sercuctech", brand: "SerCucTech" };

  const qp = new URLSearchParams(location.search);
  const vid = (qp.get("id") || "").trim();
  const vctx = (qp.get("ctx") || "Principale").trim() || "Principale";
  const vetrinaUrl = location.href;

  const vTitle =
    (document.querySelector("h1")?.textContent ||
      document.querySelector("h2")?.textContent ||
      "Vetrina").trim().slice(0, 80);

  const msg = [
    "📹 Videochiamata SerCucTech",
    `Vetrina: ${vTitle}`,
    `ID: ${vid || "-"}`,
    `Contesto: ${vctx}`,
    "",
    "Apri questa vetrina e avvia CONDIVISIONE SCHERMO durante la chiamata:",
    vetrinaUrl,
    "",
    "Usa: 🎯 Modalità Spiega (laser+marker) e 🔁 Laser Remoto (puntatore bidirezionale)."
  ].join("\n");

  const STUN = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];

  function digitsPhone(p) { return String(p || "").replace(/[^\d]/g, ""); }

  async function loadContact() {
    try {
      const r = await fetch(CONTACT_URL, { cache: "no-store" });
      if (!r.ok) return FALLBACK;
      const j = await r.json();
      return { ...FALLBACK, ...j };
    } catch { return FALLBACK; }
  }

  function toast(text) {
    let t = document.getElementById("sctToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "sctToast";
      t.style.cssText =
        "position:fixed;left:14px;right:14px;bottom:86px;z-index:99998;" +
        "max-width:980px;margin:0 auto;padding:10px 12px;border-radius:16px;" +
        "border:1px solid rgba(212,175,55,.28);background:rgba(0,0,0,.45);" +
        "color:#f3f0e6;box-shadow:0 18px 55px rgba(0,0,0,.35);display:none;backdrop-filter:blur(8px)";
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.style.display = "none"), 1800);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
  }

  function b64e(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64d(str) { return decodeURIComponent(escape(atob(str.trim()))); }

  function safeLabel(s) {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    return t.slice(0, 28);
  }

  function buildUI() {
    const wrap = document.createElement("div");
    wrap.id = "sctCallPresenter";
    wrap.innerHTML = `
      <style>
        #sctCallPresenter{position:fixed;right:14px;bottom:14px;z-index:99999;display:flex;flex-direction:column;gap:10px}
        #sctCallPresenter .btn{
          width:58px;height:58px;border-radius:18px;display:flex;align-items:center;justify-content:center;
          border:1px solid rgba(212,175,55,.35);background:rgba(0,0,0,.35);color:#f3f0e6;font-weight:1000;
          text-decoration:none;box-shadow:0 18px 55px rgba(0,0,0,.55);backdrop-filter:blur(8px);user-select:none
        }
        #sctCallPresenter .btn.primary{
          background:linear-gradient(180deg, rgba(255,222,122,.95), rgba(212,175,55,.80));
          color:#000;
        }

        #sctPresenterLayer{
          position:fixed;inset:0;z-index:99997;pointer-events:none;display:none;
        }
        #sctPointerLocal, #sctPointerRemote{
          position:absolute;width:22px;height:22px;border-radius:999px;
          transform:translate(-50%,-50%);
          box-shadow:0 0 0 2px rgba(0,0,0,.35);
        }
        #sctPointerLocal{ border:3px solid rgba(255,222,122,.95); }
        #sctPointerRemote{ border:3px dashed rgba(90,200,250,.95); }

        .sctMarker{
          position:absolute; transform:translate(-50%,-50%);
          min-height:26px; padding:0 10px;
          border-radius:999px;
          background:rgba(0,0,0,.60);
          color:#fff; font-weight:1000; font-size:14px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 14px 40px rgba(0,0,0,.55);
          border:1px solid rgba(212,175,55,.55);
          max-width:70vw;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .sctMarker.remote{ border:1px dashed rgba(90,200,250,.95); }
        .sctMarker::after{
          content:""; position:absolute; left:50%; top:100%; width:0; height:0;
          border-left:6px solid transparent; border-right:6px solid transparent;
          border-top:10px solid rgba(0,0,0,.60); transform:translateX(-50%);
        }

        #sctRemotePanel{
          position:fixed; left:14px; right:14px; top:14px; z-index:99996;
          max-width:980px; margin:0 auto;
          display:none;
          border:1px solid rgba(212,175,55,.28);
          background:rgba(0,0,0,.55);
          border-radius:16px;
          padding:12px;
          backdrop-filter: blur(8px);
          box-shadow:0 18px 55px rgba(0,0,0,.45);
          color:#f3f0e6;
        }
        #sctRemotePanel h3{margin:0 0 8px;font-size:16px}
        #sctRemotePanel .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        #sctRemotePanel textarea{
          width:100%; min-height:92px; resize:vertical;
          border-radius:12px; border:1px solid rgba(212,175,55,.28);
          background:rgba(0,0,0,.35); color:#f3f0e6;
          padding:10px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size:12px;
        }
        #sctRemotePanel .mini{
          padding:10px 12px; border-radius:12px; border:1px solid rgba(212,175,55,.35);
          background:rgba(0,0,0,.25); color:#f3f0e6; font-weight:900;
        }
        #sctRemotePanel .mini.primary{
          background:linear-gradient(180deg, rgba(255,222,122,.95), rgba(212,175,55,.80));
          color:#000;
        }
        #sctRemotePanel .status{opacity:.9;font-size:13px}
        #sctRemotePanel .tog{
          display:flex; gap:10px; flex-wrap:wrap; align-items:center;
          padding:8px; border-radius:12px; border:1px solid rgba(212,175,55,.22);
          background:rgba(0,0,0,.25);
        }
        #sctRemotePanel .tog button{
          padding:10px 12px; border-radius:12px; border:1px solid rgba(212,175,55,.35);
          background:rgba(0,0,0,.25); color:#f3f0e6; font-weight:1000;
        }
        #sctRemotePanel .tog button.on{
          background:linear-gradient(180deg, rgba(90,200,250,.95), rgba(30,140,200,.85));
          color:#000;
          border-color:rgba(90,200,250,.95);
        }
        #sctRemotePanel .sep{height:8px}
      </style>

      <a class="btn primary" id="btnWA" href="#" aria-label="Apri WhatsApp con messaggio">🟢</a>
      <a class="btn" id="btnTG" href="#" aria-label="Apri Telegram e copia messaggio">✈️</a>

      <a class="btn primary" id="btnPresenter" href="#" aria-label="Modalità Spiega (laser+marker)">🎯</a>
      <a class="btn" id="btnClearAll" href="#" aria-label="Pulisci marker (tutti)">🧽</a>

      <a class="btn primary" id="btnRemote" href="#" aria-label="Laser Remoto (bidirezionale)">🔁</a>

      <a class="btn" id="btnCopyLink" href="#" aria-label="Copia link vetrina">🔗</a>

      <div id="sctPresenterLayer">
        <div id="sctPointerLocal"></div>
        <div id="sctPointerRemote"></div>
      </div>

      <div id="sctRemotePanel">
        <h3>Laser Remoto — Bidirezionale</h3>
        <div class="status" id="sctRemoteStatus">Stato: OFF</div>

        <div class="sep"></div>
        <div class="tog">
          <button id="btnSend" class="on">INVIA: ON</button>
          <button id="btnRecv" class="on">RICEVI: ON</button>
          <span class="status">Suggerimento: spegni INVIA o RICEVI quando serve.</span>
        </div>

        <div class="sep"></div>
        <div class="row">
          <button class="mini" id="btnClearLocal">PULISCI LOCAL</button>
          <button class="mini" id="btnClearRemote">PULISCI REMOTE</button>
          <button class="mini" id="btnClearBoth">PULISCI TUTTO</button>
        </div>

        <div class="sep"></div>
        <div class="row">
          <button class="mini primary" id="btnHost">1) CREA CODICE (HOST)</button>
          <button class="mini" id="btnJoin">2) INSERISCI CODICE (JOIN)</button>
          <button class="mini" id="btnApplyAnswer">3) APPLICA RISPOSTA (HOST)</button>
          <button class="mini" id="btnDisconnect">DISCONNETTI</button>
          <button class="mini" id="btnClosePanel">CHIUDI</button>
        </div>

        <div class="sep"></div>
        <div class="status">CODICE / RISPOSTA (copia-incolla via chat durante la chiamata):</div>
        <textarea id="txtCode" placeholder="Qui comparirà il codice oppure incolla quello ricevuto..."></textarea>

        <div class="sep"></div>
        <div class="row">
          <button class="mini" id="btnCopyCode">COPIA</button>
          <button class="mini" id="btnClearCode">SVUOTA</button>
          <span class="status">Durante WhatsApp/Telegram incolla questo testo in chat.</span>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    return wrap;
  };

  const cfg = await loadContact().catch(() => FALLBACK);
  const wrap = buildUI();

  // --- bind top buttons ---
  const waDigits = digitsPhone(cfg.whatsappPhone);
  const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`
                         : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const tgUser = String(cfg.telegramUser || "sercuctech").replace(/^@/, "");
  const tgChat = `https://t.me/${encodeURIComponent(tgUser)}`;

  wrap.querySelector("#btnWA").onclick = (e) => { e.preventDefault(); window.open(waUrl, "_blank", "noopener"); };
  wrap.querySelector("#btnTG").onclick = async (e) => {
    e.preventDefault();
    const ok = await copy(msg);
    if (ok) toast("Messaggio copiato ✅ (incolla su Telegram)");
    else prompt("Copia questo messaggio:", msg);
    window.open(tgChat, "_blank", "noopener");
  };
  wrap.querySelector("#btnCopyLink").onclick = async (e) => {
    e.preventDefault();
    const ok = await copy(vetrinaUrl);
    if (ok) toast("Link vetrina copiato ✅");
    else prompt("Copia link vetrina:", vetrinaUrl);
  };

  // presenter refs
  const layer = wrap.querySelector("#sctPresenterLayer");
  const ptrLocal = wrap.querySelector("#sctPointerLocal");
  const ptrRemote = wrap.querySelector("#sctPointerRemote");

  let presenterOn = false;
  let localN = 0;
  let remoteN = 0;

  // panel refs
  let remotePanelOn = false;
  const panel = wrap.querySelector("#sctRemotePanel");
  const statusEl = wrap.querySelector("#sctRemoteStatus");
  const txt = wrap.querySelector("#txtCode");

  // toggles
  let sendEnabled = true;
  let recvEnabled = true;
  const btnSend = wrap.querySelector("#btnSend");
  const btnRecv = wrap.querySelector("#btnRecv");

  function syncToggleUI() {
    btnSend.classList.toggle("on", sendEnabled);
    btnSend.textContent = "INVIA: " + (sendEnabled ? "ON" : "OFF");
    btnRecv.classList.toggle("on", recvEnabled);
    btnRecv.textContent = "RICEVI: " + (recvEnabled ? "ON" : "OFF");
  }
  syncToggleUI();

  btnSend.onclick = (e) => { e.preventDefault(); sendEnabled = !sendEnabled; syncToggleUI(); toast("INVIA " + (sendEnabled ? "ON ✅" : "OFF")); };
  btnRecv.onclick = (e) => { e.preventDefault(); recvEnabled = !recvEnabled; syncToggleUI(); toast("RICEVI " + (recvEnabled ? "ON ✅" : "OFF")); };

  // WebRTC objects
  let pc = null;
  let dc = null;

  function setPresenter(on) {
    presenterOn = !!on;
    layer.style.display = presenterOn ? "block" : "none";
    toast(presenterOn ? "Modalità Spiega ON ✅ (tap=marker, doppio tap=marker+testo)" : "Modalità Spiega OFF");
  }
  function moveLocal(x, y) { ptrLocal.style.left = x + "px"; ptrLocal.style.top = y + "px"; }
  function moveRemote(x, y) { ptrRemote.style.left = x + "px"; ptrRemote.style.top = y + "px"; }

  function addMarker(x, y, isRemote=false, label="") {
    const m = document.createElement("div");
    m.className = "sctMarker" + (isRemote ? " remote" : "");
    const lbl = safeLabel(label);
    if (isRemote) { remoteN += 1; m.textContent = "R" + remoteN + (lbl ? " • " + lbl : ""); }
    else { localN += 1; m.textContent = String(localN) + (lbl ? " • " + lbl : ""); }
    m.style.left = x + "px";
    m.style.top = y + "px";
    layer.appendChild(m);

    let t = 0;
    m.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const now = Date.now();
      if (now - t < 350) m.remove();
      t = now;
    });
  }

  function clearLocal(alsoNotify=false) {
    [...layer.querySelectorAll(".sctMarker:not(.remote)")].forEach(x => x.remove());
    localN = 0;
    toast("Puliti marker LOCAL ✅");
    if (alsoNotify && dc && dc.readyState === "open" && sendEnabled) dc.send(JSON.stringify({ t: "clearLocal" }));
  }
  function clearRemote(alsoNotify=false) {
    [...layer.querySelectorAll(".sctMarker.remote")].forEach(x => x.remove());
    remoteN = 0;
    toast("Puliti marker REMOTE ✅");
    if (alsoNotify && dc && dc.readyState === "open" && sendEnabled) dc.send(JSON.stringify({ t: "clearRemote" }));
  }
  function clearAll(alsoNotify=false) {
    [...layer.querySelectorAll(".sctMarker")].forEach(x => x.remove());
    localN = 0; remoteN = 0;
    toast("Puliti marker TUTTI ✅");
    if (alsoNotify && dc && dc.readyState === "open" && sendEnabled) dc.send(JSON.stringify({ t: "clearAll" }));
  }

  function norm(x, y) {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    return { nx: Math.max(0, Math.min(1, x / w)), ny: Math.max(0, Math.min(1, y / h)) };
  }
  function denorm(nx, ny) {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    return { x: nx * w, y: ny * h };
  }

  // movement + marker send
  const onMove = (ev) => {
    if (!presenterOn) return;
    const p = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
    const x = p.clientX, y = p.clientY;
    moveLocal(x, y);
    if (dc && dc.readyState === "open" && sendEnabled) {
      const { nx, ny } = norm(x, y);
      dc.send(JSON.stringify({ t: "move", nx, ny }));
    }
  };

  const onTap = (ev, forceText=false) => {
    if (!presenterOn) return;
    const p = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
    const x = p.clientX, y = p.clientY;

    let label = "";
    if (forceText || ev.shiftKey) {
      label = safeLabel(prompt("Testo del marker (facoltativo):", "") || "");
    }

    addMarker(x, y, false, label);

    if (dc && dc.readyState === "open" && sendEnabled) {
      const { nx, ny } = norm(x, y);
      dc.send(JSON.stringify({ t: "mark", nx, ny, label }));
    }
  };

  // mobile double-tap = marker+text
  let lastTap = 0;
  const onTouchStart = (e) => {
    const now = Date.now();
    const dbl = (now - lastTap) < 320;
    lastTap = now;
    onTap(e, dbl);
  };

  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("click", (e) => onTap(e, false), { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });

  wrap.querySelector("#btnPresenter").onclick = (e) => { e.preventDefault(); setPresenter(!presenterOn); };
  wrap.querySelector("#btnClearAll").onclick = (e) => { e.preventDefault(); if (!presenterOn) setPresenter(true); clearAll(true); };

  function setPanel(on) {
    remotePanelOn = !!on;
    panel.style.display = remotePanelOn ? "block" : "none";
    if (remotePanelOn) toast("Laser Remoto: collega HOST/JOIN. Toggle INVIA/RICEVI quando serve.");
  }
  function setStatus(text) { statusEl.textContent = "Stato: " + text; }

  wrap.querySelector("#btnRemote").onclick = (e) => { e.preventDefault(); setPanel(!remotePanelOn); };
  wrap.querySelector("#btnClosePanel").onclick = (e) => { e.preventDefault(); setPanel(false); };

  wrap.querySelector("#btnClearLocal").onclick = (e) => { e.preventDefault(); clearLocal(true); };
  wrap.querySelector("#btnClearRemote").onclick = (e) => { e.preventDefault(); clearRemote(true); };
  wrap.querySelector("#btnClearBoth").onclick = (e) => { e.preventDefault(); clearAll(true); };

  wrap.querySelector("#btnCopyCode").onclick = async (e) => {
    e.preventDefault();
    const s = txt.value.trim();
    if (!s) return toast("Niente da copiare");
    const ok = await copy(s);
    if (ok) toast("Copiato ✅ (incolla in chat)");
    else prompt("Copia questo:", s);
  };
  wrap.querySelector("#btnClearCode").onclick = (e) => { e.preventDefault(); txt.value = ""; toast("Svuotato"); };

  // WebRTC helpers
  async function makePC() {
    const _pc = new RTCPeerConnection({ iceServers: STUN });
    _pc.oniceconnectionstatechange = () => {
      const st = _pc.iceConnectionState;
      if (st === "connected" || st === "completed") {
        setStatus("CONNESSO ✅");
        if (!presenterOn) setPresenter(true);
        toast("Connesso ✅ Laser/marker remoti pronti.");
      } else if (st === "disconnected" || st === "failed" || st === "closed") {
        setStatus("OFF");
      } else setStatus(st);
    };
    _pc.ondatachannel = (ev) => { dc = ev.channel; bindDC(); };
    return _pc;
  }

  function bindDC() {
    if (!dc) return;
    dc.onclose = () => { setStatus("OFF"); };
    dc.onmessage = (ev) => {
      if (!recvEnabled) return;
      try {
        const m = JSON.parse(ev.data);
        if (m.t === "move") {
          const { x, y } = denorm(m.nx, m.ny);
          moveRemote(x, y);
        } else if (m.t === "mark") {
          const { x, y } = denorm(m.nx, m.ny);
          addMarker(x, y, true, m.label || "");
        } else if (m.t === "clearAll") {
          clearAll(false);
          toast("Pulizia remota: TUTTO 🧽");
        } else if (m.t === "clearLocal") {
          clearRemote(false); // i loro local = i nostri remote
          toast("Pulizia remota: REMOTE 🧽");
        } else if (m.t === "clearRemote") {
          clearLocal(false); // i loro remote = i nostri local
          toast("Pulizia remota: LOCAL 🧽");
        }
      } catch {}
    };
  }

  async function waitIceGathering(_pc) {
    if (_pc.iceGatheringState === "complete") return;
    await new Promise((resolve) => {
      const on = () => {
        if (_pc.iceGatheringState === "complete") {
          _pc.removeEventListener("icegatheringstatechange", on);
          resolve();
        }
      };
      _pc.addEventListener("icegatheringstatechange", on);
    });
  }

  async function hostCreateCode() {
    pc?.close?.();
    pc = await makePC();
    dc = pc.createDataChannel("sct-pointer");
    bindDC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIceGathering(pc);
    txt.value = b64e(JSON.stringify(pc.localDescription));
    setStatus("HOST: invia codice");
    toast("HOST ✅ Copia e invia il codice all’altro.");
  }

  async function joinWithCode() {
    const code = txt.value.trim();
    if (!code) return toast("Incolla codice HOST");
    pc?.close?.();
    pc = await makePC();
    let desc;
    try { desc = JSON.parse(b64d(code)); }
    catch { return toast("Codice non valido"); }
    await pc.setRemoteDescription(desc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitIceGathering(pc);
    txt.value = b64e(JSON.stringify(pc.localDescription));
    setStatus("JOIN: invia RISPOSTA");
    toast("JOIN ✅ Copia e rimanda la RISPOSTA all’HOST.");
  }

  async function hostApplyAnswer() {
    const code = txt.value.trim();
    if (!pc) return toast("Prima: CREA CODICE (HOST)");
    if (!code) return toast("Incolla la RISPOSTA del JOIN");
    let desc;
    try { desc = JSON.parse(b64d(code)); }
    catch { return toast("Risposta non valida"); }
    await pc.setRemoteDescription(desc);
    setStatus("Collegamento…");
    toast("Risposta applicata ✅ attendi connessione…");
  }

  function disconnect() {
    try { dc?.close?.(); } catch {}
    try { pc?.close?.(); } catch {}
    dc = null; pc = null;
    setStatus("OFF");
    toast("Disconnesso");
  }

  wrap.querySelector("#btnHost").onclick = (e) => { e.preventDefault(); hostCreateCode(); };
  wrap.querySelector("#btnJoin").onclick = (e) => { e.preventDefault(); joinWithCode(); };
  wrap.querySelector("#btnApplyAnswer").onclick = (e) => { e.preventDefault(); hostApplyAnswer(); };
  wrap.querySelector("#btnDisconnect").onclick = (e) => { e.preventDefault(); disconnect(); };
})();
/* end */
