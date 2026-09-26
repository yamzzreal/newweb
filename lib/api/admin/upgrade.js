"use strict";
const {requireAdmin,privateDb,savePrivateDb}=require("./_common");
const {readStore,writeStore}=require("../../db");
function normalize(s){
  const raw=s&&typeof s==="object"?s:{};
  const mode=["days","months","years","permanent"].includes(String(raw.mode))?String(raw.mode):"days";
  const value=Math.max(1,Math.min(36500,Number(raw.value)||30));
  return {price:Math.max(0,Math.floor(Number(raw.price)||0)),mode,value};
}
module.exports=async(req,res)=>{
  if(!requireAdmin(req))return res.status(401).json({error:"Admin session tidak valid."});
  try{
    const db=await privateDb();
    if(req.method==="GET"){
      const store=await readStore();
      const legacy=Number(store.site?.resellerPrice||0);
      const settings=normalize({...db.upgradeSettings,price:db.upgradeSettings?.price??legacy});
      return res.json({success:true,settings});
    }
    if(req.method==="POST"){
      const settings=normalize(req.body||{});
      if(settings.price<1)return res.status(400).json({error:"Harga upgrade harus lebih dari Rp0."});
      db.upgradeSettings=settings;
      await savePrivateDb(db);
      const store=await readStore();
      store.site=store.site&&typeof store.site==="object"?store.site:{};
      store.site.resellerPrice=settings.price;
      await writeStore(store);
      return res.json({success:true,settings});
    }
    return res.status(405).json({error:"Method not allowed"});
  }catch(e){console.error(e);return res.status(e.statusCode||500).json({error:e.message||"Gagal mengatur upgrade reseller."});}
};
