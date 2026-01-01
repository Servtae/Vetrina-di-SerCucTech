(() => {
  const page = location.pathname.replace("/","") || "index.html";
  const map = {
    "index.html":"hub",
    "control.html":"control",
    "bios.html":"bios",
    "vetrine.html":"vetrine"
  };
  const flow = map[page];
  if(flow && window.SCGuide){
    setTimeout(()=>SCGuide.start(flow),700);
  }
})();
