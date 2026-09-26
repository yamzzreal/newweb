"use strict";
const {YAMZZ_PAYMENT_API,gatewayHeaders,gatewayConfigured}=require("../yamzz-payment/_common");
const {requireUser,savePrivateDb,addNotification}=require("../auth/_common");
const {ensure}=require("./_common");
const {sendTelegram,escapeHtml}=require("../../telegram");
const {sendPushToUser}=require("../../push");

module.exports=async(req,res)=>{
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{
    const a=await requireUser(req);
    if(!a) return res.status(401).json({error:"Sesi tidak valid."});

    const db=ensure(a.db),u=a.user,tid=String(req.body?.transactionId||"").trim();
    const top=db.topups.find(x=>String(x.transactionId)===tid&&String(x.userId)===String(u.id));
    if(!top) return res.status(404).json({error:"Top up tidak ditemukan."});
    if(top.status==="paid") return res.json({success:true,status:"paid",credited:true});
    if(!gatewayConfigured()) return res.status(500).json({error:"Yamzz Payment belum dikonfigurasi."});

    const r=await fetch(`${YAMZZ_PAYMENT_API}/api/index?route=payment-status&transaction_id=${encodeURIComponent(tid)}`,{
      method:"GET",
      headers:gatewayHeaders({"Content-Type":"application/json"})
    });
    const raw=await r.text();
    let p={}; try{p=raw?JSON.parse(raw):{}}catch{}
    if(!r.ok) return res.status(r.status||502).json({error:p.error||p.message||"Gagal mengecek pembayaran di Yamzz Payment."});

    const data=p.transaction||p.data||{};
    const status=String(data.status||p.status||"").toLowerCase();

    if(status==="paid"){
      if(top.status==="processing") return res.json({success:true,status:"paid",credited:false,processing:true});
      top.status="processing";
      await savePrivateDb(db);

      const amount=Number(top.amount)||0;
      u.balance=Math.max(0,Number(u.balance||0))+amount;
      db.walletLedger.unshift({
        id:`wl_${Date.now().toString(36)}`,
        userId:u.id,
        type:"topup",
        amount,
        note:`Top up saldo via QRIS Yamzz Payment`,
        ref:top.id,
        createdAt:new Date().toISOString(),
        meta:{method:"qris",transactionId:tid}
      });
      top.status="paid";
      top.paidAt=top.paidAt||new Date().toISOString();
      addNotification(db,u.id,"Saldo bertambah",`Top up Rp${amount.toLocaleString("id-ID")} berhasil masuk ke saldo.`,"success");
      await savePrivateDb(db);
      await sendTelegram(`✅ <b>TOP UP BERHASIL</b>\n\n👤 ${escapeHtml(u.name||u.username)} (@${escapeHtml(u.username)})\n💰 Rp${amount.toLocaleString("id-ID")}\n🧾 ${escapeHtml(top.id)}\n📌 Saldo telah ditambahkan.`).catch(()=>{});
    }else if(["expired","cancel"].includes(status)){
      top.status="rejected";
      await savePrivateDb(db);
    }

    return res.json({success:true,status,credited:top.status==="paid",balance:Number(u.balance||0)});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:e.message||"Gagal mengecek top up."});
  }
};
