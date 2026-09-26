"use strict";
const { readStore } = require("../../db");
const { requireUser } = require("./_common");
module.exports = async (req,res)=>{
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  try{
    const a=await requireUser(req); if(!a)return res.status(401).json({error:"Sesi tidak valid."});
    const store=await readStore();
    const orders=Array.isArray(store.orders)?store.orders:[];
    const rows=orders.filter(o=>String(o.userId||"")===String(a.user.id)).slice(0,50).map(o=>({
      id:o.id, product:o.product||"Produk", status:o.status||"pending", price:Number(o.totalAmount??o.price??0)||0,
      paymentMethod:o.paymentMethod||o.paymentGateway||"-", createdAt:o.createdAt||null, paidAt:o.paidAt||null,
      deliveryLink:o.deliveryLink||""
    }));
    return res.json({success:true,transactions:rows});
  }catch(e){console.error(e);return res.status(500).json({error:e.message||"Gagal memuat transaksi."});}
};
