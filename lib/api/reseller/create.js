"use strict";
const {YAMZZ_PAYMENT_API,gatewayHeaders,gatewayConfigured,storeDb}=require("../yamzz-payment/_common");
const {requireUser,privateDb,savePrivateDb,id,addNotification,calculateResellerExpiry,upgradeLabel}=require("../auth/_common");
const {balance}=require("../wallet/_common");
const {sendPushToUser}=require("../../push");

module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{
  const a=await requireUser(req);if(!a)return res.status(401).json({error:"Silakan login."});
  const {user}=a;
  if(user.type==="reseller")return res.status(409).json({error:"Akun kamu sudah reseller."});
  const main=await storeDb();
  const settingsDb=await privateDb();
  const settings=settingsDb.upgradeSettings&&typeof settingsDb.upgradeSettings==="object"?settingsDb.upgradeSettings:{};
  const price=Number(settings.price||main.site?.resellerPrice||0);
  const paymentMethod=String(req.body?.paymentMethod||"qris").toLowerCase();
  if(!Number.isFinite(price)||price<1)return res.status(400).json({error:"Harga upgrade reseller belum diatur admin."});

  if(paymentMethod==="balance"){
   const db=await privateDb();const fresh=db.users.find(x=>String(x.id)===String(user.id));
   if(!fresh)return res.status(404).json({error:"Akun tidak ditemukan."});
   if(balance(fresh)<price)return res.status(400).json({error:`Saldo tidak cukup. Harga upgrade Rp${price.toLocaleString("id-ID")}.`});
   const paidAt=new Date().toISOString(),expiresAt=calculateResellerExpiry(paidAt,settings);
   fresh.balance=balance(fresh)-price;fresh.type="reseller";fresh.resellerAt=paidAt;fresh.resellerExpiresAt=expiresAt;fresh.resellerPlan=upgradeLabel(settings);
   db.walletLedger=Array.isArray(db.walletLedger)?db.walletLedger:[];
   db.walletLedger.unshift({id:id("wl"),userId:fresh.id,type:"upgrade",amount:-price,note:"Upgrade akun Reseller menggunakan saldo",ref:"upgrade",createdAt:paidAt,meta:{price,expiresAt,plan:fresh.resellerPlan}});
   addNotification(db,fresh.id,"Akun Reseller aktif",`Upgrade berhasil menggunakan saldo Rp${price.toLocaleString("id-ID")}. Masa aktif: ${fresh.resellerPlan}.`,"success");
   await savePrivateDb(db);
   await sendPushToUser(db,fresh.id,{title:"Akun Reseller aktif",body:`Upgrade berhasil menggunakan saldo Rp${price.toLocaleString("id-ID")}. Masa aktif: ${fresh.resellerPlan}.`,data:{type:"reseller_upgrade",link:"akun.html"}});
   return res.json({success:true,paid:true,amount:price,balance:fresh.balance,upgraded:true,resellerExpiresAt:expiresAt,resellerPlan:fresh.resellerPlan});
  }

  if(!gatewayConfigured())return res.status(500).json({error:"Yamzz Payment belum dikonfigurasi. Isi YAMZZ_PAYMENT_URL dan YAMZZ_PAYMENT_API_KEY."});
  const orderId=`RES-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const gateway=await fetch(`${YAMZZ_PAYMENT_API}/api/index?route=payment-create`,{
   method:"POST",headers:gatewayHeaders(),
   body:JSON.stringify({order_id:orderId,amount:price,customer_name:user.name||user.username||"Reseller",customer_email:user.email||"",expired_minutes:15,metadata:{source:"yamzz-market-reseller",userId:String(user.id),type:"reseller-upgrade"}})
  });
  const raw=await gateway.text();let p={};try{p=raw?JSON.parse(raw):{}}catch{}
  if(!gateway.ok||p.success===false)return res.status(gateway.status||502).json({error:p.error||p.message||"Yamzz Payment gagal membuat pembayaran."});
  const transactionId=String(p.transaction_id||p.transactionId||"").trim();
  const qrString=String(p.qr_string||p.qrString||"").trim();
  const amount=Number(p.amount)||price;
  const expiredAt=String(p.expires_at||p.expired_at||p.expiresAt||new Date(Date.now()+15*60000).toISOString());
  if(!transactionId||!qrString)return res.status(502).json({error:"Data transaksi/QRIS dari Yamzz Payment tidak lengkap."});
  const db=await privateDb();db.resellerPayments=Array.isArray(db.resellerPayments)?db.resellerPayments:[];
  db.resellerPayments.unshift({id:id("rup"),userId:user.id,transactionId,amount,baseAmount:price,status:"pending",createdAt:new Date().toISOString(),expiredAt,upgradeSettings:{price,mode:settings.mode||"days",value:Number(settings.value)||30}});
  addNotification(db,user.id,"Upgrade Reseller dibuat",`Pembayaran upgrade reseller sebesar Rp${amount.toLocaleString("id-ID")} menunggu pembayaran.`,"info");
  await savePrivateDb(db);
  await sendPushToUser(db,user.id,{title:"Upgrade Reseller dibuat",body:`Pembayaran upgrade reseller sebesar Rp${amount.toLocaleString("id-ID")} menunggu pembayaran.`,data:{type:"reseller_upgrade",link:"akun.html"}});
  return res.json({success:true,transactionId,amount,qrString,expiredAt,paymentUrl:p.payment_url||null});
 }catch(e){console.error(e);return res.status(500).json({error:e.message||"Gagal membuat pembayaran upgrade."});}
};
