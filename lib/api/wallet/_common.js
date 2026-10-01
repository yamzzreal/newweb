"use strict";
const {privateDb,savePrivateDb,id,clean,addNotification}=require("../auth/_common");
const {sendPushToUser}=require("../../push");
function ensure(db){
 db.walletLedger=Array.isArray(db.walletLedger)?db.walletLedger:[];
 db.topups=Array.isArray(db.topups)?db.topups:[];
 db.withdrawals=Array.isArray(db.withdrawals)?db.withdrawals:[];
 db.walletSettings=db.walletSettings&&typeof db.walletSettings==="object"?db.walletSettings:{};
 const ws=db.walletSettings;
 ws.topupMethods=Array.isArray(ws.topupMethods)?ws.topupMethods:[];
 ws.withdrawMethods=Array.isArray(ws.withdrawMethods)?ws.withdrawMethods:[];
 const legacy=ws.methods&&typeof ws.methods==="object"?ws.methods:{};
 if(!ws.topupMethods.length){
  ws.topupMethods=[
   {id:"dana",name:"DANA",account:String(legacy.dana?.number||""),holder:String(legacy.dana?.holder||""),enabled:legacy.dana?.enabled!==false},
   {id:"seabank",name:"SeaBank",account:String(legacy.seabank?.number||""),holder:String(legacy.seabank?.holder||""),enabled:legacy.seabank?.enabled!==false},
   {id:"qris",name:"QRIS Otomatis",account:"",holder:"",enabled:legacy.qris!==false,automatic:true}
  ];
 }
 if(!ws.withdrawMethods.length){
  ws.withdrawMethods=[
   {id:"dana",name:"DANA",account:String(legacy.dana?.number||""),holder:String(legacy.dana?.holder||""),enabled:legacy.dana?.enabled!==false},
   {id:"seabank",name:"SeaBank",account:String(legacy.seabank?.number||""),holder:String(legacy.seabank?.holder||""),enabled:legacy.seabank?.enabled!==false}
  ];
 }
 return db
}
function balance(user){return Math.max(0,Number(user.balance||0))}
function addLedger(db,userId,type,amount,note,ref="",meta={}){const n=Number(amount)||0;if(!n)throw new Error("Nominal tidak valid.");db.walletLedger.unshift({id:id("wl"),userId:String(userId),type,amount:n,note:clean(note,300),ref:clean(ref,120),createdAt:new Date().toISOString(),meta});db.walletLedger=db.walletLedger.slice(0,10000);return db.walletLedger[0]}
async function creditUser(userId,amount,note,type="topup",ref="",meta={}){const db=ensure(await privateDb());const u=db.users.find(x=>String(x.id)===String(userId));if(!u)throw new Error("Akun tidak ditemukan.");const n=Number(amount);if(!Number.isFinite(n)||n<=0)throw new Error("Nominal tidak valid.");u.balance=balance(u)+n;addLedger(db,u.id,type,n,note,ref,meta);await savePrivateDb(db);return u}
async function debitUser(userId,amount,note,type="withdrawal",ref="",meta={}){const db=ensure(await privateDb());const u=db.users.find(x=>String(x.id)===String(userId));if(!u)throw new Error("Akun tidak ditemukan.");const n=Number(amount);if(!Number.isFinite(n)||n<=0||balance(u)<n)throw new Error("Saldo tidak mencukupi.");u.balance=balance(u)-n;addLedger(db,u.id,type,-n,note,ref,meta);await savePrivateDb(db);return u}
async function creditCommission(order,product){if(!order?.userId||order.commissionCredited)return false;const db=ensure(await privateDb());const u=db.users.find(x=>String(x.id)===String(order.userId));if(!u||u.type!=="reseller")return false;const commission=Number(product?.commission??product?.resellerCommission??0);if(!Number.isFinite(commission)||commission<=0)return false;const qty=Math.max(1,Number(order.quantity||1));const amount=commission*qty;u.balance=balance(u)+amount;addLedger(db,u.id,"commission",amount,`Komisi reseller dari transaksi ${order.id}`,order.id,{productId:product?.id||null,product:product?.name||order.product,quantity:qty});addNotification(db,u.id,"Komisi masuk",`Komisi ${amount.toLocaleString("id-ID")} dari transaksi ${order.id} sudah masuk ke saldo.`,`success`);await savePrivateDb(db);await sendPushToUser(db,u.id,{title:"Komisi masuk",body:`Komisi ${amount.toLocaleString("id-ID")} dari transaksi ${order.id} sudah masuk ke saldo.`,data:{type:"commission",orderId:order.id,link:"akun.html#wallet"}});return true}
module.exports={ensure,balance,addLedger,creditUser,debitUser,creditCommission};
