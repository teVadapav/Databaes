# Smart Krishi (PS-02) — Interactive IVR & Call Simulator
## Voice & Plain-Text Fallback System for 2G Feature Phones

> **System Overview**: Over 40% of Indian smallholder farmers in rainfed and tribal agricultural belts (such as Sundargarh, Vidarbha, and Kalahandi) rely on basic 2G feature phones without internet access, web browsers, or touchscreens. The **Interactive Voice Response (IVR) & Call Simulator** simulates how Smart Krishi guarantees universal digital inclusivity by delivering automated, spoken agro-advisories and emergency scheme alerts through standard mobile cellular calls and plain-text SMS pushes.

---

## 📡 Automated Channel Routing Architecture

Smart Krishi uses an intelligent **Channel Router (`get_recommended_channel`)** that inspects a farmer's device type, network connectivity, and literacy level to choose the optimal communication medium:

```
                                [ Farmer Profile Telemetry ]
                                              |
                     +------------------------+------------------------+
                     |                                                 |
         [ Device: Android Smartphone ]                    [ Device: 2G Feature Phone ]
         [ Network: 4G / 5G / Broadband]                   [ Network: 2G Cellular Voice ]
         [ Tech Literacy: Medium / High]                   [ Tech Literacy: Low / Zero  ]
                     |                                                 |
                     v                                                 v
        +-------------------------+                       +-------------------------+
        |   Farmer App (PWA)      |                       |    Automated Outbound   |
        |   - Touch UI Dashboard  |                       |    IVR Call + SMS Push  |
        |   - In-App Neural Voice |                       |    - Multi-Level DTMF   |
        |   - Visual Color Cards  |                       |    - Dialpad Navigation |
        +-------------------------+                       +-------------------------+
```

### Routing Logic Rule Matrix:
1. **`android_smartphone` + Good Network** $\rightarrow$ **`app_voice`** (Rich mobile application with audio).
2. **`basic_feature_phone` OR Poor Network** $\rightarrow$ **`ivr_call` + `sms_text`** (Outbound phone call with DTMF keypad menu + 160-character localized text message).

---

## 📞 The Call Simulator Interface & Hardware Controls

The simulator provides a fully interactive mobile phone dialer mockup with live audio, DTMF keypress handling, and a synchronized transcript ticker:

```
+-----------------------------------------------------------------------------------+
|                        IVR PHONE SIMULATOR WORKSPACE                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   +--------------------------+   +--------------------------------------------+   |
|   |   PHONE HARDWARE MOCKUP  |   |          LIVE CALL TELEMETRY & TRANSCRIPT  |   |
|   |                          |   |                                            |   |
|   |   [ Call Status: ACTIVE ]|   |   📞 Call Duration: 01:24 | Quality: HD    |   |
|   |   Incoming: Smart Krishi |   |   Farmer: Debendra Majhi (+91-94371-22819) |   |
|   |                          |   |   Language: ଓଡ଼ିଆ (Odia) | District: Sundargarh |
|   |   +---+  +---+  +---+    |   |                                            |   |
|   |   | 1 |  | 2 |  | 3 |    |   |   ┌────────────────────────────────────┐   |   |
|   |   +---+  +---+  +---+    |   |   │ "ନମସ୍କାର ଦେବେନ୍ଦ୍ର ମହାଶୟ...            │   |   |
|   |   | 4 |  | 5 |  | 6 |    |   |   │ ବର୍ତ୍ତମାନ ପାଣିପାଗ ଜାଣିବା ପାଇଁ ୧ ଦବାନ୍ତୁ...│   |   |
|   |   +---+  +---+  +---+    |   |   │ ଫସଲ ପରାମର୍ଶ ପାଇଁ ୨ ଦବାନ୍ତୁ...          │   |   |
|   |   | 7 |  | 8 |  | 9 |    |   |   │ ମଣ୍ଡି ଦର ଓ MSP ପାଇଁ ୩ ଦବାନ୍ତୁ..."     │   |   |
|   |   +---+  +---+  +---+    |   |   └────────────────────────────────────┘   |   |
|   |   | * |  | 0 |  | # |    |   |                                            |   |
|   |   +---+  +---+  +---+    |   |   [ 💬 SMS Fallback Alert Log View ]       |   |
|   |                          |   |   +------------------------------------+   |   |
|   |   [ 📞 Call ] [ 🔴 Hangup]|   |   | [Crop Advisory] Debendra Majhi:    |   |   |
|   |   [ 🔇 Mute ] [ 🔊 Spkr ]|   |   | For Paddy in Hemgir, apply 1% KNO3 |   |   |
|   +--------------------------+   |   | spray. Mandi price ₹2,150 < MSP.   |   |   |
|                                  |   | Helpline: 1800-180-1551            |   |   |
|                                  |   +------------------------------------+   |   |
+----------------------------------+--------------------------------------------+---+
```

---

## 🎛️ Comprehensive Breakdown of All Buttons & Controls

