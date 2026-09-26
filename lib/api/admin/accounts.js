
"use strict";
const {requireAdmin,privateDb,savePrivateDb,clean,id,hashPassword,addNotification}=require("./_common");
const {storeDb}=require("../yamzz-payment/_common");
const {sendPushToUser}=require("../../push");
function safeUser(u){
 return {id:u.id,username:u.username,name:u.name,whatsapp:u.whatsapp,email:u.email,type:u.type,status:u.status,createdAt:u.createdAt,resellerAt:u.resellerAt||null,resellerExpiresAt:u.resellerExpiresAt||null,resellerPlan:u.resellerPlan||null,balance:Math.max(0,Number(u.balance||0))};
}
module.exports=async(req,res)=>{
 if(!requireAdmin(req))return res.status(401).json({error:"Admin session tidak valid."});
 try{
  const db=await privateDb();
  if(req.method==="GET"){
   let changed=false;
   for(const u of db.users){
    if(u.type==="reseller"&&u.resellerExpiresAt){
      const exp=Date.parse(u.resellerExpiresAt);
      if(Number.isFinite(exp)&&Date.now()>=exp){
        u.type="customer";
        u.resellerExpiredAt=u.resellerExpiredAt||new Date().toISOString();
        changed=true;
      }
    }
   }
   if(changed)await savePrivateDb(db);
   return res.json({success:true,users:db.users.map(u=>safeUser(u))});
  }
  if(req.method==="POST"){
   const b=req.body||{}, action=clean(b.action,40), uid=clean(b.userId,100);
   const u=db.users.find(x=>String(x.id)===uid);
   if(!u)return res.status(404).json({error:"Akun tidak ditemukan."});
   if(action==="block"||action==="unblock"){
    u.status=action==="block"?"blocked":"active";
    const title=action==="block"?"Akun diblokir":"Akun dibuka kembali";
    const message=action==="block"?"Akun kamu diblokir oleh admin.":"Akun kamu sudah dapat digunakan kembali.";
    addNotification(db,u.id,title,message,action==="block"?"warning":"success");
    await sendPushToUser(db,u.id,{title,body:message,data:{type:"account_status",link:"akun.html"}});
   } else if(action==="password"){
    const pw=String(b.password||"");
    if(pw.length<8)return res.status(400).json({error:"Sandi baru minimal 8 karakter."});
    u.passwordHash=hashPassword(pw);
    addNotification(db,u.id,"Sandi akun diubah","Admin telah mengubah sandi akun kamu.","info");
    await sendPushToUser(db,u.id,{title:"Sandi akun diubah",body:"Admin telah mengubah sandi akun kamu.",data:{type:"password_changed",link:"akun.html"}});
   } else if(action==="chat"){
    const msg=clean(b.message,1000);
    if(!msg)return res.status(400).json({error:"Pesan wajib diisi."});
    db.messages.push({id:id("m"),userId:u.id,sender:"admin",message:msg,createdAt:new Date().toISOString(),read:false});
    addNotification(db,u.id,"Pesan baru dari admin",msg,"chat");
    await sendPushToUser(db,u.id,{title:"Pesan baru dari admin",body:msg,data:{type:"chat",link:"akun.html#chat"}});
   } else if(action==="notify"){
    const title=clean(b.title||"Status transaksi diperbarui",100);
    const message=clean(b.message||"Status transaksi kamu telah diperbarui.",500);
    addNotification(db,u.id,title,message,"info");
    await savePrivateDb(db);
    await sendPushToUser(db,u.id,{title,body:message,data:{type:"order_status",orderId:clean(b.orderId,100),link:"cek-transaksi.html"}});
    return res.json({success:true});
   } else if(action==="delete"){
    if(!String(b.confirm||"").trim())return res.status(400).json({error:"Konfirmasi hapus akun diperlukan."});
    db.users=db.users.filter(x=>String(x.id)!==uid);
    db.messages=db.messages.filter(x=>String(x.userId)!==uid);
    db.notifications=db.notifications.filter(x=>String(x.userId)!==uid);
    db.resellerPayments=db.resellerPayments.filter(x=>String(x.userId)!==uid);
    db.walletLedger=db.walletLedger.filter(x=>String(x.userId)!==uid);
    db.topups=db.topups.filter(x=>String(x.userId)!==uid);
    db.withdrawals=db.withdrawals.filter(x=>String(x.userId)!==uid);
    db.passwordResets=db.passwordResets.filter(x=>String(x.userId)!==uid);
    const store=await storeDb().catch(()=>null);
    if(store&&Array.isArray(store.orders)){
      store.orders=store.orders.map(o=>String(o.userId||"")===uid?({...o,userId:null}):o);
      const {save}=require("../yamzz-payment/_common");
      await save(store);
    }
    await savePrivateDb(db);
    return res.json({success:true,deleted:true});
   } else return res.status(400).json({error:"Aksi tidak dikenal."});
   await savePrivateDb(db);
   return res.json({success:true});
  }
  return res.status(405).json({error:"Method not allowed"});
 }catch(e){console.error(e);return res.status(e.statusCode||500).json({error:e.message||"Gagal mengelola akun."});}
};
