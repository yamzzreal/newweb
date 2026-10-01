/* =========================================================
   YAMZZ MARKET
   INDEX.JS
   NEON DATABASE
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {
    STORE_API: "/api/store",
    PAYMENT_PAGE: "payment",
    DEFAULT_NAME: "Yamzz Market"
};


/* =========================================================
   GLOBAL DATA
========================================================= */

let DB = {

    site: {
        name: "Yamzz Market",
        title: "JASTEB",
        description:
            "Tempat jual beli JASTEB dengan proses cepat, aman dan terpercaya.",
        tagline: "JASTEB TERPERCAYA",

        logo: "",
        banner: "",

        whatsapp: "",
        email: "",

        qris: "",

        socials: {
            tiktok: "",
            instagram: "",
            youtube: "",
            telegram: ""
        },

        cloudinaryCloudName: "",
        cloudinaryUploadPreset: ""
    },

    categories: [],

    products: [],

    orders: []

};


let currentCategory = "all";
let selectedProduct = null;

let paidTransactions = [];
let paidTransactionIndex = 0;
let paidTransactionSignature = "";
let paidTransactionTimer = null;
let paidTransactionRotateTimer = null;

const PAID_TRANSACTIONS_LIMIT = 100;
const PAID_TRANSACTIONS_POLL_MS = 10000;
const PAID_TRANSACTIONS_ROTATE_MS = 5000;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    setupFooterYear();

    setupCategoryButtons();

    setupModal();

    setupNavigation();
    setupProductSearch();
    setupGuides();

    await loadDatabase();

    // Monitor transaksi PAID secara berkala dari Neon.
    setupPaidTransactions();

});


/* =========================================================
   LOAD DATABASE
========================================================= */

async function loadDatabase() {

    showLoader();

    try {

        const data = await getDatabase();

        DB = normalizeDatabase(data);

        renderStore();
        renderHomeDashboard();
        renderProducts();
        renderDynamicCategories();
        renderSystemStatus();
        setupPromoPopup();

        hideLoader();

    } catch (error) {

        console.error("Gagal memuat database:", error);

        DB = normalizeDatabase({});

        renderStore();
        renderHomeDashboard();
        renderProducts();
        renderDynamicCategories();
        renderSystemStatus();

        showToast(
            "Gagal Memuat",
            "Database tidak dapat dimuat."
        );

        hideLoader();

    }

}



/* =========================================================
   AUTO PROMO / INFORMATION POPUP
   Tampil setiap reload jika diaktifkan admin.
========================================================= */

