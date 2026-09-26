"use strict";
const {requireAdmin,privateDb,savePrivateDb,clean,id,addNotification}=require("./_common");
const {sendPushToUser}=require("../../push");

module.exports=async(req,res)=>{
  if(!requireAdmin(req))return res.status(401).json({error:"Admin session tidak valid."});
  try{
    const db=await privateDb();
    const users=db.users||[];
    if(req.method==="GET"){
      for(const u of users){if(u.type==="reseller"&&u.resellerExpiresAt){const exp=Date.parse(u.resellerExpiresAt);if(Number.isFinite(exp)&&Date.now()>=exp)u.type="customer";}}
      const map=new Map();
      for(const m of (db.messages||[])){
        const uid=String(m.userId||"");
        if(!uid)continue;
        if(!map.has(uid))map.set(uid,[]);
        map.get(uid).push(m);
      }
      const conversations=users.map(u=>{
        const messages=(map.get(String(u.id))||[]).slice(-100);
        const unread=messages.filter(m=>m.sender==="user"&&!m.read).length;
        return {
          user:{id:u.id,username:u.username,name:u.name,type:u.type,status:u.status},
          unread,
          messages,
          lastMessage:messages[messages.length-1]||null
        };
      }).sort((a,b)=>new Date(b.lastMessage?.createdAt||0)-new Date(a.lastMessage?.createdAt||0));
      // Pesan user dianggap sudah diperiksa admin setelah halaman chat dibuka.
      for(const c of conversations){
        for(const m of c.messages){if(m.sender==="user")m.read=true;}
      }
      if(conversations.length)await savePrivateDb(db);
      return res.json({success:true,conversations});
    }
    if(req.method==="POST"){
      const uid=clean(req.body?.userId,100), msg=clean(req.body?.message,1000);
      if(!uid||!msg)return res.status(400).json({error:"Akun dan pesan wajib diisi."});
      const u=users.find(x=>String(x.id)===uid);
      if(!u)return res.status(404).json({error:"Akun tidak ditemukan."});
      db.messages.push({id:id("m"),userId:u.id,sender:"admin",message:msg,createdAt:new Date().toISOString(),read:false});
      addNotification(db,u.id,"Pesan baru dari admin",msg,"chat");
      await savePrivateDb(db);
      await sendPushToUser(db,u.id,{title:"Pesan baru dari admin",body:msg,data:{type:"chat",link:"akun.html#chat"}});
      return res.json({success:true});
    }
    return res.status(405).json({error:"Method not allowed"});
  }catch(e){console.error(e);return res.status(e.statusCode||500).json({error:e.message||"Gagal mengelola chat."});}
};
