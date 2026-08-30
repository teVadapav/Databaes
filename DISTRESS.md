# 📊 ICAR-CRIDA Farmer Distress Index (FDI) & Risk Scorer Specification

## 📌 1. Overview & Theoretical Foundation

The **Distress Scorer** in Smart Krishi (PS-02) implements the institutionally validated **6-Dimension Farmers' Distress Index (FDI)** framework published by:

> **Reddy et al. (2021)**, *"Development of Farmers' Distress Index"*,  
> **ICAR - Central Research Institute for Dryland Agriculture (CRIDA)**, *Land*, MDPI.

Instead of arbitrary scoring, the engine uses a multi-criteria weighted decision model that evaluates agronomic, climatic, financial, and institutional vulnerability to predict distress **before** it leads to emergency crises or crop loss.

---

## 🧮 2. The Core Formula & The Points System

### A. The Master Equation
$$\text{Total FDI Score} = w_E \cdot E + w_S \cdot S + w_{AC} \cdot (100 - AC) + w_M \cdot M + w_T \cdot T + w_{DF} \cdot DF$$

Where:
- $\text{Total FDI Score} \in [0, 100]$
- $w_E + w_S + w_{AC} + w_M + w_T + w_{DF} = 1.00$ ($100\%$)

---

### B. Understanding "Raw Score ($0\text{–}100$)" vs "Weighted Points"

Every dimension in the scorer uses a two-tier evaluation system:

1. **Raw Dimension Score ($\text{Raw} \in [0, 100]$)**:
   - Represents the **independent intensity** of vulnerability within that specific dimension alone.
   - $0 = \text{Optimal / Zero Vulnerability}$ (e.g., no rain deficit, no debt, assured canal irrigation).
   - $100 = \text{Extreme Vulnerability}$ (e.g., total monsoon failure, informal moneylender debt, failed borewell).

2. **Dimension Weight ($w_i$)**:
   - Represents the relative importance of that dimension in the overall distress model (based on empirical ICAR-CRIDA field surveys across dryland districts).

3. **Weighted Points ($\text{Points}_i = w_i \times \text{Raw}_i$)**:
   - The actual points that the dimension contributes to the farmer's total score (out of 100).

#### 📋 Dimension Weight & Points Distribution:
| Dimension | Notation | Weight ($w_i$) | Max Possible Points |
| :--- | :---: | :---: | :---: |
| **1. Hazard Exposure** | $E$ | **25%** ($0.25$) | **25.0 pts** |
| **2. Irrigation Sensitivity** | $S$ | **15%** ($0.15$) | **15.0 pts** |
| **3. Inverted Adaptive Capacity** | $100 - AC$ | **15%** ($0.15$) | **15.0 pts** |
| **4. Mitigation Deficit** | $M$ | **15%** ($0.15$) | **15.0 pts** |
| **5. Financial Trigger Shock** | $T$ | **20%** ($0.20$) | **20.0 pts** |
| **6. District Baseline Fragility** | $DF$ | **10%** ($0.10$) | **10.0 pts** |
| **TOTAL** | | **100%** ($1.00$) | **100.0 pts** |

---

## 🔬 3. The 6 Dimensions of FDI Explained in Detail

### 1️⃣ Dimension 1: Hazard Exposure ($E$) — Weight: 25%
Measures sudden external environmental and market shocks over which the farmer has no direct control.

- **Formula**:
  $$E = 0.50 \times \text{Rainfall Component} + 0.50 \times \text{Price Shock Component}$$
- **Sub-components**:
  - **Rainfall Component**:
    $$\text{Rainfall Component} = \min(|\text{Rainfall Deviation \%}|, 100)$$
    *(e.g., a $-40\%$ rainfall deficit yields $40$ raw points).*
  - **Price Shock Component**:
    $$\text{Price Component} = \begin{cases} \min\left(\frac{\text{Govt MSP} - \text{Mandi Price}}{\text{Govt MSP}} \times 100, 100\right) & \text{if Mandi Price } < \text{Govt MSP} \\ 0 & \text{if Mandi Price } \ge \text{Govt MSP} \end{cases}$$
- **Micro-Climate Augmentation**:
  - Adds $+15$ pts for high flood hazard risk or $+10$ pts for extreme surface temperature ($>41.5^\circ\text{C}$) combined with dry spells.

---

