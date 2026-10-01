YAMZZ ADMIN - READY BUILD

Firebase:
- Project ID: yamzzmarket-574b0
- Admin Android package: id.myid.yamzzmarket.admin
- google-services.json is already installed at:
  admin-app/android/app/google-services.json

BUILD (Termux):
  cd admin-app
  npm install
  npx cap sync android
  cd android
  ./gradlew assembleDebug

APK:
  admin-app/android/app/build/outputs/apk/debug/app-debug.apk

Release:
  cd admin-app/android
  ./gradlew assembleRelease

IMPORTANT FOR SERVER PUSH:
The Android google-services.json only configures the Android client.
Vercel/backend still needs FIREBASE_SERVICE_ACCOUNT_JSON from the SAME
Firebase project (yamzzmarket-574b0). Do not put a service-account private key
inside the APK or frontend.

Vercel:
  Required environment variable:
  FIREBASE_SERVICE_ACCOUNT_JSON=<Firebase service account JSON>

After changing backend env, redeploy the Vercel project.

Push flow:
  transaction paid
    -> /lib/api/yamzz-payment/webhook.js
    -> sendPushToAdmins()
    -> Firebase FCM
    -> id.myid.yamzzmarket.admin
    -> Android notification

Foreground fallback:
  Admin app polls transactions every 10 seconds and can show a local
  notification when a new paid transaction is detected.

Admin session:
  Persistent local session is used so closing/reopening the app does not
  immediately force a new login.
