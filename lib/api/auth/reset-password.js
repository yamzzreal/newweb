"use strict";
const crypto=require("crypto");
const {privateDb,savePrivateDb,hashPassword}=require("./_common");
const {sendPushToUser}=require("../../push");
module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 try{
  const token=String(req.body?.token||"").trim(), password=String(req.body?.password||"");
  if(!token||password.length<8)return res.status(400).json({error:"Token dan password minimal 8 karakter wajib diisi."});
  const db=await privateDb(), h=crypto.createHash("sha256").update(token).digest("hex");
  const r=db.passwordResets.find(x=>x.tokenHash===h&&!x.used&&new Date(x.expiresAt)>new Date());
  if(!r)return res.status(400).json({error:"Link reset password tidak valid atau sudah kedaluwarsa."});
  const u=db.users.find(x=>String(x.id)===String(r.userId));
  if(!u)return res.status(404).json({error:"Akun tidak ditemukan."});
  u.passwordHash=hashPassword(password);r.used=true;r.usedAt=new Date().toISOString();
  await savePrivateDb(db);
  await sendPushToUser(db,u.id,{title:"Password berhasil diubah",body:"Password akun kamu berhasil diubah.",data:{type:"password_reset",link:"login.html"}});
  return res.json({success:true,message:"Password berhasil diubah. Silakan login kembali."});
 }catch(e){console.error(e);return res.status(500).json({error:e.message||"Gagal reset password."});}
};