### 2️⃣ Dimension 2: Irrigation Sensitivity ($S$) — Weight: 15%
Measures the crop's physical susceptibility to moisture stress based on water source reliability.

- **Scoring Rules**:
  - **100% Rainfed OR Failed Borewell**: $\text{Raw } S = 90.0$ (Critically sensitive).
  - **Protective Well / Mixed Borewell**: $\text{Raw } S = 50.0$ (Moderate sensitivity).
  - **Canal / Assured Irrigation**: $\text{Raw } S = 15.0$ (Low sensitivity).
- **Dry Spell Penalty**:
  - If dry spell exceeds $14\text{ consecutive days}$, $+10$ points are added (capped at $100$).
- **Soil Factor**:
  - Red / Laterite soils (low moisture retention) add $+5$ points during extended dry spells.

---

### 3️⃣ Dimension 3: Adaptive Capacity ($AC$) — Weight: 15% (Entered as $100 - AC$)
Measures the farmer's internal structural safety buffers (land asset size and household income resilience).

- **Formula**:
  $$AC = 0.50 \times \text{Landholding Score} + 0.50 \times \text{Income Diversification Score}$$
- **Landholding Scale**:
  - Marginal ($< 1.0\text{ ha}$): $\text{Score} = 20.0$
  - Small ($1.0\text{--}2.0\text{ ha}$): $\text{Score} = 50.0$
  - Medium / Large ($> 2.0\text{ ha}$): $\text{Score} = 80.0$
- **Income Diversification**:
  - Single Source (Crop Cultivation only): $\text{Score} = 10.0$
  - Allied Agriculture (Dairy / Livestock / Poultry / Fishery): $\text{Score} = 60.0$
  - Non-farm salaried / Government remittance: $\text{Score} = 90.0$
- **Inversion into Risk ($100 - AC$)**:
  - Since higher capacity *reduces* distress, the engine enters $AC_{\text{risk}} = 100 - AC$.
  - *Example*: A marginal farmer with only crop income has $AC = 0.5(20) + 0.5(10) = 15.0$. Their distress risk is $100 - 15 = 85.0\text{ raw points}$.

---

### 4️⃣ Dimension 4: Mitigation Deficit ($M$) — Weight: 15%
Evaluates the absence of formal institutional safety nets.

- **Formula**:
  $$\text{Protection Score} = (50\text{ if PMFBY Insured else } 0) + (50\text{ if Has KCC else } 0)$$
  $$M = 100.0 - \text{Protection Score}$$
- **Scoring Rules**:
  - Both PMFBY and KCC active: $\text{Raw } M = 0.0$ (Zero deficit / Fully protected).
  - Only one active (e.g. KCC only): $\text{Raw } M = 50.0$ (Partial deficit).
  - Neither PMFBY nor KCC active: $\text{Raw } M = 100.0$ (Maximum mitigation deficit).

---

### 5️⃣ Dimension 5: Financial Trigger Shock ($T$) — Weight: 20%
Measures acute, imminent liquidity shocks that push farm households into distress.

- **Formula**:
  $$T = 0.60 \times \text{Loan Repayment Urgency} + 0.40 \times \text{Informal Debt Shock}$$
- **Loan Repayment Urgency**:
  $$\text{Loan Urgency} = \max\left(0, 100 - \min\left(100, \frac{\text{Days Until Due}}{90} \times 100\right)\right)$$
  - Loan due in $0\text{ days}$ (overdue): $\text{Urgency} = 100$
  - Loan due in $30\text{ days}$: $\text{Urgency} = 66.7$
  - Loan due in $\ge 90\text{ days}$: $\text{Urgency} = 0$
- **Informal Debt Shock**:
  - Loan from informal moneylenders at extortionate rates: $\text{Informal Shock} = 100.0$ (otherwise $0.0$).

---

### 6️⃣ Dimension 6: District Baseline Fragility ($DF$) — Weight: 10%
Provides regional baseline context based on historical agrarian distress, groundwater depletion categories (CGWB), and drought frequency.

- $\text{Raw } DF \in [0, 100]$ pulled directly from district registry databases:
  - **Akola (D2)**: $DF = 80.0$ (Historical dryland distress zone).
  - **Yavatmal (D3)**: $DF = 75.0$ (High vulnerability cotton belt).
  - **Nashik (D1)**: $DF = 45.0$ (Moderate baseline vulnerability).

---

## 🚦 4. Risk Classification Bands

Once the total composite score ($0\text{--}100$) is calculated, the farmer is classified into one of three operational risk tiers:

