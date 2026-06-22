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

class MainActivity : BridgeActivity() {

    private val cameraReqCode = 4711

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AudioFocusPlugin::class.java)
        registerPlugin(MediaNotificationPlugin::class.java)
        super.onCreate(savedInstanceState)

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

        bridge.webView?.let { web: WebView ->
            web.settings.javaScriptEnabled = true
            web.settings.mediaPlaybackRequiresUserGesture = false
            web.settings.allowFileAccess = true
            web.settings.allowContentAccess = true
            web.webChromeClient = object : BridgeWebChromeClient(bridge) {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        try {
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
