# 🔬 Engine Sandbox Explanation — Smart Krishi (PS-02)

## 📌 1. What is the Engine Sandbox?

The **Engine Sandbox (MVP Interactive Tester)** is an end-to-end diagnostic simulation workbench. It enables agronomists, policy officers, evaluators, and judges to test the core intelligence of Smart Krishi in real-time.

Instead of waiting for real-world weather or market updates, the Sandbox lets you:
1. **Inject custom farmer profiles** (land size, irrigation type, insurance, debt status, crop stage).
2. **Simulate real-time environmental & market shocks** (rainfall deficits, dry spells, monsoon delay, APMC market price crashes).
3. **Inspect the rule priority decision trace** ($R-30 \rightarrow R-10 \rightarrow R-15 \rightarrow R-20$) to understand *why* a particular advisory was generated.
4. **View the live ICAR-CRIDA 6-Dimension Farmer Distress Index (FDI)** calculation and risk level score.
5. **Listen to synthesized spoken regional audio** across 6 Indian languages.

---

## 🕹️ 2. Detailed Breakdown of Every Button & Control

### ⚡ A. Top Action & 1-Click Preset Shock Buttons

| Button | What It Does & How It Works |
| :--- | :--- |
| **🚀 Run Engine Simulation** | Sends a `POST` request to `/api/simulator/evaluate` with the active input parameters. The server recalculates the 6-dimension FDI score, checks the rule priority hierarchy, and updates all diagnostic output cards instantly. *(Note: The simulation also updates automatically as you type or tweak any input).* |
| **🚨 1. Market Crash Preset** | Sets up a harvest-stage Onion farmer where the mandi price (₹1,100) falls below Government MSP (₹1,500). Automatically triggers **Rule R-30 (Market Distress Override)** to protect the farmer from panic distress selling. |
| **🌾 2. Monsoon Delay Preset** | Configures a 22-day monsoon delay and dry spell during the Sowing stage in Akola. Automatically triggers **Rule R-10 (ICAR-CRIDA Contingency Crop Switch)** recommending drought-resilient alternative crops (e.g. Pigeonpea/Soybean). |
| **☀️ 3. Fragility & Relief Preset** | Configures a rainfed smallholder with failed irrigation, informal private debt, and no crop insurance. Tests high **Sensitivity ($S$)** and high **Mitigation Deficit ($M$)**, yielding a **High Risk** distress score. |
| **✅ 4. Healthy Normal Preset** | Resets all weather and market variables to safe, normal baseline conditions. Demonstrates a stable, **Low Risk** state with standard stage-specific cultivation guidance (**Rule R-20**). |

---

### 👨‍🌾 B. Custom Farmer Parameter Inputs (Left Column - Card 1)

| Input / Control | Function & Impact on Engine |
| :--- | :--- |
| **Farmer Name** | Custom name dynamically personalized into generated advisory text and spoken voice greetings. |
| **District** | Selects baseline agro-district (`Nashik (D1)`, `Akola (D2)`, `Yavatmal (D3)`). Injects the baseline **District Fragility ($DF$)** score based on regional groundwater depth and historical drought vulnerability. |
| **Crop** | Selected crop (`Onion`, `Cotton`, `Soybean`, `Tomato`, `Paddy`, `Wheat`, `Maize`). Sets MSP baseline and crop-specific vulnerability. |
| **Crop Stage** | Phenological stage (`Sowing`, `Vegetative`, `Flowering`, `Harvest`). Determines rule applicability (e.g., market interventions apply at *Harvest*; contingency switches apply at *Sowing*). |
| **Landholding (ha)** | Land size in hectares. Inversely impacts **Adaptive Capacity ($AC$)** (holdings $< 2\text{ ha}$ indicate small/marginal farmers with less buffer against shocks). |
| **Irrigation** | Selects irrigation infrastructure (`100% Rainfed`, `Protective Well / Borewell`, `Canal (Assured)`). Higher rainfed proportion increases **Irrigation Sensitivity ($S$)**. |
| **Borewell Failed ☑** | When checked, flags acute water failure and triggers **Rule R-15 (Life-Saving Protective Irrigation)**. |
| **PMFBY Insured ☑** | When unchecked, increases **Mitigation Deficit ($M$)** due to lack of crop insurance. |
| **Has KCC ☑** | Kisan Credit Card access. When unchecked, increases **Mitigation Deficit ($M$)**. |
| **Informal Debt ☑** | Flags high-interest moneylender loans, significantly elevating the **Financial Trigger Shock ($T$)** dimension. |
| **Evaluation Language** | Selects language (`English`, `Hindi`, `Marathi`, `Odia`, `Assamese`, `Kannada`) for generated advisory text and neural voice playback. |
| **Loan Due Date** | Due date of institutional loan. Dates within 30 days increase the **Trigger Shock ($T$)** dimension. |

