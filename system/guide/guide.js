// GLOBAL GUIDE TOGGLE
function guideOff(){ try{ return localStorage.getItem("SCT_GUIDE_OFF")==="1"; }catch(e){ return false; } }

/* SerCucTech Guide — guide.js (ANTI-AUDIO-CUT + queue) */
(() => {
  const LS = {
    audio: "scGuide.audio",
    level: "scGuide.level",
    pending: "scGuide.pending",
    saved: "scGuide.savedPaths",
    last:  "scGuide.lastRun",
    cont:  "scVoice.continuous"
  };

  const $ = (id) => document.getElementById(id);
  const getLang = () => {
    const l = (navigator.language || "en").toLowerCase();
    if (l.startsWith("it")) return "it";
    if (l.startsWith("uk") || l.startsWith("ua")) return "ua";
    return "en";
  };

  // ====== SAFE TTS (NO CUT) ======
  const TTS = {
    enabled() { return (localStorage.getItem(LS.audio) ?? "1") === "1"; },
    setEnabled(v){ localStorage.setItem(LS.audio, v ? "1":"0"); },
    _busy:false,
    _queue:[],
    _lastSpeakAt:0,
    stop(){ try{ speechSynthesis.cancel(); }catch(e){} this._queue=[]; this._busy=false; },
    say(text){
      if(!this.enabled()) return;
      if(!text || !String(text).trim()) return;

      // Debounce micro-click doppi
      const now = Date.now();
      if(now - this._lastSpeakAt < 120) return;
      this._lastSpeakAt = now;

      this._queue.push(String(text).trim());
      this._pump();
    },
    _pump(){
      if(this._busy) return;
      if(!this._queue.length) return;

      const msg = this._queue.shift();
      this._busy = true;

      // IMPORTANTISSIMO: non chiamare cancel() qui, altrimenti taglia sempre.
      const u = new SpeechSynthesisUtterance(msg);
      u.lang = (getLang()==="ua") ? "uk-UA" : (getLang()==="it" ? "it-IT" : "en-US");
      u.rate = 1.0;
      u.pitch = 1.0;

      u.onend = () => { this._busy=false; setTimeout(()=>this._pump(), 30); };
      u.onerror = () => { this._busy=false; setTimeout(()=>this._pump(), 30); };

      try{ speechSynthesis.speak(u); }catch(e){ this._busy=false; }
    }
  };

  // ====== UI STATUS ======
  const setStatus = (t) => { const s=$("sc-status"); if(s) s.textContent = t; };

  // ====== LOAD JSON (flows/targets/intro) ======
  async function loadJSON(url){
    const r = await fetch(url, {cache:"no-store"});
    if(!r.ok) throw new Error(url+" "+r.status);
    return await r.json();
  }

  // ====== GUIDE BAR BIND ======
  function bindBar(){
    const bPlay = $("sc-play");
    const bPause = $("sc-pause");
    const bAudio = $("sc-audio");
    const bLvl = $("sc-lvl");
    const bIntro = $("sc-intro");
    const bMic = $("sc-mic");
    const bBm = $("sc-bookmark");

    if(bAudio){
      const on = TTS.enabled();
      bAudio.textContent = on ? "🔊" : "🔇";
      bAudio.onclick = () => {
        const v = !TTS.enabled();
        TTS.setEnabled(v);
        bAudio.textContent = v ? "🔊":"🔇";
        setStatus(v ? "audio ON" : "audio OFF");
        if(!v) TTS.stop();
      };
    }
    if(bPause){
      bPause.onclick = () => { TTS.stop(); setStatus("pausa"); };
    }
    if(bLvl){
      const cur = localStorage.getItem(LS.level) || "basic";
      bLvl.textContent = (cur==="basic") ? "👶" : "🎓";
      bLvl.onclick = () => {
        const now = (localStorage.getItem(LS.level) || "basic");
        const next = (now==="basic") ? "pro" : "basic";
        localStorage.setItem(LS.level, next);
        bLvl.textContent = (next==="basic") ? "👶" : "🎓";
        setStatus(next==="basic" ? "livello base" : "livello avanzato");
        TTS.say(next==="basic" ? "Livello guida impostato su base." : "Livello guida impostato su avanzato.");
      };
    }
    if(bIntro){
      bIntro.onclick = async () => {
        try{
          const lang = getLang();
          const intro = await loadJSON("system/guide/intro.json");
          const lvl = localStorage.getItem(LS.level) || "basic";
          const t = (intro[lang] && intro[lang][lvl]) || (intro["en"] && intro["en"][lvl]) || "";
          setStatus("intro");
          TTS.say(t);
        }catch(e){
          setStatus("intro errore");
        }
      };
    }
    if(bPlay){
      bPlay.onclick = () => { setStatus("play"); TTS.say("Guida pronta. Tocca un tasto una volta per ascoltare, due volte per entrare."); };
    }

    // MIC (placeholder): qui solo feedback, senza rompere nulla
    if(bMic){
      bMic.onclick = () => {
        TTS.say("Microfono: in arrivo. Per ora usa i tasti e le guide passo passo.");
        setStatus("mic (beta)");
      };
    }

    if(bBm){
      bBm.onclick = () => {
        try{
          const last = localStorage.getItem(LS.last) || "";
          localStorage.setItem(LS.saved, JSON.stringify([{ts:Date.now(), note:"bookmark", last}]));
          TTS.say("Segnalibro salvato.");
          setStatus("bookmark ✅");
        }catch(e){
          setStatus("bookmark err");
        }
      };
    }
  }

  // ====== DOUBLE-TAP EXPLAIN/ENTER (NO CUT) ======
  function attachExplainEnter(){
    // Target mapping (optional)
    let targets = null;
    const defaultExplain = (label) => `Apri ${label}. Tocca due volte per entrare.`;

    // “labels” fallback: prova a leggere aria-label/title/textContent
    const getLabel = (el) => el.getAttribute("data-guide-label")
      || el.getAttribute("aria-label")
      || el.getAttribute("title")
      || (el.textContent||"").trim()
      || "questa funzione";

    // descrizioni “speciali” richieste da te
    const special = {
      "bios": "BIOS & PIN: accesso amministratore. Tocca due volte per entrare e gestire sicurezza e PIN.",
      "note": "Note & Copia: area appunti persistente. Tocca due volte per aprire e salvare testi da riutilizzare.",
      "media": "File/Media: upload e gestione file. Tocca due volte per aprire il file manager."
    };

    const hook = async () => {
      try{ targets = await loadJSON("system/guide/targets.json"); }catch(e){ targets=null; }

      const tappable = document.querySelectorAll("[data-guide], .sc-tile, a, button");
      tappable.forEach(el => {
        if(el.__scBound) return;
        el.__scBound = true;

        let lastTap = 0;
        el.addEventListener("click", (ev) => {
          const now = Date.now();
          const dt = now - lastTap;
          lastTap = now;

          const id = el.getAttribute("data-guide") || el.id || "";
          const pageKey = (location.pathname.split("/").pop() || "index.html").replace(".html","");
          const lang = getLang();

          if(dt < 450){
            // DOPPIO TAP: lascia fare l’azione naturale (non tagliamo l’audio, ma è normale che cambi pagina)
            return;
          }

          // SINGOLO TAP: SOLO SPIEGAZIONE, NIENTE NAVIGAZIONE EXTRA
          ev.preventDefault();
          ev.stopPropagation();

          let txt = "";
          // prova targets.json
          try{
            if(targets && targets[pageKey] && targets[pageKey][id] && targets[pageKey][id][lang]){
              txt = targets[pageKey][id][lang];
            }
          }catch(e){}

          // fallback speciali
          if(!txt){
            if(id.includes("bios")) txt = special.bios;
            else if(id.includes("note")) txt = special.note;
            else if(id.includes("media") || id.includes("file")) txt = special.media;
          }

          // fallback universale
          if(!txt) txt = defaultExplain(getLabel(el));

          setStatus("spiego…");
          TTS.say(txt); // NON viene tagliato
        }, true);
      });
    };

    hook();
  }

  // ====== INIT ======
  bindBar();
  attachExplainEnter();
})();

/* === SerCucTech FIX MAPPING === */
(async function(){
  try{
    const map = await fetch("system/guide/targets-map.json").then(r=>r.json());
    const data = await fetch("system/guide/targets.json").then(r=>r.json());

    Object.keys(map).forEach(sel=>{
      const key = map[sel];
      const btn = document.querySelector(sel);
      if(btn && data[key]){
        btn.dataset.scTitle = data[key].title;
        btn.dataset.scDesc  = data[key].desc;
      }
    });
  }catch(e){console.warn("SC MAP FIX:",e);}
})();
