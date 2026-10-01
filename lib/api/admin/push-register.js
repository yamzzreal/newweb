"use strict";
const crypto=require("crypto");
const {requireAdmin,privateDb,savePrivateDb,clean,id}=require("./_common");
module.exports=async(req,res)=>{
 const admin=await requireAdmin(req);if(!admin)return res.status(401).json({error:"Admin session tidak valid."});
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{const token=clean(req.body?.token,4096),platform=clean(req.body?.platform||"android",30),deviceName=clean(req.body?.deviceName||"",160);if(!token||token.length<20)return res.status(400).json({error:"Token perangkat tidak valid."});
 const db=await privateDb();db.adminPushDevices=Array.isArray(db.adminPushDevices)?db.adminPushDevices:[];const hash=crypto.createHash("sha256").update(token).digest("hex"),now=new Date().toISOString(),existing=db.adminPushDevices.find(x=>x.hash===hash);
 if(existing){existing.token=token;existing.platform=platform;existing.deviceName=deviceName||existing.deviceName||"Perangkat Android";existing.sessionId=admin.sid||existing.sessionId||null;existing.updatedAt=now;existing.active=true;}else db.adminPushDevices.unshift({id:id("adminpush"),hash,token,platform,deviceName:deviceName||"Perangkat Android",sessionId:admin.sid||null,active:true,createdAt:now,updatedAt:now});
 db.adminPushDevices=db.adminPushDevices.filter(x=>x&&x.token&&x.active!==false).slice(0,100);await savePrivateDb(db);return res.json({success:true,registered:true});
 }catch(e){console.error("ADMIN PUSH REGISTER ERROR",e);return res.status(500).json({error:e.message||"Gagal mendaftarkan perangkat admin."});}
};
