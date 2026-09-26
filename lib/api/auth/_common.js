"use strict";
const crypto = require("crypto");
const { readPrivate, writePrivate } = require("../../db");

const JWT_SECRET = process.env.YAMZZ_AUTH_SECRET;

function assertConfig() {
  if (!JWT_SECRET) {
    const e = new Error("Auth belum dikonfigurasi. Isi YAMZZ_AUTH_SECRET di Vercel.");
    e.statusCode = 500;
    throw e;
  }
}

async function privateDb() {
  assertConfig();
  const db = await readPrivate();
  db.users = Array.isArray(db.users) ? db.users : [];
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
  db.messages = Array.isArray(db.messages) ? db.messages : [];
  db.resellerPayments = Array.isArray(db.resellerPayments) ? db.resellerPayments : [];
  db.walletLedger = Array.isArray(db.walletLedger) ? db.walletLedger : [];
  db.topups = Array.isArray(db.topups) ? db.topups : [];
  db.withdrawals = Array.isArray(db.withdrawals) ? db.withdrawals : [];
  db.walletSettings = db.walletSettings && typeof db.walletSettings === "object" ? db.walletSettings : {};
  db.upgradeSettings = db.upgradeSettings && typeof db.upgradeSettings === "object" ? db.upgradeSettings : {};
  db.passwordResets = Array.isArray(db.passwordResets) ? db.passwordResets : [];
  return db;
}

async function savePrivateDb(db) {
  assertConfig();
  await writePrivate(db);
}

function clean(v,max=300){return String(v ?? "").trim().slice(0,max);}
function id(prefix="u"){
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}
function hashPassword(password){
  const salt=crypto.randomBytes(16);
  const derived=crypto.scryptSync(String(password),salt,64);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}
function verifyPassword(password,stored){
  try{
    const [scheme,saltHex,hashHex]=String(stored||"").split(":");
    if(scheme!=="scrypt"||!saltHex||!hashHex)return false;
    const actual=crypto.scryptSync(String(password),Buffer.from(saltHex,"hex"),64);
    const expected=Buffer.from(hashHex,"hex");
    return expected.length===actual.length && crypto.timingSafeEqual(expected,actual);
  }catch{return false;}
}
function b64(v){return Buffer.from(JSON.stringify(v)).toString("base64url");}
function signToken(payload){
  assertConfig();
  const body=b64(payload);
  const sig=crypto.createHmac("sha256",JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function readToken(token){
  try{
    assertConfig();
    const [body,sig]=String(token||"").split(".");
    if(!body||!sig)return null;
    const expected=crypto.createHmac("sha256",JWT_SECRET).update(body).digest("base64url");
    if(expected.length!==sig.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(sig)))return null;
    const p=JSON.parse(Buffer.from(body,"base64url").toString("utf8"));
    if(!p.exp||Date.now()>Number(p.exp))return null;
    return p;
  }catch{return null;}
}
function bearer(req){
  const h=String(req.headers?.authorization||"");
  return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";
}
async function requireUser(req){
  const token=bearer(req);
  const session=readToken(token);
  if(!session?.uid) return null;
  const db=await privateDb();
  const user=db.users.find(u=>String(u.id)===String(session.uid));
  if(!user||user.status==="blocked")return null;

  // Otomatis turunkan akun reseller yang sudah melewati masa berlaku.
  if(user.type==="reseller" && user.resellerExpiresAt){
    const exp=Date.parse(user.resellerExpiresAt);
    if(Number.isFinite(exp) && Date.now()>=exp){
      user.type="customer";
      user.resellerExpiredAt=new Date().toISOString();
      addNotification(db,user.id,"Masa Reseller berakhir","Masa berlaku akun Reseller kamu sudah berakhir. Akun kembali menjadi Customer.","warning");
      await savePrivateDb(db);
    }
  }
  return {db,user};
}
function calculateResellerExpiry(fromDate,settings){
  const s=settings&&typeof settings==="object"?settings:{};
  const mode=String(s.mode||"days");
  if(mode==="permanent")return null;
  const value=Math.max(1,Math.min(36500,Number(s.value)||30));
  const d=new Date(fromDate||Date.now());
  if(mode==="years"){d.setFullYear(d.getFullYear()+value);return d.toISOString();}
  if(mode==="months"){d.setMonth(d.getMonth()+value);return d.toISOString();}
  d.setDate(d.getDate()+value);return d.toISOString();
}
function upgradeLabel(settings){
  const s=settings&&typeof settings==="object"?settings:{};
  if(String(s.mode)==="permanent")return "Permanen";
  const unit={days:"Hari",months:"Bulan",years:"Tahun"}[String(s.mode)]||"Hari";
  return `${Math.max(1,Number(s.value)||30)} ${unit}`;
}

function publicUser(u){
  if(!u)return null;
  return {id:u.id,username:u.username,name:u.name,whatsapp:u.whatsapp,email:u.email,type:u.type,status:u.status,createdAt:u.createdAt,resellerAt:u.resellerAt||null,resellerExpiresAt:u.resellerExpiresAt||null,resellerPlan:u.resellerPlan||null,balance:Math.max(0,Number(u.balance||0))};
}
function makeToken(user){
  return signToken({uid:user.id,exp:Date.now()+7*24*60*60*1000});
}
function addNotification(db,userId,title,message,type="info"){
  db.notifications.unshift({id:id("n"),userId:String(userId),title:clean(title,100),message:clean(message,500),type,read:false,createdAt:new Date().toISOString()});
  db.notifications=db.notifications.slice(0,5000);
}
module.exports={privateDb,savePrivateDb,clean,id,hashPassword,verifyPassword,makeToken,bearer,readToken,requireUser,publicUser,addNotification,calculateResellerExpiry,upgradeLabel};
