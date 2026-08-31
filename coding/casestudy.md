# Smart Krishi (PS-02) — Real-Time Field Case Study
## Averting Agrarian Distress in Sundargarh District, Odisha

---

## 🌾 1. Executive Summary & Farmer Persona

| Profile Field | Field Record Details |
|---|---|
| **Farmer Name** | **Debendra Majhi** |
| **Farmer ID** | `F_SUN1` |
| **Geographic Location** | Hemgir Block, Sundargarh District, Odisha (Ib River Basin) |
| **GPS Coordinates** | Lat: $22.12^\circ\text{ N}$, Long: $84.03^\circ\text{ E}$ (Elevation: 232m) |
| **Landholding Size** | **1.5 Hectares** (Smallholder Farmer) |
| **Soil Classification** | Red Sandy Loam Soil (Rapid runoff, low moisture retention) |
| **Primary Cultivated Crop** | **Paddy (Rice)** — Variety: *Swarna / MTU-1010* |
| **Current Crop Growth Stage** | **Vegetative Growth Phase** (Day 35 of cultivation) |
| **Irrigation Profile** | Rainfed (100% Monsoon Dependent) + **Borewell Failed this Season** |
| **Primary Spoken Language** | **Odia (`or` — ଓଡ଼ିଆ)** |
| **Device & Tech Profile** | Basic Android Smartphone (Low Tech Literacy) |
| **Credit & Debt Obligations** | Outstanding Bank KCC Loan: **₹65,000** (Due: Nov 10, 2026); Informal Private Debt: **₹30,000** at 36% p.a. |
| **Existing Scheme Enrolment** | Enrolled in *PM-KISAN* & *KALIA*; **Not enrolled in PMFBY Crop Insurance** |

---

## ⚡ 2. The Compound Agrarian Crisis (Real-Time Ingested Signals)

In August 2026, Debendra Majhi faces a multi-dimensional crisis threatening his livelihood and pushing him toward severe agrarian distress:

