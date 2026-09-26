(() => {
  "use strict";

  /*
   * ==========================================
   * YAMZZ MARKET - APK DOWNLOAD POPUP
   * ==========================================
   */

  const APK_URL =
    "https://www.mediafire.com/file/zblave0xenssrh2/YamzzMarket.apk/file";

  const POPUP_ID = "yamzzApkPopup";
  const STYLE_ID = "yamzz-apk-popup-style";
  const CLOSED_KEY = "yamzz_apk_popup_closed";

  let popupShown = false;

  /*
   * Jangan tampilkan popup jika website sedang
   * dibuka sebagai aplikasi/PWA.
   */
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone) return;

  /*
   * ==========================================
   * STYLE
   * ==========================================
   */

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");

    style.id = STYLE_ID;

    style.textContent = `
      .yamzz-apk-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;

        display: flex;
        align-items: flex-end;
        justify-content: center;

        padding: 18px;

        background: rgba(0, 0, 0, .65);

        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);

        opacity: 0;
        pointer-events: none;

        transition: opacity .25s ease;
      }

      .yamzz-apk-overlay.show {
        opacity: 1;
        pointer-events: auto;
      }

      .yamzz-apk-card {
        width: min(430px, 100%);
        box-sizing: border-box;

        background:
          linear-gradient(
            145deg,
            #0b1728,
            #101d31
          );

        border: 1px solid rgba(77, 183, 255, .25);

        border-radius: 24px;

        padding: 20px;

        color: #fff;

        box-shadow:
          0 24px 70px rgba(0, 0, 0, .55);

        transform: translateY(30px);

        transition:
          transform .3s ease;

        font-family:
          Inter,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      .yamzz-apk-overlay.show .yamzz-apk-card {
        transform: translateY(0);
      }

      .yamzz-apk-head {
        display: flex;
        align-items: center;
        gap: 13px;
      }

      .yamzz-apk-logo {
        width: 58px;
        height: 58px;

        flex-shrink: 0;

        border-radius: 16px;

        object-fit: cover;

        border:
          1px solid
          rgba(255, 255, 255, .12);

        box-shadow:
          0 7px 22px
          rgba(0, 140, 255, .22);
      }

      .yamzz-apk-title {
        font-size: 18px;
        font-weight: 800;

        margin: 0;
      }

      .yamzz-apk-sub {
        font-size: 12px;

        color: #9eabc0;

        margin-top: 4px;
      }

      .yamzz-apk-close {
        margin-left: auto;

        width: 34px;
        height: 34px;

        border: 0;
        border-radius: 50%;

        background:
          rgba(255, 255, 255, .07);

        color: #aeb9ca;

        font-size: 22px;

        line-height: 1;

        cursor: pointer;

        transition:
          background .2s ease,
          transform .2s ease;
      }

      .yamzz-apk-close:hover {
        background:
          rgba(255, 255, 255, .12);

        transform: scale(1.05);
      }

      .yamzz-apk-text {
        color: #b9c4d5;

        font-size: 13px;

        line-height: 1.55;

        margin: 16px 0;
      }

      .yamzz-apk-download {
        width: 100%;

        border: 0;

        border-radius: 14px;

        padding: 14px 16px;

        background:
          linear-gradient(
            135deg,
            #168cff,
            #5d55ff
          );

        color: #fff;

        font-weight: 800;

        font-size: 14px;

        cursor: pointer;

        box-shadow:
          0 10px 25px
          rgba(30, 120, 255, .22);

        transition:
          transform .2s ease,
          filter .2s ease;
      }

      .yamzz-apk-download:hover {
        filter: brightness(1.08);
        transform: translateY(-1px);
      }

      .yamzz-apk-download:active {
        transform: scale(.98);
      }

      .yamzz-apk-download i {
        margin-right: 7px;
      }

      .yamzz-apk-info {
        margin-top: 13px;

        padding: 12px;

        border-radius: 12px;

        background:
          rgba(255, 255, 255, .05);

        color: #aeb9ca;

        font-size: 12px;

        line-height: 1.5;
      }

      .yamzz-apk-info i {
        margin-right: 5px;
      }

      .yamzz-apk-later {
        display: block;

        width: 100%;

        border: 0;

        background: transparent;

        color: #8f9bad;

        padding: 12px 8px 2px;

        font-size: 13px;

        cursor: pointer;
      }

      .yamzz-apk-later:hover {
        color: #c2cada;
      }

      @media (max-width: 480px) {
        .yamzz-apk-overlay {
          padding: 12px;
        }

        .yamzz-apk-card {
          border-radius: 21px;
          padding: 18px;
        }

        .yamzz-apk-logo {
          width: 54px;
          height: 54px;
        }

        .yamzz-apk-title {
          font-size: 17px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /*
   * ==========================================
   * CREATE POPUP
   * ==========================================
   */

  function createPopup() {
    if (document.getElementById(POPUP_ID)) {
      return;
    }

    addStyles();

    const overlay = document.createElement("div");

    overlay.id = POPUP_ID;

    overlay.className = "yamzz-apk-overlay";

    overlay.innerHTML = `
      <div
        class="yamzz-apk-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="yamzzApkTitle"
      >

        <div class="yamzz-apk-head">

          <img
            class="yamzz-apk-logo"
            src="/assets/hero.png"
            alt="Yamzz Market"
          >

          <div>
            <h2
              class="yamzz-apk-title"
              id="yamzzApkTitle"
            >
              Download Yamzz Market
            </h2>

            <div class="yamzz-apk-sub">
              Aplikasi Android resmi Yamzz Market
            </div>
          </div>

          <button
            class="yamzz-apk-close"
            type="button"
            aria-label="Tutup"
          >
            ×
          </button>

        </div>

        <p class="yamzz-apk-text">
          Download aplikasi Yamzz Market untuk mendapatkan
          akses yang lebih cepat dan praktis langsung dari
          perangkat Android kamu.
        </p>

        <button
          class="yamzz-apk-download"
          type="button"
        >
          <i class="fa-solid fa-download"></i>
          Download Aplikasi
        </button>

        <button
          class="yamzz-apk-later"
          type="button"
        >
          Nanti saja
        </button>
        
       <div class="yamzz-apk-info">
          <i class="fa-solid fa-circle-info"></i>
          Install sekarang agar mendapatkan informasi diskon 
          dan panel free terbaru.
        </div>
        
      </div>
    `;

    document.body.appendChild(overlay);

    /*
     * ==========================================
     * CLOSE POPUP
     * ==========================================
     */

    function closePopup() {
      overlay.classList.remove("show");

      sessionStorage.setItem(
        CLOSED_KEY,
        "1"
      );
    }

    /*
     * ==========================================
     * BUTTON EVENTS
     * ==========================================
     */

    const closeButton =
      overlay.querySelector(".yamzz-apk-close");

    const laterButton =
      overlay.querySelector(".yamzz-apk-later");

    const downloadButton =
      overlay.querySelector(".yamzz-apk-download");

    closeButton.addEventListener(
      "click",
      closePopup
    );

    laterButton.addEventListener(
      "click",
      closePopup
    );

    /*
     * Tombol download APK
     */

    downloadButton.addEventListener(
      "click",
      () => {

        /*
         * Buka halaman MediaFire.
         */
        window.location.href = APK_URL;

        /*
         * Tutup popup.
         */
        closePopup();

      }
    );

    /*
     * Klik area luar popup = tutup
     */

    overlay.addEventListener(
      "click",
      (event) => {

        if (event.target === overlay) {
          closePopup();
        }

      }
    );

    /*
     * Tekan tombol ESC = tutup
     */

    document.addEventListener(
      "keydown",
      (event) => {

        if (event.key === "Escape") {
          closePopup();
        }

      }
    );
  }

  /*
   * ==========================================
   * SHOW POPUP
   * ==========================================
   */

  function showPopup() {

    /*
     * Jangan tampilkan dua kali.
     */
    if (popupShown) {
      return;
    }

    /*
     * Jangan tampilkan lagi jika user
     * sudah memilih "Nanti saja" atau menutup.
     */
    if (
      sessionStorage.getItem(CLOSED_KEY) === "1"
    ) {
      return;
    }

    /*
     * Jangan tampilkan di mode standalone.
     */
    if (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches
    ) {
      return;
    }

    popupShown = true;

    createPopup();

    requestAnimationFrame(() => {

      const popup =
        document.getElementById(POPUP_ID);

      if (popup) {
        popup.classList.add("show");
      }

    });
  }

  /*
   * ==========================================
   * START
   * ==========================================
   */

  window.addEventListener(
    "load",
    () => {

      /*
       * Tunggu 1,6 detik agar halaman
       * selesai dirender terlebih dahulu.
       */
      setTimeout(
        showPopup,
        1600
      );

    }
  );

})();
