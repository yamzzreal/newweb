/* YAMZZ MARKET ADMIN
   ONE NEON DATABASE.
   IMPORTANT: MASTER KEY IN CLIENT JS IS NOT TRULY SECRET.
   For real security use a Vercel serverless API/proxy.
*/
"use strict";

const ADMIN_CONFIG = {
  STORE_API: "/api/admin/store",
  LOGIN_PAGE: "login.html"
};
const AUTH_KEY="yamzz_admin_authenticated", AUTH_TIME="yamzz_admin_time", ADMIN_TOKEN_KEY="yamzz_admin_token";
let DB={site:{},categories:[],products:[],orders:[]};
function dateAdmin(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function auth(){
  if(sessionStorage.getItem(AUTH_KEY)!=="true" || !sessionStorage.getItem(ADMIN_TOKEN_KEY)) return false;
  const t=Number(sessionStorage.getItem(AUTH_TIME)||0);
  if(!t || Date.now()-t>12*60*60*1000){logout();return false;}
  return true;
}
function guard(){if(!auth()){location.replace(ADMIN_CONFIG.LOGIN_PAGE);return false}return true}
function logout(){sessionStorage.removeItem(AUTH_KEY);sessionStorage.removeItem(AUTH_TIME);sessionStorage.removeItem(ADMIN_TOKEN_KEY)}
if(!guard()) throw new Error("Admin authentication required");

const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const cat=v=>String(v||"jasteb").toLowerCase().trim().replace(/\s+/g,"-");

async function request(method="GET",body=null){
  const headers={
    "Content-Type":"application/json",
    "Authorization":`Bearer ${sessionStorage.getItem(ADMIN_TOKEN_KEY)||""}`
  };
  const r=await fetch(ADMIN_CONFIG.STORE_API,{
    method,
    headers,
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||`API ${r.status}`);
  return d;
}
async function load(){
  const r=await request("GET");
  DB=normalize(r.record||{});
}
async function accountAPI(path,options={}){const headers={...(options.headers||{}),Authorization:`Bearer ${sessionStorage.getItem(ADMIN_TOKEN_KEY)||""}`,"Content-Type":"application/json"};const r=await fetch(path,{...options,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`API ${r.status}`);return d;}
function normalize(d){
  return {
    site:{
      name:d.site?.name||"Yamzz Market",title:d.site?.title||"",description:d.site?.description||"",tagline:d.site?.tagline||"",
      logo:d.site?.logo||"",banner:d.site?.banner||"",notification:d.site?.notification||"",maintenance:d.site?.maintenance===true,storeOffline:d.site?.storeOffline===true,whatsapp:d.site?.whatsapp||"",email:d.site?.email||"",whatsappChannel:d.site?.whatsappChannel||d.site?.waChannel||"",
      socials:{tiktok:d.site?.socials?.tiktok||"",instagram:d.site?.socials?.instagram||"",youtube:d.site?.socials?.youtube||"",telegram:d.site?.socials?.telegram||""},
      cloudinaryCloudName:d.site?.cloudinaryCloudName||"",cloudinaryUploadPreset:d.site?.cloudinaryUploadPreset||"",resellerPrice:Number(d.site?.resellerPrice||0),
      popup:{
        enabled:d.site?.popup?.enabled===true,
        title:d.site?.popup?.title||"Promo Spesial",
        message:d.site?.popup?.message||"",
        image:d.site?.popup?.image||"",
        discount:d.site?.popup?.discount||"",
        buttonText:d.site?.popup?.buttonText||"Lihat Promo",
        buttonLink:d.site?.popup?.buttonLink||"produk",
        startAt:d.site?.popup?.startAt||"",
        endAt:d.site?.popup?.endAt||""
      }
    },
    categories:Array.isArray(d.categories)&&d.categories.length?d.categories:[{id:"jasteb",name:"JASTEB",icon:"fa-bolt"},{id:"sewa-jasteb",name:"Sewa JASTEB",icon:"fa-key"},{id:"pt-jasteb",name:"PT JASTEB",icon:"fa-crown"},{id:"email-ress",name:"EMAIL RESS",icon:"fa-envelope-open-text"}],
    products:Array.isArray(d.products)?d.products:[],
    orders:Array.isArray(d.orders)?d.orders:[],
    testimonials:Array.isArray(d.testimonials)?d.testimonials:[],
    ratings:Array.isArray(d.ratings)?d.ratings:[]
  };
}
async function save(){
  const r=await request("PUT",DB);
  return !!r.record;
}

window.Admin={
  async mount(){
    if(!guard())return;
    await load();
    this.render();
  },
  render(){
    document.title=`Admin Panel • ${DB.site.name}`;
    const app=$("#adminApp");
    app.innerHTML=`
    <div class="admin-layout">
      <aside class="sidebar">
        <div class="sidebar-brand"><div class="brand-logo">
    ${
        DB.site.logo
        ? `<img src="${esc(DB.site.logo)}"
               alt="Logo"
               style="width:42px;height:42px;object-fit:cover;border-radius:13px;display:block;">`
        : `<i class="fa-solid fa-bolt"></i>`
    }
</div><div><strong>${esc(DB.site.name)}</strong><small>ADMIN PANEL</small></div></div>
        <nav class="sidebar-nav">
          <button class="nav-item active" data-section="dashboard" onclick="Admin.open('dashboard',this)"><i class="fa-solid fa-chart-line"></i><span>Dashboard</span></button>
          <button class="nav-item" data-section="products" onclick="Admin.open('products',this)"><i class="fa-solid fa-box"></i><span>Produk</span></button>
          <button class="nav-item" data-section="orders" onclick="Admin.open('orders',this)"><i class="fa-solid fa-receipt"></i><span>Transaksi</span></button>
          <button class="nav-item" data-section="testimonials" onclick="Admin.open('testimonials',this)"><i class="fa-solid fa-comments"></i><span>Testimoni</span></button>
          <button class="nav-item" data-section="accounts" onclick="Admin.open('accounts',this)"><i class="fa-solid fa-users"></i><span>Akun</span></button>
          <button class="nav-item" data-section="accountTransactions" onclick="Admin.open('accountTransactions',this)"><i class="fa-solid fa-file-invoice-dollar"></i><span>Transaksi Akun</span></button>
          <button class="nav-item" data-section="chat" onclick="Admin.open('chat',this)"><i class="fa-solid fa-headset"></i><span>Chat</span></button>
          <button class="nav-item" data-section="upgrade" onclick="Admin.open('upgrade',this)"><i class="fa-solid fa-crown"></i><span>Upgrade</span></button>
          <button class="nav-item" data-section="wallet" onclick="Admin.open('wallet',this)"><i class="fa-solid fa-wallet"></i><span>Wallet</span></button>
          <button class="nav-item" data-section="information" onclick="Admin.open('information',this)"><span class="material-symbols-rounded">campaign</span><span>Informasi</span></button>
          <button class="nav-item" data-section="settings" onclick="Admin.open('settings',this)"><i class="fa-solid fa-gear"></i><span>Pengaturan</span></button>
        </nav>
        <div class="sidebar-bottom"><a href="index.html" class="sidebar-store"><i class="fa-solid fa-store"></i>Lihat Toko</a><button class="logout-button" onclick="Admin.logout()"><i class="fa-solid fa-right-from-bracket"></i>Keluar</button></div>
      </aside>
      <main class="admin-main">
        <header class="admin-topbar"><div><button class="mobile-menu" onclick="Admin.toggleSidebar()"><i class="fa-solid fa-bars"></i></button><div><h1 id="pageTitle">Dashboard</h1><p>Kelola ${esc(DB.site.name)}</p></div></div><div class="admin-profile"><div class="online-dot"></div><div><strong>Administrator</strong><small>Online</small></div></div></header>
        <section id="section-dashboard" class="admin-section active"><div class="welcome-card"><div><span>DASHBOARD</span><h2>Selamat datang kembali 👋</h2><p>Kelola satu database Neon untuk produk, transaksi dan konfigurasi website.</p></div><i class="fa-solid fa-chart-pie"></i></div><div id="stats" class="stats-grid"></div><div class="dashboard-grid"><div class="panel-card"><div class="panel-header"><div><h3>Transaksi Terbaru</h3><p>Aktivitas pesanan</p></div><button onclick="Admin.open('orders')">Lihat semua</button></div><div id="recentOrders"></div></div><div class="panel-card"><div class="panel-header"><div><h3>Produk</h3><p>Produk aktif</p></div></div><div id="quickProducts"></div></div></div></section>
        <section id="section-products" class="admin-section"><div class="section-toolbar"><div><h2>Produk & Kategori</h2><p>Kelola produk dan kategori yang tersinkron ke Neon.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary-button" onclick="Admin.addCategory()"><i class="fa-solid fa-tags"></i>Tambah Kategori</button><button class="primary-button" onclick="Admin.addProduct()"><i class="fa-solid fa-plus"></i>Tambah Produk</button></div></div><div id="categoryList" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px"></div><div id="productList" class="product-admin-list"></div></section>
        <section id="section-orders" class="admin-section"><div class="section-toolbar"><div><h2>Transaksi</h2><p>Verifikasi bukti pembayaran pelanggan.</p></div></div><div id="orderList" class="order-list"></div></section>
        <section id="section-accounts" class="admin-section"><div class="section-toolbar"><div><h2>Daftar Akun</h2><p>Kelola Customer dan Reseller. Transaksi dan chat tersedia di halaman terpisah.</p></div></div><div id="accountList" class="product-admin-list"></div></section>
        <section id="section-accountTransactions" class="admin-section"><div class="section-toolbar"><div><h2>Transaksi Setiap Akun</h2><p>Riwayat transaksi dipisahkan dari halaman akun agar lebih mudah dicari.</p></div><button class="primary-button" onclick="Admin.renderAccountTransactions()"><i class="fa-solid fa-rotate"></i>Refresh</button></div><div id="accountTransactionList" class="product-admin-list"></div></section>
        <section id="section-chat" class="admin-section"><div class="section-toolbar"><div><h2>Chat Pelanggan</h2><p>Lihat percakapan berdasarkan akun dan balas langsung dari Admin.</p></div><button class="primary-button" onclick="Admin.renderChat()"><i class="fa-solid fa-rotate"></i>Refresh</button></div><div id="adminChatList" class="product-admin-list"></div></section>
        <section id="section-upgrade" class="admin-section"><div class="section-toolbar"><div><h2>Upgrade Reseller</h2><p>Atur harga upgrade dan masa berlaku akun Reseller. Pilih durasi sendiri atau permanen.</p></div></div><div id="upgradeSettingsPanel"></div></section>
        <section id="section-wallet" class="admin-section"><div class="section-toolbar"><div><h2>Wallet & Penarikan</h2><p>Atur metode top up, proses top up manual, penarikan reseller, dan saldo akun.</p></div></div><div id="walletPanel"></div></section>\n        <section id="section-testimonials" class="admin-section">
          <div class="section-toolbar">
            <div><h2>Testimoni Pelanggan</h2><p>Hanya admin yang dapat menambahkan testimoni. Gambar akan otomatis di-upload ke Cloudinary.</p></div>
            <button class="primary-button" onclick="Admin.addTestimonial()"><i class="fa-solid fa-plus"></i>Tambah Testimoni</button>
          </div>
          <div id="testimonialAdminList" class="product-admin-list"></div>
        </section>
        <section id="section-information" class="admin-section"><div class="section-toolbar"><div><h2>Informasi Website</h2><p>Kelola informasi, promo popup, dan status toko yang tampil di halaman pelanggan.</p></div></div>
          <div class="information-grid">
            <div class="panel-card info-control-card"><div class="panel-header"><div><h3><span class="material-symbols-rounded">campaign</span> Notifikasi Berjalan</h3><p>Teks notifikasi yang berjalan di halaman Home.</p></div></div>${field("setNotification","Teks Notifikasi","text")}</div>
            <div class="panel-card info-control-card"><div class="panel-header"><div><h3><span class="material-symbols-rounded">image</span> Set Banner</h3><p>Ganti banner Home menggunakan URL gambar.</p></div></div>${field("setInfoBanner","URL Banner / Cloudinary","url")}<div class="info-banner-preview"><img id="infoBannerPreview" alt="Preview Banner"><span id="infoBannerEmpty">Belum ada banner</span></div></div>

            <div class="panel-card info-control-card" style="grid-column:1/-1">
              <div class="panel-header"><div><h3><i class="fa-solid fa-bullhorn"></i> Popup Promo / Informasi</h3><p>Popup otomatis muncul setiap kali pengunjung reload halaman. Atur promo, diskon, gambar, tombol, dan masa berlaku dari sini.</p></div></div>
              <label class="switch-row"><span><strong>Aktifkan Popup</strong><small>Popup akan tampil otomatis setiap reload selama masih aktif dan berada dalam masa berlaku.</small></span><input id="setPopupEnabled" type="checkbox"><span class="switch-ui"></span></label>
              <div class="settings-grid" style="margin-top:14px">
                <div>${field("setPopupTitle","Judul Popup","text")}${field("setPopupDiscount","Label Diskon / Promo","text")}${field("setPopupMessage","Isi Informasi / Promo","textarea")}</div>
                <div>${field("setPopupImage","URL Gambar Promo","url")}${field("setPopupButtonText","Teks Tombol","text")}${field("setPopupButtonLink","Link Tombol","text")}</div>
              </div>
              <div class="settings-grid" style="margin-top:14px">
                <div>${field("setPopupStart","Mulai Tampil","datetime-local")}</div>
                <div>${field("setPopupEnd","Berakhir","datetime-local")}</div>
              </div>
            </div>

            <div class="panel-card info-control-card"><div class="panel-header"><div><h3><span class="material-symbols-rounded">build</span> Website Maintenance</h3><p>Pelanggan tidak dapat berinteraksi dan hanya melihat popup maintenance.</p></div></div><label class="switch-row"><span><strong>Aktifkan Maintenance</strong><small>Gunakan saat website sedang diperbaiki.</small></span><input id="setMaintenance" type="checkbox"><span class="switch-ui"></span></label></div>
            <div class="panel-card info-control-card"><div class="panel-header"><div><h3><span class="material-symbols-rounded">storefront</span> Store Offline</h3><p>Pelanggan mendapat popup store close dan semua produk tidak dapat diklik.</p></div></div><label class="switch-row"><span><strong>Aktifkan Store Offline</strong><small>Gunakan saat toko sedang tutup.</small></span><input id="setStoreOffline" type="checkbox"><span class="switch-ui"></span></label></div>
          </div><div class="settings-save"><button class="primary-button" onclick="Admin.saveInformation()"><i class="fa-solid fa-floppy-disk"></i>Simpan Informasi</button></div>
        </section>
        <section id="section-settings" class="admin-section"><div class="section-toolbar"><div><h2>Pengaturan Website</h2><p>Semua konfigurasi disimpan di record Neon yang sama.</p></div></div>
          <div class="settings-grid">
            <div class="panel-card"><div class="panel-header"><div><h3>Identitas</h3><p>Nama, deskripsi, kontak dan branding.</p></div></div>
              ${field("setName","Nama Store","text")}${field("setTitle","Title Browser","text")}${field("setTagline","Tagline","text")}${field("setDescription","Deskripsi Store","textarea")}
              ${field("setLogo","URL Logo / Cloudinary","url")}${field("setBanner","URL Banner / Cloudinary","url")}
            </div>
            <div class="panel-card"><div class="panel-header"><div><h3>Kontak & Saluran</h3><p>Kontak Customer Service dan link saluran resmi.</p></div></div>
              ${field("setWhatsapp","WhatsApp CS","text")}${field("setEmail","Email CS","email")}${field("setWhatsappChannel","Saluran WhatsApp","url")}
              <div class="settings-note"><span class="material-symbols-rounded">info</span><span>Pembayaran menggunakan QRIS dinamis dari sistem otomatis. Tidak perlu mengatur QRIS manual di sini.</span></div>
            </div>
            <div class="panel-card"><div class="panel-header"><div><h3>Cloudinary Upload</h3><p>Konfigurasi upload gambar produk.</p></div></div>
              ${field("setCloudName","Cloud Name","text")}${field("setUploadPreset","Unsigned Upload Preset","text")}
            </div>
            <div class="panel-card"><div class="panel-header"><div><h3>Sosial Media</h3><p>Link footer website.</p></div></div>
              ${field("setTiktok","TikTok","url")}${field("setInstagram","Instagram","url")}${field("setYoutube","YouTube","url")}${field("setTelegram","Telegram","url")}
            </div>
          </div>
          <div class="settings-save"><button class="primary-button" onclick="Admin.saveSettings()"><i class="fa-solid fa-floppy-disk"></i>Simpan Semua Pengaturan</button></div>
        </section>
      </main>
    </div>`;
    this.renderAll();
  },
  open(section,button){
    if(!guard())return;
    document.querySelectorAll(".admin-section").forEach(x=>x.classList.remove("active"));
    $("#section-"+section)?.classList.add("active");
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
    (button||document.querySelector(`[data-section="${section}"]`))?.classList.add("active");
    $("#pageTitle").textContent={dashboard:"Dashboard",products:"Produk",orders:"Transaksi",testimonials:"Testimoni",accounts:"Akun",accountTransactions:"Transaksi Akun",chat:"Chat",upgrade:"Upgrade Reseller",wallet:"Wallet",information:"Informasi",settings:"Pengaturan"}[section]||"Admin";
    this.closeSidebar();
  },
  renderAll(){this.renderStats();this.renderCategories();this.renderProducts();this.renderOrders();this.renderTestimonials();this.renderAccounts();this.renderAccountTransactions();this.renderChat();this.renderUpgrade();this.renderSettings();this.renderInformation();this.renderWallet()},
  renderCategories(){const c=$("#categoryList");if(!c)return;c.innerHTML=(DB.categories||[]).map(x=>`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#101f34"><i class="fa-solid ${esc(x.icon||"fa-tag")}"></i><b>${esc(x.name)}</b><button class="action-button delete" title="Hapus kategori" onclick="Admin.deleteCategory('${esc(x.id)}')"><i class="fa-solid fa-trash"></i></button></div>`).join("")},
  async addCategory(){const name=prompt("Nama kategori baru:");if(!name||!name.trim())return;const clean=name.trim();const cid=cat(clean);if((DB.categories||[]).some(x=>x.id===cid))return this.notify("Kategori sudah ada","error");DB.categories.push({id:cid,name:clean,icon:"fa-tag"});await this.commit("Kategori ditambahkan")},
  async deleteCategory(cid){if((DB.products||[]).some(p=>cat(p.category)===cid))return this.notify("Kategori masih dipakai produk","error");if(!confirm("Hapus kategori ini?"))return;DB.categories=DB.categories.filter(x=>x.id!==cid);await this.commit("Kategori dihapus")},
  renderStats(){
    const orders=DB.orders||[], products=DB.products||[];
    const pending=orders.filter(o=>o.status==="pending").length, paid=orders.filter(o=>["paid","completed"].includes(o.status)).length;
    const revenue=orders.filter(o=>["paid","completed"].includes(o.status)).reduce((a,o)=>a+Number(o.price||0),0);
    $("#stats").innerHTML=`<div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-box"></i></div><div><span>Total Produk</span><strong>${products.length}</strong></div></div><div class="stat-card"><div class="stat-icon orange"><i class="fa-solid fa-clock"></i></div><div><span>Pending</span><strong>${pending}</strong></div></div><div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-circle-check"></i></div><div><span>Terbayar</span><strong>${paid}</strong></div></div><div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-wallet"></i></div><div><span>Pendapatan</span><strong>${rupiah(revenue)}</strong></div></div>`;
  },
  renderProducts(){
    const c=$("#productList"), q=$("#quickProducts"), ps=DB.products||[];
    if(!ps.length){c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-box-open"></i><strong>Belum ada produk</strong><span>Tambahkan produk pertama.</span></div>`;q.innerHTML=`<div class="empty-mini">Belum ada produk.</div>`;return}
    c.innerHTML=ps.map(p=>`<div class="product-row"><div class="product-main"><div class="product-icon">${p.image?`<img src="${esc(p.image)}" alt="">`:`<i class="fa-solid fa-bolt"></i>`}</div><div><strong>${esc(p.name)}</strong><span>${Number(p.ress||0)} Ress • ${rupiah(p.price)} • Komisi ${rupiah(p.commission||0)} • Stok ${Number(p.stock||0)}</span></div></div><span class="status-badge ${p.active===false?"inactive":"active"}">${p.active===false?"Nonaktif":"Aktif"}</span><div class="row-actions"><button class="action-button edit" onclick="Admin.editProduct('${esc(p.id)}')"><i class="fa-solid fa-pen"></i></button><button class="action-button delete" onclick="Admin.deleteProduct('${esc(p.id)}')"><i class="fa-solid fa-trash"></i></button></div></div>`).join("");
    q.innerHTML=ps.slice(0,5).map(p=>`<div class="mini-product"><div><strong>${esc(p.name)}</strong><span>${Number(p.ress||0)} Ress • Stok ${Number(p.stock||0)}</span></div><b>${rupiah(p.price)}</b></div>`).join("");
  },
  addProduct(product=null){
    this.openProductModal(product);
  },
  editProduct(pid){
    const p=DB.products.find(x=>String(x.id)===String(pid));
    if(!p)return this.notify("Produk tidak ditemukan","error");
    this.openProductModal(p);
  },
  openProductModal(product=null){
    document.getElementById("yamzzProductModal")?.remove();
    const edit=!!product;
    const modal=document.createElement("div");
    modal.id="yamzzProductModal";
    modal.innerHTML=`
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto" onclick="if(event.target===this)this.remove()">
        <div style="width:min(720px,100%);max-height:92vh;overflow:auto;background:#0b1628;border:1px solid rgba(80,170,255,.25);border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,.5);color:#fff;font-family:Inter,Arial,sans-serif">
          <div style="padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#0b1628;z-index:2">
            <div><div style="font-size:20px;font-weight:800">${edit?'Edit Produk':'Tambah Produk'}</div><div style="font-size:12px;color:#8fa4bd;margin-top:4px">${edit?'Perbarui data produk yang dipilih':'Tambahkan produk baru ke database'}</div></div>
            <button type="button" id="pmClose" style="width:38px;height:38px;border:0;border-radius:10px;background:rgba(255,255,255,.07);color:#fff;font-size:18px;cursor:pointer"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <form id="yamzzProductForm" style="padding:24px">
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
              <div><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Nama Produk</label><input id="pmName" required value="${esc(product?.name||'')}" placeholder="Contoh: 10K 100 Ress" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none"></div>
              <div><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Kategori</label><select id="pmCategory" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none">${(DB.categories||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></div>
              <div><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Jumlah Ress</label><input id="pmRess" required type="number" min="1" value="${Number(product?.ress||100)}" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none"></div>
              <div><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Harga (Rp)</label><input id="pmPrice" required type="number" min="1" value="${Number(product?.price||10000)}" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none"></div>
              <div><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Komisi Reseller (Rp)</label><input id="pmCommission" required type="number" min="0" value="${Number(product?.commission||product?.resellerCommission||0)}" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none"><div style="font-size:11px;color:#8fa4bd;margin-top:6px">Masuk ke saldo reseller setiap transaksi produk ini berstatus PAID.</div></div><div><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Stok</label><input id="pmStock" required type="number" min="0" value="${Number(product?.stock||0)}" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none"></div>
              <div><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Gambar Produk</label><input id="pmImageFile" type="file" accept="image/png,image/jpeg,image/webp" style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#aebed1"></div>
              <div style="grid-column:1/-1"><div id="pmImageStatus" style="font-size:12px;color:#8fa4bd;margin:-4px 0 12px">${product?.image?'Gambar saat ini tersimpan di Cloudinary. Pilih file baru jika ingin menggantinya.':'Pilih gambar untuk otomatis di-upload ke Cloudinary.'}</div><img id="pmPreview" src="${esc(product?.image||'')}" style="${product?.image?'display:block;':''}width:100%;max-height:190px;object-fit:contain;border-radius:12px;background:#07111f;border:1px solid rgba(255,255,255,.08);${product?.image?'':'display:none;'}"></div>
              <div style="grid-column:1/-1"><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Link Produk <span style="color:#8fa4bd;font-weight:500">(Opsional)</span></label><input id="pmDeliveryLink" type="url" value="${esc(product?.deliveryLink||product?.productLink||product?.link||'')}" placeholder="https://contoh.com/link-produk" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none"><div style="font-size:12px;color:#8fa4bd;margin-top:7px">Jika diisi, link akan diberikan otomatis setelah pembayaran PAID. Jika kosong, pesanan diproses admin.</div></div>
              <div style="grid-column:1/-1"><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Deskripsi</label><textarea id="pmDescription" rows="4" placeholder="Deskripsi produk..." style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none;resize:vertical">${esc(product?.description||'')}</textarea></div>
            </div>
            <div id="pmError" style="display:none;margin-top:16px;padding:12px;border-radius:10px;background:rgba(255,70,70,.1);border:1px solid rgba(255,70,70,.25);color:#ff9b9b;font-size:13px"></div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px">
              <button type="button" id="pmCancel" style="padding:12px 18px;border:0;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer">Batal</button>
              <button type="submit" id="pmSave" style="padding:12px 20px;border:0;border-radius:10px;background:linear-gradient(135deg,#168cff,#0066ff);color:#fff;font-weight:800;cursor:pointer"><i class="fa-solid fa-cloud-arrow-up"></i> ${edit?'Simpan Perubahan':'Tambah Produk'}</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const root=modal.firstElementChild;
    const close=()=>modal.remove();
    modal.querySelector('#pmClose').onclick=close;
    modal.querySelector('#pmCancel').onclick=close;
    modal.querySelector('#pmCategory').value=cat(product?.category||'jasteb');
    const fileInput=modal.querySelector('#pmImageFile'), preview=modal.querySelector('#pmPreview');
    fileInput.onchange=()=>{
      const f=fileInput.files?.[0];
      if(!f)return;
      if(f.size>5*1024*1024)return this.notify('Ukuran gambar maksimal 5 MB','error');
      if(!f.type.startsWith('image/'))return this.notify('File harus berupa gambar','error');
      preview.src=URL.createObjectURL(f);preview.style.display='block';
      modal.querySelector('#pmImageStatus').textContent='Gambar siap di-upload ke Cloudinary saat disimpan.';
    };
    modal.querySelector('#yamzzProductForm').onsubmit=async(e)=>{
      e.preventDefault();
      const name=modal.querySelector('#pmName').value.trim();
      const category=cat(modal.querySelector('#pmCategory').value);
      const ress=Number(modal.querySelector('#pmRess').value);
      const price=Number(modal.querySelector('#pmPrice').value);
      const stock=Number(modal.querySelector('#pmStock').value);
      const commission=Math.max(0,Number(modal.querySelector('#pmCommission').value)||0);
      const deliveryLink=modal.querySelector('#pmDeliveryLink').value.trim();
      const description=modal.querySelector('#pmDescription').value.trim();
      const file=fileInput.files?.[0];
      const error=modal.querySelector('#pmError'), btn=modal.querySelector('#pmSave');
      if(!name||!ress||!price||stock<0){error.textContent='Data produk belum valid.';error.style.display='block';return;}
      if(deliveryLink){try{const u=new URL(deliveryLink);if(!['http:','https:'].includes(u.protocol))throw new Error();}catch{error.textContent='Link produk harus berupa URL http/https yang valid.';error.style.display='block';return;}}
      btn.disabled=true;btn.style.opacity='.65';btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';error.style.display='none';
      try{
        let image=product?.image||'';
        if(file) image=await this.uploadProductImage(file);
        const data={name,category,ress,price,stock,commission,image,description,deliveryLink};
        if(edit) Object.assign(product,data);
        else DB.products.push({id:'p_'+id(),...data,active:true,createdAt:new Date().toISOString()});
        await this.commit(edit?'Produk diperbarui':'Produk ditambahkan');
        close();
      }catch(err){
        console.error(err);error.textContent=err.message||'Gagal menyimpan produk.';error.style.display='block';
        btn.disabled=false;btn.style.opacity='1';btn.innerHTML='<i class="fa-solid fa-cloud-arrow-up"></i> '+(edit?'Simpan Perubahan':'Tambah Produk');
      }
    };
  },
  async uploadProductImage(file){
    const cloudName=String(DB.site?.cloudinaryCloudName||'').trim();
    const uploadPreset=String(DB.site?.cloudinaryUploadPreset||'').trim();
    if(!cloudName||!uploadPreset) throw new Error('Cloudinary belum dikonfigurasi. Isi Cloud Name dan Unsigned Upload Preset di Pengaturan.');
    if(file.size>5*1024*1024) throw new Error('Ukuran gambar maksimal 5 MB.');
    if(!file.type.startsWith('image/')) throw new Error('File harus berupa gambar.');
    const form=new FormData();form.append('file',file);form.append('upload_preset',uploadPreset);
    const r=await fetch('https://api.cloudinary.com/v1_1/'+encodeURIComponent(cloudName)+'/image/upload',{method:'POST',body:form});
    const result=await r.json();
    if(!r.ok) throw new Error(result?.error?.message||'Upload Cloudinary gagal.');
    return result.secure_url;
  },
  async deleteProduct(pid){
    const p=DB.products.find(x=>String(x.id)===String(pid)); if(!p||!confirm(`Hapus "${p.name}"?`))return;
    DB.products=DB.products.filter(x=>String(x.id)!==String(pid)); await this.commit("Produk dihapus");
  },
  renderOrders(){
    const c=$("#orderList"), r=$("#recentOrders"), os=DB.orders||[];
    if(!os.length){c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-receipt"></i><strong>Belum ada transaksi</strong><span>Transaksi akan muncul di sini.</span></div>`;r.innerHTML=`<div class="empty-mini">Belum ada transaksi.</div>`;return}
    c.innerHTML=os.map(o=>this.orderHTML(o)).join("");
    r.innerHTML=os.slice(0,5).map(o=>`<div class="recent-order"><div class="recent-icon"><i class="fa-solid fa-receipt"></i></div><div class="recent-info"><strong>${esc(o.product)}</strong><span>${esc(o.name||o.whatsapp||"Pelanggan")}</span></div><div class="recent-price">${rupiah(o.price)}</div></div>`).join("");
  },
  orderHTML(o){
    const s=o.status||"pending";
    return `<article class="order-card"><div class="order-top"><div><span class="order-id">${esc(o.id)}</span><h3>${esc(o.product)}</h3></div><span class="order-status ${s}">${({pending:"Pending",paid:"Terbayar",completed:"Selesai",rejected:"Ditolak"}[s]||s)}</span></div>
    <div class="order-info"><div><span>Nama</span><strong>${esc(o.name)}</strong></div><div><span>WhatsApp</span><strong>${esc(o.whatsapp)}</strong></div><div><span>Email</span><strong>${esc(o.email)}</strong></div><div><span>Total</span><strong>${rupiah(o.price)}</strong></div></div>
    ${o.proof?`<div class="proof-box"><img src="${esc(o.proof)}" alt="Bukti" onclick="Admin.previewImage('${esc(o.proof)}')"><span>Klik gambar untuk memperbesar</span></div>`:`<div class="no-proof"><i class="fa-solid fa-image"></i> Bukti belum tersedia.</div>`}
    <div class="order-actions">${s==="pending"?`<button class="success-button" onclick="Admin.updateStatus('${esc(o.id)}','paid')"><i class="fa-solid fa-check"></i>Verifikasi</button><button class="danger-button" onclick="Admin.updateStatus('${esc(o.id)}','rejected')"><i class="fa-solid fa-xmark"></i>Tolak</button>`:""}${s==="paid"?`<button class="success-button" onclick="Admin.updateStatus('${esc(o.id)}','completed')"><i class="fa-solid fa-check-double"></i>Tandai Selesai</button>`:""}</div></article>`;
  },
  async updateStatus(oid,status){
    const o=DB.orders.find(x=>String(x.id)===String(oid));if(!o)return;
    if(!confirm(status==="paid"?"Verifikasi pembayaran ini?":status==="rejected"?"Tolak pembayaran ini?":"Tandai transaksi selesai?"))return;
    const wasStatus=o.status;
    if(status==="paid" && o.status!=="paid" && o.stockDeducted!==true){const p=DB.products.find(x=>String(x.id)===String(o.productId));if(p){const cur=Number(p.stock??p.stok??p.quantity??0);const next=Math.max(0,cur-Number(o.quantity||1));p.stock=next;if("stok" in p)p.stok=next;if("quantity" in p)p.quantity=next;o.stockDeducted=true;}} o.status=status;o.verifiedAt=new Date().toISOString();await this.commit("Status transaksi diperbarui");
    if(o.userId && wasStatus!==status){try{await accountAPI("/api/admin/accounts",{method:"POST",body:JSON.stringify({action:"notify",userId:o.userId,title:"Status transaksi diperbarui",message:`Transaksi ${o.id} sekarang ${status}.`})});}catch(e){console.warn("User notification failed",e)}}
  },

  async renderAccounts(){
    const c=$("#accountList"); if(!c)return;
    c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-spinner fa-spin"></i><strong>Memuat akun...</strong></div>`;
    try{
      const d=await accountAPI("/api/admin/accounts");
      const users=d.users||[];
      if(!users.length){c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-users"></i><strong>Belum ada akun</strong><span>Akun customer akan muncul di sini.</span></div>`;return;}
      c.innerHTML=users.map(u=>this.accountHTML(u)).join("");
    }catch(e){c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-triangle-exclamation"></i><strong>Gagal memuat akun</strong><span>${esc(e.message)}</span></div>`}
  },
  accountHTML(u){
    const expiry=u.resellerExpiresAt?new Date(u.resellerExpiresAt):null;
    const activeReseller=u.type==="reseller" && (!expiry || expiry.getTime()>Date.now());
    const typeLabel=activeReseller?"RESELLER":"CUSTOMER";
    const expiryText=activeReseller?(expiry?`Aktif sampai ${expiry.toLocaleString("id-ID")}`:"Permanen"):"Tidak aktif / Customer";
    return `<article class="order-card" style="margin-bottom:14px">
      <div class="order-top"><div><span class="order-id">@${esc(u.username)}</span><h3>${esc(u.name)} <span class="status-badge ${activeReseller?"active":"inactive"}">${typeLabel}</span></h3></div><span class="order-status ${u.status==="blocked"?"rejected":"paid"}">${u.status==="blocked"?"Diblokir":"Aktif"}</span></div>
      <div class="order-info"><div><span>WhatsApp</span><strong>${esc(u.whatsapp)}</strong></div><div><span>Email</span><strong>${esc(u.email||"-")}</strong></div><div><span>Jenis Akun</span><strong>${typeLabel}</strong></div><div><span>Expired Reseller</span><strong>${esc(expiryText)}</strong></div><div><span>Saldo</span><strong>${rupiah(u.balance||0)}</strong></div><div><span>Dibuat</span><strong>${new Date(u.createdAt).toLocaleString("id-ID")}</strong></div></div>
      <div class="order-actions"><button class="primary-button" onclick="Admin.accountPassword('${esc(u.id)}')"><i class="fa-solid fa-key"></i>Atur Sandi</button><button class="${u.status==="blocked"?"success-button":"danger-button"}" onclick="Admin.accountBlock('${esc(u.id)}',${u.status!=="blocked"})"><i class="fa-solid ${u.status==="blocked"?"fa-unlock":"fa-ban"}"></i>${u.status==="blocked"?"Buka Blokir":"Blokir"}</button><button class="danger-button" onclick="Admin.deleteAccount('${esc(u.id)}','${esc(u.username)}')"><i class="fa-solid fa-trash"></i>Hapus Akun</button></div>
    </article>`;
  },
  async deleteAccount(uid,username){
    if(!confirm(`Hapus akun @${username}? Data chat, wallet, notifikasi dan data pribadi akun akan ikut dihapus. Transaksi toko akan dipertahankan tanpa mengikat akun.`))return;
    const confirmText=prompt(`Ketik HAPUS untuk menghapus @${username}:`);
    if(confirmText!=="HAPUS")return this.notify("Penghapusan dibatalkan","error");
    try{await accountAPI("/api/admin/accounts",{method:"POST",body:JSON.stringify({action:"delete",userId:uid,confirm:confirmText})});this.notify("Akun berhasil dihapus");await this.renderAccounts();await this.renderAccountTransactions();await this.renderChat();}catch(e){this.notify(e.message,"error")}
  },
  async accountBlock(uid,block){
    if(!confirm(block?"Blokir akun ini?":"Buka blokir akun ini?"))return;
    try{await accountAPI("/api/admin/accounts",{method:"POST",body:JSON.stringify({action:block?"block":"unblock",userId:uid})});await this.renderAccounts();this.notify("Status akun diperbarui");}catch(e){this.notify(e.message,"error")}
  },
  async accountPassword(uid){
    const pw=prompt("Masukkan sandi baru (minimal 8 karakter):");if(pw===null)return;
    try{await accountAPI("/api/admin/accounts",{method:"POST",body:JSON.stringify({action:"password",userId:uid,password:pw})});this.notify("Sandi akun diperbarui");}catch(e){this.notify(e.message,"error")}
  },
  async renderAccountTransactions(){
    const c=$("#accountTransactionList");if(!c)return;
    c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-spinner fa-spin"></i><strong>Memuat transaksi akun...</strong></div>`;
    try{
      const d=await accountAPI("/api/admin/account-transactions");const accounts=d.accounts||[];
      if(!accounts.length){c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-receipt"></i><strong>Belum ada transaksi terikat akun</strong></div>`;return;}
      c.innerHTML=accounts.map(a=>`<article class="order-card" style="margin-bottom:14px"><div class="order-top"><div><span class="order-id">@${esc(a.user.username)}</span><h3>${esc(a.user.name)} <span class="status-badge ${a.user.type==="reseller"?"active":"inactive"}">${a.user.type==="reseller"?"RESELLER":"CUSTOMER"}</span></h3></div><span class="order-status paid">${a.transactions.length} transaksi</span></div><div style="display:grid;gap:8px;margin-top:12px">${a.transactions.slice().reverse().map(t=>`<div style="padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02)"><div style="display:flex;justify-content:space-between;gap:10px"><strong>${esc(t.product)}</strong><b>${rupiah(t.price)}</b></div><span style="display:block;color:#8fa4bd;font-size:12px;margin-top:5px">${esc(t.id)} • ${esc(t.paymentMethod)} • ${esc(t.status)} • ${dateAdmin(t.createdAt)}</span>${t.deliveryLink?`<a href="${esc(t.deliveryLink)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:7px">Buka produk</a>`:""}</div>`).join("")}</div></article>`).join("");
    }catch(e){c.innerHTML=`<div class="empty-admin"><strong>Gagal memuat transaksi</strong><span>${esc(e.message)}</span></div>`}
  },
  async renderChat(){
    const c=$("#adminChatList");if(!c)return;
    c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-spinner fa-spin"></i><strong>Memuat chat...</strong></div>`;
    try{
      const d=await accountAPI("/api/admin/chat");const conversations=d.conversations||[];
      if(!conversations.length){c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-comments"></i><strong>Belum ada percakapan</strong><span>Chat dari akun pelanggan akan tampil di sini.</span></div>`;return;}
      c.innerHTML=conversations.map(a=>`<article class="order-card" style="margin-bottom:14px"><div class="order-top"><div><span class="order-id">@${esc(a.user.username)}</span><h3>${esc(a.user.name)} <span class="status-badge ${a.user.type==="reseller"?"active":"inactive"}">${a.user.type==="reseller"?"RESELLER":"CUSTOMER"}</span></h3></div>${a.unread?`<span class="status-badge active">${a.unread} baru</span>`:""}</div><div style="display:grid;gap:8px;max-height:320px;overflow:auto;padding:4px 0 10px">${a.messages.length?a.messages.map(m=>`<div style="max-width:82%;justify-self:${m.sender==="admin"?"end":"start"};padding:10px 12px;border-radius:12px;background:${m.sender==="admin"?"rgba(61,145,255,.14)":"rgba(255,255,255,.05)"}"><strong style="font-size:11px;color:#79b8ff">${m.sender==="admin"?"Admin":"Pelanggan"}</strong><div style="margin-top:4px;line-height:1.5">${esc(m.message)}</div><small style="display:block;color:#7f93a9;margin-top:5px">${dateAdmin(m.createdAt)}</small></div>`).join(""):`<div style="color:#8195aa;padding:12px;text-align:center">Belum ada pesan dari akun ini.</div>`}</div><form onsubmit="return Admin.sendChat(event,'${esc(a.user.id)}')" style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px"><input name="message" required maxlength="1000" placeholder="Balas pesan @${esc(a.user.username)}" style="min-width:0;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff"><button class="primary-button" type="submit"><i class="fa-solid fa-paper-plane"></i>Kirim</button></form></article>`).join("");
    }catch(e){c.innerHTML=`<div class="empty-admin"><strong>Gagal memuat chat</strong><span>${esc(e.message)}</span></div>`}
  },
  async sendChat(e,uid){
    e.preventDefault();const form=e.currentTarget;const input=form.querySelector('[name="message"]');const msg=input?.value.trim();if(!msg)return false;
    try{await accountAPI("/api/admin/chat",{method:"POST",body:JSON.stringify({userId:uid,message:msg})});input.value="";this.notify("Pesan terkirim");await this.renderChat();}catch(err){this.notify(err.message,"error")}return false;
  },
  async renderUpgrade(){
    const c=$("#upgradeSettingsPanel");if(!c)return;
    c.innerHTML=`<div class="panel-card"><div class="empty-admin"><i class="fa-solid fa-spinner fa-spin"></i><strong>Memuat pengaturan upgrade...</strong></div></div>`;
    try{
      const d=await accountAPI("/api/admin/upgrade");const s=d.settings||{price:0,mode:"days",value:30};
      c.innerHTML=`<div class="panel-card"><div class="panel-header"><div><h3>Harga & Masa Aktif Reseller</h3><p>Pengaturan ini dipakai untuk upgrade baru melalui saldo maupun QRIS.</p></div></div><div class="settings-grid"><div>${field("upgradePrice","Harga Upgrade Reseller (Rp)","number")}</div><div><label class="field"><span>Jenis Expired</span><select id="upgradeMode"><option value="days">Hari</option><option value="months">Bulan</option><option value="years">Tahun</option><option value="permanent">Permanen</option></select></label></div><div id="upgradeValueWrap">${field("upgradeValue","Jumlah Durasi","number")}</div></div><div id="upgradePreview" class="settings-note" style="margin-top:12px"></div><div class="settings-save"><button class="primary-button" onclick="Admin.saveUpgradeSettings()"><i class="fa-solid fa-floppy-disk"></i>Simpan Pengaturan Upgrade</button></div></div><div class="panel-card" style="margin-top:16px"><div class="panel-header"><div><h3>Catatan</h3><p>Akun reseller baru akan mendapatkan masa aktif sesuai pengaturan saat pembayaran berhasil. Perubahan setting tidak mengubah masa aktif reseller yang sudah aktif.</p></div></div></div>`;
      $("#upgradePrice").value=s.price||0;$("#upgradeMode").value=s.mode||"days";$("#upgradeValue").value=s.value||30;
      const refresh=()=>{const mode=$("#upgradeMode")?.value||"days",wrap=$("#upgradeValueWrap"),prev=$("#upgradePreview");if(mode==="permanent"){if(wrap)wrap.style.display="none";if(prev)prev.textContent=`Harga ${rupiah($("#upgradePrice")?.value)} • Masa aktif Permanen`;}else{if(wrap)wrap.style.display="block";const val=Math.max(1,Number($("#upgradeValue")?.value)||1),unit={days:"hari",months:"bulan",years:"tahun"}[mode]||"hari";if(prev)prev.textContent=`Harga ${rupiah($("#upgradePrice")?.value)} • Masa aktif ${val} ${unit}`;}};
      $("#upgradeMode").onchange=refresh;$("#upgradeValue").oninput=refresh;$("#upgradePrice").oninput=refresh;refresh();
    }catch(e){c.innerHTML=`<div class="panel-card"><div class="empty-admin"><strong>Gagal memuat pengaturan</strong><span>${esc(e.message)}</span></div></div>`}
  },
  async saveUpgradeSettings(){
    try{const mode=$("#upgradeMode")?.value||"days",value=Math.max(1,Number($("#upgradeValue")?.value)||1),price=Math.max(0,Number($("#upgradePrice")?.value)||0);if(price<1)return this.notify("Harga upgrade harus lebih dari Rp0","error");await accountAPI("/api/admin/upgrade",{method:"POST",body:JSON.stringify({price,mode,value})});this.notify("Pengaturan upgrade disimpan");await this.renderUpgrade();}catch(e){this.notify(e.message,"error")}
  },
  async renderWallet(){
    const c=$("#walletPanel");if(!c)return;c.innerHTML=`<div class="panel-card"><div class="panel-header"><div><h3>Memuat wallet...</h3></div></div></div>`;
    try{const d=await accountAPI("/api/admin/wallet"),s=d.settings||{},top=s.topupMethods||[],wd=s.withdrawMethods||[],topups=d.topups||[],withdrawals=d.withdrawals||[],users=d.users||[];
      const methodRows=(arr,prefix)=>arr.map((m,i)=>`<div class="wallet-method-row" data-prefix="${prefix}" data-id="${esc(m.id)}" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px"><input class="wm-id" value="${esc(m.id)}" placeholder="id"><input class="wm-name" value="${esc(m.name)}" placeholder="Nama metode"><input class="wm-account" value="${esc(m.account)}" placeholder="Nomor / rekening"><input class="wm-holder" value="${esc(m.holder)}" placeholder="Nama pemilik"><label style="display:flex;gap:5px;align-items:center;font-size:12px"><input class="wm-enabled" type="checkbox" ${m.enabled!==false?'checked':''}> Aktif</label><button class="danger-button wm-remove" type="button">Hapus</button></div>`).join("");
      c.innerHTML=`<div class="panel-card"><div class="panel-header"><div><h3>Pengaturan Wallet</h3><p>Atur minimal saldo, fee, serta tambah metode top up dan penarikan.</p></div></div><div style="display:grid;gap:12px">${field("walletMinTopup","Minimal Top Up (Rp)","number")}${field("walletMinWithdraw","Minimal Penarikan (Rp)","number")}${field("walletFeeWithdraw","Biaya Penarikan (Rp)","number")}</div><h4>Metode Top Up</h4><div id="topupMethodsAdmin">${methodRows(top,"topup")}</div><button class="primary-button" type="button" onclick="Admin.addWalletMethod('topup')">+ Tambah Metode Top Up</button><h4>Metode Penarikan</h4><div id="withdrawMethodsAdmin">${methodRows(wd,"withdraw")}</div><button class="primary-button" type="button" onclick="Admin.addWalletMethod('withdraw')">+ Tambah Metode Penarikan</button><div style="margin-top:12px"><button class="primary-button" onclick="Admin.saveWalletSettings()"><i class="fa-solid fa-floppy-disk"></i> Simpan Wallet</button></div></div>
      <div class="panel-card" style="margin-bottom:18px"><div class="panel-header"><div><h3>Saldo Akun</h3><p>Tambah/kurangi saldo secara manual bila diperlukan.</p></div></div><div style="display:grid;gap:10px;max-height:360px;overflow:auto">${users.map(u=>`<div style="padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:10px"><div><b>${esc(u.name||u.username)}</b><small style="display:block;color:#8fa4bd">@${esc(u.username)} • ${esc(u.type)} • ${rupiah(u.balance)}</small></div><button class="primary-button" onclick="Admin.adjustWallet('${esc(u.id)}')">Atur</button></div>`).join("")||'<span class="empty-admin">Belum ada akun.</span>'}</div></div>
      <div class="panel-card" style="margin-bottom:18px"><div class="panel-header"><div><h3>Top Up</h3></div></div>${topups.length?topups.map(t=>{const u=users.find(x=>String(x.id)===String(t.userId));return `<div style="padding:12px;border-bottom:1px solid rgba(255,255,255,.06);display:grid;gap:7px"><b>${esc(u?.name||t.userId)} • ${rupiah(t.amount)} • ${esc(t.method)}</b><span style="font-size:12px;color:#8fa4bd">${esc(t.status)} • ${new Date(t.createdAt).toLocaleString("id-ID")}</span>${t.proofUrl?`<a href="${esc(t.proofUrl)}" target="_blank" rel="noopener">Lihat bukti</a>`:""}${t.status==="waiting_proof"?`<button class="success-button" onclick="Admin.approveTopup('${esc(t.id)}','${esc(t.userId)}')">Setujui</button><button class="danger-button" onclick="Admin.rejectTopup('${esc(t.id)}','${esc(t.userId)}')">Tolak</button>`:""}</div>`}).join(""):'<div class="empty-admin">Belum ada top up.</div>'}</div>
      <div class="panel-card"><div class="panel-header"><div><h3>Penarikan</h3><p>Customer dan Reseller dapat mengajukan penarikan.</p></div></div>${withdrawals.length?withdrawals.map(w=>{const u=users.find(x=>String(x.id)===String(w.userId));return `<div style="padding:12px;border-bottom:1px solid rgba(255,255,255,.06);display:grid;gap:7px"><b>${esc(u?.name||w.userId)} • ${rupiah(w.amount)} • ${esc(w.method)}</b><span style="font-size:12px;color:#8fa4bd">${esc(w.destination)} • ${esc(w.holder)} • ${esc(w.status)}</span>${w.status==="pending"?`<button class="success-button" onclick="Admin.approveWithdraw('${esc(w.id)}','${esc(w.userId)}')">Tandai Dibayar</button><button class="danger-button" onclick="Admin.rejectWithdraw('${esc(w.id)}','${esc(w.userId)}')">Tolak & Kembalikan</button>`:""}</div>`}).join(""):'<div class="empty-admin">Belum ada penarikan.</div>'}</div>`;
      $("#walletMinTopup").value=s.minTopup||10000;$("#walletMinWithdraw").value=s.minWithdraw||10000;$("#walletFeeWithdraw").value=s.feeWithdraw||0;
      c.querySelectorAll(".wm-remove").forEach(btn=>btn.onclick=()=>btn.closest(".wallet-method-row").remove());
    }catch(e){c.innerHTML=`<div class="panel-card"><div class="empty-admin">${esc(e.message)}</div></div>`}
  },
  addWalletMethod(type){const wrap=$(type==='topup'?"#topupMethodsAdmin":"#withdrawMethodsAdmin");const row=document.createElement("div");row.className="wallet-method-row";row.style.cssText="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px";row.innerHTML=`<input class="wm-id" value="method${Date.now().toString(36)}" placeholder="id"><input class="wm-name" value="Metode Baru" placeholder="Nama metode"><input class="wm-account" value="" placeholder="Nomor / rekening"><input class="wm-holder" value="" placeholder="Nama pemilik"><label style="display:flex;gap:5px;align-items:center;font-size:12px"><input class="wm-enabled" type="checkbox" checked> Aktif</label><button class="danger-button wm-remove" type="button">Hapus</button>`;row.querySelector(".wm-remove").onclick=()=>row.remove();wrap.appendChild(row)},
  async saveWalletSettings(){try{const collect=(sel)=>[...document.querySelectorAll(sel+' .wallet-method-row')].map(r=>({id:r.querySelector('.wm-id').value.trim(),name:r.querySelector('.wm-name').value.trim(),account:r.querySelector('.wm-account').value.trim(),holder:r.querySelector('.wm-holder').value.trim(),enabled:r.querySelector('.wm-enabled').checked}));await accountAPI("/api/admin/wallet",{method:"POST",body:JSON.stringify({action:"settings",minTopup:Number($("#walletMinTopup").value),minWithdraw:Number($("#walletMinWithdraw").value),feeWithdraw:Number($("#walletFeeWithdraw").value),topupMethods:collect("#topupMethodsAdmin"),withdrawMethods:collect("#withdrawMethodsAdmin")})});this.notify("Pengaturan wallet disimpan");await this.renderWallet()}catch(e){this.notify(e.message,"error")}},
  async adjustWallet(uid){const amount=prompt("Nominal penyesuaian saldo. Gunakan minus untuk mengurangi, contoh 5000 atau -5000:");if(amount===null)return;const note=prompt("Catatan:")||"Penyesuaian saldo admin";try{await accountAPI("/api/admin/wallet",{method:"POST",body:JSON.stringify({action:"adjustBalance",userId:uid,amount:Number(amount),note})});this.notify("Saldo diperbarui");await this.renderWallet()}catch(e){this.notify(e.message,"error")}},
  async approveTopup(tid,uid){if(!confirm("Setujui top up ini dan tambahkan saldo?"))return;try{await accountAPI("/api/admin/wallet",{method:"POST",body:JSON.stringify({action:"approveTopup",topupId:tid,userId:uid})});this.notify("Top up disetujui");await this.renderWallet()}catch(e){this.notify(e.message,"error")}},
  async rejectTopup(tid,uid){const note=prompt("Alasan penolakan:")||"Bukti pembayaran tidak valid.";try{await accountAPI("/api/admin/wallet",{method:"POST",body:JSON.stringify({action:"rejectTopup",topupId:tid,userId:uid,note})});this.notify("Top up ditolak");await this.renderWallet()}catch(e){this.notify(e.message,"error")}},
  async approveWithdraw(wid,uid){if(!confirm("Tandai penarikan sebagai sudah dibayar?"))return;try{await accountAPI("/api/admin/wallet",{method:"POST",body:JSON.stringify({action:"approveWithdraw",withdrawalId:wid,userId:uid})});this.notify("Penarikan ditandai dibayar");await this.renderWallet()}catch(e){this.notify(e.message,"error")}},
  async rejectWithdraw(wid,uid){const note=prompt("Alasan penolakan:")||"Penarikan ditolak admin.";try{await accountAPI("/api/admin/wallet",{method:"POST",body:JSON.stringify({action:"rejectWithdraw",withdrawalId:wid,userId:uid,note})});this.notify("Penarikan ditolak dan saldo dikembalikan");await this.renderWallet()}catch(e){this.notify(e.message,"error")}},
  renderTestimonials(){
    const c=$("#testimonialAdminList");
    if(!c)return;
    const list=Array.isArray(DB.testimonials)?DB.testimonials:[];
    if(!list.length){
      c.innerHTML=`<div class="empty-admin"><i class="fa-solid fa-comments"></i><strong>Belum ada testimoni</strong><span>Tambahkan testimoni pelanggan dari tombol di atas.</span></div>`;
      return;
    }
    c.innerHTML=list.map(t=>`<div class="product-row">
      <div class="product-main">
        <div class="product-icon">${t.image?`<img src="${esc(t.image)}" alt="">`:`<i class="fa-solid fa-user"></i>`}</div>
        <div><strong>${esc(t.name||"Pelanggan")}</strong><span>${esc(t.message||"Tanpa isi testimoni")}</span></div>
      </div>
      <div class="row-actions"><button class="action-button delete" title="Hapus testimoni" onclick="Admin.deleteTestimonial('${esc(t.id)}')"><i class="fa-solid fa-trash"></i></button></div>
    </div>`).join("");
  },
  addTestimonial(){
    this.openTestimonialModal();
  },
  openTestimonialModal(){
    document.getElementById("yamzzTestimonialModal")?.remove();
    const modal=document.createElement("div");
    modal.id="yamzzTestimonialModal";
    modal.innerHTML=`<div style="position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto" onclick="if(event.target===this)this.remove()">
      <div style="width:min(620px,100%);max-height:92vh;overflow:auto;background:#0b1628;border:1px solid rgba(80,170,255,.25);border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,.5);color:#fff;font-family:Inter,Arial,sans-serif">
        <div style="padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between">
          <div><div style="font-size:20px;font-weight:800">Tambah Testimoni</div><div style="font-size:12px;color:#8fa4bd;margin-top:4px">Testimoni hanya dapat dibuat dari Admin Panel.</div></div>
          <button type="button" id="tmClose" style="width:38px;height:38px;border:0;border-radius:10px;background:rgba(255,255,255,.07);color:#fff;font-size:18px;cursor:pointer"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="yamzzTestimonialForm" style="padding:24px">
          <label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Nama Pelanggan</label>
          <input id="tmName" required maxlength="80" placeholder="Contoh: Andi" style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none;margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Isi Testimoni</label>
          <textarea id="tmMessage" required maxlength="1000" rows="5" placeholder="Tulis testimoni pelanggan..." style="width:100%;box-sizing:border-box;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;outline:none;resize:vertical;margin-bottom:16px"></textarea>
          <label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">Gambar Testimoni <span style="color:#8fa4bd;font-weight:500">(Opsional)</span></label>
          <input id="tmImageFile" type="file" accept="image/png,image/jpeg,image/webp" style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#aebed1">
          <div id="tmImageStatus" style="font-size:12px;color:#8fa4bd;margin:8px 0 12px">Gambar akan otomatis di-upload ke Cloudinary dan disimpan sebagai URL.</div>
          <img id="tmPreview" alt="Preview" style="display:none;width:100%;max-height:220px;object-fit:contain;border-radius:12px;background:#07111f;border:1px solid rgba(255,255,255,.08)">
          <div id="tmError" style="display:none;margin-top:16px;padding:12px;border-radius:10px;background:rgba(255,70,70,.1);border:1px solid rgba(255,70,70,.25);color:#ff9b9b;font-size:13px"></div>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px">
            <button type="button" id="tmCancel" style="padding:12px 18px;border:0;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer">Batal</button>
            <button type="submit" id="tmSave" style="padding:12px 20px;border:0;border-radius:10px;background:linear-gradient(135deg,#168cff,#0066ff);color:#fff;font-weight:800;cursor:pointer"><i class="fa-solid fa-cloud-arrow-up"></i> Simpan Testimoni</button>
          </div>
        </form>
      </div>
    </div>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove();
    modal.querySelector("#tmClose").onclick=close;
    modal.querySelector("#tmCancel").onclick=close;
    const fileInput=modal.querySelector("#tmImageFile"), preview=modal.querySelector("#tmPreview");
    fileInput.onchange=()=>{
      const f=fileInput.files?.[0]; if(!f)return;
      if(f.size>5*1024*1024)return this.notify("Ukuran gambar maksimal 5 MB","error");
      if(!f.type.startsWith("image/"))return this.notify("File harus berupa gambar","error");
      preview.src=URL.createObjectURL(f);preview.style.display="block";
      modal.querySelector("#tmImageStatus").textContent="Gambar siap di-upload ke Cloudinary saat disimpan.";
    };
    modal.querySelector("#yamzzTestimonialForm").onsubmit=async e=>{
      e.preventDefault();
      const name=modal.querySelector("#tmName").value.trim();
      const message=modal.querySelector("#tmMessage").value.trim();
      const file=fileInput.files?.[0];
      const error=modal.querySelector("#tmError"),btn=modal.querySelector("#tmSave");
      if(!name||!message){error.textContent="Nama dan isi testimoni wajib diisi.";error.style.display="block";return;}
      if(file && file.size>5*1024*1024){error.textContent="Ukuran gambar maksimal 5 MB.";error.style.display="block";return;}
      btn.disabled=true;btn.style.opacity=".65";btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Mengupload & menyimpan...';error.style.display="none";
      try{
        const image=file?await this.uploadTestimonialImage(file):"";
        DB.testimonials=Array.isArray(DB.testimonials)?DB.testimonials:[];
        DB.testimonials.unshift({id:"t_"+id(),name,message,image,createdAt:new Date().toISOString()});
        await this.commit("Testimoni berhasil ditambahkan");
        close();
      }catch(err){
        console.error(err);error.textContent=err.message||"Gagal menyimpan testimoni.";error.style.display="block";
        btn.disabled=false;btn.style.opacity="1";btn.innerHTML='<i class="fa-solid fa-cloud-arrow-up"></i> Simpan Testimoni';
      }
    };
  },
  async uploadTestimonialImage(file){
    const cloudName=String(DB.site?.cloudinaryCloudName||"").trim();
    const uploadPreset=String(DB.site?.cloudinaryUploadPreset||"").trim();
    if(!cloudName||!uploadPreset) throw new Error("Cloudinary belum dikonfigurasi. Isi Cloud Name dan Unsigned Upload Preset di Pengaturan.");
    if(file.size>5*1024*1024) throw new Error("Ukuran gambar maksimal 5 MB.");
    if(!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
    const form=new FormData();form.append("file",file);form.append("upload_preset",uploadPreset);
    const r=await fetch("https://api.cloudinary.com/v1_1/"+encodeURIComponent(cloudName)+"/image/upload",{method:"POST",body:form});
    const result=await r.json();
    if(!r.ok) throw new Error(result?.error?.message||"Upload Cloudinary gagal.");
    return result.secure_url;
  },
  async deleteTestimonial(tid){
    if(!confirm("Hapus testimoni ini?"))return;
    DB.testimonials=(DB.testimonials||[]).filter(x=>String(x.id)!==String(tid));
    await this.commit("Testimoni dihapus");
  },
  renderInformation(){
    const s=DB.site||{};
    const p=s.popup||{};
    const n=$("#setNotification");if(n)n.value=s.notification||"";
    const b=$("#setInfoBanner");if(b)b.value=s.banner||"";
    const m=$("#setMaintenance");if(m)m.checked=s.maintenance===true;
    const o=$("#setStoreOffline");if(o)o.checked=s.storeOffline===true;
    const pe=$("#setPopupEnabled");if(pe)pe.checked=p.enabled===true;
    const pv=(id,key)=>{const e=$("#"+id);if(e)e.value=p[key]||""};
    pv("setPopupTitle","title"); pv("setPopupDiscount","discount"); pv("setPopupMessage","message");
    pv("setPopupImage","image"); pv("setPopupButtonText","buttonText"); pv("setPopupButtonLink","buttonLink");
    pv("setPopupStart","startAt"); pv("setPopupEnd","endAt");
    this.updateInfoBannerPreview(s.banner||"");
  },
  updateInfoBannerPreview(url){const i=$("#infoBannerPreview"),e=$("#infoBannerEmpty");if(!i||!e)return;if(url){i.src=url;i.style.display="block";e.style.display="none"}else{i.removeAttribute("src");i.style.display="none";e.style.display="block"}},
  async saveInformation(){
    const val=id=>$("#"+id)?.value.trim()||"";
    const beforePopup = JSON.stringify(DB.site.popup || {});
    DB.site={
      ...DB.site,
      notification:val("setNotification"),
      banner:val("setInfoBanner"),
      maintenance:$("#setMaintenance")?.checked===true,
      storeOffline:$("#setStoreOffline")?.checked===true,
      popup:{
        enabled:$("#setPopupEnabled")?.checked===true,
        title:val("setPopupTitle")||"Promo Spesial",
        message:val("setPopupMessage"),
        image:val("setPopupImage"),
        discount:val("setPopupDiscount"),
        buttonText:val("setPopupButtonText")||"Lihat Promo",
        buttonLink:val("setPopupButtonLink")||"produk",
        startAt:val("setPopupStart"),
        endAt:val("setPopupEnd")
      }
    };
    const popupChanged = beforePopup !== JSON.stringify(DB.site.popup || {});
    await this.commit("Informasi & popup promo disimpan");

    if (popupChanged && DB.site.popup?.enabled) {
      try {
        const title = DB.site.popup.title || "Promo Yamzz Market";
        const discount = DB.site.popup.discount ? ` • ${DB.site.popup.discount}` : "";
        const body = `${DB.site.popup.message || "Ada promo terbaru di Yamzz Market."}${discount}`;
        const response = await fetch("/api/admin/push/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem(ADMIN_TOKEN_KEY) || ""}`
          },
          body: JSON.stringify({
            title,
            body,
            link: DB.site.popup.buttonLink || "produk.html"
          })
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          this.notify(`Promo tersimpan • ${Number(result.sent || 0)} notifikasi dikirim`);
        } else {
          console.warn("Push promo:", result.error || "Gagal mengirim");
        }
      } catch (error) {
        console.warn("Push promo error:", error);
      }
    }
  },
  renderSettings(){
    const s=DB.site;
    [["setName","name"],["setTitle","title"],["setTagline","tagline"],["setDescription","description"],["setLogo","logo"],["setBanner","banner"],["setWhatsapp","whatsapp"],["setEmail","email"],["setWhatsappChannel","whatsappChannel"],["setCloudName","cloudinaryCloudName"],["setUploadPreset","cloudinaryUploadPreset"],["setTiktok","socials.tiktok"],["setInstagram","socials.instagram"],["setYoutube","socials.youtube"],["setTelegram","socials.telegram"]].forEach(([el,key])=>{
      const e=$("#"+el);if(!e)return;let v=key.includes(".")?s[key.split(".")[0]][key.split(".")[1]]:s[key];e.value=v||"";
    });
  },
  async saveSettings(){
    const val=id=>$("#"+id)?.value.trim()||"";
    DB.site={...DB.site,name:val("setName")||"Yamzz Market",title:val("setTitle")||`${val("setName")||"Yamzz Market"} • JASTEB`,tagline:val("setTagline"),description:val("setDescription"),whatsapp:val("setWhatsapp"),email:val("setEmail"),whatsappChannel:val("setWhatsappChannel"),resellerPrice:DB.site.resellerPrice||0,logo:val("setLogo"),banner:val("setBanner"),cloudinaryCloudName:val("setCloudName"),cloudinaryUploadPreset:val("setUploadPreset"),socials:{tiktok:val("setTiktok"),instagram:val("setInstagram"),youtube:val("setYoutube"),telegram:val("setTelegram")},notification:DB.site.notification||"",maintenance:DB.site.maintenance===true,storeOffline:DB.site.storeOffline===true};
    await this.commit("Semua pengaturan disimpan");
  },
  previewImage(url){const m=document.createElement("div");m.className="image-preview";m.innerHTML=`<div class="image-preview-inner"><button onclick="this.closest('.image-preview').remove()"><i class="fa-solid fa-xmark"></i></button><img src="${esc(url)}" alt=""></div>`;document.body.appendChild(m)},
  async commit(msg){try{await save();this.renderAll();this.notify(msg)}catch(e){console.error(e);this.notify("Gagal menyimpan: "+e.message,"error");await load();this.renderAll()}},
  toggleSidebar(){$(".sidebar")?.classList.toggle("show")},
  closeSidebar(){$(".sidebar")?.classList.remove("show")},
  logout(){if(confirm("Keluar dari Admin Panel?")){logout();location.replace("login.html")}},
  notify(msg,type="success"){const t=$("#adminToast");if(!t)return;t.textContent=msg;t.className=`admin-toast show ${type}`;setTimeout(()=>t.classList.remove("show"),3000)}
};

function field(id,label,type="text"){
 return `<div class="field"><label>${label}</label>${type==="textarea"?`<textarea id="${id}" rows="4"></textarea>`:`<input id="${id}" type="${type}">`}</div>`;
}
document.addEventListener("DOMContentLoaded",()=>Admin.mount());
