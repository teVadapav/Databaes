# Smart Krishi (PS-02) — District Officer Dashboard
## Comprehensive Guide to the Agrarian Distress Command Center

> **System Overview**: The **District Officer Dashboard** is an executive early-warning and intervention command center designed for District Agricultural Officers (DAOs), Block Development Officers (BDOs), and District Collectors. It transforms passive data collection into proactive, real-time distress prevention by combining meteorological stress, mandi price drops, credit loan due proximity, and historical district fragility into an actionable priority ranking system.

---

## 🏛️ Architecture & Decision Pipeline

```
+-----------------------------------------------------------------------------------+
|                        OFFICER DISTRESS DASHBOARD PIPELINE                        |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   [1. Ingest Multi-Source Telemetry]                                              |
|         - IMD Real-Time Rainfall & Dry Spell Deviations (R)                       |
|         - Agmarknet / OSAMB Mandi Prices vs Government MSP (P)                    |
|         - Core Banking Loan Repayment Due Dates & Amounts (L)                     |
|         - District Fragility & Agrarian Vulnerability Index (V)                   |
|                                         |                                         |
|                                         v                                         |
|   [2. 4-Factor Weighted Distress-Risk Scorer]                                     |
|         Distress Score = 0.35*R + 0.30*P + 0.20*L + 0.15*V                        |
|                                         |                                         |
|                                         v                                         |
|   [3. Live Re-Ranking & Interactive Sliders]                                      |
|         - Real-Time Weight Tuning ($w_R, w_P, w_L, w_V$)                          |
|         - Instant Re-sorting of Entire District Roster                            |
|                                         |                                         |
|                                         v                                         |
|   [4. Actionable Scheme Mapping & Multimodal Outreach]                            |
|         - Auto-Generate PMFBY Claim Forms & KCC Loan Moratorium Requests          |
|         - Dispatch Automated Localized IVR Voice Calls & SMS Pushes               |
|         - Assign Field VLEs / Kisan Mitras for Physical Verification              |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 🧮 The 4-Factor Distress-Risk Scoring Model

The core computational engine calculates a composite distress index ($0\text{–}100$) for every farmer in the district:

$$\text{Distress Score} = w_R \cdot R + w_P \cdot P + w_L \cdot L + w_V \cdot V$$

| Component | Factor Name | Mathematical Definition | Default Weight ($w$) |
|---|---|---|---|
| **$R$** | **Rainfall Deficit** | $\min(|\text{deviation}\%|, 100)$ based on real-time IMD rain data. | **$0.35$ (35%)** |
| **$P$** | **Price Drop Below MSP** | $\max\left(0, \frac{\text{Govt MSP} - \text{Mandi Price}}{\text{Govt MSP}} \times 100\right)$ | **$0.30$ (30%)** |
| **$L$** | **Loan Due Proximity** | $100 - \min\left(100, \frac{\text{Days to Due Date}}{90} \times 100\right)$ | **$0.20$ (20%)** |
| **$V$** | **District Fragility Index** | $0\text{–}100$ proxy for historical drought sensitivity, soil runoff & debt history. | **$0.15$ (15%)** |

### Severity Classifications:
* 🔴 **Critical Risk ($\ge 70.0$)**: Immediate multi-agency intervention required (drought compensation, debt moratorium, IVR call).
* 🟠 **High Risk ($50.0\text{–}69.9$)**: Priority advisory outreach and scheme enrollment.
* 🟡 **Moderate Risk ($30.0\text{–}49.9$)**: Standard agro-climatic monitoring and contingency tips.
* 🟢 **Low / Normal Risk ($< 30.0$)**: Favorable weather and market conditions.

---

## 🖥️ Top Control Bar & Executive Metric Tiles

### 1. Spoken AI Daily Briefing Banner
* Located at the very top of the Officer view.
* Features a **"🔊 Play Morning Briefing"** button that synthesizes an automated spoken executive summary for the District Officer:
  > *"Good morning, Officer. District Sundargarh currently reports 24 critical-risk farmers in Hemgir and Lephripara blocks due to a 42% rainfall deficit. 18 farmers are selling Paddy below MSP at Sundargarh RMC. PMFBY crop insurance claim batches have been prepared for immediate sanction."*

### 2. Executive Metric Overview Tiles
* 👥 **Total Monitored Farmers**: Total active agricultural profiles tracked across the district.
* ⚠️ **Critical Distress Cases**: Number of farmers scoring $\ge 70.0$ on the composite risk index.
* 📋 **Pending Policy Interventions**: Actionable scheme applications awaiting officer digital signature.
* 💰 **Total Financial Payout Exposure**: Aggregate estimated crop insurance claims and credit relief value in ₹ Lakhs.

---

## 🎛️ Dynamic Sliders & Filter Controls

```
+-----------------------------------------------------------------------------------+
|                        DYNAMIC DISTRESS RE-WEIGHTING PANEL                        |
|                                                                                   |
|  🌧️ Rainfall Deficit (w_R):    [======== 35% ========]                            |
|  📉 Mandi Price vs MSP (w_P):  [====== 30% ======]                                |
|  ⏳ Loan Due Proximity (w_L):  [==== 20% ====]                                    |
|  🏛️ District Fragility (w_V):  [=== 15% ===]                                      |
|                                                                                   |
|  [🔄 Reset to Default Weights]  [⚡ Run Live District Re-Ranking]                 |
+-----------------------------------------------------------------------------------+
```

### 1. Real-Time Weight Tuning Sliders (`#slider-weight-rain`, `#slider-weight-price`, etc.)
* Allows the District Collector or DAO to dynamically adjust risk weights during emergencies:
  * *During a severe drought*: Boost $w_R$ to 60% to immediately bubble up farmers suffering dry spells.
  * *During a market price crash at harvest*: Boost $w_P$ to 50% to surface farmers vulnerable to distress sales.