function setupPromoPopup() {
    const p = DB?.site?.popup || {};

    if (p.enabled !== true || !p.message && !p.title && !p.image && !p.discount) {
        return;
    }

    const now = Date.now();

    if (p.startAt) {
        const start = new Date(p.startAt).getTime();
        if (!Number.isNaN(start) && now < start) return;
    }

    if (p.endAt) {
        const end = new Date(p.endAt).getTime();
        if (!Number.isNaN(end) && now > end) return;
    }

    injectPromoPopupStyles();

    const old = document.getElementById("yamzzPromoPopup");
    if (old) old.remove();

    const safe = value => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const image = String(p.image || "").trim();
    const buttonText = String(p.buttonText || "").trim();
    const buttonLink = normalizePromoLink(p.buttonLink || "");

    const modal = document.createElement("div");
    modal.id = "yamzzPromoPopup";
    modal.className = "yamzz-promo-overlay";
    modal.innerHTML = `
        <div class="yamzz-promo-modal" role="dialog" aria-modal="true" aria-label="${safe(p.title || "Informasi")}">
            <button type="button" class="yamzz-promo-close" aria-label="Tutup">
                <i class="fa-solid fa-xmark"></i>
            </button>

            ${image ? `
                <div class="yamzz-promo-image-wrap">
                    <img src="${safe(image)}" alt="${safe(p.title || "Promo")}" onerror="this.closest('.yamzz-promo-image-wrap').remove()">
                </div>
            ` : ""}

            <div class="yamzz-promo-body">
                ${p.discount ? `<div class="yamzz-promo-badge"><i class="fa-solid fa-tag"></i> ${safe(p.discount)}</div>` : ""}
                ${p.title ? `<h2>${safe(p.title)}</h2>` : ""}
                ${p.message ? `<div class="yamzz-promo-message">${safe(p.message).replace(/\n/g, "<br>")}</div>` : ""}

                ${buttonText ? `
                    <a class="yamzz-promo-button" href="${safe(buttonLink || "#")}">
                        ${safe(buttonText)}
                        <i class="fa-solid fa-arrow-right"></i>
                    </a>
                ` : ""}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add("yamzz-promo-open");

    const close = () => {
        modal.classList.add("closing");
        setTimeout(() => {
            modal.remove();
            document.body.classList.remove("yamzz-promo-open");
        }, 180);
    };

    modal.querySelector(".yamzz-promo-close")?.addEventListener("click", close);

    modal.addEventListener("click", event => {
        if (event.target === modal) close();
    });

    modal.querySelector(".yamzz-promo-button")?.addEventListener("click", event => {
        if (!buttonLink || buttonLink === "#") {
            event.preventDefault();
        }
    });

    document.addEventListener("keydown", function promoEscape(event) {
        if (event.key === "Escape" && document.getElementById("yamzzPromoPopup")) {
            close();
            document.removeEventListener("keydown", promoEscape);
        }
    }, { once: false });

    requestAnimationFrame(() => modal.classList.add("show"));
}

function normalizePromoLink(link) {
    const value = String(link || "").trim();

    if (!value) return "#";

    if (/^(javascript|data|vbscript):/i.test(value)) {
        return "#";
    }

    if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) {
        return value;
    }

    if (value.startsWith("#") || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) {
        return value;
    }

    return value.replace(/^\/+/, "");
}

function injectPromoPopupStyles() {
    if (document.getElementById("yamzzPromoPopupStyles")) return;

    const style = document.createElement("style");
    style.id = "yamzzPromoPopupStyles";
    style.textContent = `
        body.yamzz-promo-open { overflow: hidden; }

        .yamzz-promo-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: rgba(2, 8, 20, .76);
            backdrop-filter: blur(9px);
            -webkit-backdrop-filter: blur(9px);
            opacity: 0;
            transition: opacity .18s ease;
        }

        .yamzz-promo-overlay.show { opacity: 1; }
        .yamzz-promo-overlay.closing { opacity: 0; }

        .yamzz-promo-modal {
            position: relative;
            width: min(94vw, 470px);
            max-height: min(90vh, 720px);
            overflow: auto;
            border: 1px solid rgba(76, 201, 255, .28);
            border-radius: 24px;
            background:
                radial-gradient(circle at 15% 0%, rgba(76,201,255,.16), transparent 34%),
                radial-gradient(circle at 100% 100%, rgba(255,90,179,.13), transparent 34%),
                #081525;
            box-shadow: 0 25px 90px rgba(0,0,0,.55), 0 0 45px rgba(76,201,255,.10);
            transform: translateY(18px) scale(.97);
            transition: transform .2s ease;
            scrollbar-width: thin;
        }

        .yamzz-promo-overlay.show .yamzz-promo-modal {
            transform: translateY(0) scale(1);
        }

        .yamzz-promo-close {
            position: absolute;
            z-index: 2;
            top: 12px;
            right: 12px;
            width: 38px;
            height: 38px;
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 50%;
            background: rgba(5,13,25,.72);
            color: #fff;
            cursor: pointer;
            display: grid;
            place-items: center;
            font-size: 17px;
        }

        .yamzz-promo-close:hover { background: rgba(255,255,255,.12); }

        .yamzz-promo-image-wrap {
            width: 100%;
            aspect-ratio: 16 / 8.5;
            overflow: hidden;
            background: #0b1a2b;
        }

        .yamzz-promo-image-wrap img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .yamzz-promo-body {
            padding: 25px 24px 24px;
            color: #fff;
        }

        .yamzz-promo-badge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 7px 11px;
            margin-bottom: 12px;
            border-radius: 999px;
            background: rgba(255,90,179,.13);
            border: 1px solid rgba(255,90,179,.28);
            color: #ff8bc6;
            font-size: 12px;
            font-weight: 800;
        }

        .yamzz-promo-body h2 {
            margin: 0 0 10px;
            color: #fff;
            font-size: clamp(23px, 6vw, 32px);
            line-height: 1.15;
            font-weight: 900;
        }

        .yamzz-promo-message {
            color: rgba(255,255,255,.76);
            font-size: 14px;
            line-height: 1.7;
            white-space: normal;
        }

        .yamzz-promo-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            width: 100%;
            margin-top: 20px;
            padding: 13px 16px;
            border-radius: 13px;
            background: linear-gradient(135deg, #258cff, #4cc9ff);
            color: #fff !important;
            text-decoration: none !important;
            font-weight: 800;
            box-shadow: 0 9px 28px rgba(37,140,255,.23);
        }

        .yamzz-promo-button:hover { filter: brightness(1.08); }

        @media (max-width: 520px) {
            .yamzz-promo-overlay { padding: 12px; }
            .yamzz-promo-modal { border-radius: 20px; }
            .yamzz-promo-body { padding: 21px 18px 19px; }
            .yamzz-promo-close { top: 9px; right: 9px; }
        }
    `;
    document.head.appendChild(style);
}

/* =========================================================
   GET Neon
========================================================= */

async function getDatabase() {
    const response = await fetch(CONFIG.STORE_API, {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Database Error ${response.status}`);
    }

    const result = await response.json();
    return result.record || {};
}

/* =========================================================
   NORMALIZE DATABASE
========================================================= */

