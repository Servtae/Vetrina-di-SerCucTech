/* SerCucTech — Patch: Condividi intelligente + Dialogo continuo (toggle)
   - Share: testo + link + contesto guida + step + livello + bookmark (se presenti)
   - Fallback: clipboard se navigator.share non disponibile
*/
(() => {
  const LS_CONT = "scVoice.continuous";
  const LS_LAST = "scShare.last";

  function setStatus(t){
    const s = document.getElementById("sc-status");
    if(s) s.textContent = t;
  }

  function ensureBtn(id, label, title){
    const bar = document.getElementById("sc-guide-bar");
    if(!bar) return null;

    let btn = document.getElementById(id);
    if(btn) return btn;

    let controls = bar.querySelector(".sc-controls");
    if(!controls){
      controls = document.createElement("div");
      controls.className = "sc-controls";
      bar.appendChild(controls);
    }

    btn = document.createElement("button");
    btn.id = id;
    btn.textContent = label;
    btn.title = title || "";
    // metti in fondo (così non copre play/pause)
    controls.appendChild(btn);
    return btn;
  }

  function safeJSON(x){
    try{ return JSON.stringify(x); }catch(e){ return ""; }
  }

  function collectGuideContext(){
    // Prende info se esistono (non rompe nulla se non ci sono)
    const out = {
      page: (location.pathname.split("/").pop() || "index.html"),
      url: location.href,
      status: "",
      guide: {}
    };

    const st = document.getElementById("sc-status");
    if(st) out.status = (st.textContent || "").trim();

    // Dal motore guida (se espone qualcosa)
    // 1) Se window.SCGuideState è presente
    if(window.SCGuideState && typeof window.SCGuideState === "object"){
      out.guide = window.SCGuideState;
      return out;
    }

    // 2) Altrimenti prova a leggere localStorage più comuni
    const g = {};
    try{
      g.audio = localStorage.getItem("scGuide.audio");
      g.autoplayDesc = localStorage.getItem("scGuide.autoplayDesc");
      g.pending = localStorage.getItem("scGuide.pending");      // intent/step in ripresa
      g.lastRun = localStorage.getItem("scGuide.lastRun");      // ultimo percorso
      g.savedPaths = localStorage.getItem("scGuide.savedPaths");// percorsi salvati
      g.bookmark = localStorage.getItem("scGuide.bookmark");    // se l’hai messo nel motore
      g.level = localStorage.getItem("scGuide.level");          // livello guida (se presente)
    }catch(e){}
    out.guide = g;

    return out;
  }

  function buildShareText(){
    const ctx = collectGuideContext();
    const pageName = ctx.page.replace(".html","");

    // prova ad estrarre "step" e "intent" da pending/lastRun se sono JSON
    let intent = "", step = "", level = "";
    const g = ctx.guide || {};

    function parseMaybe(s){
      if(!s) return null;
      try{ return JSON.parse(s); }catch(e){ return null; }
    }

    const pendingObj = parseMaybe(g.pending);
    if(pendingObj){
      intent = pendingObj.intent || pendingObj.flow || pendingObj.context || "";
      step = (pendingObj.step ?? pendingObj.i ?? "").toString();
    }

    const lastObj = parseMaybe(g.lastRun);
    if(lastObj && !intent) intent = lastObj.intent || lastObj.flow || lastObj.context || "";

    const lvlObj = parseMaybe(g.level);
    if(typeof lvlObj === "string") level = lvlObj;
    if(!level && typeof g.level === "string") level = g.level;

    // bookmark: string o json
    let bookmark = "";
    const bmObj = parseMaybe(g.bookmark);
    if(bmObj) bookmark = bmObj.name || bmObj.title || safeJSON(bmObj);
    if(!bookmark && typeof g.bookmark === "string") bookmark = g.bookmark;

    const lines = [];
    lines.push("SerCucTech MINI-PC — Condivisione");
    lines.push(`Pagina: ${pageName}`);
    if(ctx.status) lines.push(`Stato: ${ctx.status}`);

    if(intent) lines.push(`Guida: ${intent}`);
    if(step) lines.push(`Step: ${step}`);
    if(level) lines.push(`Livello: ${level}`);
    if(bookmark) lines.push(`Segnalibro: ${bookmark}`);

    lines.push(`Link: ${ctx.url}`);

    return {
      title: "SerCucTech MINI-PC",
      text: lines.join("\n")
    };
  }

  function sharePayload(payload){
    const title = payload.title || "SerCucTech";
    const text  = payload.text  || "";
    const url   = payload.url   || location.href;

    // salva ultimo contenuto (fallback)
    try{ localStorage.setItem(LS_LAST, JSON.stringify({title, text, url, ts: Date.now()})); }catch(e){}

    // Web Share API (Android / iOS)
    if(navigator.share){
      return navigator.share({ title, text, url }).catch(()=>{});
    }

    // fallback: clipboard
    const all = `${title}\n${text}\n${url}`.trim();
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(all).then(()=>{ setStatus("copiato ✅"); }).catch(()=>{});
    }
    try{
      const ta=document.createElement("textarea");
      ta.value=all;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setStatus("copiato ✅");
    }catch(e){}
    return Promise.resolve();
  }

  function init(){
    // 1) bottone Condividi
    const bShare = ensureBtn("sc-share","📤","Condividi (testo + link)");
    if(bShare){
      bShare.onclick = () => {
        const p = buildShareText();
        // per WebShare serve anche url separato: lo mettiamo
        sharePayload({ title: p.title, text: p.text, url: location.href });
        setStatus("condividi…");
      };
    }

    // 2) toggle CONT.
    const bCont = ensureBtn("sc-cont","CONT.","Dialogo continuo ON/OFF");
    if(bCont){
      const refresh = () => {
        const on = localStorage.getItem(LS_CONT)==="1";
        bCont.style.opacity = on ? "1" : "0.55";
        bCont.style.borderStyle = on ? "solid" : "dashed";
        bCont.textContent = on ? "CONT.✅" : "CONT.";
      };
      refresh();
      bCont.onclick = () => {
        const on = localStorage.getItem(LS_CONT)==="1";
        localStorage.setItem(LS_CONT, on ? "0" : "1");
        refresh();
        setStatus(on ? "CONT. OFF" : "CONT. ON");
      };
    }

    // bridge: altri moduli possono chiamare window.SerCucTechShare({...})
    window.SerCucTechShare = sharePayload;
    window.SerCucTechContinuousOn = () => localStorage.getItem(LS_CONT)==="1";
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else init();
})();
