"use strict";
const {YAMZZ_PAYMENT_API,gatewayHeaders,gatewayConfigured}=require("../yamzz-payment/_common");
const {requireUser,savePrivateDb,addNotification,calculateResellerExpiry,upgradeLabel}=require("../auth/_common");
const {sendPushToUser}=require("../../push");
module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{
  const a=await requireUser(req);if(!a)return res.status(401).json({error:"Sesi tidak valid."});
  const {db,user}=a,tid=String(req.body?.transactionId||"").trim();
  const pay=(db.resellerPayments||[]).find(x=>String(x.transactionId)===tid&&String(x.userId)===String(user.id));
  if(!pay)return res.status(404).json({error:"Pembayaran upgrade tidak ditemukan."});
  if(user.type==="reseller")return res.json({success:true,status:"paid",upgraded:true});
  if(!gatewayConfigured())return res.status(500).json({error:"Yamzz Payment belum dikonfigurasi."});
  const r=await fetch(`${YAMZZ_PAYMENT_API}/api/index?route=payment-status&transaction_id=${encodeURIComponent(tid)}`,{headers:gatewayHeaders({"Content-Type":"application/json"})});
  const raw=await r.text();let p={};try{p=raw?JSON.parse(raw):{}}catch{}
  if(!r.ok)return res.status(r.status||502).json({error:p.error||p.message||"Gagal mengecek pembayaran."});
  const data=p.transaction||p.data||{},status=String(data.status||p.status||"").toLowerCase();
  if(status==="paid"){
   pay.status="paid";pay.paidAt=pay.paidAt||new Date().toISOString();
   const settings=pay.upgradeSettings&&typeof pay.upgradeSettings==="object"?pay.upgradeSettings:(db.upgradeSettings||{});
   user.type="reseller";user.resellerAt=user.resellerAt||pay.paidAt;user.resellerExpiresAt=calculateResellerExpiry(pay.paidAt,settings);user.resellerPlan=upgradeLabel(settings);
   addNotification(db,user.id,"Akun Reseller aktif",`Pembayaran berhasil. Akun kamu sekarang berstatus Reseller. Masa aktif: ${user.resellerPlan}.`,"success");
   await savePrivateDb(db);
   await sendPushToUser(db,user.id,{title:"Akun Reseller aktif",body:`Pembayaran berhasil. Akun kamu sekarang berstatus Reseller. Masa aktif: ${user.resellerPlan}.`,data:{type:"reseller_upgrade",link:"akun.html"}});
  }else if(["expired","cancel","canceled"].includes(status)){pay.status="rejected";await savePrivateDb(db);}
  return res.json({success:true,status,upgraded:user.type==="reseller"});
 }catch(e){console.error(e);return res.status(500).json({error:e.message||"Gagal mengecek upgrade."});}
};