function normalizeDatabase(data) {

    data = data || {};


    const site = data.site || {};

    const socials = site.socials || {};


    return {

        site: {

            name:
                site.name ||
                CONFIG.DEFAULT_NAME,

            title:
                site.title ||
                "JASTEB",

            description:
                site.description ||
                "Tempat jual beli JASTEB dengan proses cepat, aman dan terpercaya.",

            tagline:
                site.tagline ||
                "JASTEB TERPERCAYA",


            logo:
                site.logo ||
                "",

            banner:
                site.banner ||
                "",

            notification:
                site.notification ||
                "",

            maintenance:
                site.maintenance === true,

            storeOffline:
                site.storeOffline === true,


            whatsapp:
                site.whatsapp ||
                "",

            email:
                site.email ||
                "",

            whatsappChannel:
                site.whatsappChannel ||
                site.waChannel ||
                "",


            qris:
                site.qris ||
                "",


            socials: {

                tiktok:
                    socials.tiktok ||
                    "",

                instagram:
                    socials.instagram ||
                    "",

                youtube:
                    socials.youtube ||
                    "",

                telegram:
                    socials.telegram ||
                    ""

            },


            cloudinaryCloudName:
                site.cloudinaryCloudName ||
                "",

            cloudinaryUploadPreset:
                site.cloudinaryUploadPreset ||
                "",

            popup: {
                enabled: site.popup?.enabled === true,
                title: site.popup?.title || "Promo Spesial",
                message: site.popup?.message || "",
                image: site.popup?.image || "",
                discount: site.popup?.discount || "",
                buttonText: site.popup?.buttonText || "Lihat Promo",
                buttonLink: site.popup?.buttonLink || "produk",
                startAt: site.popup?.startAt || "",
                endAt: site.popup?.endAt || ""
            }

        },


        categories: Array.isArray(data.categories)&&data.categories.length ? data.categories : [{id:"jasteb",name:"JASTEB",icon:"fa-bolt"},{id:"sewa-jasteb",name:"Sewa JASTEB",icon:"fa-key"},{id:"pt-jasteb",name:"PT JASTEB",icon:"fa-crown"},{id:"email-ress",name:"EMAIL RESS",icon:"fa-envelope-open-text"}],

        products:
            Array.isArray(data.products)
                ? data.products
                : [],


        orders:
            Array.isArray(data.orders)
                ? data.orders
                : []

    };

}


/* =========================================================
   RENDER STORE
========================================================= */

function renderStore() {

    const site = DB.site;


    /* -----------------------------------------
       STORE NAME
    ----------------------------------------- */

    setText(
        "navStoreName",
        site.name
    );


    setText(
        "footerStoreName",
        site.name
    );


    setText(
        "copyrightName",
        site.name
    );


    /* -----------------------------------------
       HERO
    ----------------------------------------- */

    setText(
        "heroTagline",
        site.tagline
    );


    const heroTitle =
        document.getElementById("heroTitle");

    if (heroTitle) {

        heroTitle.innerHTML = `
            ${escapeHTML(site.title)}
            <span>${escapeHTML(site.name)}</span>
        `;

    }


    setText(
        "heroDescription",
        site.description
    );


    /* -----------------------------------------
       ABOUT
    ----------------------------------------- */

    setText(
        "aboutTitle",
        `Tentang ${site.name}`
    );


    setText(
        "aboutDescription",
        site.description
    );


    /* -----------------------------------------
       FOOTER
    ----------------------------------------- */

    setText(
        "footerDescription",
        site.description
    );


    /* -----------------------------------------
       LOGO
    ----------------------------------------- */

    setImage(
        "navLogo",
        site.logo,
        `${site.name} Logo`
    );


    setImage(
        "heroLogo",
        site.logo,
        `${site.name} Logo`
    );


    setImage(
        "footerLogo",
        site.logo,
        `${site.name} Logo`
    );


    /* -----------------------------------------
       BANNER
    ----------------------------------------- */

    setImage(
        "storeBanner",
        site.banner,
        `${site.name} Banner`
    );


    setText(
        "bannerTitle",
        site.title || "JASTEB TERBARU"
    );


    setText(
        "bannerDescription",
        site.description
    );


    /* -----------------------------------------
       WHATSAPP
    ----------------------------------------- */

    setupWhatsApp(
        site.whatsapp
    );


    /* -----------------------------------------
       EMAIL
    ----------------------------------------- */

    setupEmail(
        site.email
    );


    /* -----------------------------------------
       SOCIAL MEDIA
    ----------------------------------------- */

    setupSocial(
        "socialTiktok",
        site.socials.tiktok
    );


    setupSocial(
        "socialInstagram",
        site.socials.instagram
    );


    setupSocial(
        "socialYoutube",
        site.socials.youtube
    );


    setupSocial(
        "socialTelegram",
        site.socials.telegram
    );


    /* -----------------------------------------
       PRODUCT COUNT
    ----------------------------------------- */

    updateProductCount();
    renderAboutContact();

}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

    const container =
        document.getElementById(
            "productsContainer"
        );


    const emptyState =
        document.getElementById(
            "emptyProducts"
        );


    if (!container) {
        return;
    }


    let products = [...DB.products];


    /* -----------------------------------------
       FILTER CATEGORY
    ----------------------------------------- */

    if (currentCategory !== "all") {

        products =
            products.filter(product => {

                const category =
                    normalizeCategory(
                        product.category
                    );

                return category ===
                    currentCategory;

            });

    }


    /* -----------------------------------------
       CLEAR CONTAINER
    ----------------------------------------- */

    container.innerHTML = "";


    /* -----------------------------------------
       EMPTY
    ----------------------------------------- */

    if (!products.length) {

        if (emptyState) {
            emptyState.style.display = "block";
        }

        return;

    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    /* -----------------------------------------
       RENDER
    ----------------------------------------- */

    products.forEach(
        (product, index) => {

            container.appendChild(
                createProductCard(
                    product,
                    index
                )
            );

        }
    );

}


/* =========================================================
   CREATE PRODUCT CARD
========================================================= */

