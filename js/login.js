
"use strict";
const form=document.getElementById("loginForm");
const username=document.getElementById("username");
const password=document.getElementById("password");
const error=document.getElementById("loginError");
const toggle=document.getElementById("togglePassword");
if(sessionStorage.getItem("yamzz_admin_token")) location.replace("admin.html");
toggle?.addEventListener("click",()=>{password.type=password.type==="password"?"text":"password";toggle.innerHTML=password.type==="password"?'<i class="fa-solid fa-eye"></i>':'<i class="fa-solid fa-eye-slash"></i>';});
form?.addEventListener("submit",async e=>{
 e.preventDefault(); error.textContent=""; error.classList.remove("show");
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Masuk...';
 try{
  const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:username.value.trim(),password:password.value})});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error||"Login gagal.");
  sessionStorage.setItem("yamzz_admin_token",d.token);
  sessionStorage.setItem("yamzz_admin_authenticated","true");
  sessionStorage.setItem("yamzz_admin_time",String(Date.now()));
  location.replace("admin.html");
 }catch(e){error.textContent=e.message;error.classList.add("show");}
 finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Masuk ke Admin';}
});
