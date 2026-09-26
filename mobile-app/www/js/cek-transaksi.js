"use strict";
const CONFIG={API_URL:"/api/transaction/check"};
let DB={site:{},orders:[]};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const normalizePhone=v=>String(v||"").replace(/\D/g,"").replace(/^62/,"0").replace(/^0+/,"0");
const formatDate=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?"-":d.toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"});};
const statusMap={
 pending:{label:"Menunggu Verifikasi",icon:"fa-clock",class:"pending",desc:"Pembayaran kamu sudah diterima sistem dan sedang menunggu verifikasi admin."},
 paid:{label:"Pembayaran Terverifikasi",icon:"fa-circle-check",class:"paid",desc:"Pembayaran sudah diverifikasi. Pesanan sedang diproses."},
 completed:{label:"Selesai",icon:"fa-check-double",class:"completed",desc:"Transaksi sudah selesai diproses."},
 rejected:{label:"Ditolak",icon:"fa-circle-xmark",class:"rejected",desc:"Pembayaran ditolak. Silakan hubungi admin untuk informasi lebih lanjut."}
};
async function getDB(id, whatsapp){
 const r=await fetch(CONFIG.API_URL,{
   method:"POST",
   headers:{"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify({id,whatsapp})
 });
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||`Gagal mengecek database (${r.status}).`);
 return j;
}
function renderSite(){
 const site=DB.site||{};
 const name=site.name||"Yamzz Market";
 document.title=`Cek Transaksi • ${name}`;
 $("#brandName").textContent=name;$("#footerName").textContent=name;
 if(site.logo)$("#brandLogo").innerHTML=`<img src="${esc(site.logo)}" alt="${esc(name)}">`;
}
function showMessage(text,type="error"){$("#message").className=`message ${type}`;$(("#message")).innerHTML=`<i class="fa-solid ${type==="success"?"fa-circle-check":"fa-circle-exclamation"}"></i><span>${esc(text)}</span>`;}
function clearMessage(){$("#message").className="message";$(("#message")).innerHTML="";}
function renderResult(order){
 const s=statusMap[order.status]||{label:order.status||"Tidak diketahui",icon:"fa-circle-question",class:"unknown",desc:"Status transaksi belum dikenali."};
 $("#result").hidden=false;
 $("#result").innerHTML=`
 <div class="result-head">
   <div><span class="result-label">HASIL TRANSAKSI</span><h2>${esc(order.id)}</h2></div>
   <span class="status ${s.class}"><i class="fa-solid ${s.icon}"></i>${s.label}</span>
 </div>
 <p class="status-desc">${s.desc}</p>
 <div class="detail-grid">
   <div><span>Produk</span><strong>${esc(order.product||"-")}</strong></div>
   <div><span>Ress</span><strong>${Number(order.ress||0).toLocaleString("id-ID")} Ress</strong></div>
   <div><span>Total</span><strong>${rupiah(order.price)}</strong></div>
   <div><span>Nama</span><strong>${esc(order.name||"-")}</strong></div>
   <div><span>Dibuat</span><strong>${formatDate(order.createdAt)}</strong></div>
   <div><span>Terakhir diperbarui</span><strong>${formatDate(order.verifiedAt||order.createdAt)}</strong></div>
 </div>
 ${order.status==="paid"&&String(order.deliveryLink||order.productLink||order.link||"").trim()?`<a class="contact-btn" target="_blank" rel="noopener noreferrer" href="${esc(String(order.deliveryLink||order.productLink||order.link).trim())}"><i class="fa-solid fa-link"></i> Buka Link Produk</a>`:""}
 ${order.status==="paid"&&!String(order.deliveryLink||order.productLink||order.link||"").trim()?`<div class="status-desc" style="margin-top:12px">Pesanan akan diproses admin.</div>`:""}
 ${order.status==="rejected"&&DB.site?.whatsapp?`<a class="contact-btn" target="_blank" href="https://wa.me/${encodeURIComponent(String(DB.site.whatsapp).replace(/\D/g,""))}"><i class="fa-brands fa-whatsapp"></i> Hubungi Admin</a>`:""}`;
 $("#result").scrollIntoView({behavior:"smooth",block:"nearest"});
}
async function submit(e){
 e.preventDefault();clearMessage();$("#result").hidden=true;
 const btn=$("#checkButton"), id=$("#transactionId").value.trim().toUpperCase(), phone=normalizePhone($("#transactionWhatsapp").value);
 if(!id||phone.length<8){showMessage("ID transaksi dan nomor WhatsApp harus diisi.");return;}
 btn.disabled=true;btn.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> Mengecek...`;
 try{
   const result=await getDB(id,phone);
   DB={site:result.site||{}};
   renderSite();
   const order=result.order;
   if(!result.found||!order){showMessage("Transaksi tidak ditemukan. Pastikan ID transaksi dan nomor WhatsApp sudah benar.");return;}
   renderResult(order);showMessage("Transaksi ditemukan.","success");
 }catch(err){console.error(err);showMessage(err.message||"Terjadi kesalahan saat mengecek transaksi.");}
 finally{btn.disabled=false;btn.innerHTML=`<i class="fa-solid fa-magnifying-glass"></i> Cek Transaksi`;}
}
$("#checkForm").addEventListener("submit",submit);
$("#year").textContent=new Date().getFullYear();
(async()=>{try{DB=await getDB();renderSite();}catch(e){console.warn(e);}})();
