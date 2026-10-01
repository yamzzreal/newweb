"use strict";
const form=document.getElementById("loginForm");
const username=document.getElementById("username");
const password=document.getElementById("password");
const error=document.getElementById("loginError");
const toggle=document.getElementById("togglePassword");
const TOKEN_KEY="yamzz_admin_token";
if(localStorage.getItem(TOKEN_KEY)||sessionStorage.getItem(TOKEN_KEY)) location.replace("admin.html");
toggle?.addEventListener("click",()=>{password.type=password.type==="password"?"text":"password";toggle.innerHTML=password.type==="password"?'<i class="fa-solid fa-eye"></i>':'<i class="fa-solid fa-eye-slash"></i>';});
function deviceInfo(){
  const ua=navigator.userAgent||"";
  let name="Perangkat";
  if(/Android/i.test(ua))name="Android";
  else if(/iPhone/i.test(ua))name="iPhone";
  else if(/iPad/i.test(ua))name="iPad";
  else if(/Windows/i.test(ua))name="Windows";
  else if(/Mac/i.test(ua))name="Mac";
  return {deviceName:name,platform:/Android/i.test(ua)?"android":"web",userAgent:ua};
}
form?.addEventListener("submit",async e=>{
 e.preventDefault();error.textContent="";error.classList.remove("show");
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Masuk...';
 try{
  const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:username.value.trim(),password:password.value,device:deviceInfo()})});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error||"Login gagal.");
  localStorage.setItem(TOKEN_KEY,d.token);
  localStorage.setItem("yamzz_admin_authenticated","true");
  localStorage.setItem("yamzz_admin_time",String(Date.now()));
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("yamzz_admin_authenticated");
  sessionStorage.removeItem("yamzz_admin_time");
  location.replace("admin.html");
 }catch(e){error.textContent=e.message;error.classList.add("show");}
 finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Masuk ke Admin';}
});
