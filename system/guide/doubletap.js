// GLOBAL GUIDE TOGGLE
function guideOff(){ try{ return localStorage.getItem("SCT_GUIDE_OFF")==="1"; }catch(e){ return false; } }

/* SerCucTech — DoubleTap Navigator + Voice Explain (anti-duplicati, anti-loop) */
(() => {
  if (window.__SC_DOUBLETAP_READY__) return;
  window.__SC_DOUBLETAP_READY__ = true;

  const DT_MS = 650;           // finestra doppio tap
  const SPEAK_COOLDOWN = 900;  // evita ripetizioni
  let lastTap = 0;
  let lastEl = null;
  let lastSpeakAt = 0;

  const pageName = () => (location.pathname.split("/").pop() || "index.html").replace(".html","");

  function getLang(){
    const l = (navigator.language || "en").toLowerCase();
    if (l.startsWith("it")) return "it";
    if (l.startsWith("uk") || l.startsWith("ua")) return "ua";
    return "en";
  }

  // testo “basso livello” (universale)
  const TEXT = {
    it: {
      hub:     { title:"HUB",     desc:"Torna alla Home del Mini-PC e ai collegamenti principali." },
      vetrine: { title:"Vetrine", desc:"Apri le vetrine pubbliche e i contenuti condivisibili." },
      control: { title:"Control", desc:"Pannello di controllo: remoto, rete, servizi e strumenti." },
      bios:    { title:"BIOS / PIN", desc:"Area sicurezza e PIN (per funzioni protette e utenti)." },
      note:    { title:"Note & Copia", desc:"Appunti persistenti: copia, salva e riprendi testo." },
      media:   { title:"File / Media", desc:"Gestione file e upload: immagini, video, documenti." },
      open:    "Se tocchi 2 volte di seguito, entri.",
      listening:"ascolto…",
      ready:"pronto"
    },
    en: {
      hub:     { title:"HUB",     desc:"Back to the Mini-PC Home and main shortcuts." },
      vetrine: { title:"Showcases", desc:"Open public showcases and shareable content." },
      control: { title:"Control", desc:"Control panel: remote, network, services, tools." },
      bios:    { title:"BIOS / PIN", desc:"Security area and PIN (protected features/users)." },
      note:    { title:"Notes & Copy", desc:"Persistent clipboard: save and reuse text." },
      media:   { title:"Files / Media", desc:"File manager and uploads: images, video, docs." },
      open:    "Double-tap to open.",
      listening:"listening…",
      ready:"ready"
    },
    ua: {
      hub:     { title:"HUB",     desc:"Повернення на головну та основні ярлики." },
      vetrine: { title:"Вітрини", desc:"Відкрити публічні вітрини та матеріали." },
      control: { title:"Control", desc:"Панель керування: віддалено, мережа, сервіси." },
      bios:    { title:"BIOS / PIN", desc:"Безпека та PIN (захищені функції/користувачі)." },
      note:    { title:"Нотатки", desc:"Постійні нотатки/буфер: зберегти й відновити." },
      media:   { title:"Файли", desc:"Файли та завантаження: фото, відео, документи." },
      open:    "Двічі торкніться, щоб відкрити.",
      listening:"слухаю…",
      ready:"готово"
    }
  };

  function setStatus(t){
    const s = document.getElementById("sc-status");
    if (s) s.textContent = t;
  }

  function stopSpeak(){
    try { speechSynthesis.cancel(); } catch(e){}
  }

  function speakOnce(text){
    const now = Date.now();
    if (now - lastSpeakAt < SPEAK_COOLDOWN) return;
    lastSpeakAt = now;

    const lang = getLang();
    stopSpeak();

    try{
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "it" ? "it-IT" : (lang === "ua" ? "uk-UA" : "en-US");
      u.onstart = () => setStatus(TEXT[lang].listening);
      u.onend   = () => setStatus(TEXT[lang].ready);
      u.onerror = () => setStatus(TEXT[lang].ready);
      speechSynthesis.speak(u);
    } catch(e){
      // niente
    }
  }

  function norm(s){ return (s||"").toLowerCase().trim(); }

  function inferKeyFromElement(el){
    // 1) data-flow manuale (se presente)
    const df = el.getAttribute && el.getAttribute("data-flow");
    if (df) return norm(df);

    // 2) href (se link)
    const a = el.closest ? el.closest("a[href]") : null;
    const href = norm(a ? a.getAttribute("href") : "");
    const txt  = norm(el.textContent || "");

    // mapping robusto
    if (href.includes("vetrine")) return "vetrine";
    if (href.includes("control")) return "control";
    if (href.includes("bios"))    return "bios";
    if (href.includes("note") || href.includes("appunti") || href.includes("clipboard") || href.includes("#note")) return "note";
    if (href.includes("media") || href.includes("file") || href.includes("manager") || href.includes("upload")) return "media";
    if (href.includes("index") || href === "/" || href === "./" || href === "") return "hub";

    // fallback su testo
    if (txt.includes("vetrin")) return "vetrine";
    if (txt.includes("control")) return "control";
    if (txt.includes("bios") || txt.includes("pin")) return "bios";
    if (txt.includes("note") || txt.includes("appunt")) return "note";
    if (txt.includes("file") || txt.includes("media")) return "media";
    if (txt.includes("hub")) return "hub";

    return "hub";
  }

  function explain(el){
    const lang = getLang();
    const key  = inferKeyFromElement(el);
    const info = TEXT[lang][key] || TEXT[lang].hub;
    const msg  = `${info.title}. ${info.desc} ${TEXT[lang].open}`;
    speakOnce(msg);
  }

  function isClickable(el){
    if (!el) return false;
    return !!(el.closest && (el.closest("a[href]") || el.closest("button") || el.closest("[role='button']") || el.closest(".tile") || el.closest(".card")));
  }

  // Intercetta tap su elementi cliccabili: 1 tap spiega, 2 tap entra.
  document.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!isClickable(t)) return;

    const a = t.closest("a[href]");
    const now = Date.now();

    // doppio tap sullo stesso elemento -> entra
    if (lastEl && lastEl === a && (now - lastTap) < DT_MS) {
      // lascia navigare (non prevenire)
      lastEl = null;
      lastTap = 0;
      return;
    }

    // singolo tap -> NON entra, spiega
    if (a) ev.preventDefault();

    lastTap = now;
    lastEl  = a;

    explain(t);
  }, true);

  // Piccolo fix layout: se la barra copre contenuto, spinge giù la pagina
  try{
    document.documentElement.style.scrollPaddingTop = "64px";
  }catch(e){}
})();