function createProductCard(product, index) {

    const card =
        document.createElement("div");


    card.className =
        "product-card";


    const name =
        product.name ||
        "Produk";


    const description =
        product.description ||
        "Produk JASTEB";


    const price =
        Number(product.price) || 0;


    const image =
        product.image ||
        product.img ||
        "";


    const category =
        normalizeCategory(
            product.category
        );


    const categoryName =
        getCategoryName(
            category
        );


    const stock =
        getStock(product);


    const isOutOfStock =
        stock <= 0;


    if (isOutOfStock) {

        card.classList.add(
            "out-of-stock"
        );

    }


    card.innerHTML = `

        <div class="product-image">

            ${
                image
                ?
                `
                <img
                    src="${escapeAttribute(image)}"
                    alt="${escapeAttribute(name)}"
                    loading="lazy"
                    onerror="this.style.display='none';"
                >
                `
                :
                `
                <div class="product-image-placeholder">
                    <i class="fa-solid fa-box-open"></i>
                </div>
                `
            }

            <span class="product-badge">
                ${escapeHTML(categoryName)}
            </span>

        </div>


        <div class="product-body">

            <span class="product-category">
                ${escapeHTML(categoryName)}
            </span>


            <h3 class="product-name">
                ${escapeHTML(name)}
            </h3>


            <p class="product-description">
                ${escapeHTML(description)}
            </p>


            <div class="product-bottom">

                <div class="product-price">

                    <span>
                        Mulai dari
                    </span>

                    <strong>
                        ${formatRupiah(price)}
                    </strong>

                </div>


                <div class="product-stock">

                    ${
                        isOutOfStock
                        ?
                        `
                        <i class="fa-solid fa-circle-xmark"></i>
                        Habis
                        `
                        :
                        `
                        <i class="fa-solid fa-circle-check"></i>
                        ${stock} tersedia
                        `
                    }

                </div>

            </div>


            <button
                type="button"
                class="btn btn-primary btn-full product-buy-btn"
                data-product-index="${index}"
                ${isOutOfStock ? "disabled" : ""}
            >

                ${
                    isOutOfStock
                    ?
                    `
                    <i class="fa-solid fa-ban"></i>
                    Stok Habis
                    `
                    :
                    `
                    <i class="fa-solid fa-cart-shopping"></i>
                    Beli Sekarang
                    `
                }

            </button>

        </div>

    `;


    /*
     * Tombol beli
     */

    const buyButton =
        card.querySelector(
            ".product-buy-btn"
        );


    if (buyButton && !isOutOfStock && DB.site?.maintenance!==true && DB.site?.storeOffline!==true) {

        buyButton.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                buyProduct(product);

            }
        );

    }


    /*
     * Klik card
     */

    card.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "button"
                )
            ) {
                return;
            }


            if (!isOutOfStock && DB.site?.maintenance!==true && DB.site?.storeOffline!==true) {

                openProductModal(
                    product
                );

            }

        }
    );


    return card;

}


/* =========================================================
   PRODUCT MODAL
========================================================= */

function openProductModal(product) {

    if (DB.site?.maintenance===true || DB.site?.storeOffline===true) return;

    if (!product) {
        return;
    }


    selectedProduct =
        product;


    const modal =
        document.getElementById(
            "productModal"
        );


    if (!modal) {
        return;
    }


    const name =
        product.name ||
        "Produk";


    const description =
        product.description ||
        "Produk JASTEB";


    const price =
        Number(product.price) || 0;


    const category =
        normalizeCategory(
            product.category
        );


    const image =
        product.image ||
        product.img ||
        "";


    setText(
        "modalProductName",
        name
    );


    setText(
        "modalProductDescription",
        description
    );


    setText(
        "modalCategory",
        getCategoryName(category)
    );


    setText(
        "modalPrice",
        formatRupiah(price)
    );


    const modalImage =
        document.getElementById(
            "modalImage"
        );


    if (modalImage) {

        if (image) {

            modalImage.src =
                image;

            modalImage.alt =
                name;

            modalImage.style.display =
                "block";

        } else {

            modalImage.removeAttribute(
                "src"
            );

            modalImage.style.display =
                "none";

        }

    }


    modal.classList.add(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "modal-open"
    );


    selectedProduct =
        null;

}


/* =========================================================
   SETUP MODAL
========================================================= */

function setupModal() {

    const closeButton =
        document.getElementById(
            "closeModal"
        );


    const overlay =
        document.querySelector(
            ".modal-overlay"
        );


    const buyButton =
        document.getElementById(
            "modalBuyButton"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeProductModal
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeProductModal
        );

    }


    if (buyButton) {

        buyButton.addEventListener(
            "click",
            () => {

                if (!selectedProduct) {
                    return;
                }


                buyProduct(
                    selectedProduct
                );

            }
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeProductModal();

            }

        }
    );

}


/* =========================================================
   BUY PRODUCT
========================================================= */

function buyProduct(product) {

    if (!product) {
        return;
    }


    const stock =
        getStock(product);


    if (stock <= 0) {

        showToast(
            "Stok Habis",
            "Produk ini sedang tidak tersedia."
        );

        return;

    }


    /*
     * Simpan produk ke sessionStorage
     * agar payment.html bisa membaca
     */

    const checkoutData = {

        id:
            product.id ||
            generateID(),

        name:
            product.name ||
            "Produk",

        price:
            Number(product.price) || 0,

        category:
            product.category ||
            "jasteb",

        description:
            product.description ||
            "",

        image:
            product.image ||
            product.img ||
            "",

        stock:
            stock,

        // Link produk bersifat opsional.
        deliveryLink:
            product.deliveryLink ||
            product.productLink ||
            product.link ||
            ""

    };


    try {
        const payload = JSON.stringify(checkoutData);
        sessionStorage.setItem("yamzz_selected_product", payload);
        // Backward compatibility with older payment.js versions.
        sessionStorage.setItem("yamzz_checkout", payload);
    } catch (error) {
        console.error("SessionStorage error:", error);
        showToast("Gagal", "Browser memblokir penyimpanan checkout.");
        return;
    }


    closeProductModal();


    window.location.href =
        CONFIG.PAYMENT_PAGE;

}