* **Instant Live Re-Sorting**: Adjusting any slider recalculates all distress scores in real-time and re-orders the farmer roster with zero page reloads.

### 2. Multi-Dimensional Search & Filtering Bar
* **District Dropdown (`#officer-district-select`)**: Filter by district (*Sundargarh, Nashik, Bongaigaon, Mandya, etc.*).
* **Block / Taluka Dropdown (`#officer-block-select`)**: Filter by specific administrative block (*Hemgir, Bonaigarh, Lephripara, Sadar*).
* **Crop Filter (`#officer-crop-select`)**: Filter by cultivated crop (*Paddy, Cotton, Onion, Soybean, Maize, etc.*).
* **Severity Filter (`#officer-severity-select`)**: Quick filter for *All, Critical Only, High Only, Moderate Only, Low Only*.
* **Live Search Input (`#officer-search-input`)**: Real-time search by Farmer Name, Phone Number, or Farmer ID.
* **Sort Selector (`#officer-sort-select`)**: Sort by *Distress Score (High to Low), Loan Due Date (Earliest First), or Land Size*.

---

## 📋 Comprehensive Breakdown of All Dashboard Buttons

### Table of Action Buttons & Functions:

| Button / Control Name | Element ID / Selector | Action & Functional Outcome |
|---|---|---|
| **Play Morning Briefing** | `#btn-officer-briefing-play` | Triggers neural TTS audio summary of district distress metrics for executive daily briefing. |
| **Stop Audio Briefing** | `#btn-officer-briefing-stop` | Immediately pauses and resets the TTS speech synthesis stream. |
| **Reset Risk Weights** | `#btn-reset-weights` | Restores default 4-factor weights ($w_R=0.35, w_P=0.30, w_L=0.20, w_V=0.15$). |
| **Export District CSV** | `#btn-export-distress-csv` | Generates and downloads a clean CSV spreadsheet with all farmer risk scores, loan amounts, and crop states for official reporting. |
| **Export PDF Report** | `#btn-export-distress-pdf` | Formats and launches print-ready district distress dossiers for State Disaster Management Authority (OSDMA/CRIDA) meetings. |
| **View Farmer Details Drawer** | `.btn-view-farmer-drawer` | Slides open the comprehensive socio-economic, agronomic, and debt ledger panel for a specific farmer. |
| **Trigger Automated IVR Call** | `.btn-trigger-ivr` | Dispatches an automated outbound voice advisory call in the farmer's native dialect (Odia/Hindi/Marathi) via the telecom gateway. |
| **Send SMS Advisory** | `.btn-send-sms` | Pushes a 160-character localized text alert directly to the farmer's phone with contingency advice and helpline number. |
| **Push App Notification** | `.btn-push-notif` | Delivers an instant push notification containing actionable CRIDA agronomic directives to smartphone owners. |
| **Generate PMFBY Claim Form** | `.btn-gen-pmfby-form` | Auto-populates official **PMFBY Form 2B (Crop Loss Compensation)** with satellite rainfall deficit, block name, survey number, and estimated loss value. |
| **Generate KCC Moratorium Request** | `.btn-gen-kcc-moratorium` | Auto-generates **KCC Restructuring Form 4A** requesting bank loan moratorium and interest subvention to prevent credit default. |
| **Generate PM-AASHA Token** | `.btn-gen-pmaasha-token` | Issues a priority APMC procurement token guaranteeing statutory MSP price at designated government procurement yards. |
| **Assign Village Level Worker (VLE)** | `.btn-assign-vle` | Dispatches a local CSC operator / Kisan Mitra with a handheld terminal for physical field inspection and biometric claim verification. |
| **Filter by Scheme Category Tabs** | `#scheme-cat-all`, `#scheme-cat-pmfby`, etc. | Filters the table to farmers eligible for specific government scheme interventions (*All, Insurance, Credit, Market Support, State Drought Relief*). |

