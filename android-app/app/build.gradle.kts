plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.norpan.kiosko"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.norpan.kiosko"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    /**
     * 🔀 FLAVORS
     * kiosk   → APK de autoservicio (Compose)
     * kitchen → APK de cocina (ViewBinding/XML)
     */
    flavorDimensions += "mode"

    productFlavors {
        create("kiosk") {
            dimension = "mode"
            applicationIdSuffix = ".kiosk"
            resValue("string", "app_name", "Kiosko")
        }

        create("kitchen") {
            dimension = "mode"
            applicationIdSuffix = ".kitchen"
            resValue("string", "app_name", "Cocina")
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }

        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        // Kitchen
        viewBinding = true
        // Kiosk
        compose = true
    }

    // Kotlin 1.9.25 → usar una extensión compatible
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.15"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Base
    implementation("androidx.core:core-ktx:1.12.0")

    // Kitchen (View/XML)
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("com.google.android.flexbox:flexbox:3.0.0")
    implementation("androidx.cardview:cardview:1.0.0")

    // Lifecycle / coroutines
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.8.6")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")

    // ZXing (QR)
    implementation("com.google.zxing:core:3.5.3")

    // --- Compose (Kiosk) ---
    implementation("androidx.activity:activity-compose:1.9.3")

    // Compose BOM (versiona todo junto)
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.10.00"))

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")

    // Material3 (tu código usa androidx.compose.material3.*)
    implementation("androidx.compose.material3:material3")
    
    // Material Icons Extended (para íconos de categorías)
    implementation("androidx.compose.material:material-icons-extended")
    
    // Coil (carga de imágenes para Compose)
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Para viewModel() en Compose (MenuScreen usa lifecycle.viewmodel.compose)
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    // Tests
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