function renderDynamicCategories(){const wrap=document.querySelector(".dynamic-categories");if(!wrap)return;wrap.innerHTML=`<button type="button" class="category-btn active" data-category="all"><i class="fa-solid fa-border-all"></i> Semua</button>`+(DB.categories||[]).map(c=>`<button type="button" class="category-btn" data-category="${escapeHTML(c.id)}"><i class="fa-solid ${escapeHTML(c.icon||"fa-tag")}"></i> ${escapeHTML(c.name)}</button>`).join("");setupCategoryButtons();}

/* =========================================================
   CATEGORY BUTTON
========================================================= */

function setupCategoryButtons() {

    const buttons =
        document.querySelectorAll(
            ".category-btn"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const category =
                        button.dataset.category ||
                        "all";


                  currentCategory =
                        normalizeCategory(
                            category
                        );


                    buttons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    renderProducts();

                }
            );

        }
    );

}


/* =========================================================
   CATEGORY NORMALIZER
========================================================= */

function normalizeCategory(category){if(!category)return "jasteb";const value=String(category).toLowerCase().trim();if(value==="all"||value==="semua")return "all";if(Array.isArray(DB.categories)&&DB.categories.some(c=>c.id===value))return value;if(value.includes("sewa"))return "sewa-jasteb";if(value.includes("ress"))return "email-ress";if(value.includes("pt"))return "pt-jasteb";return value.replace(/\s+/g,"-");}

/* =========================================================
   CATEGORY NAME
========================================================= */

function getCategoryName(category){const id=normalizeCategory(category);const found=(DB.categories||[]).find(c=>c.id===id);return found?.name||id.replace(/-/g," ").toUpperCase();}

/* =========================================================
   STOCK
========================================================= */

function getStock(product) {

    if (!product) {
        return 0;
    }


    /*
     * Support:
     *
     * stock: 10
     * stok: 10
     * quantity: 10
     */

    let stock =
        product.stock;


    if (
        stock === undefined ||
        stock === null
    ) {

        stock =
            product.stok;

    }


    if (
        stock === undefined ||
        stock === null
    ) {

        stock =
            product.quantity;

    }


    const number =
        Number(stock);


    if (
        Number.isNaN(number)
    ) {

        return 0;

    }


    return Math.max(
        0,
        number
    );

}


/* =========================================================
   PRODUCT COUNT
========================================================= */

function updateProductCount() {

    const total =
        DB.products.length;


    setText(
        "totalProducts",
        total
    );


    setText(
        "productCount",
        `${total} Produk`
    );

}


/* =========================================================
   WHATSAPP
========================================================= */

function setupWhatsApp(number) {

    const clean =
        cleanPhoneNumber(
            number
        );


    if (!clean) {

        hideElement(
            "navWhatsapp"
        );

        hideElement(
            "heroWhatsapp"
        );

        hideElement(
            "aboutWhatsapp"
        );

        hideElement(
            "footerWhatsapp"
        );

        hideElement(
            "floatingWhatsapp"
        );

        return;

    }


    const url =
        `https://wa.me/${clean}`;


    setLink(
        "navWhatsapp",
        url
    );


    setLink(
        "heroWhatsapp",
        url
    );


    setLink(
        "aboutWhatsapp",
        url
    );


    setLink(
        "footerWhatsapp",
        url
    );


    setLink(
        "floatingWhatsapp",
        url
    );


    showElement(
        "navWhatsapp"
    );


    showElement(
        "heroWhatsapp"
    );


    showElement(
        "aboutWhatsapp"
    );


    showElement(
        "footerWhatsapp"
    );


    showElement(
        "floatingWhatsapp"
    );

}


/* =========================================================
   EMAIL
========================================================= */

function setupEmail(email) {

    const element =
        document.getElementById(
            "footerEmail"
        );


    if (!element) {
        return;
    }


    if (!email) {

        element.style.display =
            "none";

        return;

    }


    element.href =
        `mailto:${email}`;

    element.style.display =
        "";

}


/* =========================================================
   SOCIAL MEDIA
========================================================= */

function setupSocial(id, url) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    if (!url) {

        element.style.display =
            "none";

        return;

    }


    element.href =
        normalizeSocialURL(
            url
        );


    element.target =
        "_blank";

    element.rel =
        "noopener noreferrer";

    element.style.display =
        "flex";

}


/* =========================================================
   SOCIAL URL NORMALIZER
========================================================= */

function normalizeSocialURL(url) {

    if (!url) {
        return "#";
    }


    const value =
        String(url).trim();


    if (
        value.startsWith(
            "http://"
        ) ||
        value.startsWith(
            "https://"
        )
    ) {

        return value;

    }


    return `https://${value}`;

}


/* =========================================================
   PHONE NORMALIZER
========================================================= */

