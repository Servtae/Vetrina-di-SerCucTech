SCT_OK_v1
/* SerCucTech VideoCall — Jitsi per singola vetrina */
(() => {
  const CONTACT_URL = "system/contact.json";
  const DEFAULT_BASE = "https://meet.jit.si";

  const isVetrina = () => /\/vetrina\.html(\?|$)/i.test(location.pathname);
  if (!isVetrina()) return;

  const qp = new URLSearchParams(location.search);
  const id = (qp.get("id") || "").trim();
  const ctx = (qp.get("ctx") || "Principale").trim() || "Principale";

  // Room name: stabile e “pulita”
  const rawRoom = `sercuctech-${id || "vetrina"}-${ctx}`;
  const room = rawRoom
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "sercuctech-vetrina";

  async function loadContact() {
    try {
      const r = await fetch(CONTACT_URL, { cache: "no-store" });
      if (!r.ok) return {};
      return await r.json();
    } catch (e) {
      return {};
    }
  }

  function makeUI(callUrl) {
    const wrap = document.createElement("div");
    wrap.id = "sct-videocall";
    wrap.innerHTML = `
      <style>
        #sct-videocall{position:fixed; right:14px; bottom:14px; z-index:9999; display:flex; flex-direction:column; gap:10px}
        #sct-videocall .btn{
          width:58px; height:58px; border-radius:18px;
          display:flex; align-items:center; justify-content:center;
          border:1px solid rgba(212,175,55,.35);
          background: rgba(0,0,0,.35);
          color:#f3f0e6; font-weight:1000; text-decoration:none;
          box-shadow: 0 18px 55px rgba(0,0,0,.55);
          backdrop-filter: blur(8px);
          user-select:none;
        }
        #sct-videocall .btn.primary{
          background: linear-gradient(180deg, rgba(255,222,122,.95), rgba(212,175,55,.80));
          color:#000;
        }
        #sct-videocall .hint{
          position:fixed; left:14px; right:14px; bottom:86px; z-index:9998;
          max-width:980px; margin:0 auto;
          border:1px solid rgba(212,175,55,.28);
          background: rgba(0,0,0,.35);
          border-radius:16px;
          padding:10px 12px;
          color:#f3f0e6;
          box-shadow: 0 18px 55px rgba(0,0,0,.35);
          display:none;
        }
      </style>

      <a class="btn primary" id="btnCall" href="#" aria-label="Videochiamata in diretta">📹</a>
      <a class="btn" id="btnCopy" href="#" aria-label="Copia link videochiamata">🔗</a>
      <a class="btn" id="btnShare" href="#" aria-label="Condividi link videochiamata">📤</a>

      <div class="hint" id="hint"></div>
    `;
    document.body.appendChild(wrap);

    const hint = wrap.querySelector("#hint");
    const show = (msg) => {
      hint.textContent = msg;
      hint.style.display = "block";
      clearTimeout(show._t);
      show._t = setTimeout(() => (hint.style.display = "none"), 1800);
    };

    const title = document.querySelector("h1,h2")?.textContent?.trim()?.slice(0, 80) || "Vetrina";
    const vUrl = location.href;
    const text = `SerCucTech — Videochiamata\nVetrina: ${title}\nID: ${id || "-"}\nContesto: ${ctx}\nLink vetrina: ${vUrl}\nLink video: ${callUrl}`;

    wrap.querySelector("#btnCall").onclick = (e) => {
      e.preventDefault();
      // apre la stanza video
      window.open(callUrl, "_blank", "noopener");
    };

    wrap.querySelector("#btnCopy").onclick = async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(callUrl);
        show("Link video copiato ✅");
      } catch (err) {
        prompt("Copia il link video:", callUrl);
      }
    };

    wrap.querySelector("#btnShare").onclick = async (e) => {
      e.preventDefault();
      if (navigator.share) {
        try { await navigator.share({ title: "SerCucTech Videochiamata", text, url: callUrl }); }
        catch (err) {}
      } else {
        try {
          await navigator.clipboard.writeText(text);
          show("Testo copiato ✅ (incolla su WhatsApp/Telegram)");
        } catch (err) {
          prompt("Condividi questo testo:", text);
        }
      }
    };
  }

  (async () => {
    const cfg = await loadContact();
    // compat: accetta vari nomi, così non rompiamo nulla
    const base =
      (cfg.videoCallBase || cfg.jitsiBase || (cfg.videoCall && cfg.videoCall.base) || DEFAULT_BASE)
        .toString()
        .trim() || DEFAULT_BASE;

    const callUrl = `${base.replace(/\/+$/,"")}/${encodeURIComponent(room)}`;
    makeUI(callUrl);
  })();
})();