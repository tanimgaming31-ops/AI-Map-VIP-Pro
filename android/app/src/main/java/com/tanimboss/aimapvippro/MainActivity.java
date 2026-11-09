package com.tanimboss.aimapvippro;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
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

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setNavigationBarColor(Color.rgb(8, 13, 24));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR & 0);
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
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
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
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