function cleanPhoneNumber(number) {

    if (!number) {
        return "";
    }


    let value =
        String(number)
            .replace(
                /[^0-9+]/g,
                ""
            );


    if (
        value.startsWith("+62")
    ) {

        value =
            value.substring(1);

    }


    if (
        value.startsWith("62")
    ) {

        return value;

    }


    if (
        value.startsWith("0")
    ) {

        return (
            "62" +
            value.substring(1)
        );

    }


    return value;

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const links =
        document.querySelectorAll(
            ".nav-link"
        );


    links.forEach(
        link => {

            link.addEventListener(
                "click",
                () => {

                    links.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    link.classList.add(
                        "active"
                    );

                }
            );

        }
    );


    /*
     * Active section saat scroll
     */

    const sections =
        document.querySelectorAll(
            "main section[id]"
        );


    if (
        "IntersectionObserver"
        in window
    ) {

        const observer =
            new IntersectionObserver(
                entries => {

                    entries.forEach(
                        entry => {

                            if (
                                entry.isIntersecting
                            ) {

                                links.forEach(
                                    link => {

                                        link.classList.toggle(
                                            "active",
                                            link.getAttribute(
                                                "href"
                                            ) ===
                                            `#${entry.target.id}`
                                        );

                                    }
                                );

                            }

                        }
                    );

                },
                {
                    threshold: 0.35
                }
            );


        sections.forEach(
            section => {

                observer.observe(
                    section
                );

            }
        );

    }

}


/* =========================================================
   LOADER
========================================================= */

function showLoader() {

    const loader =
        document.getElementById(
            "loader"
        );


    if (!loader) {
        return;
    }


    loader.classList.remove(
        "hidden"
    );


    loader.style.display =
        "flex";

}


function hideLoader() {

    const loader =
        document.getElementById(
            "loader"
        );


    if (!loader) {
        return;
    }


    loader.classList.add(
        "hidden"
    );


    setTimeout(
        () => {

            loader.style.display =
                "none";

        },
        300
    );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    title,
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    setText(
        "toastTitle",
        title
    );


    setText(
        "toastMessage",
        message
    );


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.yamzzToastTimer
    );


    window.yamzzToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        value ?? "";

}


/* =========================================================
   SET IMAGE
========================================================= */

function setImage(
    id,
    src,
    alt = ""
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    if (src) {

        element.src =
            src;

        element.alt =
            alt;

        element.style.display =
            "";

    } else {

        element.removeAttribute(
            "src"
        );

        element.style.display =
            "none";

    }

}


/* =========================================================
   SET LINK
========================================================= */

function setLink(
    id,
    href
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.href =
        href;


    element.target =
        "_blank";


    element.rel =
        "noopener noreferrer";

}


/* =========================================================
   SHOW ELEMENT
========================================================= */

function showElement(id) {

    const element =
        document.getElementById(id);


    if (element) {

        element.style.display =
            "";

    }

}


/* =========================================================
   HIDE ELEMENT
========================================================= */

function hideElement(id) {

    const element =
        document.getElementById(id);


    if (element) {

        element.style.display =
            "none";

    }

}


/* =========================================================
   RUPIAH FORMAT
========================================================= */

function formatRupiah(number) {

    const value =
        Number(number) || 0;


    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0
        }
    ).format(value);

}


/* =========================================================
   GENERATE ID
========================================================= */

function generateID() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(value) {

    return escapeHTML(
        value
    );

}


/* =========================================================
   FOOTER YEAR
========================================================= */

function setupFooterYear() {

    const year =
        document.getElementById(
            "footerYear"
        );


    if (year) {

        year.textContent =
            new Date()
                .getFullYear();

    }

}



function renderAboutContact(){
  const s=DB.site||{};
  setText("aboutCardName",s.name||"Yamzz Market");
  const email=document.getElementById("aboutEmail");
  const emailText=document.getElementById("aboutEmailText");
  if(emailText) emailText.textContent=s.email||"Email belum diatur";
  if(email){
    if(s.email){email.href=`mailto:${s.email}`;email.style.display="";}
    else email.style.display="none";
  }
  const wa=cleanPhoneNumber(s.whatsapp);
  const waUrl=wa?`https://wa.me/${wa}`:"";
  ["aboutWaContact","aboutWhatsapp"].forEach(id=>{
    const e=document.getElementById(id);
    if(e){if(waUrl){e.href=waUrl;e.style.display="";}else e.style.display="none";}
  });
  const channel=document.getElementById("whatsappChannel");
  if(channel){
    if(s.whatsappChannel){channel.href=normalizeSocialURL(s.whatsappChannel);channel.style.display="inline-flex";}
    else {channel.href=waUrl||"#";channel.style.display=waUrl?"inline-flex":"none";}
  }
  [["aboutTiktok",s.socials?.tiktok],["aboutInstagram",s.socials?.instagram],["aboutYoutube",s.socials?.youtube],["aboutTelegram",s.socials?.telegram]].forEach(([id,url])=>{
    const e=document.getElementById(id); if(!e)return;
    if(url){e.href=normalizeSocialURL(url);e.style.display="flex";} else e.style.display="none";
  });
}