---

## 🗂️ Interactive Farmer Detail Drawer (`#farmer-detail-drawer`)

Clicking on any farmer row in the table opens an expandable, in-depth dossier:
1. **Header & Severity Indicator**: Farmer Name, Village, Contact Number, and composite score gauge.
2. **4-Factor Risk Breakdown Chart**: Interactive horizontal bar graph showing exact percentage contributions of Rainfall ($R$), Price ($P$), Loan ($L$), and Fragility ($V$).
3. **Agro-Climatic Parameters**: Current crop, growth stage, soil type, irrigation status, and borewell failure condition.
4. **Financial Ledger & Private Debt Exposure**: Bank name, loan amount, due date proximity, and high-interest informal private debt warning badges.
5. **Action History & Telemetry Log**: Timestamped record of all past IVR calls, SMS alerts, field visits, and scheme submissions.

---

## 🛠️ Codebase References

| Component | File Path | Key Functions / Elements |
|---|---|---|
| **Officer Dashboard UI** | [`coding/client/index.html`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/client/index.html#L565-L950) | `#view-officer`, `#officer-farmer-table`, `#farmer-detail-drawer`, `#slider-weight-rain` |
| **Officer View Controller** | [`coding/client/app.js`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/client/app.js) | `fetchOfficerData()`, `renderOfficerTable()`, `handleWeightSliderChange()`, `generateSchemeForm()` |
| **Distress Scorer Engine** | [`coding/server/engine/distress_scorer.py`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/server/engine/distress_scorer.py) | `calculate_distress_score()`, `DEFAULT_WEIGHTS`, 4-factor formula implementation |
| **Officer API Endpoints** | [`coding/server/main.py`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/server/main.py) | `GET /api/v1/officer/farmers`, `POST /api/v1/officer/trigger-ivr`, `POST /api/v1/officer/generate-form` |
