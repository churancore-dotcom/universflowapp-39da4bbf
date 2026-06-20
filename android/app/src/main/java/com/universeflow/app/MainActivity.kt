package com.universeflow.app

import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.universeflow.app.media.MediaNotificationPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AudioFocusPlugin::class.java)
        registerPlugin(MediaNotificationPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
