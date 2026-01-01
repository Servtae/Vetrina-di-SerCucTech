/* SerCucTech - TTS HARD KILL when guide OFF */
(function(){
  function guideOff(){
    try { return localStorage.getItem("SCT_GUIDE_OFF")==="1"; }
    catch(e){ return false; }
  }

  // Flag globale
  function syncFlag(){
    window.SCT_GUIDE_OFF = guideOff();
    if (window.SCT_GUIDE_OFF && window.speechSynthesis){
      try { window.speechSynthesis.cancel(); } catch(e){}
    }
  }
  syncFlag();

  // Monkey patch speechSynthesis.speak
  if (window.speechSynthesis && typeof window.speechSynthesis.speak === "function"){
    const _speak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = function(utter){
      if (guideOff() || window.SCT_GUIDE_OFF){
        try { window.speechSynthesis.cancel(); } catch(e){}
        return;
      }
      return _speak(utter);
    };
  }

  // Aggiorna se cambia localStorage (alcuni browser)
  window.addEventListener("storage", syncFlag);

  // Aggiorna spesso (per sicurezza su Android WebView)
  setInterval(syncFlag, 800);
})();
