// GLOBAL GUIDE TOGGLE
function guideOff(){ try{ return localStorage.getItem("SCT_GUIDE_OFF")==="1"; }catch(e){ return false; } }

(async () => {
  try {
    // 1) Inserisce la barra guida in alto
    const bar = await fetch("/system/guide/bar.html", { cache: "no-store" }).then(r => r.text());
    document.body.insertAdjacentHTML("afterbegin", bar);

    // 2) Carica il motore guida
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "/system/guide/guide.js";
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    // 3) Avvio automatico in base alla pagina (hub/control/bios/vetrine)
    const a = document.createElement("script");
    a.src = "/system/guide/auto.js";
    a.defer = true;
    document.head.appendChild(a);

  
} catch (e) {
    console.error("SCGuide loader error:", e);
  }
})();

/* SerCucTech PATCH (CONT+SHARE) */
(function(){
  try{
    const p=document.createElement("script");
    p.src="/system/voice/patch_continuous_and_share.js";
    p.defer=true;
    document.head.appendChild(p);
  }catch(e){}
})();

/* SerCucTech TTS FIX loader */
(function(){
  try{
    const s=document.createElement("script");
    s.src="/system/guide/ttsfix.js";
    s.defer=true;
    document.head.appendChild(s);
  }catch(e){}
})();
