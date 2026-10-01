(() => {
  "use strict";
  const LAST_CHAT_KEY="yamzz_admin_last_notified_chat";
  if (!window.Capacitor?.isNativePlatform?.()) return;
  const boot = async () => {
    try {
      const { PushNotifications } = window.Capacitor.Plugins || {};
      const adminToken = localStorage.getItem("yamzz_admin_token") || sessionStorage.getItem("yamzz_admin_token") || "";
      if (!PushNotifications || !adminToken) return;
      try { await PushNotifications.createChannel({id:"yamzz_admin_transactions",name:"Transaksi Admin",description:"Notifikasi transaksi Yamzz Market",importance:5,sound:"default",vibration:true}); } catch (_) {}
      const permission=await PushNotifications.requestPermissions();
      if(permission.receive!=="granted")return;
      await PushNotifications.register();
      PushNotifications.addListener("registration",async({value})=>{
        if(!value)return;
        try{
          const r=await fetch("/api/admin/push-register",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+adminToken},body:JSON.stringify({token:value,platform:"android",deviceName:deviceLabel()})});
          const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);
          console.log("[Yamzz Admin] Push aktif.");
        }catch(e){console.error("[Yamzz Admin] Registrasi push gagal:",e);}
      });
      PushNotifications.addListener("registrationError",error=>console.error("[Yamzz Admin] FCM error:",error));
      PushNotifications.addListener("pushNotificationReceived",async(notification)=>{
        try{
          const LocalNotifications=window.Capacitor?.Plugins?.LocalNotifications;
          if(!LocalNotifications)return;
          await LocalNotifications.createChannel({id:"yamzz_admin_transactions",name:"Transaksi Admin",description:"Notifikasi transaksi Yamzz Market",importance:5,sound:"default",vibration:true});
          await LocalNotifications.schedule({notifications:[{
            id:Math.floor(Date.now()%2147483647),
            title:notification?.title||"Transaksi baru",
            body:notification?.body||"Ada transaksi baru di Yamzz Market.",
            channelId:"yamzz_admin_transactions",
            sound:"default",
            extra:notification?.data||{}
          }]});
        }catch(e){console.warn("[Yamzz Admin] Foreground notification gagal:",e);}
      });
      PushNotifications.addListener("pushNotificationActionPerformed",({notification})=>{
        const link=notification?.data?.link||"admin.html";try{window.location.href=new URL(link,window.location.origin).href;}catch(_){}
      });
    }catch(e){console.error("[Yamzz Admin] Push boot error:",e);}
  };
  function deviceLabel(){const u=navigator.userAgent||"";if(/Android/i.test(u))return"Android";if(/iPhone/i.test(u))return"iPhone";if(/iPad/i.test(u))return"iPad";return"Perangkat";}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();