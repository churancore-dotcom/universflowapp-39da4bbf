package com.universeflow.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.BridgeActivity
import com.getcapacitor.BridgeWebChromeClient
import com.universeflow.app.media.MediaNotificationPlugin
import com.universeflow.app.island.DynamicIslandPlugin

class MainActivity : BridgeActivity() {

    private val cameraReqCode = 4711

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AudioFocusPlugin::class.java)
        registerPlugin(MediaNotificationPlugin::class.java)
        registerPlugin(DynamicIslandPlugin::class.java)
        super.onCreate(savedInstanceState)

        // Ask camera permission up-front so the WebView face-check can use it.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.CAMERA),
                    cameraReqCode
                )
            }
        }

        // Allow getUserMedia() inside the Capacitor WebView (face liveness, etc.).
        // Without overriding onPermissionRequest the camera silently fails on APK.
        bridge.webView?.let { web: WebView ->
            web.settings.javaScriptEnabled = true
            web.settings.mediaPlaybackRequiresUserGesture = false
            web.settings.allowFileAccess = true
            web.settings.allowContentAccess = true
            web.webChromeClient = object : BridgeWebChromeClient(bridge) {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        try {
                            // Grant whatever the page asked for (camera/mic).
                            request.grant(request.resources)
                        } catch (_: Throwable) {
                            request.deny()
                        }
                    }
                }
            }
        }
    }
}
