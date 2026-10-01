"use strict";
const {adminToken,privateDb,savePrivateDb,id,clientMeta}=require("./_common");
module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 const u=String(process.env.YAMZZ_ADMIN_USERNAME||"").trim(),p=String(process.env.YAMZZ_ADMIN_PASSWORD||""),b=req.body||{};
 if(!u||!p)return res.status(500).json({error:"Admin auth belum dikonfigurasi. Isi YAMZZ_ADMIN_USERNAME dan YAMZZ_ADMIN_PASSWORD."});
 if(String(b.username||"")!==u||String(b.password||"")!==p)return res.status(401).json({error:"Username atau password admin salah."});
 try{const db=await privateDb();db.adminSessions=Array.isArray(db.adminSessions)?db.adminSessions:[];const meta=clientMeta(req,b.device||{}),now=new Date().toISOString(),sessionId=id("session");db.adminSessions.unshift({id:sessionId,deviceId:id("device"),deviceName:meta.deviceName,platform:meta.platform||"web",ip:meta.ip,city:meta.city,region:meta.region,country:meta.country,location:[meta.city,meta.region,meta.country].filter(Boolean).join(", ")||"Tidak diketahui",userAgent:meta.userAgent,createdAt:now,lastSeenAt:now,active:true});db.adminSessions=db.adminSessions.filter(x=>x&&x.active!==false).slice(0,50);await savePrivateDb(db);return res.json({success:true,token:adminToken(meta,sessionId),expiresAt:new Date(Date.now()+30*24*60*60*1000).toISOString(),sessionId});}catch(e){return res.status(500).json({error:e.message});}
};
