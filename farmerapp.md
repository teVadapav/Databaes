# Smart Krishi (PS-02) — Farmer Mobile Application
## Comprehensive Architectural Guide & Feature Documentation

> **System Overview**: The **Smart Krishi Farmer App** is a low-literacy, voice-first, multi-lingual progressive mobile application designed specifically for Indian smallholder and marginal farmers. It converts complex agro-climatic contingency models (ICAR-CRIDA), market price intelligence (Agmarknet MSP surveillance), and financial risk indicators into simple, color-coded, actionable insights with real-time neural Text-to-Speech (TTS) in 6 Indian languages.

---

## 📱 Core Architectural Principles

```
+-----------------------------------------------------------------------------------+
|                        SMART KRISHI FARMER APPLICATION                            |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   [1. Pre-Dashboard Onboarding] ----> [2. Localized Profile State]                |
|         - 6 Vernacular Languages            - Land, Soil & Irrigation             |
|         - Instant Voice Audio Preview       - Financial Debt & PMFBY Profile      |
|         - 11 Primary Indian Crops           - Crop Growth Stage Selection         |
|                                                                                   |
|                                         |                                         |
|                                         v                                         |
|   +---------------------------------------------------------------------------+   |
|   |                 4-BUTTON LOW-LITERACY DASHBOARD INTERFACE                 |   |
|   +---------------------------------------------------------------------------+   |
|   |  🌦️ Weather & Soil Stress  |  💡 Agro-Advisory & Actions (CRIDA Logic)     |   |
|   |  💰 Market MSP Alert (R-30) |  🏛️ Schemes & Kisan Helpline (1800-180-1551) |   |
|   +---------------------------------------------------------------------------+   |
|                                         |                                         |
|                                         v                                         |
|   [3. Neural TTS Voice Engine] -------> [4. Dynamic Multilingual Alert Feed]      |
|         - Edge-TTS Cloud Synthesis          - Mandi Price Drop < MSP Alert        |
|         - Pre-Warmed Instant Caching        - Dry Spell Contingency Directives    |
|         - Web Speech API Fallback           - Bank Loan Due Date Reminders        |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 🌟 Comprehensive Feature Breakdown

### 1. Pre-Dashboard Onboarding & Profile Setup Flow (4-Step Wizard)

The application features a 4-step modal wizard that personalizes all weather, agronomic, and distress indicators to the specific farmer's field reality:

#### **Step 1: Preferred Language Selection (`#ob-screen-1`)**
* **6 Supported Languages**:
  * English (`en`)
  * Hindi (`hi` — हिन्दी)
  * Marathi (`mr` — मराठी)
  * Odia (`or` — ଓଡ଼ିଆ)
  * Assamese (`as` — অসমীয়া)
  * Kannada (`kn` — ಕನ್ನಡ)
* **Native & English Typography**: Each language card displays both the native script (e.g. `ଓଡ଼ିଆ`) and English phonetic name (`ODIA`).
* **Interactive Audio Pronunciation Preview Pill (`.lang-voice-pill`)**: Farmers can tap the sound badge on any language card to hear a natural welcoming sample in that language before selecting.
* **Instant Audio Pre-Warming**: In the background, audio files for all 6 languages are pre-fetched into memory so voice playback starts with zero latency.

#### **Step 2: Farmer Profile & Farm Details (`#ob-screen-2`)**
* **Farmer Full Name (`#ob-farmer-name`)**: Dedicated touch input with validation.
* **Mobile Phone Number (`#ob-farmer-phone`)**: Formatted with a clean `+91` prefix addon box for Indian mobile numbers.
* **State & District Selector (`#ob-farmer-state`, `#ob-farmer-district`)**: 2-column cascading dropdown mapping to major agricultural states (*Maharashtra, Odisha, Assam, Karnataka, Uttar Pradesh*) and all constituent districts.
* **Total Land Area & Unit Toggle (`#ob-land-area`, `#unit-btn-ha`, `#unit-btn-acres`)**: Allows seamless numerical entry with an instant toggle between **Hectares** and **Acres**.
* **Soil Type Selector (`#ob-soil-type`)**: Full-width selector supporting 8 major Indian agro-ecological soil classifications:
  1. *Black Cotton Soil (Regur)*
  2. *Alluvial Loam Soil*
  3. *Red Sandy Loam Soil*
  4. *Laterite Clay Soil*
  5. *Arid Desert / Sandy Soil*
  6. *Saline & Alkaline Soil*
  7. *Peaty / Marshy Organic Soil*
  8. *Fertile Medium Loam Soil*
* **Primary Irrigation Details (`#ob-farmer-irrigation`)**:
  * *Rainfed (100% Monsoon Dependent)*
  * *Protective Well / Borewell*
  * *Canal Assured Irrigation*
  * *Borewell Yield Failure Checkbox (`#ob-borewell-failed`)*: Flags acute localized groundwater collapse.
