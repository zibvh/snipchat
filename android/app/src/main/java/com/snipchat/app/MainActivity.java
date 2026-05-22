package com.snipchat.app;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Allow screenshots and screen recording.
        // Capacitor sets FLAG_SECURE by default in some configurations; clear it explicitly.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }
}