| Button / Control Name | Selector / Element ID | Action & Functional Outcome |
|---|---|---|
| **Dialpad Number Keys (1–9, 0)** | `.ivr-keypad-btn` (`#ivr-key-1` to `9`) | Emits DTMF dual-tone frequency sound and triggers the corresponding branch in the IVR decision tree. |
| **Star Key (\*)** | `#ivr-key-star` | Replays the current menu prompt or returns to the previous menu level. |
| **Hash Key (#)** | `#ivr-key-hash` | Confirms farmer input (e.g. confirming quantity of produce or PIN code). |
| **Initiate Call (`Call`)** | `#btn-start-ivr-call` | Dials the farmer's registered number, opens the live voice channel, and plays the localized welcome audio prompt. |
| **End Call (`Hangup`)** | `#btn-end-ivr-call` | Terminates the active call session, stops audio playback, and resets the DTMF state machine. |
| **Mute Button (`Mute`)** | `#btn-mute-ivr` | Toggles simulated microphone input mute with visual feedback badge. |
| **Speakerphone Button (`Speaker`)** | `#btn-speaker-ivr` | Toggles high-gain audio playback filter simulating speakerphone mode. |
| **Language Switcher** | `#ivr-lang-select` | Dynamically switches IVR prompt language (*Odia, Hindi, Marathi, Assamese, Kannada, English*). |
| **Farmer Selector** | `#ivr-farmer-select` | Selects a specific farmer profile to test personalized voice prompts (e.g. `F_SUN1 Debendra Majhi`, `F1 Ramesh Patil`). |
| **Send Simulated SMS** | `#btn-trigger-sms-sim` | Pushes a real-time 160-character localized text message to the SMS log container. |

---

## 🌳 Multi-Level IVR Menu Decision Tree (DTMF Logic)

```
[ INCOMING CALL INITIATED ]
            |
            v
[ GREETING & IDENTIFICATION ]
"Namaskar [Farmer Name]. Welcome to Smart Krishi Advisory."
            |
            +-------------------------------------------------------------+
            |                                                             |
            v                                                             v
    [ KEYPRESS 1 ]                                                [ KEYPRESS 2 ]
Weather & Soil Stress                                         CRIDA Crop Contingency
"In your block, rainfall is -42%                              "For your Paddy at vegetative
deficit. 24 dry days recorded.                                stage, apply 1% KNO3 foliar
Farm pond irrigation advised."                                spray and organic mulching."
            |                                                             |
            +-------------------------------------------------------------+
            |                                                             |
            v                                                             v
    [ KEYPRESS 3 ]                                                [ KEYPRESS 4 ]
Mandi Prices & MSP Protection                                 Government Schemes & Claims
"Sundargarh Mandi Paddy price is                              "You are eligible for PMFBY
₹2,150/qtl, below MSP ₹2,300.                                 drought relief. Press 1 to
Do not panic sell. Store in WDRA."                            request a Kisan Mitra visit."
            |                                                             |
            +-------------------------------------------------------------+
            |                                                             |
            v                                                             v
    [ KEYPRESS 5 ]                                                [ KEYPRESS 9 ]
Repeat Menu / Switch Language                                 Connect to Agronomist
"To hear in Hindi, press 1.                                   "Connecting your call to the
To hear in Odia, press 2."                                    Kisan Call Center: 1800-180-1551"
```

### Detailed Level 1 Menu Actions:
* **Press `1` — 🌦️ Weather & Agro-Meteorological Stress**:
  * Reads current block rainfall deficit ($R$), consecutive dry days, and soil moisture warnings.
* **Press `2` — 💡 ICAR-CRIDA Contingency Crop Advisory**:
  * Evaluates current crop growth stage and reads tailored emergency measures (irrigation interval, pest sprays, weed management).
* **Press `3` — 💰 APMC Mandi Market Prices & MSP Override (Rule `R-30`)**:
  * Reads current modal prices at the nearest APMC yard. If market price $<$ MSP, directly warns the farmer against distress selling to middlemen.
* **Press `4` — 🏛️ Government Scheme Claims & Insurance**:
  * Informs the farmer about active relief programs (PMFBY, KCC loan moratorium, PM-KISAN) and allows one-key registration of field claims.
* **Press `5` — 🔄 Replay Options & Dialect Selection**:
  * Replays the main menu or toggles language between Odia, Hindi, Marathi, Assamese, Kannada, and English.
* **Press `9` — 👨‍💼 Connect to District Agricultural Officer**:
  * Forwards call directly to the state Kisan Call Center helpline (`1800-180-1551`).

---

## 💬 Plain-Text SMS Push Fallback Engine

When the voice call completes or when connectivity drops, the system automatically pushes a structured, concise **160-character localized SMS**:

### Sample SMS in English:
```text
[Smart Krishi] Debendra Majhi: For Paddy in Hemgir, rainfall is -42%. Apply 1% KNO3 foliar spray. Mandi price ₹2,150 is below MSP ₹2,300. Do not panic sell. Helpline: 1800-180-1551
```

### Sample SMS in Odia:
```text
[ସ୍ମାର୍ଟ କୃଷି] ଦେବେନ୍ଦ୍ର ମାଝୀ: ହେମଗିରିରେ ଧାନ ଫସଲ ପାଇଁ ୧% KNO3 ସ୍ପ୍ରେ କରନ୍ତୁ। ମଣ୍ଡି ଦର ₹୨,୧୫୦ ସରକାରୀ MSP ₹୨,୩୦୦ ଠାରୁ କମ୍ ଅଟେ। ଶସ୍ତାରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। ହେଲ୍ପଲାଇନ: 1800-180-1551
```

---

## 🛠️ Codebase References

| Component | File Path | Key Functions / Elements |
|---|---|---|
| **IVR Simulator UI** | [`coding/client/index.html`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/client/index.html#L955-L1150) | `#view-simulator`, `#ivr-keypad`, `#ivr-transcript-feed`, `#sms-preview-container` |
| **IVR Client Controller** | [`coding/client/app.js`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/client/app.js) | `startIVRCall()`, `handleKeypadPress()`, `endIVRCall()`, `playIVRPrompt()`, `sendSimulatedSMS()` |
| **Channel Router Engine** | [`coding/server/engine/channel_router.py`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/server/engine/channel_router.py) | `get_recommended_channel()`, `get_default_ui_mode()` |
| **IVR Backend Endpoints** | [`coding/server/main.py`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/server/main.py) | `POST /api/v1/ivr/simulate-call`, `POST /api/v1/ivr/send-sms`, `GET /api/v1/ivr/prompts` |
