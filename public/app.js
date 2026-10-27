
async function api(url, options={}){const r=await fetch(url,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||"Request failed");return d}
document.addEventListener("DOMContentLoaded",()=>{
 const menu=document.querySelector(".menu"), nav=document.querySelector(".navlinks"); if(menu) menu.onclick=()=>nav.classList.toggle("open");
 document.querySelectorAll("[data-year]").forEach(e=>e.textContent=new Date().getFullYear());
 document.querySelectorAll("form[data-api]").forEach(f=>f.addEventListener("submit",async e=>{
   e.preventDefault();const data=Object.fromEntries(new FormData(f));const msg=f.querySelector(".msg");
   try{const d=await api(f.dataset.api,{method:"POST",body:JSON.stringify(data)});if(msg){msg.textContent=d.message||"Submitted successfully.";msg.style.color="#21723a";msg.hidden=false}f.reset()}catch(err){if(msg){msg.textContent=err.message;msg.style.color="#b42318";msg.hidden=false}}
 }));
});
