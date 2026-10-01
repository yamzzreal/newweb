(() => {
  "use strict";
  const LAST_CHAT_KEY="yamzz_admin_last_notified_chat";
  if (!window.Capacitor?.isNativePlatform?.()) return;

  const TOKEN_KEY = "yamzz_admin_token";
  const LAST_ORDER_KEY = "yamzz_admin_last_notified_order";
  let pollTimer = null;
  let lastSnapshot = null;

  function token(){
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function deviceLabel(){
    const u=navigator.userAgent||"";
    if(/Android/i.test(u)){
      const m=u.match(/Android[^;)]*;[^;)]*;\s*([^;)]+?)(?:\s+Build[\/;].*)?[;)]/i);
      return m?.[1]?.trim() || "Android";
    }
    if(/iPhone/i.test(u))return "iPhone";
    if(/iPad/i.test(u))return "iPad";
    return "Perangkat";
  }

  async function setupLocalNotifications(LocalNotifications){
    if(!LocalNotifications)return false;
    try{
      const p=await LocalNotifications.requestPermissions();
      if(p.display!=="granted")return false;
    }catch(e){ console.warn("[Yamzz Admin] Local notification permission:",e); }
    try{
      await LocalNotifications.createChannel({
        id:"yamzz_admin_transactions",
        name:"Transaksi Admin",
        description:"Notifikasi transaksi Yamzz Market",
        importance:5,
        sound:"default",
        vibration:true
      });
    }catch(e){ console.warn("[Yamzz Admin] Channel:",e); }
    return true;
  }

  async function notifyLocal(title, body, data={}){
    try{
      const LocalNotifications=window.Capacitor?.Plugins?.LocalNotifications;
      if(!LocalNotifications)return;
      if(!(await setupLocalNotifications(LocalNotifications)))return;
      await LocalNotifications.schedule({notifications:[{
        id:Math.floor(Date.now()%2147483647),
        title:title||"Transaksi baru",
        body:body||"Ada transaksi baru di Yamzz Market.",
        channelId:"yamzz_admin_transactions",
        sound:"default",
        extra:data
      }]});
    }catch(e){ console.warn("[Yamzz Admin] Local notification gagal:",e); }
  }

  async function registerToken(value){
    const t=token();
    if(!t || !value)return;
    try{
      const r=await fetch("/api/admin/push-register",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+t},
        body:JSON.stringify({token:value,platform:"android",deviceName:deviceLabel()})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);
      localStorage.setItem("yamzz_admin_push_registered",Date.now().toString());
      console.log("[Yamzz Admin] Push token tersimpan.");
    }catch(e){console.error("[Yamzz Admin] Registrasi push gagal:",e);}
  }

  async function pollTransactions(){
    const t=token();
    if(!t || document.visibilityState==="hidden")return;
    try{
      const r=await fetch("/api/admin/store",{headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},cache:"no-store"});
      if(!r.ok)return;
      const d=await r.json();
      const orders=Array.isArray(d.record?.orders)?d.record.orders:[];
      const paid=orders.filter(o=>["paid","completed"].includes(String(o.status||"").toLowerCase()))
        .sort((a,b)=>new Date(b.paidAt||b.updatedAt||b.createdAt||0)-new Date(a.paidAt||a.updatedAt||a.createdAt||0));
      const snapshot=JSON.stringify(paid.slice(0,30).map(o=>[o.id,o.status,o.paidAt,o.updatedAt]));
      if(lastSnapshot===null){
        lastSnapshot=snapshot;
        return;
      }
      if(snapshot===lastSnapshot)return;
      const previous=JSON.parse(lastSnapshot||"[]");
      const previousIds=new Set(previous.map(x=>String(x[0])));
      const changed=paid.find(o=>!previousIds.has(String(o.id)) || previous.find(x=>String(x[0])===String(o.id))?.[2]!==o.paidAt);
      lastSnapshot=snapshot;
      if(!changed)return;
      const orderId=String(changed.id||"");
      if(localStorage.getItem(LAST_ORDER_KEY)===orderId)return;
      localStorage.setItem(LAST_ORDER_KEY,orderId);
      await notifyLocal(
        "Pembayaran berhasil",
        `${changed.id||"Transaksi"} • ${changed.product||"Produk"} • Rp${Number(changed.price||changed.totalAmount||0).toLocaleString("id-ID")}`,
        {type:"admin_transaction",orderId,status:String(changed.status||"paid"),link:"admin.html"}
      );
    }catch(e){console.warn("[Yamzz Admin] Transaction notification poll:",e);}
  }

  async function pollChat(){
    const t=token();
    if(!t || document.visibilityState==="hidden")return;
    try{
      const r=await fetch("/api/admin/chat",{headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},cache:"no-store"});
      if(!r.ok)return;
      const d=await r.json();
      const conversations=Array.isArray(d.conversations)?d.conversations:[];
      const newest=conversations.find(c=>c.lastMessage)?.lastMessage;
      const latestId=String(newest?.id||"");
      if(!latestId)return;
      const previous=localStorage.getItem(LAST_CHAT_KEY);
      localStorage.setItem(LAST_CHAT_KEY,latestId);
      if(!previous || previous===latestId)return;
      const target=conversations.find(c=>String(c.lastMessage?.id)===latestId);
      if(!target || Number(target.unread||0)<=0 || target.lastMessage?.sender!=="user")return;
      await notifyLocal(
        `Chat baru dari @${target.user?.username||target.user?.name||"Pelanggan"}`,
        target.lastMessage?.message||"Ada pesan baru dari pelanggan.",
        {type:"chat",userId:String(target.user?.id||""),link:"admin.html"}
      );
    }catch(e){console.warn("[Yamzz Admin] Chat notification poll:",e);}
  }

  const boot=async()=>{
    try{
      const plugins=window.Capacitor?.Plugins||{};
      const PushNotifications=plugins.PushNotifications;
      const LocalNotifications=plugins.LocalNotifications;
      if(!token())return;

      await setupLocalNotifications(LocalNotifications);

      // Listener HARUS dipasang sebelum register(), karena event token bisa datang segera.
      if(PushNotifications){
        try{await PushNotifications.removeAllListeners();}catch(_){ }
        await PushNotifications.addListener("registration", ({value})=>registerToken(value));
        await PushNotifications.addListener("registrationError", error=>console.error("[Yamzz Admin] FCM registration error:",error));
        await PushNotifications.addListener("pushNotificationReceived", async(notification)=>{
          await notifyLocal(notification?.title||"Transaksi baru",notification?.body||"Ada transaksi baru di Yamzz Market.",notification?.data||{});
        });
        await PushNotifications.addListener("pushNotificationActionPerformed",({notification})=>{
          const link=notification?.data?.link||"admin.html";
          try{window.location.href=new URL(link,window.location.href).href;}catch(_){window.location.href="admin.html";}
        });
        try{await PushNotifications.createChannel({id:"yamzz_admin_transactions",name:"Transaksi Admin",description:"Notifikasi transaksi Yamzz Market",importance:5,sound:"default",vibration:true});}catch(_){ }
        try{
          const permission=await PushNotifications.requestPermissions();
          if(permission.receive==="granted")await PushNotifications.register();
          else console.warn("[Yamzz Admin] Izin push belum diberikan.");
        }catch(e){console.error("[Yamzz Admin] FCM setup error:",e);}
      }

      await pollTransactions();
      await pollChat();
      clearInterval(pollTimer);
      pollTimer=setInterval(()=>{pollTransactions();pollChat();},10000);
    }catch(e){console.error("[Yamzz Admin] Push boot error:",e);}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