| Risk Tier | Score Range | Color | Action Protocol |
| :--- | :---: | :---: | :--- |
| 🟢 **LOW RISK** | **$0.0 \le \text{FDI} < 41.0$** | Green | Routine agronomic care, weather updates, and regular market price monitoring. |
| 🟡 **MEDIUM RISK** | **$41.0 \le \text{FDI} \le 70.9$** | Amber | Proactive warning SMS, moisture conservation advisory, contingency crop options, and PMFBY survey tracking. |
| 🔴 **HIGH RISK** | **$71.0 \le \text{FDI} \le 100.0$** | Red | **Immediate priority intervention**: Block Agriculture Officer dispatch, KCC debt restructuring (1-yr moratorium), WDRA warehouse pledge loan, and emergency direct benefit transfer (DBT). |

---

## 🎯 5. Step-by-Step Numerical Example

Let's calculate the FDI score for a hypothetical farmer (**Ramesh**):
- **Exposure ($E$)**: $-30\%$ rain deficit ($30$ pts), Mandi price ₹1,100 vs ₹1,500 MSP ($26.7$ pts) $\rightarrow \text{Raw } E = 28.4$
- **Sensitivity ($S$)**: Rainfed irrigation $\rightarrow \text{Raw } S = 90.0$
- **Adaptive Capacity ($AC$)**: $1.2\text{ ha}$ land ($50$ pts), single crop income ($10$ pts) $\rightarrow AC = 30.0 \rightarrow \text{Raw } (100 - AC) = 70.0$
- **Mitigation Deficit ($M$)**: Has PMFBY, has KCC $\rightarrow \text{Protection} = 100 \rightarrow \text{Raw } M = 0.0$
- **Trigger Shock ($T$)**: Loan due in 45 days ($50$ pts), informal debt present ($100$ pts) $\rightarrow \text{Raw } T = 0.6(50) + 0.4(100) = 70.0$
- **District Fragility ($DF$)**: Akola $\rightarrow \text{Raw } DF = 80.0$

### 🔢 Calculation:
$$\begin{aligned}
\text{Pts}(E) &= 0.25 \times 28.4 = 7.10 \\
\text{Pts}(S) &= 0.15 \times 90.0 = 13.50 \\
\text{Pts}(AC) &= 0.15 \times 70.0 = 10.50 \\
\text{Pts}(M) &= 0.15 \times 0.0 = 0.00 \\
\text{Pts}(T) &= 0.20 \times 70.0 = 14.00 \\
\text{Pts}(DF) &= 0.10 \times 80.0 = 8.00 \\
\hline
\mathbf{\text{Total FDI Score}} &= 7.10 + 13.50 + 10.50 + 0.00 + 14.00 + 8.00 = \mathbf{53.1} \quad (\text{\bf Medium Risk})
\end{aligned}$$

---

## 🛡️ 6. Dimension-to-Scheme Policy Mapping

When specific dimension scores spike, the engine automatically matches and routes the farmer to eligible government welfare schemes:

| Condition Trigger | Targeted Dimension | Automatically Recommended Scheme | Action Item |
| :--- | :--- | :--- | :--- |
| **$E > 25$** (Rainfall deficit) | Hazard Exposure ($E$) | **PMFBY (S1)** | Initiate 72-hr block loss assessment |
| **$E > 25$** (Mandi price $<$ MSP) | Hazard Exposure ($E$) | **PM-AASHA (S3)** | Direct procurement at MSP floor |
| **$S \ge 70$** (Water stress) | Irrigation Sensitivity ($S$) | **PMKSY / Per Drop More Crop (S4)** | Micro-irrigation 55% subsidy |
| **$AC_{\text{risk}} > 55$** (Marginal holding) | Adaptive Capacity ($AC$) | **PM-KISAN (S5)** | Direct income transfer check |
| **$M \ge 50$** (Uninsured / No credit) | Mitigation Deficit ($M$) | **KCC & PMFBY Enrollment Drive** | Doorstep enrollment via CSC/Mitra |
| **$T > 50$** (Debt maturity / Moneylender) | Trigger Shock ($T$) | **KCC Debt Restructuring (S2)** | 1-year moratorium + 3% subvention |
| **$DF \ge 80$** (Severely fragile zone) | District Fragility ($DF$) | **State Special Drought Package (S4)** | Emergency fodder & tanker water relief |
