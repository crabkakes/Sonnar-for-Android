#!/usr/bin/env bash
set -e

echo "=== Building Android APK for Sonarr Mobile ==="

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
BUILD_DIR="/tmp/sonarr-android-build"
OUTPUT_APK="/app/applet/public/sonarr-android.apk"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/com/sonarr/mobile"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/drawable"
mkdir -p "$BUILD_DIR/assets/dist"
mkdir -p "$BUILD_DIR/bin"

# Copy built web distribution into APK assets so it runs standalone
cp -r /app/applet/dist/* "$BUILD_DIR/assets/dist/"

# Create strings.xml
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Sonarr</string>
</resources>
EOF

# Create AndroidManifest.xml
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.sonarr.mobile"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="@string/app_name"
        android:allowBackup="true"
        android:supportsRtl="true"
        android:hardwareAccelerated="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout"
            android:theme="@android:style/Theme.NoTitleBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# Create MainActivity.java
cat << 'EOF' > "$BUILD_DIR/src/com/sonarr/mobile/MainActivity.java"
package com.sonarr.mobile;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        // Load bundled web distribution from assets
        webView.loadUrl("file:///android_asset/dist/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
EOF

echo "Step 1: Running AAPT package resources..."
aapt package -f -m \
    -J "$BUILD_DIR/src" \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S "$BUILD_DIR/res" \
    -A "$BUILD_DIR/assets" \
    -I "$ANDROID_JAR"

echo "Step 2: Compiling Java source files..."
javac -source 1.8 -target 1.8 \
    -bootclasspath "$ANDROID_JAR" \
    -d "$BUILD_DIR/bin" \
    "$BUILD_DIR/src/com/sonarr/mobile/"*.java

echo "Step 3: Translating bytecode to Dalvik dex..."
/usr/bin/dalvik-exchange --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/bin"

echo "Step 4: Packaging APK with AAPT..."
aapt package -f \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S "$BUILD_DIR/res" \
    -A "$BUILD_DIR/assets" \
    -I "$ANDROID_JAR" \
    -F "$BUILD_DIR/unsigned.apk"

cd "$BUILD_DIR/bin"
aapt add "$BUILD_DIR/unsigned.apk" classes.dex
cd -

echo "Step 5: Aligning APK..."
zipalign -f -p 4 "$BUILD_DIR/unsigned.apk" "$BUILD_DIR/aligned.apk"

echo "Step 6: Generating signing keystore and signing APK..."
keytool -genkey -v \
    -keystore "$BUILD_DIR/debug.keystore" \
    -storepass android \
    -alias androiddebugkey \
    -keypass android \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Sonarr Mobile, OU=Build, O=Sonarr, C=US"

jarsigner -verbose \
    -sigalg SHA256withRSA \
    -digestalg SHA-256 \
    -keystore "$BUILD_DIR/debug.keystore" \
    -storepass android \
    "$BUILD_DIR/aligned.apk" androiddebugkey

mkdir -p /app/applet/public
cp "$BUILD_DIR/aligned.apk" "$OUTPUT_APK"

echo "=== APK Successfully Built ==="
ls -lh "$OUTPUT_APK"
