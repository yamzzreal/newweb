(() => {
  "use strict";

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  // Register the service worker.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    });
  }

  if (isStandalone) return;

  let deferredPrompt = null;
  let popupShown = false;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  function addStyles() {
    if (document.getElementById("yamzz-pwa-style")) return;

    const style = document.createElement("style");
    style.id = "yamzz-pwa-style";
    style.textContent = `
      .yamzz-pwa-overlay{
        position:fixed;inset:0;z-index:999999;
        display:flex;align-items:flex-end;justify-content:center;
        padding:18px;background:rgba(0,0,0,.62);
        backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);
        opacity:0;pointer-events:none;transition:opacity .25s ease;
      }
      .yamzz-pwa-overlay.show{opacity:1;pointer-events:auto}
      .yamzz-pwa-card{
        width:min(430px,100%);box-sizing:border-box;
        background:linear-gradient(145deg,#0b1728,#101d31);
        border:1px solid rgba(77,183,255,.25);
        border-radius:24px;padding:20px;
        color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.55);
        transform:translateY(30px);transition:transform .3s ease;
        font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .yamzz-pwa-overlay.show .yamzz-pwa-card{transform:translateY(0)}
      .yamzz-pwa-head{display:flex;align-items:center;gap:13px}
      .yamzz-pwa-logo{
        width:58px;height:58px;border-radius:16px;object-fit:cover;
        border:1px solid rgba(255,255,255,.12);
        box-shadow:0 7px 22px rgba(0,140,255,.22)
      }
      .yamzz-pwa-title{font-size:18px;font-weight:800;margin:0}
      .yamzz-pwa-sub{font-size:12px;color:#9eabc0;margin-top:4px}
      .yamzz-pwa-close{
        margin-left:auto;width:34px;height:34px;border:0;border-radius:50%;
        background:rgba(255,255,255,.07);color:#aeb9ca;font-size:22px;cursor:pointer
      }
      .yamzz-pwa-text{
        color:#b9c4d5;font-size:13px;line-height:1.55;margin:16px 0
      }
      .yamzz-pwa-install{
        width:100%;border:0;border-radius:14px;padding:14px 16px;
        background:linear-gradient(135deg,#168cff,#5d55ff);
        color:#fff;font-weight:800;font-size:14px;cursor:pointer;
        box-shadow:0 10px 25px rgba(30,120,255,.22)
      }
      .yamzz-pwa-install i{margin-right:7px}
      .yamzz-pwa-later{
        display:block;width:100%;border:0;background:transparent;
        color:#8f9bad;padding:12px 8px 2px;font-size:13px;cursor:pointer
      }
      .yamzz-pwa-help{
        display:none;margin-top:13px;padding:12px;border-radius:12px;
        background:rgba(255,255,255,.05);color:#aeb9ca;
        font-size:12px;line-height:1.5
      }
    `;
    document.head.appendChild(style);
  }

  function createPopup() {
    if (document.getElementById("yamzzPwaPopup")) return;

    addStyles();

    const overlay = document.createElement("div");
    overlay.id = "yamzzPwaPopup";
    overlay.className = "yamzz-pwa-overlay";
    overlay.innerHTML = `
      <div class="yamzz-pwa-card" role="dialog" aria-modal="true" aria-labelledby="yamzzPwaTitle">
        <div class="yamzz-pwa-head">
          <img class="yamzz-pwa-logo" src="/assets/hero.png" alt="Jasteb Yamzz Market">
          <div>
            <h2 class="yamzz-pwa-title" id="yamzzPwaTitle">Install Yamzz Market</h2>
            <div class="yamzz-pwa-sub">Aplikasi web resmi Yamzz Market</div>
          </div>
          <button class="yamzz-pwa-close" type="button" aria-label="Tutup">×</button>
        </div>
        <p class="yamzz-pwa-text">
          Tambahkan Yamzz Market ke layar utama agar lebih cepat dibuka
          seperti aplikasi.
        </p>
        <button class="yamzz-pwa-install" type="button">
          <i class="fa-solid fa-download"></i> Install Sekarang
        </button>
        <div class="yamzz-pwa-help">
          Browser ini belum menyediakan tombol install otomatis.
          Gunakan menu browser <b>⋮</b> lalu pilih
          <b>Tambahkan ke layar utama</b> atau <b>Install aplikasi</b>.
        </div>
        <button class="yamzz-pwa-later" type="button">Nanti saja</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.remove("show");
      sessionStorage.setItem("yamzz_pwa_popup_closed", "1");
    };

    overlay.querySelector(".yamzz-pwa-close").addEventListener("click", close);
    overlay.querySelector(".yamzz-pwa-later").addEventListener("click", close);

    overlay.querySelector(".yamzz-pwa-install").addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try {
          await deferredPrompt.userChoice;
        } catch (_) {}
        deferredPrompt = null;
        close();
      } else {
        overlay.querySelector(".yamzz-pwa-help").style.display = "block";
      }
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }

  function showPopup() {
    if (popupShown || sessionStorage.getItem("yamzz_pwa_popup_closed") === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    popupShown = true;
    createPopup();

    requestAnimationFrame(() => {
      document.getElementById("yamzzPwaPopup")?.classList.add("show");
    });
  }

  window.addEventListener("load", () => {
    // Give the page a moment to finish rendering before showing the install card.
    setTimeout(showPopup, 1600);
  });
})();