```
+-----------------------------------------------------------------------------------+
|                        REAL-TIME DATA INGESTION MATRIX                            |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. AGRO-CLIMATIC TELEMETRY (IMD AWS Station - Hemgir)                            |
|     - Rainfall Deficit: -42.0% (Deviation from Long Period Average)               |
|     - Consecutive Dry Days (CDD): 24 Days with zero precipitation                 |
|     - Soil Moisture Sensor: < 22% in top 30cm root zone                           |
|     - Local Groundwater State: Borewell yield collapsed / dry                     |
|                                                                                   |
|  2. MANDI MARKET PRICING TELEMETRY (Agmarknet / OSAMB)                            |
|     - Market Yard: Sundargarh Regulated Market Committee (Main Yard)              |
|     - Paddy Modal Mandi Price: ₹2,150 / Quintal                                   |
|     - Statutory Government MSP: ₹2,300 / Quintal                                  |
|     - Market Price Deficit: -₹150 / Quintal (6.5% below MSP)                      |
|                                                                                   |
|  3. CORE BANKING REPAYMENT LEDGER (NABARD / Lead Bank)                            |
|     - KCC Outstanding Principal: ₹65,000                                          |
|     - Days Remaining to Repayment Due Date: 71 Days (Due: 10-Nov-2026)            |
|     - Private Moneylender Pressure: High-interest informal debt (>36% p.a.)       |
|                                                                                   |
|  4. HISTORICAL DISTRICT FRAGILITY INDEX (V)                                       |
|     - Sundargarh Agrarian Vulnerability Score: V = 88.0 / 100                     |
|     - Drivers: Rain-shadow plateau, mining run-off, high debt-sensitivity         |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 🧮 3. Real-Time Mathematical Distress Scoring

When Debendra opens his app (or when the Sundargarh DAO loads the morning district roster), the **4-Factor Distress Scorer** executes dynamically:

$$\text{Distress Score} = w_R \cdot R + w_P \cdot P + w_L \cdot L + w_V \cdot V$$

### Calculation Breakdown:
1. **$R$ (Rainfall Deficit Component)**:
   $$R = \min(42.0, 100) = 42.0 \implies 0.35 \times 42.0 = \mathbf{14.70}$$
2. **$P$ (Price vs MSP Deficit Component)**:
   $$P = \frac{2300 - 2150}{2300} \times 100 = 6.52\% \implies 0.30 \times 6.52 = \mathbf{1.96}$$
3. **$L$ (Loan Due Proximity Component)**:
   $$\text{Days to Due} = 71 \implies L = 100 - \left(\frac{71}{90} \times 100\right) = 21.11 \implies 0.20 \times 21.11 = \mathbf{4.22}$$
4. **$V$ (Historical District Fragility Component)**:
   $$V = 88.0 \implies 0.15 \times 88.0 = \mathbf{13.20}$$

$$\text{Base Score} = 14.70 + 1.96 + 4.22 + 13.20 = 34.08$$

### Critical Multiplier Penalties Applied:
* **Borewell Yield Failure Penalty**: $+25.0$ points (acute irrigation collapse).
* **Informal Private Debt Penalty (>24% p.a.)**: $+18.0$ points.

$$\mathbf{\text{Final Composite Distress Score}} = 34.08 + 25.0 + 18.0 = \mathbf{77.08 \implies 77.1 \quad (CRITICAL \ RED \ TIER)}$$

---

## 🛠️ 4. How Smart Krishi Intervenes in Real Time

```
                                [ REAL-TIME SYSTEM ACTION TIMELINE ]

 [08:00 AM] REAL-TIME TELEMETRY INGESTION
            - Ingests -42% rainfall deficit + ₹2,150 Mandi price + KCC due date.
            - Distress Scorer flags Debendra Majhi at 77.1 (Critical Severity).
                                           |
                                           v
 [08:05 AM] ADVISORY ENGINE FIRES RULES R-14 & R-30
            - Rule R-14 (CRIDA): Urgent 1% KNO3 foliar spray & farm pond Chahata link.
            - Rule R-30 (Market Override): Mandi price < MSP; alert against panic selling.
                                           |
                                           v
 [08:06 AM] FARMER APP & NEURAL VOICE GENERATION (ODIA)
            - Speaks advisory aloud in natural Odia (or-IN-SubhasiniNeural).
            - Highlights 4 touch tiles with high-contrast color badges.
                                           |
                                           v
 [08:15 AM] DISTRICT OFFICER DASHBOARD PROACTIVE INTERVENTION
            - DAO Sundargarh sees Debendra Majhi at #1 in Hemgir block distress list.
            - Clicks [Generate PMFBY Claim Form 2B] & [KCC Moratorium Request Form 4A].
            - Dispatches local Kisan Mitra (VLE) for physical farm visit.
                                           |
                                           v
 [08:20 AM] MULTIMODAL TELECOM FALLBACK DISPATCH
            - Automated outbound IVR phone call rings Debendra's mobile in Odia.
            - Localized 160-character SMS alert delivered with toll-free helpline.