/* =========================================================
   MULTI-PAGE SEARCH / HOME DASHBOARD / GUIDES
========================================================= */
function setupProductSearch(){
  const input=document.getElementById("productSearch");
  if(!input) return;
  input.addEventListener("input", renderProducts);
  const clear=document.getElementById("clearSearch");
  if(clear) clear.addEventListener("click",()=>{input.value="";renderProducts();input.focus()});
}
function renderProducts(){
  const container=document.getElementById("productsContainer");
  const emptyState=document.getElementById("emptyProducts");
  if(!container) return;
  let products=[...DB.products];
  if(currentCategory!=="all") products=products.filter(p=>normalizeCategory(p.category)===currentCategory);
  const q=(document.getElementById("productSearch")?.value||"").trim().toLowerCase();
  if(q) products=products.filter(p=>`${p.name||""} ${p.description||""} ${p.category||""}`.toLowerCase().includes(q));
  container.innerHTML="";
  if(!products.length){if(emptyState) emptyState.style.display="block";return}
  if(emptyState) emptyState.style.display="none";
  products.forEach((product,index)=>container.appendChild(createProductCard(product,index)));
  const visible=document.getElementById("productCount");
  if(visible) visible.textContent=`${products.length} Produk`;
}
function renderHomeDashboard(){
  if(!document.getElementById("homeStats")) return;
  const products=DB.products||[];
  const totalStock=products.reduce((sum,p)=>sum+getStock(p),0);
  const cats=new Set(products.map(p=>normalizeCategory(p.category)));
  const orders=DB.orders||[];
  const stats=[
    ["homeTotalProducts",products.length],
    ["homeTotalStock",totalStock],
    ["homeTotalCategories",cats.size],
    ["homeTotalOrders",orders.length]
  ];
  stats.forEach(([id,val])=>setText(id,String(val)));
  const ticker=document.getElementById("tickerText");
  if(ticker){
    const text=DB.site.notification || `Selamat datang di ${DB.site.name} • Produk tersedia ${products.length} • Transaksi diproses dengan cepat dan aman`;
    ticker.textContent=text;
    ticker.dataset.text=text;
  }
}
function setupGuides(){
  document.querySelectorAll(".guide-button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const item=btn.closest(".guide-item");
      const was=item.classList.contains("open");
      document.querySelectorAll(".guide-item.open").forEach(x=>x.classList.remove("open"));
      if(!was){
        item.classList.add("open");
        setTimeout(()=>item.scrollIntoView({behavior:"smooth",block:"center"}),40);
      }
    });
  });
}

/* =========================================================
   SYSTEM STATUS / MAINTENANCE / STORE OFFLINE
========================================================= */
function renderSystemStatus(){
  const existing=document.getElementById("yamzzSystemOverlay");
  if(existing) existing.remove();
  document.body.classList.remove("yamzz-maintenance-active","yamzz-store-offline");
  const maintenance=DB.site?.maintenance===true;
  const offline=!maintenance && DB.site?.storeOffline===true;
  if(!maintenance && !offline) return;

  document.body.classList.add(maintenance?"yamzz-maintenance-active":"yamzz-store-offline");
  const overlay=document.createElement("div");
  overlay.id="yamzzSystemOverlay";
  overlay.className="yamzz-system-overlay";
  overlay.setAttribute("role","alertdialog");
  overlay.setAttribute("aria-modal","true");
  overlay.innerHTML=`
    <div class="yamzz-system-card">
      <div class="yamzz-system-icon"><i class="${maintenance?"fa-solid fa-screwdriver-wrench":"fa-solid fa-store"}"></i></div>
      <span class="yamzz-system-label">${maintenance?"SYSTEM MAINTENANCE":"STORE OFFLINE"}</span>
      <h2>${maintenance?"Website Sedang Maintenance":"Store Sudah Close"}</h2>
      <p>${maintenance?"Sistem sedang dalam proses maintenance. Untuk sementara seluruh fitur website dinonaktifkan. Silakan kembali lagi nanti.":"Maaf, store sedang ditutup untuk sementara. Silakan kembali lagi nanti."}</p>
      <div class="yamzz-system-status"><i class="fa-solid fa-clock"></i>${maintenance?"Kami akan segera kembali.":"Terima kasih atas pengertiannya."}</div>
    </div>`;
  document.body.appendChild(overlay);

  // Maintenance mengunci seluruh interaksi pelanggan.
  if(maintenance){
    const block=e=>{e.preventDefault();e.stopPropagation();};
    ["click","pointerdown","touchstart","keydown"].forEach(type=>overlay.addEventListener(type,block,true));
  }
}

/* =========================================================
   LIVE TRANSACTIONS
   Menampilkan transaksi yang memang sudah tersimpan di Neon.
   Tidak bergantung pada status pembayaran.
========================================================= */

function setupPaidTransactions(){
    const card=document.getElementById("paidTransactionsCard");
    const track=document.getElementById("paidTransactionsTrack");
    if(!card || !track) return;

    refreshPaidTransactions();

    if(paidTransactionTimer) clearInterval(paidTransactionTimer);
    paidTransactionTimer=setInterval(refreshPaidTransactions,PAID_TRANSACTIONS_POLL_MS);

    if(paidTransactionRotateTimer) clearInterval(paidTransactionRotateTimer);
    paidTransactionRotateTimer=setInterval(rotatePaidTransaction,PAID_TRANSACTIONS_ROTATE_MS);
}

