(() => {
const LS="SCT_MY_VETRINE";
const $=s=>document.querySelector(s);
const listEl=$("#list");
const subEl=$("#sub");

function read(){try{return JSON.parse(localStorage.getItem(LS)||"[]")}catch(e){return[]}}
function write(a){try{localStorage.setItem(LS,JSON.stringify(a))}catch(e){}}

function render(){
 const arr=read();
 subEl.textContent=`${arr.length} vetrine salvate`;
 listEl.innerHTML="";

 if(!arr.length){listEl.innerHTML="<div class='empty'>Nessuna vetrina salvata</div>";return;}

 const selBox=document.createElement("div");
 selBox.innerHTML=`
   <div style="padding:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
     <button id="bWa">Broadcast WhatsApp</button>
     <button id="bTg">Broadcast Telegram</button>
     <button id="bMail">Broadcast Email</button>
     <button id="bCopy">Copia Broadcast</button>
   </div>`;
 listEl.appendChild(selBox);

 arr.forEach((x,i)=>{
   const d=document.createElement("div");
   d.className="card";
   d.innerHTML=`
     <label style="display:flex;align-items:center;gap:8px">
       <input type="checkbox" class="chk" data-i="${i}">
       <b>${x.title||x.id}</b>
     </label>
     <div class="meta">${x.url}</div>`;
   listEl.appendChild(d);
 });

 function selected(){
   return [...document.querySelectorAll(".chk:checked")].map(c=>arr[c.dataset.i]);
 }

 function makeText(sel){
   return "SerCucTech — Vetrine Broadcast\n\n"+sel.map(v=>"• "+(v.title||v.id)+"\n"+v.url).join("\n\n");
 }

 function act(type){
   const sel=selected();
   if(!sel.length){alert("Seleziona almeno una vetrina");return;}
   const txt=makeText(sel);
   if(type==="copy"){navigator.clipboard.writeText(txt);alert("Broadcast copiato");return;}
   if(type==="wa"){location.href="https://wa.me/?text="+encodeURIComponent(txt);return;}
   if(type==="tg"){location.href="https://t.me/share/url?url=&text="+encodeURIComponent(txt);return;}
   if(type==="mail"){location.href="mailto:?subject=Vetrine SerCucTech&body="+encodeURIComponent(txt);}
 }

 $("#bWa").onclick=()=>act("wa");
 $("#bTg").onclick=()=>act("tg");
 $("#bMail").onclick=()=>act("mail");
 $("#bCopy").onclick=()=>act("copy");
}

render();
})();