* **Financial Safety Nets & Loans Card (`.financial-card`)**:
  * `PMFBY` Crop Insurance Enrollment Toggle (`#ob-pmfby`)
  * `KCC` Kisan Credit Card Active Toggle (`#ob-kcc`)
  * `High-Interest Informal Private Debt (>24% p.a.)` Alert Toggle (`#ob-informal-debt`)
  * `Next Bank Loan Due Date` Datepicker (`#ob-loan-due-date`)
  * `Outstanding Loan Amount (₹)` Numerical input (`#ob-loan-amount`)
* **Primary Phone / Device Type (`#ob-device-type`)**:
  * *Android Smartphone (4G/5G)*
  * *Basic Feature Phone (2G / Voice & SMS Only)* — Used by the automated channel router to trigger IVR calls.
* **Login Mode Switcher (`Onboarding.toggleLoginMode`)**: Allows registered farmers to log in directly using their Mobile Number or Farmer ID (e.g. `F1`, `F_SUN1`).

#### **Step 3: Primary Crop Selection (`#ob-screen-3`)**
* **11 Key Indian Kharif & Rabi Crops**:
  * 🧅 **Onion** (*कांदा / प्याज / ପିଆଜ*)
  * ⚪ **Cotton** (*कापूस / कपास / କପା*)
  * 🌱 **Soybean** (*सोयाबीन / ସୋୟାବିନ୍*)
  * 🌾 **Paddy (Rice)** (*भात / धान / ଧାନ*)
  * 🌾 **Wheat** (*गहू / गेहूं / ଗହମ*)
  * 🌽 **Maize (Corn)** (*मका / मक्का / ମକା*)
  * 🌾 **Bajra (Pearl Millet)** (*बाजरी / बाजरा / ବାଜରା*)
  * 🥜 **Groundnut (Peanut)** (*भुईमूग / मूंगफली / ଚିନାବାଦାମ*)
  * 🌿 **Pigeonpea (Arhar/Tur)** (*तूर / अरहर / ହରଡ଼*)
  * 🫘 **Pulses (Early-Maturing)** (*कडधान्ये / दलहन / ଡାଲି ଜାତୀୟ*)
  * 🎋 **Sugarcane** (*ऊस / गन्ना / ଆଖୁ*)
* Interactive 2-column touch cards with instant active checkmark feedback.

#### **Step 4: Crop Growth Stage & Confirmation (`#ob-screen-4`)**
* **4 Core Biological Growth Stages**:
  1. 🌱 **Sowing / Emergence (0–20 Days)**: Seedling germination and root establishment.
  2. 🌿 **Vegetative Growth (20–55 Days)**: Foliage development, tillering, and branching.
  3. 🌸 **Flowering / Podding (55–85 Days)**: Moisture-critical reproductive phase.
  4. 🌾 **Maturity / Harvest (85+ Days)**: Grain hardening and market harvesting.
* **Instant Profile Confirmation Card (`#ob-profile-summary-box`)**: Summarizes Farmer Name, District, Land Area, Primary Crop, and Growth Stage before launching the dashboard.

---

### 2. The 4-Button Low-Literacy Dashboard Interface

Once onboarding is completed, the farmer is presented with a distraction-free mobile screen featuring **4 primary high-contrast touch tiles**:

