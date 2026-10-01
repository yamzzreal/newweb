 "use strict";
const crypto=require("crypto");
const {privateDb,savePrivateDb,clean,id,hashPassword,verifyPassword,addNotification}=require("../auth/_common");
function adminPayload(token){try{const [body,sig]=String(token||"").split(".");const secret=process.env.YAMZZ_AUTH_SECRET;if(!secret||!body||!sig)return null;const expected=crypto.createHmac("sha256",secret).update(body).digest("base64url");if(expected.length!==sig.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(sig)))return null;const p=JSON.parse(Buffer.from(body,"base64url").toString("utf8"));if(p.role!=="admin"||Number(p.exp)<=Date.now())return null;return p;}catch{return null;}}
function clientIp(req){const f=String(req.headers?.["x-forwarded-for"]||"").split(",")[0].trim();return clean(f||req.headers?.["x-real-ip"]||req.socket?.remoteAddress||"unknown",120);}
function guessDeviceName(ua,platform){const u=String(ua||"");if(/Android/i.test(u)){const m=u.match(/Android[^;)]*;[^;)]*;\s*([^;)]+?)(?:\s+Build[\/;].*)?[;)]/i);if(m?.[1])return clean(m[1].replace(/Build.*$/i,"").trim(),120);return"Android";}if(/iPhone/i.test(u))return"iPhone";if(/iPad/i.test(u))return"iPad";if(/Windows/i.test(u))return"Windows";if(/Mac OS/i.test(u))return"Mac";if(/Linux/i.test(u))return"Linux";return platform||"Perangkat";}
function clientMeta(req,extra={}){const ip=clientIp(req),city=clean(req.headers?.["x-vercel-ip-city"]||extra.city||"",120),country=clean(req.headers?.["x-vercel-ip-country"]||extra.country||"",80),region=clean(req.headers?.["x-vercel-ip-country-region"]||extra.region||"",80),ua=clean(req.headers?.["user-agent"]||extra.userAgent||"",500),platform=clean(extra.platform||"",40),deviceName=clean(extra.deviceName||"",160)||guessDeviceName(ua,platform);return{ip,city,country,region,userAgent:ua,platform,deviceName};}
function adminToken(meta={},sessionId=null){const secret=process.env.YAMZZ_AUTH_SECRET;if(!secret)throw new Error("YAMZZ_AUTH_SECRET belum dikonfigurasi.");const payload={role:"admin",sid:sessionId||id("sess"),exp:Date.now()+30*24*60*60*1000};const body=Buffer.from(JSON.stringify(payload)).toString("base64url");const sig=crypto.createHmac("sha256",secret).update(body).digest("base64url");return body+"."+sig;}
async function requireAdmin(req){
  const h=String(req.headers?.authorization||"");
  const payload=adminPayload(h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"");
  if(!payload)return null;
  if(!payload.sid)return payload;
  try{
    const db=await privateDb();
    const session=(Array.isArray(db.adminSessions)?db.adminSessions:[]).find(x=>String(x.id)===String(payload.sid));
    if(!session||session.active===false)return null;
    return payload;
  }catch{return null;}
}
module.exports={privateDb,savePrivateDb,clean,id,hashPassword,verifyPassword,addNotification,adminToken,adminPayload,requireAdmin,clientMeta,clientIp,guessDeviceName};
