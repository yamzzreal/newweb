(() => {
  "use strict";

  const showPushStatus = (message) => {
    let el = document.getElementById("yamzzPushStatus");

    if (!el) {
      el = document.createElement("div");
      el.id = "yamzzPushStatus";

      Object.assign(el.style, {
        position: "fixed",
        left: "50%",
        bottom: "85px",
        transform: "translateX(-50%)",
        zIndex: "99999",
        width: "min(92%, 430px)",
        padding: "13px 16px",
        borderRadius: "14px",
        background: "rgba(5, 15, 30, .96)",
        border: "1px solid rgba(0, 153, 255, .45)",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "600",
        textAlign: "center",
        boxShadow: "0 0 25px rgba(0, 153, 255, .25)",
        backdropFilter: "blur(10px)"
      });

      document.body.appendChild(el);
    }

    el.textContent = message;

    clearTimeout(window.__yamzzPushStatusTimer);
    window.__yamzzPushStatusTimer = setTimeout(() => {
      el.remove();
    }, 5000);
  };

  const isNative = !!window.Capacitor?.isNativePlatform?.();

  if (!isNative) return;

  const boot = async () => {
    try {
      const { PushNotifications } = window.Capacitor.Plugins || {};

      if (!PushNotifications) {
        showPushStatus("❌ Push Notification Plugin tidak tersedia");
        return;
      }

      showPushStatus("🔔 Mengaktifkan notifikasi...");

      const perm = await PushNotifications.requestPermissions();

      if (perm.receive !== "granted") {
        showPushStatus("⚠️ Izin notifikasi belum diberikan");
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener("registration", async ({ value }) => {
        if (!value) {
          showPushStatus("❌ Token FCM tidak ditemukan");
          return;
        }

        try {
          const authToken = localStorage.getItem("yamzz_user_token") || "";
          const headers = {
            "Content-Type": "application/json"
          };
          if (authToken) headers.Authorization = "Bearer " + authToken;

          const response = await fetch("/api/push/register", {
            method: "POST",
            headers,
            body: JSON.stringify({
              token: value,
              platform: "android",
              app: "yamzz-market"
            })
          });

          let data = {};

          try {
            data = await response.json();
          } catch (_) {}

          if (!response.ok) {
            throw new Error(
              data?.error || `HTTP ${response.status}`
            );
          }

          showPushStatus("✅ Notifikasi Yamzz Market berhasil diaktifkan");
        } catch (error) {
          showPushStatus(
            "❌ Gagal mendaftarkan perangkat: " +
            (error?.message || "Server error")
          );
        }
      });

      PushNotifications.addListener(
        "registrationError",
        (error) => {
          console.error("FCM registration error:", error);
          showPushStatus("❌ Gagal mendapatkan token FCM");
        }
      );

      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        ({ notification }) => {
          const link =
            notification?.data?.link ||
            notification?.data?.url ||
            "";

          if (link) {
            try {
              window.location.href = new URL(
                link,
                window.location.origin
              ).href;
            } catch (_) {}
          }
        }
      );
    } catch (error) {
      console.error("Push notification error:", error);

      showPushStatus(
        "❌ Notifikasi gagal: " +
        (error?.message || "Terjadi kesalahan")
      );
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