---

### 🌦️ C. Environmental & Market Shock Inputs (Left Column - Card 2)

| Input / Control | Function & Impact on Engine |
| :--- | :--- |
| **Mandi Price (₹)** | Current wholesale APMC price per quintal. |
| **Govt MSP (₹)** | Official Minimum Support Price floor benchmark. If `Mandi Price < Govt MSP` during Harvest, the engine overrides regular agronomy with emergency market intervention. |
| **Rain Deficit %** | Percentage deviation from normal precipitation (e.g., `-40%`). Directly elevates **Hazard Exposure ($E$)**. |
| **Dry Spell (Days)** | Consecutive days without rain during active crop season. Triggers moisture conservation and supplemental irrigation protocols. |
| **Onset Delay (Days)** | Delay in monsoon arrival. Delays $> 14\text{ days}$ trigger contingency crop switching. |

---

### 📊 D. Live Engine Diagnostic Outputs (Right Column)

#### 1. Fired Rule & Advisory Card
- **Rule Badge**: Displays the fired rule badge (e.g. `🚨 RULE R-30: MARKET DISTRESS OVERRIDE` or `⚠️ RULE R-10: CRIDA CONTINGENCY CROP SWITCH`).
- **Generated Advisory Body**: Displays the generated advisory text in the selected language.
- **🔊 Listen Spoken Audio Button**: Synthesizes and plays the generated advisory using regional neural speech.

#### 2. Rule Hierarchy Decision Trace (Auditable Checklist)
Shows the sequential priority evaluation order:
- **Priority 1 — Rule R-30 (Market Distress Intervention)**: Checks if market price is below MSP at harvest stage.
- **Priority 2 — Rule R-10 (Contingency Crop Switch)**: Checks if onset delay $> 14\text{ days}$ or severe sowing-stage drought occurs.
- **Priority 3 — Rule R-15 (Protective Irrigation Advisory)**: Checks if protective wells failed or dry spell $\ge 10\text{ days}$.
- **Priority 4 — Rule R-20 (Standard ICAR-CRIDA Agronomy)**: Fallback standard agronomic care for healthy conditions.

#### 3. ICAR-CRIDA 6-Dimension Distress Calculation
Computes the weighted composite **Farmer Distress Index (FDI)** (Reddy et al., 2021):

$$\text{FDI Score} = 0.25 \cdot E + 0.15 \cdot S + 0.15 \cdot (100 - AC) + 0.15 \cdot M + 0.20 \cdot T + 0.10 \cdot DF$$

- **$E$ (Hazard Exposure)**: Rainfall deficit, temperature anomaly, and market price drop shocks.
- **$S$ (Irrigation Sensitivity)**: Rainfed percentage and soil moisture vulnerability.
- **$AC$ (Adaptive Capacity)**: Landholding buffer and non-farm income resilience.
- **$M$ (Mitigation Deficit)**: Absence of PMFBY crop insurance and KCC institutional credit.
- **$T$ (Financial Trigger Shock)**: Impending loan due dates and informal debt exposure.
- **$DF$ (District Fragility)**: Baseline regional drought vulnerability and groundwater depletion index.

**Risk Classification**:
- 🟢 **LOW RISK** ($\text{FDI} < 30$): Normal farming conditions.
- 🟡 **MEDIUM RISK** ($30 \le \text{FDI} < 60$): Proactive alerts and advisory guidance.
- 🔴 **HIGH RISK** ($\text{FDI} \ge 60$): Immediate officer intervention, emergency relief, and scheme enrollment.
