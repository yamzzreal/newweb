"use strict";
const {YAMZZ_PAYMENT_API,gatewayHeaders,gatewayConfigured}=require("../yamzz-payment/_common");
const {requireUser,privateDb,savePrivateDb,id,addNotification,clean}=require("../auth/_common");
const {ensure}=require("./_common");
const {sendTelegram,escapeHtml}=require("../../telegram");
const {sendPushToUser}=require("../../push");
function deep(input,keys,depth=0){if(!input||typeof input!=="object"||depth>6)return;for(const k of keys)if(input[k]!=null&&input[k]!=="")return input[k];for(const v of Object.values(input)){const x=deep(v,keys,depth+1);if(x!=null)return x}}
module.exports=async(req,res)=>{if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});try{const a=await requireUser(req);if(!a)return res.status(401).json({error:"Silakan login."});const user=a.user;const main=ensure(await privateDb());const settings=main.walletSettings||{};const amount=Math.floor(Number(req.body?.amount));const method=clean(req.body?.method,20).toLowerCase();const proofUrl=clean(req.body?.proofUrl,1000);const min=Number(settings.minTopup||10000);if(!Number.isFinite(amount)||amount<min)return res.status(400).json({error:`Minimal top up Rp${min.toLocaleString("id-ID")}.`});const topupMethods=Array.isArray(settings.topupMethods)?settings.topupMethods:[];
const selected=topupMethods.find(x=>String(x.id)===method);
if(!selected||selected.enabled===false)return res.status(400).json({error:"Metode top up tidak tersedia."});
const methods=settings.methods||{};
if(method==="qris"&&selected.enabled===false)return res.status(400).json({error:"QRIS otomatis sedang dinonaktifkan."});const db=main;db.topups=db.topups||[];const rec={id:id("tu"),userId:user.id,amount,method,status:method==="qris"?"pending":"waiting_proof",proofUrl,createdAt:new Date().toISOString(),paidAt:null};if(method==="qris"){
if(!gatewayConfigured())return res.status(500).json({error:"Yamzz Payment belum dikonfigurasi. Isi YAMZZ_PAYMENT_URL dan YAMZZ_PAYMENT_API_KEY."});
const gateway=await fetch(`${YAMZZ_PAYMENT_API}/api/index?route=payment-create`,{
 method:"POST",
 headers:gatewayHeaders(),
 body:JSON.stringify({
   order_id:rec.id,
   amount,
   customer_name:user.name||user.username||"",
   customer_email:user.email||"",
   expired_minutes:15,
   metadata:{source:"yamzz-market-wallet-topup",topupId:rec.id,userId:user.id}
 })
});
const raw=await gateway.text();let p={};try{p=raw?JSON.parse(raw):{}}catch{}
if(!gateway.ok||p.success===false)return res.status(gateway.status||502).json({error:p.error||p.message||"Yamzz Payment gagal membuat QRIS."});
rec.transactionId=String(p.transaction_id||p.transactionId||"");
rec.qrString=String(p.qr_string||p.qrString||"");
rec.amount=Number(p.amount)||amount;
rec.expiredAt=String(p.expires_at||p.expired_at||p.expiresAt||new Date(Date.now()+15*60000).toISOString());
if(!rec.transactionId||!rec.qrString)return res.status(502).json({error:"Data QRIS dari Yamzz Payment tidak lengkap."});
}
db.topups.unshift(rec);addNotification(db,user.id,"Top up dibuat",`Top up ${rec.amount.toLocaleString("id-ID")} melalui ${method.toUpperCase()} menunggu pembayaran.`,`info`);await savePrivateDb(db);await sendPushToUser(db,user.id,{title:"Top up dibuat",body:`Top up ${rec.amount.toLocaleString("id-ID")} melalui ${method.toUpperCase()} menunggu pembayaran.`,data:{type:"topup",link:"akun.html#wallet"}});try{await sendTelegram(`💳 <b>TOP UP BARU</b>\n\n👤 ${escapeHtml(user.name||user.username)} (@${escapeHtml(user.username)})\n💰 Rp${rec.amount.toLocaleString("id-ID")}\n🏦 ${escapeHtml(selected.name||method)}\n📌 Status: ${escapeHtml(rec.status)}\n🧾 ${escapeHtml(rec.id)}`)}catch(e){console.error(e)}
return res.json({success:true,topup:rec,payment:method==="qris"?{qrString:rec.qrString,transactionId:rec.transactionId,expiredAt:rec.expiredAt,amount:rec.amount}:selected})}catch(e){console.error(e);return res.status(500).json({error:e.message||"Gagal membuat top up."})}}