```

---

### Step 1: Personalized Farmer App Guidance (In Native Odia)

When Debendra opens his phone, the app displays his dashboard in **ଓଡ଼ିଆ (Odia)**:

* 🌦️ **Weather Tile**: Alerts him that Hemgir has suffered 24 dry days with severe moisture stress.
* 💡 **Advisory Tile (Rule `R-14`)**:
  > *"ଆପଣଙ୍କ ଧାନ ଫସଲରେ ମରୁଡ଼ି ପ୍ରଭାବ କମାଇବା ପାଇଁ ୧% ପୋଟାସିୟମ ନାଇଟ୍ରେଟ (KNO3) ସ୍ପ୍ରେ କରନ୍ତୁ। ନିକଟସ୍ଥ ଚାହାଟା (ଫାର୍ମ ପୋଖରୀ) ରୁ ଜୀବନ ରକ୍ଷାକାରୀ ଜଳସେଚନ ଦିଅନ୍ତୁ।"*
  *(Apply 1% KNO3 foliar spray to prevent vegetative wilting. Tap community farm pond for protective irrigation.)*
* 💰 **Market Alert (Rule `R-30`)**:
  > *"ସୁନ୍ଦରଗଡ଼ ମଣ୍ଡିରେ ଧାନ ଦର କ୍ୱିଣ୍ଟାଲ ପିଛା ₹୨,୧୫୦ ରହିଛି, ଯାହାକି ସରକାରୀ MSP ₹୨,୩୦୦ ଠାରୁ କମ୍। ଶସ୍ତାରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। e-NAM ୱେୟାରହାଉସ ଋଣ ସୁବିଧା ନିଅନ୍ତୁ।"*
  *(Mandi price is ₹2,150, below MSP ₹2,300. Do not panic-sell to middlemen. Leverage e-NAM warehouse receipt loans.)*
* **One-Tap Neural TTS**: Debendra taps **"🔊 ଶୁଣନ୍ତୁ" (Listen)** to hear the exact instructions spoken aloud.

---

### Step 2: Proactive District Officer Intervention

1. **Dashboard Alert**: District Agricultural Officer (DAO) at Sundargarh opens the dashboard. Under Hemgir Block, **Debendra Majhi** is ranked **#1 with Distress Score 77.1**.
2. **Instant Form Generation**:
   * The DAO clicks **"Generate PMFBY Claim Form"** $\rightarrow$ The system auto-fills **PMFBY Form 2B** using satellite rainfall anomaly data, Debendra's Aadhaar/KCC ID, and 1.5 Ha survey land record.
   * The DAO clicks **"Generate KCC Moratorium"** $\rightarrow$ Formats a debt rescheduling request under the State Agricultural Relief Framework, requesting the bank to defer the Nov 10 payment by 180 days with interest subvention.
3. **VLE Field Assignment**:
   * The DAO clicks **"Assign VLE"** $\rightarrow$ The local Panchayat Kisan Mitra in Hemgir is notified on their tablet to visit Debendra's farm and collect signatures.

---

### Step 3: Multimodal Telecom Outreach (IVR Call & SMS)

Even if Debendra's smartphone data is turned off, the automated channel router initiates:
1. **Automated Outbound IVR Call**: His phone rings, and an automated voice speaks in Odia:
   > *"ନମସ୍କାର ଦେବେନ୍ଦ୍ର ମହାଶୟ, ସ୍ମାର୍ଟ କୃଷି ସୁନ୍ଦରଗଡ଼ କଣ୍ଟ୍ରୋଲ ରୁମ ତରଫରୁ ଏହି ଜରୁରୀ ସୂଚନା... ଆପଣଙ୍କ ମରୁଡ଼ି ସହାୟତା ପାଇଁ ୧ ଦବାନ୍ତୁ..."*
2. **Plain-Text SMS Push**: A 160-character SMS alert is delivered instantly with the Kisan Call Center toll-free helpline number (`1800-180-1551`).

---

## 📊 5. Measurable Impact & Outcome Comparison

| Dimension | Scenario A: Without Smart Krishi | Scenario B: With Smart Krishi (PS-02) |
|---|---|---|
| **Paddy Crop Yield** | 75% crop loss due to unmanaged 24-day dry spell ($6.0\text{ Quintals}$ total). | **Saved 65% of crop yield** via timely $KNO_3$ spray and farm pond micro-irrigation ($24.5\text{ Quintals}$ harvested). |
| **Produce Selling Price** | Forced panic-sale to local middlemen (*dalals*) at **₹1,800/quintal** at farmgate. | Sold at statutory **Govt MSP of ₹2,300/quintal** at OSAMB procurement yard via e-NAM token. |
| **Gross Farm Revenue** | $6.0\text{ qtl} \times ₹1,800 = \mathbf{₹10,800}$ | $24.5\text{ qtl} \times ₹2,300 = \mathbf{₹56,350}$ |
| **KCC Bank Loan Repayment** | Defaulted on ₹65,000 due Nov 10; credit score ruined; blacklisted by public banks. | **180-Day Loan Moratorium Approved** via automated Form 4A; zero penalty interest. |
| **Informal Private Debt** | Trapped in compounding debt spiral ($36\%\text{ p.a.}$ on ₹30,000 debt). | Paid off ₹30,000 private debt from harvest proceeds + PMFBY drought claim payout. |
| **Net Financial Impact** | **Net Loss: -₹84,200 (Extreme Agrarian Crisis)** | **Net Positive Surplus: +₹21,350 (Distress Fully Averted)** |

---

## 🛠️ Codebase Telemetry Mappings

* **Farmer Profile**: [`coding/data/farmers.json`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/data/farmers.json#L3-L30) (`F_SUN1` Debendra Majhi)
* **Sundargarh Agro-Climatic Context**: [`coding/data/sundargarh_disaster_context.json`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/data/sundargarh_disaster_context.json)
* **Sundargarh Mandi MSP Surveillance**: [`coding/data/sundargarh_mandis.json`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/data/sundargarh_mandis.json#L1-L20) (`M_SUN_01` Sundargarh RMC Yard)
* **Advisory & Distress Engine**: [`coding/server/engine/advisory_engine.py`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/server/engine/advisory_engine.py), [`coding/server/engine/distress_scorer.py`](file:///c:/Users/Achyut/Desktop/SIH-clone1/coding/server/engine/distress_scorer.py)
