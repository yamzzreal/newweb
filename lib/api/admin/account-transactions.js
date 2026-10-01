"use strict";
const {requireAdmin,privateDb}=require("./_common");
const {readStore}=require("../../db");
module.exports=async(req,res)=>{
  if(!requireAdmin(req))return res.status(401).json({error:"Admin session tidak valid."});
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  try{
    const [db,store]=await Promise.all([privateDb(),readStore()]);
    const users=db.users||[];
    const now=Date.now();
    for(const u of users){if(u.type==="reseller"&&u.resellerExpiresAt){const exp=Date.parse(u.resellerExpiresAt);if(Number.isFinite(exp)&&now>=exp)u.type="customer";}}
    const orders=Array.isArray(store.orders)?store.orders:[];
    const rows=users.map(u=>({
      user:{id:u.id,username:u.username,name:u.name,whatsapp:u.whatsapp,type:u.type,status:u.status},
      transactions:orders.filter(o=>String(o.userId||"")===String(u.id) || (!o.userId && String(o.whatsapp||"")===String(u.whatsapp||""))).map(o=>({
        id:o.id,product:o.product||"Produk",status:o.status||"pending",price:Number(o.totalAmount??o.price??0)||0,
        paymentMethod:o.paymentMethod||o.paymentGateway||"-",createdAt:o.createdAt||null,paidAt:o.paidAt||null,deliveryLink:o.deliveryLink||""
      }))
    })).filter(x=>x.transactions.length);
    return res.json({success:true,accounts:rows,total:rows.reduce((n,x)=>n+x.transactions.length,0)});
  }catch(e){console.error(e);return res.status(e.statusCode||500).json({error:e.message||"Gagal memuat transaksi akun."});}
};