```
+-------------------------------------------------------------+
|                      FARMER APP HEADER                      |
|  👨‍🌾 Ramesh Patil | Nashik, MH | 1.2 Ha (Black Soil)         |
|  Crop: Onion (Vegetative) | Language: मराठी [🔊 Listen All]  |
+-------------------------------------------------------------+
|                                                             |
|   +--------------------------+   +-----------------------+  |
|   | 🌦️ WEATHER & SOIL        |   | 💡 ADVISORY & ACTIONS |  |
|   | Deficit: -38% (Deficit)  |   | [CRIDA Contingency]   |  |
|   | Dry Spell: 16 Days       |   | Foliar Spray & Mulch  |  |
|   | Soil Moisture: Critical  |   | [🔊 Listen]           |  |
|   +--------------------------+   +-----------------------+  |
|                                                             |
|   +--------------------------+   +-----------------------+  |
|   | 💰 MARKET MSP ALERT      |   | 🏛️ SCHEMES & HELPLINE |  |
|   | Mandi: ₹1,100 / Quintal  |   | PMFBY Insurance Form  |  |
|   | Govt MSP: ₹1,500         |   | KCC Restructuring     |  |
|   | [R-30: DO NOT PANIC SELL]|   | 📞 Call 1800-180-1551 |  |
|   +--------------------------+   +-----------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

#### **Button 1: 🌦️ Weather & Soil Stress Card**
* Displays real-time rainfall deviation percentage (`-38% Deficit`).
* Tracks **Consecutive Dry Days (CDD)** or **Heavy Rainfall Days**.
* Classifies agro-meteorological state: *Severe Drought Stress*, *Moderate Dry Spell*, *Optimal Rainfall*, or *Excess Inundation*.
* Shows soil moisture retention status based on soil type (e.g. *Black Cotton Soil* high retention vs *Red Sandy Soil* rapid runoff).

#### **Button 2: 💡 Agro-Advisory & Contingency Actions (CRIDA Logic)**
* Connects dynamically to the **ICAR-CRIDA Advisory Engine**.
* Returns precise, actionable contingency advice based on crop + stage + weather anomaly:
  * *Protective irrigation scheduling*
  * *Foliar spray recommendations* (e.g. 1% Potassium Nitrate $KNO_3$ or 2% Urea for dry spell recovery)
  * *Drainage channel clearing* in flood alerts
  * *Interculture and organic mulching* to conserve root-zone moisture.
* Dedicated **"🔊 Listen Advisory"** button reads the exact agronomic guidance aloud in the farmer's native dialect.

#### **Button 3: 💰 Market Prices & MSP Distress Override (Rule `R-30`)**
* Compares real-time Agmarknet mandi modal prices against the statutory Government Minimum Support Price (**Govt MSP**).
* Calculates exact price gap per quintal (e.g. `Mandi ₹1,100 vs MSP ₹1,500 = -₹400/qtl`).
* **Market Intervention Override (`R-30`)**: When a crop reaches harvest and Mandi prices collapse below MSP, the app triggers an urgent warning:
  > *"Current Mandi price is below Government MSP. Do not sell in panic to middlemen. Store your harvest in a WDRA warehouse to avail a pledge loan or register at the nearest APMC e-NAM procurement center."*

#### **Button 4: 🏛️ Government Schemes & Emergency Kisan Helpline**
* Dynamically highlights government schemes matching the farmer's distress conditions:
  * **PMFBY (Pradhan Mantri Fasal Bima Yojana)**: Crop loss compensation for rainfall deficit or pest attack.
  * **KCC (Kisan Credit Card)**: Debt restructuring and repayment moratorium requests.
  * **PM-KISAN / KALIA**: Direct benefit transfer status.
  * **PM-AASHA**: Price support scheme and MSP procurement centers.
* **One-Tap Kisan Call Center Button (`tel:18001801551`)**: Connects the farmer immediately to toll-free agronomist support.

---

### 3. Neural Voice Engine & Multilingual Accessibility

* **Edge-TTS Neural Cloud Voices**: Integrates natural, expressive Indian regional voices:
  * Odia: `or-IN-SubhasiniNeural`
  * Hindi: `hi-IN-MadhurNeural`
  * Marathi: `mr-IN-AarohiNeural`
  * Assamese: `as-IN-YashNeural`
  * Kannada: `kn-IN-GaganNeural`
  * English: `en-IN-NeerjaNeural`
* **Pre-Warmed Audio Cache**: Text strings for common advisories and welcome prompts are cached on boot, eliminating network lag.
* **Web Speech API Fallback**: In offline or low-bandwidth conditions, seamlessly falls back to client-side speech synthesis.
* **Animated Waveform Feedback**: Shows real-time pulse animations on active audio pills while speaking.

---

### 4. Assisted Mode (Kisan Mitra / CSC Operator Mode)

* Located on the top bar, allows **Village Level Entrepreneurs (VLEs)**, CSC operators, or Krishi Mitras to switch between **Self Mode** (single farmer) and **Assisted Mode** (managing multiple village farmers).
* In Assisted Mode, the operator can switch profiles with one click, enter biometric/field inspection details, and submit paperwork on behalf of illiterate farmers.

---

### 5. Adaptive 3-Tier Font Size Scaling

* Designed for low-vision farmers and harsh outdoor sunlight readability.
* Options available in the top bar:
  * **Medium** (`1.0x` scale)
  * **Large** (`1.15x` scale)
  * **Extra Large** (`1.3x` scale)
* Automatically adjusts all typography, line-heights, and touch targets across the entire Farmer Viewport without breaking layouts.

---

## 🛠️ Codebase References

| Component | File Path | Key Functions / Elements |
|---|---|---|
| **Onboarding Controller** | [`coding/client/onboarding.js`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/client/onboarding.js) | `Onboarding.init()`, `renderOnboardingUI()`, `validateAndGoToStep3()`, `submitProfile()` |
| **Onboarding Styles** | [`coding/client/onboarding.css`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/client/onboarding.css) | `.lang-select-card`, `.crop-chip`, `.financial-card`, `.phone-input-wrapper` |
| **Farmer Dashboard UI** | [`coding/client/index.html`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/client/index.html#L179-L560) | `#view-farmer`, `#mobile-weather-card`, `#mobile-advisory-card`, `#mobile-market-card` |
| **Farmer App Logic** | [`coding/client/app.js`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/client/app.js) | `loadFarmerDashboard()`, `playTTS()`, `switchLanguage()`, `switchMainView()` |
| **Advisory Engine** | [`coding/server/engine/advisory_engine.py`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/server/engine/advisory_engine.py) | `get_advisory()`, CRIDA contingency rules `R-10` to `R-30` |