async function refreshPaidTransactions(){
    try{
        const data=await getDatabase();
        const fresh=normalizeDatabase(data);

        const transactions=(fresh.orders||[])
            .slice()
            .sort((a,b)=>getPaidTimestamp(b)-getPaidTimestamp(a))
            .slice(0,PAID_TRANSACTIONS_LIMIT);

        const signature=transactions.map(order=>String(
            order.id||order.paymentTransactionId||`${order.name}-${order.product}-${order.createdAt}`
        )).join("|");

        DB.orders=fresh.orders;

        if(signature!==paidTransactionSignature){
            paidTransactionSignature=signature;
            paidTransactions=transactions;
            paidTransactionIndex=0;
            renderPaidTransaction(true);
        }else if(!paidTransactions.length && transactions.length){
            paidTransactions=transactions;
            renderPaidTransaction(false);
        }
    }catch(error){
        console.warn("Live transaksi gagal diperbarui:",error);
    }
}

function getPaidTimestamp(order){
    const value=order?.paidAt||order?.updatedAt||order?.createdAt;
    const time=Date.parse(value||"");
    return Number.isFinite(time)?time:0;
}

function maskCustomerName(name){
    const clean=String(name||"Pelanggan").trim().replace(/\s+/g," ");
    if(!clean) return "Pelanggan";

    return clean.split(" ").map(part=>{
        if(part.length<=1) return part+"***";
        return part.charAt(0)+"***";
    }).join(" ");
}

function timeAgo(value){
    const t=Date.parse(value||"");
    if(!Number.isFinite(t)) return "baru saja";

    const diff=Math.max(0,Date.now()-t);
    const minutes=Math.floor(diff/60000);

    if(minutes<1) return "baru saja";
    if(minutes<60) return `${minutes} menit lalu`;

    const hours=Math.floor(minutes/60);
    if(hours<24) return `${hours} jam lalu`;

    const days=Math.floor(hours/24);
    return `${days} hari lalu`;
}

function renderPaidTransaction(isNew){
    const card=document.getElementById("paidTransactionsCard");
    const track=document.getElementById("paidTransactionsTrack");
    if(!card || !track) return;

    if(!paidTransactions.length){
        card.hidden=true;
        return;
    }

    card.hidden=false;

    const order=paidTransactions[paidTransactionIndex % paidTransactions.length];
    const name=maskCustomerName(order.name||order.customer?.name);
    const product=order.product||order.productName||order.nameProduct||"Produk";
    const amount=Number(order.price||order.amount||0);
    const paidAt=order.createdAt||order.updatedAt||order.paidAt;

    track.innerHTML=`
        <div class="paid-live-item ${isNew?"paid-live-new":""}">
            <div class="paid-live-icon">
                <i class="fa-solid fa-circle-check"></i>
            </div>
            <div class="paid-live-content">
                <strong>${escapeHTML(name)} <b>melakukan transaksi</b></strong>
                <span>${escapeHTML(product)}${amount>0?` • ${escapeHTML(formatRupiah(amount))}`:""}</span>
            </div>
            <span class="paid-live-time">${escapeHTML(timeAgo(paidAt))}</span>
        </div>
    `;
}

function rotatePaidTransaction(){
    if(paidTransactions.length < 2) return;

    const track = document.getElementById("paidTransactionsTrack");
    if(!track) return;

    // ================================
    // FADE OUT
    // ================================
    track.classList.remove("paid-live-fade-in");
    track.classList.add("paid-live-fade-out");

    setTimeout(() => {

        // ================================
        // GANTI TRANSAKSI
        // ================================
        paidTransactionIndex =
            (paidTransactionIndex + 1) % paidTransactions.length;

        renderPaidTransaction(false);

        // ================================
        // FADE IN
        // ================================
        track.classList.remove("paid-live-fade-out");

        // Paksa browser restart animasi
        void track.offsetWidth;

        track.classList.add("paid-live-fade-in");

        // Hapus class setelah fade-in selesai
        setTimeout(() => {
            track.classList.remove("paid-live-fade-in");
        }, 1200);

    }, 800);
}
/* =========================================================
   AUTO REFRESH DATABASE
   Setiap 60 detik
========================================================= */

setInterval(
    async () => {

        try {

            const data =
                await getDatabase();


            DB =
                normalizeDatabase(
                    data
                );


            renderStore();
            renderHomeDashboard();

            renderProducts();
            renderSystemStatus();

        } catch (error) {

            console.warn(
                "Auto refresh gagal:",
                error
            );

        }

    },
    60000
);


/* =========================================================
   EXPORT GLOBAL
========================================================= */

window.YamzzMarket = {

    getDatabase,

    renderProducts,

    renderStore,

    openProductModal,

    closeProductModal,

    formatRupiah,
    getData: () => DB

};

/* =========================================================
   USER ACCOUNT + NOTIFICATION BELL
========================================================= */
(function(){
  const TOKEN_KEY="yamzz_user_token";
  const badge=document.getElementById("navNotificationBadge");
  if(!badge)return;
  async function refreshUserNotifications(){
    const token=localStorage.getItem(TOKEN_KEY);
    if(!token){badge.hidden=true;return;}
    try{
      const r=await fetch("/api/auth/notifications",{headers:{Authorization:"Bearer "+token}});
      if(!r.ok){badge.hidden=true;return;}
      const d=await r.json(), list=Array.isArray(d.notifications)?d.notifications:[];
      const unread=list.filter(n=>!n.read).length;
      badge.textContent=unread>99?"99+":String(unread);
      badge.hidden=unread===0;
    }catch(e){console.warn("Notification:",e)}
  }
  refreshUserNotifications();
  setInterval(refreshUserNotifications,10000);
})();
