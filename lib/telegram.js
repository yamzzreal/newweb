"use strict";

function escapeHtml(value){
  return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function sendTelegram(text){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatId=process.env.TELEGRAM_CHAT_ID;
  if(!token||!chatId)return false;
  try{
    const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({chat_id:chatId,text,parse_mode:"HTML",disable_web_page_preview:true})
    });
    return r.ok;
  }catch(e){console.error("Telegram error:",e.message);return false;}
}
module.exports={sendTelegram,escapeHtml};
