#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"

echo "[1/4] Memeriksa Node.js..."
node -v
npm -v

echo "[2/4] Install dependency Capacitor..."
npm install

echo "[3/4] Sync Android project..."
npx cap sync android

cd android
chmod +x gradlew

echo "[4/4] Build APK release..."
./gradlew assembleRelease --no-daemon

echo
echo "APK selesai:"
find app/build/outputs/apk/release -maxdepth 1 -type f -name '*.apk' -print
