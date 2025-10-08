package com.reactnative

import android.app.Application
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

object SoLoaderInit {
    @JvmStatic
    fun init(app: Application) {
        // Initializes SoLoader with the merged-JNI mapping so merged libs can be resolved
        SoLoader.init(app, OpenSourceMergedSoMapping)
    }
}