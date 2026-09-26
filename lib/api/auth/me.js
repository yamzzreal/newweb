"use strict";
const {requireUser,publicUser}=require("./_common");
const {readStore}=require("../../db");
module.exports=async(req,res)=>{
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
 try{
  const a=await requireUser(req);if(!a)return res.status(401).json({error:"Sesi tidak valid."});
  const store=await readStore();
  const legacyPrice=Number(store.site?.resellerPrice||0);
  const upgrade=a.db.upgradeSettings&&typeof a.db.upgradeSettings==="object"?a.db.upgradeSettings:{};
  return res.json({success:true,user:publicUser(a.user),upgrade:{price:Number(upgrade.price||legacyPrice||0),mode:upgrade.mode||"days",value:Number(upgrade.value)||30}});
 }catch(e){console.error(e);return res.status(500).json({error:e.message||"Gagal mengambil profil."});}
};
