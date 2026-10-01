"use strict";
const {requireAdmin,privateDb,savePrivateDb,clientMeta,clean}=require("./_common");
module.exports=async(req,res)=>{
 const admin=await requireAdmin(req);if(!admin)return res.status(401).json({error:"Admin session tidak valid."});
 try{const db=await privateDb();db.adminSessions=Array.isArray(db.adminSessions)?db.adminSessions:[];const current=db.adminSessions.find(x=>String(x.id)===String(admin.sid));if(admin.sid&&!current)return res.status(401).json({error:"Sesi perangkat sudah tidak aktif. Silakan login kembali."});
 if(req.method==="GET"){return res.json({success:true,currentSessionId:admin.sid||null,sessions:db.adminSessions.filter(x=>x&&x.active!==false).map(x=>({...x,current:String(x.id)===String(admin.sid)}))});}
 if(req.method==="POST"){if(!current)return res.status(401).json({error:"Sesi tidak ditemukan."});const meta=clientMeta(req,req.body||{});current.lastSeenAt=new Date().toISOString();current.ip=meta.ip||current.ip;current.city=meta.city||current.city;current.region=meta.region||current.region;current.country=meta.country||current.country;current.location=[current.city,current.region,current.country].filter(Boolean).join(", ")||current.location||"Tidak diketahui";if(meta.userAgent)current.userAgent=meta.userAgent;await savePrivateDb(db);return res.json({success:true,session:current});}
 if(req.method==="DELETE"){const target=clean(req.body?.sessionId||"",120);if(!target)return res.status(400).json({error:"sessionId wajib diisi."});const s=db.adminSessions.find(x=>String(x.id)===target);if(!s)return res.status(404).json({error:"Perangkat tidak ditemukan."});s.active=false;s.revokedAt=new Date().toISOString();await savePrivateDb(db);return res.json({success:true,revoked:target});}
 return res.status(405).json({error:"Method not allowed"});
 }catch(e){console.error("ADMIN SESSION ERROR",e);return res.status(500).json({error:e.message||"Gagal mengelola perangkat."});}
};
