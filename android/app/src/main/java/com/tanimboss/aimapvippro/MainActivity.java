package com.tanimboss.aimapvippro;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.speech.tts.TextToSpeech;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.util.Collections;
import java.util.Locale;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private static final String ASSET_ORIGIN = "https://appassets.androidplatform.net";
    private static final String START_URL = ASSET_ORIGIN + "/assets/web/index.html";
    private static final int REQUEST_LOCATION = 1001;
    private static final int REQUEST_MICROPHONE = 1002;
    private WebView webView;
    private GeolocationPermissions.Callback locationCallback;
    private String requestedLocationOrigin;
    private PermissionRequest microphoneRequest;
    private TextToSpeech navigationSpeech;
    private String pendingSharedLocation;
    private boolean appPageLoaded = false;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setNavigationBarColor(Color.rgb(8, 13, 24));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR & 0);
        readShareIntent(getIntent());
        navigationSpeech = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && navigationSpeech != null) {
                navigationSpeech.setLanguage(Locale.US);
                navigationSpeech.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            }
        });
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(8, 13, 24));
        setContentView(webView);
        WebSettings options = webView.getSettings();
        options.setJavaScriptEnabled(true);
        options.setDomStorageEnabled(true);
        options.setGeolocationEnabled(true);
        options.setAllowFileAccess(false);
        options.setAllowContentAccess(false);
        options.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        options.setSafeBrowsingEnabled(true);
        options.setMediaPlaybackRequiresUserGesture(true);
        options.setSupportZoom(false);
        options.setBuiltInZoomControls(false);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(webView, "vipAndroid",
                Collections.singleton(ASSET_ORIGIN),
                (view, message, origin, mainFrame, replyProxy) -> {
                    if (!mainFrame || !ASSET_ORIGIN.equals(origin.toString())) return;
                    try {
                        JSONObject data = new JSONObject(message.getData());
                        String action = data.optString("type", "");
                        if ("screen".equals(action)) {
                            boolean enabled = data.optBoolean("keepOn", false);
                            runOnUiThread(() -> {
                                if (enabled) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                            });
                        } else if ("stopSpeech".equals(action)) {
                            runOnUiThread(() -> { if (navigationSpeech != null) navigationSpeech.stop(); });
                        } else if ("speak".equals(action)) {
                            String content = data.optString("text", "");
                            String lang = data.optString("language", "en-US");
                            if (content.length() > 400) content = content.substring(0, 400);
                            final String output = content;
                            runOnUiThread(() -> {
                                if (navigationSpeech == null || output.isEmpty()) return;
                                Locale locale = Locale.forLanguageTag(lang);
                                int available = navigationSpeech.isLanguageAvailable(locale);
                                if (available >= TextToSpeech.LANG_AVAILABLE) navigationSpeech.setLanguage(locale);
                                else navigationSpeech.setLanguage(Locale.US);
                                navigationSpeech.speak(output, TextToSpeech.QUEUE_FLUSH, null,
                                    "vip-guidance-" + System.nanoTime());
                            });
                        }
                    } catch (Exception ignored) {}
                });
        }
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (url.startsWith(ASSET_ORIGIN)) {
                    appPageLoaded = true;
                    deliverSharedLocation();
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (ASSET_ORIGIN.equals(u.getScheme() + "://" + u.getHost())) return false;
                if ("https".equalsIgnoreCase(u.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); }
                    catch (ActivityNotFoundException ignored) {}
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!origin.startsWith(ASSET_ORIGIN)) { callback.invoke(origin, false, false); return; }
                if (hasLocationPermission()) { callback.invoke(origin, true, false); return; }
                requestedLocationOrigin = origin;
                locationCallback = callback;
                requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, REQUEST_LOCATION);
            }
            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!ASSET_ORIGIN.equals(request.getOrigin().getScheme() + "://" + request.getOrigin().getHost())) { request.deny(); return; }
                    boolean isAudioOnly = request.getResources().length == 1 &&
                        PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(request.getResources()[0]);
                    if (!isAudioOnly) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        microphoneRequest = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_MICROPHONE);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (microphoneRequest == request) microphoneRequest = null;
            }
        });
        webView.loadUrl(START_URL);
    }

    private void readShareIntent(Intent intent) {
        if (intent == null) return;
        String value = null;
        if (Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
            value = intent.getStringExtra(Intent.EXTRA_TEXT);
        } else if (Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            Uri uri = intent.getData();
            if ("geo".equals(uri.getScheme())) value = uri.toString();
        }
        if (value != null && value.length() > 0) {
            final String shared = value.substring(0, Math.min(3000, value.length()));
            Matcher match = Pattern.compile("https://(?:maps\\.app\\.goo\\.gl/|goo\\.gl/maps/)[^\\s]+", Pattern.CASE_INSENSITIVE).matcher(shared);
            if (match.find()) resolveShortMapLink(match.group(), shared);
            else pendingSharedLocation = shared;
        }
    }
    private static boolean trustedMapsRedirect(URL url) {
        if (!"https".equalsIgnoreCase(url.getProtocol())) return false;
        String host = url.getHost().toLowerCase(Locale.US);
        return host.equals("maps.app.goo.gl") || host.equals("goo.gl") ||
            host.equals("google.com") || host.equals("www.google.com") ||
            host.equals("maps.google.com");
    }
    private void resolveShortMapLink(String shortLink, String originalText) {
        new Thread(() -> {
            String result = originalText;
            try {
                URL cursor = new URL(shortLink);
                for (int i = 0; i < 7 && trustedMapsRedirect(cursor); i++) {
                    HttpURLConnection connection = (HttpURLConnection) cursor.openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setRequestMethod("GET");
                    connection.setConnectTimeout(6500);
                    connection.setReadTimeout(6500);
                    connection.setRequestProperty("User-Agent", "AI-Map-VIP-Pro/1.2 (Android)");
                    int code = connection.getResponseCode();
                    String location = connection.getHeaderField("Location");
                    connection.disconnect();
                    if (code >= 300 && code < 400 && location != null && !location.isEmpty()) {
                        URL redirected = new URL(cursor, location);
                        if (!trustedMapsRedirect(redirected)) break;
                        cursor = redirected;
                        if (cursor.toString().contains("/maps/") || cursor.toString().contains("?q=")) {
                            result = cursor.toString();
                        }
                    } else {
                        if (cursor.toString().contains("/maps/") || cursor.toString().contains("?q="))
                            result = cursor.toString();
                        break;
                    }
                }
            } catch (Exception ignored) {}
            final String resolved = result;
            runOnUiThread(() -> {
                pendingSharedLocation = resolved;
                deliverSharedLocation();
            });
        }, "vip-maps-link-resolver").start();
    }
    private void deliverSharedLocation() {
        if (webView == null || !appPageLoaded || pendingSharedLocation == null) return;
        String value = pendingSharedLocation;
        pendingSharedLocation = null;
        webView.evaluateJavascript("window.vipImportSharedLocation && window.vipImportSharedLocation("+
            JSONObject.quote(value)+");", null);
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readShareIntent(intent);
        deliverSharedLocation();
    }
    @Override protected void onPause() {
        if (navigationSpeech != null) navigationSpeech.stop();
        super.onPause();
    }
    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_LOCATION && locationCallback != null) {
            locationCallback.invoke(requestedLocationOrigin, hasLocationPermission(), false);
            locationCallback = null;
            requestedLocationOrigin = null;
        }
        if (requestCode == REQUEST_MICROPHONE && microphoneRequest != null) {
            boolean allowed = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            if (allowed) microphoneRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else microphoneRequest.deny();
            microphoneRequest = null;
        }
    }
    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (navigationSpeech != null) { navigationSpeech.stop(); navigationSpeech.shutdown(); navigationSpeech = null; }
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
