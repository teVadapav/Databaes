/**
 * PS-02: Smart Crop Advisory & Farmer Distress Early-Warning System (v3)
 * Frontend Application Logic (Vanilla JS + Modern Component Architecture)
 */

// Application State
const savedLocale = (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
const state = {
  activeView: 'farmer',         // 'farmer' | 'officer' | 'simulator'
  farmerAccessMode: 'assisted', // 'assisted' | 'self'
  selectedFarmerId: 'F1',
  selectedLanguage: savedLocale,
  activeFarmerTab: 'advisory',  // 'advisory' | 'mandi' | 'alerts' | 'schemes'
  farmers: [],
  currentFarmer: null,
  currentAdvisory: null,
  currentDistress: null,
  officerFarmers: [],
  officerMetrics: {},
  weights: {
    exposure:           0.25,   // E  — Dimension 1: Climate & Price Hazard
    sensitivity:        0.15,   // S  — Dimension 2: Irrigation Dependency
    adaptive_capacity:  0.15,   // AC — Dimension 3: Landholding & Income (inverted)
    mitigation_deficit: 0.15,   // M  — Dimension 4: PMFBY / KCC Deficit
    trigger:            0.20,   // T  — Dimension 5: Loan & Informal Debt Shock
    district_fragility: 0.10    // DF — Dimension 6: Historical Vulnerability
  },
  selectedOfficerFarmer: null,
  ivrState: null,
  currentAudio: null,
  currentAudioTrigger: null,
  isSpeaking: false,
  translationCache: {},
  audioBlobCache: new Map(),
  activeSchemeCategory: 'for_you',
  currentAlerts: [],
  currentSchemes: []
};

// API Base URL
const API_BASE = '/api';

// Google Cloud API Configuration
const GOOGLE_TTS_API_KEY       = '';
const GOOGLE_TRANSLATE_API_KEY = '';

// All 6 supported languages
const SUPPORTED_LANGUAGES = {
  en: { name: 'English',   bcp47: 'en-IN', voice: 'en-IN-NeerjaExpressiveNeural', script: 'latin'      },
  hi: { name: 'हिंदी',       bcp47: 'hi-IN', voice: 'hi-IN-SwaraNeural',            script: 'devanagari' },
  mr: { name: 'मराठी',      bcp47: 'mr-IN', voice: 'mr-IN-AarohiNeural',           script: 'devanagari' },
  or: { name: 'ଓଡ଼ିଆ',      bcp47: 'or-IN', voice: 'hi-IN-SwaraNeural',            script: 'odia'       },
  as: { name: 'অসমীয়া',    bcp47: 'as-IN', voice: 'bn-IN-TanishaaNeural',         script: 'assamese'   },
  kn: { name: 'ಕನ್ನಡ',     bcp47: 'kn-IN', voice: 'kn-IN-SapnaNeural',            script: 'kannada'    },
};

// ─── i18n Translation Table (Natural, Modern & Colloquial Indian Languages) ───
const i18n = {
  "en": {
    "appTitle": "Smart Krishi • PS-02",
    "cropAdvisory": "Crop Advisory",
    "mandiPrice": "📈 APMC Mandi Price",
    "myAlerts": "🔔 My Alerts",
    "govtSchemes": "🛡️ Govt Safety Net",
    "accessMode": "Access Mode",
    "assistedMode": "Assisted Mode (Kisan Mitra / CSC)",
    "selfService": "Self-Service",
    "language": "Language:",
    "quickLangSwitch": "Quick Lang:",
    "tapToListen": "Tap to listen 🔊",
    "tapToListenShort": "Tap to listen 🔊",
    "playing": "Playing audio…",
    "whyNeedLabel": "📌 Why You Need This:",
    "howHelpsLabel": "✨ How It Benefits You:",
    "listenSchemeCard": "Tap to listen 🔊",
    "officialPortal": "Official Portal ↗",
    "tabForYou": "🌟 For You",
    "tabFinance": "💳 Finance & Credit",
    "tabCropManagement": "Crop Management",
    "tabDisaster": "🛡️ Disaster & Relief",
    "CRITICAL": "CRITICAL",
    "HIGH": "HIGH",
    "MEDIUM": "MEDIUM",
    "LOW": "LOW",
    "cropAdvisorySub": "Weather & Crop Care",
    "mandiPriceSub": "Market vs Govt MSP",
    "myAlertsSub": "Rain & Loan Notices",
    "govtSchemesSub": "PMFBY, KCC & Relief",
    "weatherContextTitle": "Field Micro-Climate & Soil Conditions",
    "listenAllWeather": "Listen Weather & Soil 🔊",
    "rainDevLabel": "Rainfall Deviation",
    "drySpellLabel": "Dry Spell Length",
    "monsoonOnsetLabel": "Monsoon Onset",
    "soilTypeLabel": "Soil Type",
    "mandiBadge": "APMC Market Surveillance",
    "mandiMainTitle": "Mandi Price vs Government MSP",
    "listenMandi": "Listen Mandi Price 🔊",
    "todayMandiLabel": "Today's Mandi Price",
    "perQuintalLabel": "per Quintal",
    "govFloorPrice": "Govt Floor Price",
    "govMspLabel": "Government MSP",
    "guaranteedMspLabel": "per Quintal (Guaranteed Benchmark)",
    "recommendedActionLabel": "Recommended Market Action:",
    "alertsBadge": "Notifications & Reminders",
    "alertsMainTitle": "Active Notifications for Your Farm",
    "listenAllAlerts": "Listen All Alerts 🔊",
    "schemesBadge": "Government Safety Net",
    "schemesMainTitle": "Eligible Schemes Based on Your Stress Signals",
    "listenAllSchemes": "Listen All Schemes 🔊",
    "officerBadge": "Administration & Extension Portal",
    "officerMainTitle": "District Agro-Distress Monitoring & Interventions",
    "officerMainSub": "ICAR-CRIDA FDI framework early-warning dashboard for block agriculture officers and field workers.",
    "playOfficerBriefing": "Listen to District Briefing",
    "metricTotal": "Total Monitored",
    "metricTotalSub": "Across 3 Agro-Districts",
    "metricHigh": "High Risk Alert",
    "metricHighSub": "Immediate intervention required",
    "metricMed": "Medium Risk",
    "metricMedSub": "Under advisory monitoring",
    "metricLow": "Low Risk",
    "metricLowSub": "Stable agronomic conditions",
    "calibratorTitle": "CRIDA FDI Weight Calibrator — 6 Dimensions",
    "calibratorSub": "Adjust relative weights of the 6 vulnerability dimensions to recalculate distress scores dynamically in real-time.",
    "resetDefaults": "Reset to ICAR-CRIDA Defaults",
    "sliderExposure": "Hazard Exposure (E):",
    "sliderExposureSub": "Rainfall deficit, temperature anomalies, & price drop hazards",
    "sliderSensitivity": "Irrigation Sensitivity (S):",
    "sliderSensitivitySub": "Rainfed vs irrigated proportion & soil moisture vulnerability",
    "sliderAC": "Adaptive Capacity (AC - Inverted):",
    "sliderACSub": "Marginal landholding, non-farm income deficit, & asset buffer",
    "sliderMitigation": "Mitigation Deficit (M):",
    "sliderMitigationSub": "Absence of PMFBY insurance & Kisan Credit Card (KCC) coverage",
    "sliderTrigger": "Financial Trigger Shock (T):",
    "sliderTriggerSub": "Impending loan due dates & exposure to high-interest informal moneylenders",
    "sliderDF": "District Fragility (DF):",
    "sliderDFSub": "Historical farmer distress index & groundwater depletion category",
    "registryTitle": "Real-Time Farmer Distress Risk Registry",
    "registrySub": "Live vulnerability matrix calculated via ICAR-CRIDA weighted multi-criteria decision model.",
    "filterLabel": "Filter by Risk Level:",
    "filterAll": "All Risk Levels",
    "filterHigh": "High Risk (Score ≥ 60)",
    "filterMed": "Medium Risk (Score 30-59)",
    "filterLow": "Low Risk (Score < 30)",
    "thDistressScore": "FDI Distress Score",
    "thCropStage": "Crop & Stage",
    "thTopTrigger": "Primary Distress Trigger",
    "thContactChannel": "Recommended Channel",
    "thRecommendedScheme": "Priority Intervention Scheme",
    "modalBreakdownTitle": "ICAR-CRIDA 6-Dimension Score Breakdown",
    "modalExplanationsTitle": "Plain-Language Multi-Channel Explanation",
    "modalReachabilityTitle": "Farmer Communication & Reachability",
    "modalLandTitle": "Landholding & Soil Profile",
    "modalFragilityTitle": "District Baseline Fragility",
    "modalInterventionsTitle": "Safety-Net Interventions & Schemes",
    "modalListenBriefing": "Listen Case Briefing 🔊",
    "modalCloseBtn": "Close Case Record",
    "simBadge": "Multi-Channel Telephony Simulator",
    "simTitle": "IVR & Plain SMS Delivery Emulator",
    "simSub": "Simulate and audit how personalized advisories are delivered to farmers over feature phones via automated IVR voice calls and GSM-7/Unicode SMS.",
    "ivrHeaderTitle": "Interactive Voice Response (IVR) Simulator",
    "ivrSpeakPrompt": "Speak / Ask AI Kisan Mitra",
    "pressKeypad": "Press Keypad",
    "keyAdvisory": "1: Advisory",
    "keyMandi": "2: Mandi Rates",
    "keySchemes": "3: Safety-Net",
    "keyOfficer": "9: Connect Officer",
    "ivrRestartCall": "Restart Call",
    "smsEmulatorTitle": "Outbound SMS Notification Emulator",
    "smsEmulatorSub": "Simulated GSM SMS payload builder across all 6 regional languages.",
    "sendTestSms": "Dispatch SMS via Telephony Gateway",
    "simDesignNoteTitle": "CRIDA Voice & SMS Design Specification:",
    "simDesignNote1": "• Dual-Tone Multi-Frequency (DTMF) keypad routing allows basic feature phone farmers to navigate without internet.",
    "simDesignNote2": "• Spoken advisories are structured in natural spoken sentence chunks under 30 seconds for maximum clarity.",
    "simDesignNote3": "• Outbound SMS uses Unicode (UCS-2) encoding for Indian scripts with automatic segment calculation.",
    "contingencyBoxTitle": "ICAR-CRIDA Contingency Crop Recommendations:",
    "voiceBtnText": "Play Spoken Advisory 🔊"
  },
  "hi": {
    "appTitle": "स्मार्ट कृषि • PS-02",
    "cropAdvisory": "फसल सलाह",
    "mandiPrice": "📈 मंडी भाव",
    "myAlerts": "🔔 अलर्ट एवं सूचनाएं",
    "govtSchemes": "🛡️ सरकारी सुरक्षा कवच",
    "accessMode": "उपयोग मोड",
    "assistedMode": "सहायता प्राप्त मोड (किसान मित्र / सीएससी)",
    "selfService": "स्वयं सेवा (किसान मोड)",
    "language": "भाषा:",
    "quickLangSwitch": "त्वरित भाषा:",
    "tapToListen": "सुनने के लिए टैप करें 🔊",
    "tapToListenShort": "सुनने के लिए टैप करें 🔊",
    "playing": "ऑडियो चल रहा है…",
    "whyNeedLabel": "📌 आपको इसकी आवश्यकता क्यों है:",
    "howHelpsLabel": "✨ इससे आपको क्या फायदा होगा:",
    "listenSchemeCard": "सुनने के लिए टैप करें 🔊",
    "officialPortal": "सरकारी पोर्टल ↗",
    "tabForYou": "🌟 आपके लिए",
    "tabFinance": "💳 वित्त एवं ऋण सहायता",
    "tabCropManagement": "फसल प्रबंधन",
    "tabDisaster": "🛡️ आपदा एवं राहत",
    "CRITICAL": "अति आवश्यक",
    "HIGH": "उच्च प्राथमिकता",
    "MEDIUM": "मध्यम",
    "LOW": "सामान्य",
    "cropAdvisorySub": "मौसम एवं फसल देखभाल",
    "mandiPriceSub": "मंडी भाव बनाम सरकारी समर्थन मूल्य",
    "myAlertsSub": "वर्षा एवं ऋण सूचनाएं",
    "govtSchemesSub": "फसल बीमा, केसीसी एवं राहत योजनाएं",
    "weatherContextTitle": "खेत का मौसम एवं मिट्टी की स्थिति",
    "listenAllWeather": "मौसम एवं मिट्टी की जानकारी सुनें 🔊",
    "rainDevLabel": "वर्षा विचलन",
    "drySpellLabel": "सूखा खंड अवधि",
    "monsoonOnsetLabel": "मानसून आगमन",
    "soilTypeLabel": "मिट्टी का प्रकार",
    "mandiBadge": "एपीएमसी मंडी निगरानी",
    "mandiMainTitle": "मंडी भाव बनाम सरकारी समर्थन मूल्य (MSP)",
    "listenMandi": "मंडी भाव सुनें 🔊",
    "todayMandiLabel": "आज का मंडी भाव",
    "perQuintalLabel": "प्रति क्विंटल",
    "govFloorPrice": "सरकारी न्यूनतम मूल्य",
    "govMspLabel": "सरकारी समर्थन मूल्य (MSP)",
    "guaranteedMspLabel": "प्रति क्विंटल (गारंटीड बेंचमार्क)",
    "recommendedActionLabel": "अनुशंसित बाजार कदम:",
    "alertsBadge": "सूचनाएं एवं अनुस्मारक",
    "alertsMainTitle": "आपके खेत के लिए सक्रिय अलर्ट",
    "listenAllAlerts": "सभी अलर्ट सुनें 🔊",
    "schemesBadge": "सरकारी सुरक्षा कवच",
    "schemesMainTitle": "आपके संकट संकेतों पर आधारित पात्र योजनाएं",
    "listenAllSchemes": "सभी योजनाएं सुनें 🔊",
    "officerBadge": "प्रशासन एवं विस्तार पोर्टल",
    "officerMainTitle": "जिला कृषि संकट निगरानी एवं हस्तक्षेप",
    "officerMainSub": "प्रखंड कृषि अधिकारियों और कार्यकर्ताओं के लिए आईसीएआर-क्रीडा एफडीआई पूर्व-चेतावनी डैशबोर्ड।",
    "playOfficerBriefing": "जिला ब्रीफिंग सुनें",
    "metricTotal": "कुल निगरानी अधीन",
    "metricTotalSub": "३ कृषि जिलों में",
    "metricHigh": "उच्च जोखिम अलर्ट",
    "metricHighSub": "तत्काल हस्तक्षेप आवश्यक",
    "metricMed": "मध्यम जोखिम",
    "metricMedSub": "सलाहकार निगरानी में",
    "metricLow": "कम जोखिम",
    "metricLowSub": "स्थिर कृषि स्थिति",
    "calibratorTitle": "क्रीडा एफडीआई वेटेज कैलिब्रेटर — ६ आयाम",
    "calibratorSub": "संकट स्कोर की पुनर्गणना के लिए ६ आयामों के सापेक्ष वेटेज को आवश्यकतानुसार समायोजित करें।",
    "resetDefaults": "क्रीडा मूल मान रीसेट करें",
    "sliderExposure": "संकट जोखिम (E):",
    "sliderExposureSub": "वर्षा की कमी, तापमान असामान्यता एवं मूल्य गिरावट जोखिम",
    "sliderSensitivity": "सिंचाई संवेदनशीलता (S):",
    "sliderSensitivitySub": "असिंचित बनाम सिंचित अनुपात एवं मिट्टी की नमी संवेदनशीलता",
    "sliderAC": "अनुकूलन क्षमता (AC - विपरीत):",
    "sliderACSub": "सीमांत जोत, गैर-कृषि आय की कमी एवं परिसंपत्ति बफर",
    "sliderMitigation": "राहत सुरक्षा कमी (M):",
    "sliderMitigationSub": "फसल बीमा एवं किसान क्रेडिट कार्ड (KCC) का अभाव",
    "sliderTrigger": "वित्तीय संकट धक्का (T):",
    "sliderTriggerSub": "ऋण चुकाने की अंतिम तिथि एवं अनौपचारिक साहूकारों पर निर्भरता",
    "sliderDF": "जिला संवेदनशीलता (DF):",
    "sliderDFSub": "ऐतिहासिक संकट सूचकांक एवं भूजल स्तर की स्थिति",
    "registryTitle": "वास्तविक समय किसान संकट जोखिम रजिस्टर",
    "registrySub": "क्रीडा बहु-मानदंड निर्णय मॉडल द्वारा तैयार की गई सक्रिय किसान जोखिम सूची।",
    "filterLabel": "जोखिम स्तर अनुसार फिल्टर करें:",
    "filterAll": "सभी जोखिम स्तर",
    "filterHigh": "उच्च जोखिम (स्कोर ≥ ६०)",
    "filterMed": "मध्यम जोखिम (स्कोर ३०-५९)",
    "filterLow": "कम जोखिम (स्कोर < ३०)",
    "thDistressScore": "एफडीआई संकट स्कोर",
    "thCropStage": "फसल एवं अवस्था",
    "thTopTrigger": "मुख्य संकट कारण",
    "thContactChannel": "अनुशंसित संचार माध्यम",
    "thRecommendedScheme": "प्राथमिक सरकारी योजना",
    "modalBreakdownTitle": "क्रीडा ६-आयाम स्कोर विवरण",
    "modalExplanationsTitle": "सरल भाषा में बहु-माध्यम विवरण",
    "modalReachabilityTitle": "किसान संचार एवं संपर्क साधन",
    "modalLandTitle": "जोत एवं मिट्टी विवरण",
    "modalFragilityTitle": "जिला आधारभूत संवेदनशीलता",
    "modalInterventionsTitle": "सुरक्षा कवच एवं राहत योजनाएं",
    "modalListenBriefing": "केस विवरण सुनें 🔊",
    "modalCloseBtn": "बंद करें",
    "simBadge": "बहु-माध्यम टेलीफोनी सिम्युलेटर",
    "simTitle": "आईवीआर कॉल एवं एसएमएस एमुलेटर",
    "simSub": "कीपैड फोन वाले किसानों तक स्वचालित वॉयस कॉल और एसएमएस द्वारा सलाह पहुंचाने का सिम्युलेटर।",
    "ivrHeaderTitle": "इंटरएक्टिव वॉयस रिस्पॉन्स (IVR) सिम्युलेटर",
    "ivrSpeakPrompt": "बोलें / किसान मित्र से पूछें",
    "pressKeypad": "कीपैड दबाएं",
    "keyAdvisory": "१: फसल सलाह",
    "keyMandi": "२: मंडी भाव",
    "keySchemes": "३: सरकारी योजनाएं",
    "keyOfficer": "९: अधिकारी से बात करें",
    "ivrRestartCall": "कॉल पुनः शुरू करें",
    "smsEmulatorTitle": "आउटबाउंड एसएमएस सूचना एमुलेटर",
    "smsEmulatorSub": "सभी ६ क्षेत्रीय भाषाओं में स्वचालित एसएमएस पेलोड जनरेटर।",
    "sendTestSms": "टेलीफोनी गेटवे द्वारा एसएमएस भेजें",
    "simDesignNoteTitle": "क्रीडा वॉयस एवं एसएमएस तकनीकी विवरण:",
    "simDesignNote1": "• डीटीएमएफ कीपैड रूटिंग द्वारा बिना इंटरनेट वाले फोन पर आसानी से नेविगेशन।",
    "simDesignNote2": "• वॉयस कॉल में ३० सेकंड के छोटे एवं स्पष्ट वाक्यों में सरल भाषा का उपयोग।",
    "simDesignNote3": "• भारतीय भाषाओं के लिए यूनिकोड (UCS-2) एन्कोडिंग एवं स्वचालित सेगमेंट गणना।",
    "contingencyBoxTitle": "आईसीएआर-क्रीडा अनुशंसित आकस्मिक वैकल्पिक फसलें:",
    "voiceBtnText": "पूरी सलाह आवाज में सुनें 🔊"
  },
  "mr": {
    "appTitle": "स्मार्ट कृषी • PS-02",
    "cropAdvisory": "पीक सल्ला",
    "mandiPrice": "📈 बाजार भाव",
    "myAlerts": "🔔 महत्त्वाचे इशारे",
    "govtSchemes": "🛡️ शासकीय सुरक्षा कवच",
    "accessMode": "वापर मोड",
    "assistedMode": "मदतनीस मोड (किसान मित्र / सीएससी)",
    "selfService": "स्वयं-सेवा (शेतकरी मोड)",
    "language": "भाषा:",
    "quickLangSwitch": "भाषा निवडा:",
    "tapToListen": "ऐकण्यासाठी टॅप करा 🔊",
    "tapToListenShort": "ऐकण्यासाठी टॅप करा 🔊",
    "playing": "ऑडिओ सुरू आहे…",
    "whyNeedLabel": "📌 आपल्याला याची गरज का आहे:",
    "howHelpsLabel": "✨ यामुळे काय फायदा होईल:",
    "listenSchemeCard": "ऐकण्यासाठी टॅप करा 🔊",
    "officialPortal": "शासकीय पोर्टल ↗",
    "tabForYou": "🌟 आपल्यासाठी",
    "tabFinance": "💳 वित्त व कर्ज साहाय्य",
    "tabCropManagement": "पीक व्यवस्थापन",
    "tabDisaster": "🛡️ आपत्ती व दिलासा",
    "CRITICAL": "अति गंभीर",
    "HIGH": "उच्च जोखीम",
    "MEDIUM": "मध्यम",
    "LOW": "सामान्य",
    "cropAdvisorySub": "हवामान व पीक निगा",
    "mandiPriceSub": "बाजार भाव विरुद्ध शासकीय हमीभाव",
    "myAlertsSub": "पाऊस व पीक कर्ज सूचना",
    "govtSchemesSub": "पीक विमा, केसीसी व दिलासा योजना",
    "weatherContextTitle": "शेतातील हवामान व जमिनीची स्थिती",
    "listenAllWeather": "हवामान व जमिनीची माहिती ऐका 🔊",
    "rainDevLabel": "पावसाची तूट",
    "drySpellLabel": "दुष्काळ खंड कालावधी",
    "monsoonOnsetLabel": "मान्सून आगमन",
    "soilTypeLabel": "जमिनीचा प्रकार",
    "mandiBadge": "एपीएमसी बाजार भाव देखरेख",
    "mandiMainTitle": "बाजार भाव विरुद्ध शासकीय हमीभाव (MSP)",
    "listenMandi": "बाजार भाव ऐका 🔊",
    "todayMandiLabel": "आजचा बाजार भाव",
    "perQuintalLabel": "प्रति क्विंटल",
    "govFloorPrice": "शासकीय हमीभाव आधार",
    "govMspLabel": "शासकीय हमीभाव (MSP)",
    "guaranteedMspLabel": "प्रति क्विंटल (हमीभाव बेंचमार्क)",
    "recActionTitle": "शिफारस केलेले बाजार पाऊल:",
    "alertsBadge": "सूचना व स्मरणपत्रे",
    "alertsMainTitle": "आपल्या शेतासाठी सक्रिय इशारे",
    "listenAllAlerts": "सर्व इशारे ऐका 🔊",
    "schemesBadge": "शासकीय सुरक्षा कवच",
    "schemesMainTitle": "आपल्या परिस्थितीनुसार पात्र शासकीय योजना",
    "listenAllSchemes": "सर्व योजना ऐका 🔊",
    "officerBadge": "प्रशासन व विस्तार पोर्टल",
    "officerMainTitle": "जिल्हा कृषी संकट देखरेख व उपाययोजना",
    "officerMainSub": "तालुका कृषी अधिकारी व कर्मचाऱ्यांसाठी आयसीएआर-क्रीडा पूर्वसूचना डॅशबोर्ड.",
    "playOfficerBriefing": "जिल्हा अहवाल ऐका",
    "metricTotal": "एकूण नोंदणीकृत",
    "metricTotalSub": "३ कृषी जिल्ह्यांमध्ये",
    "metricHigh": "उच्च जोखीम अलर्ट",
    "metricHighSub": "तातडीने मदतीची गरज",
    "metricMed": "मध्यम जोखीम",
    "metricMedSub": "सल्लागार देखरेखीखाली",
    "metricLow": "कमी जोखीम",
    "metricLowSub": "स्थिर परिस्थिती",
    "calibratorTitle": "क्रीडा एफडीआय भारमान समायोजन — ६ घटक",
    "calibratorSub": "संकट स्कोअरची पुनर्गणना करण्यासाठी ६ घटकांचे भारमान आवश्यकतेनुसार बदला.",
    "resetDefaults": "क्रीडा मूळ प्रमाण रीसेट करा",
    "sliderExposure": "संकट जोखीम (E):",
    "sliderExposureSub": "पावसाची तूट, तापमानातील बदल व भाव घसरणीची जोखीम",
    "sliderSensitivity": "सिंचन संवेदनशीलता (S):",
    "sliderSensitivitySub": "जिरायती क्षेत्र व जमिनीतील ओलाव्याची कमतरता",
    "sliderAC": "अनुकूलन क्षमता (AC - उलट):",
    "sliderACSub": "अल्पभूधारक शेती, बिगर-शेती उत्पन्नाचा अभाव व मालमत्ता",
    "sliderMitigation": "सुरक्षा कवच अभाव (M):",
    "sliderMitigationSub": "पीक विमा व किसान क्रेडिट कार्ड (KCC) ची अनुपलब्धता",
    "sliderTrigger": "आर्थिक धक्का (T):",
    "sliderTriggerSub": "कर्ज परतफेडीची मुदत व खासगी सावकारांवरील अवलंबित्व",
    "sliderDF": "जिल्हा संवेदनशीलता (DF):",
    "sliderDFSub": "ऐतिहासिक दुष्काळ निर्देशांक व भूजल पातळीची स्थिती",
    "registryTitle": "थेट शेतकरी संकट जोखीम नोंदवही",
    "registrySub": "क्रीडा बहु-निकष निर्णय मॉडेलद्वारे तयार केलेली शेतकरी जोखीम सूची.",
    "filterLabel": "जोखीम पातळीनुसार निवडा:",
    "filterAll": "सर्व जोखीम पातळी",
    "filterHigh": "उच्च जोखीम (स्कोअर ≥ ६०)",
    "filterMed": "मध्यम जोखीम (स्कोअर ३०-५९)",
    "filterLow": "कमी जोखीम (स्कोअर < ३०)",
    "thDistressScore": "एफडीआय संकट स्कोअर",
    "thCropStage": "पीक व अवस्था",
    "thTopTrigger": "मुख्य संकट कारण",
    "thContactChannel": "संपर्क माध्यम",
    "thRecommendedScheme": "प्राधान्य शासकीय योजना",
    "modalBreakdownTitle": "क्रीडा ६-घटक स्कोअर विश्लेषण",
    "modalExplanationsTitle": "सोप्या भाषेतील संपूर्ण माहिती",
    "modalReachabilityTitle": "शेतकरी संपर्क व संवाद साधने",
    "modalLandTitle": "जमीन व माती तपशील",
    "modalFragilityTitle": "जिल्हा पायाभूत संवेदनशीलता",
    "modalInterventionsTitle": "सुरक्षा कवच व दिलासा योजना",
    "modalListenBriefing": "माहिती ऐका 🔊",
    "modalCloseBtn": "बंद करा",
    "simBadge": "टेलिफोनी सिम्युलेटर",
    "simTitle": "आयव्हीआर कॉल व एसएमएस एमुलेटर",
    "simSub": "साध्या कीपॅड फोनवर स्वयंचलित कॉल व एसएमएसद्वारे सल्ला देण्याची यंत्रणा.",
    "ivrHeaderTitle": "इंटरएक्टिव्ह व्हॉईस रिस्पॉन्स (IVR) सिम्युलेटर",
    "ivrSpeakPrompt": "बोला / किसान मित्राला विचारा",
    "pressKeypad": "कीपॅड दाबा",
    "keyAdvisory": "१: पीक सल्ला",
    "keyMandi": "२: बाजार भाव",
    "keySchemes": "३: शासकीय योजना",
    "keyOfficer": "९: अधिकाऱ्याशी बोला",
    "ivrRestartCall": "कॉल पुन्हा सुरू करा",
    "smsEmulatorTitle": "एसएमएस सूचना एमुलेटर",
    "smsEmulatorSub": "सर्व ६ प्रादेशिक भाषांमध्ये स्वयंचलित एसएमएस पाठवण्याची सुविधा.",
    "sendTestSms": "गेटवे द्वारे एसएमएस पाठवा",
    "simDesignNoteTitle": "क्रीडा व्हॉईस व एसएमएस तांत्रिक तपशील:",
    "simDesignNote1": "• डीटीएमएफ कीपॅड द्वारे साध्या फोनवर इंटरनेटशिवाय सहज वापर.",
    "simDesignNote2": "• कॉलमध्ये ३० सेकंदांच्या सुटसुटीत व सोप्या वाक्यांचा वापर.",
    "simDesignNote3": "• भारतीय भाषांसाठी युनिकोड (UCS-2) एन्कोडिंग व स्वयंचलित सेगमेंट गणना.",
    "recommendedActionLabel": "शिफारस केलेले बाजार पाऊल:",
    "contingencyBoxTitle": "ICAR-CRIDA शिफारस केलेली आपत्कालीन पर्यायी पिके:",
    "voiceBtnText": "संपूर्ण सल्ला आवाजात ऐका 🔊"
  },
  "or": {
    "appTitle": "ସ୍ମାର୍ଟ କୃଷି • PS-02",
    "cropAdvisory": "ଫସଲ ପରାମର୍ଶ",
    "mandiPrice": "📈 ମଣ୍ଡି ଦର",
    "myAlerts": "🔔 ସତର୍କତା ଓ ସୂଚନା",
    "govtSchemes": "🛡️ ସରକାରୀ ସୁରକ୍ଷା କବଚ",
    "accessMode": "ବ୍ୟବହାର ମୋଡ୍",
    "assistedMode": "ସହାୟତା ମୋଡ୍ (କିଷାନ ମିତ୍ର / CSC)",
    "selfService": "ସ୍ୱୟଂ ସେବା (ଚାଷୀ ମୋଡ୍)",
    "language": "ଭାଷା:",
    "quickLangSwitch": "ଭାଷା ବାଛନ୍ତୁ:",
    "tapToListen": "ଶୁଣିବା ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ 🔊",
    "tapToListenShort": "ଶୁଣିବା ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ 🔊",
    "playing": "ଅଡିଓ ଚାଲୁଅଛି…",
    "whyNeedLabel": "📌 ଆପଣଙ୍କୁ ଏହା କାହିଁକି ଦରକାର:",
    "howHelpsLabel": "✨ ଏଥିରୁ ଆପଣଙ୍କୁ କି ଲାଭ ମିଳିବ:",
    "listenSchemeCard": "ଶୁଣିବା ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ 🔊",
    "officialPortal": "ସରକାରୀ ପୋର୍ଟାଲ୍ ↗",
    "tabForYou": "🌟 ଆପଣଙ୍କ ପାଇଁ",
    "tabFinance": "💳 ଆର୍ଥିକ ଓ ଋଣ ସହାୟତା",
    "tabCropManagement": "ଫସଲ ପରିଚାଳନା",
    "tabDisaster": "🛡️ ବିପର୍ଯ୍ୟୟ ଓ ରିହାତି",
    "CRITICAL": "ଜରୁରୀ",
    "HIGH": "ଉଚ୍ଚ ସତର୍କତା",
    "MEDIUM": "ମଧ୍ୟମ",
    "LOW": "ସ୍ୱାଭାବିକ",
    "cropAdvisorySub": "ପାଣିପାଗ ଓ ଫସଲ ଯତ୍ନ",
    "mandiPriceSub": "ମଣ୍ଡି ଦର ବନାମ ସରକାରୀ ଏମଏସପି",
    "myAlertsSub": "ବର୍ଷା ଓ ଋଣ ସୂଚନା",
    "govtSchemesSub": "ଫସଲ ବୀମା, କେସିସି ଓ ରିହାତି ଯୋଜନା",
    "weatherContextTitle": "ଜମିର ପାଣିପାଗ ଓ ମାଟିର ସ୍ଥିତି",
    "listenAllWeather": "ପାଣିପାଗ ଓ ମାଟି ସୂଚନା ଶୁଣନ୍ତୁ 🔊",
    "rainDevLabel": "ବର୍ଷା ଅଭାବ",
    "drySpellLabel": "ଶୁଖିଲା ପାଗ ଅବଧି",
    "monsoonOnsetLabel": "ମୌସୁମୀ ଆଗମନ",
    "soilTypeLabel": "ମାଟିର ପ୍ରକାର",
    "mandiBadge": "ଏପିଏମସି ମଣ୍ଡି ନିରୀକ୍ଷଣ",
    "mandiMainTitle": "ମଣ୍ଡି ଦର ବନାମ ସରକାରୀ ଏମଏସପି (MSP)",
    "listenMandi": "ମଣ୍ଡି ଦର ଶୁଣନ୍ତୁ 🔊",
    "todayMandiLabel": "ଆଜିର ମଣ୍ଡି ଦର",
    "perQuintalLabel": "କ୍ୱିଣ୍ଟାଲ ପିଛା",
    "govFloorPrice": "ସରକାରୀ ସର୍ବନିମ୍ନ ସହାୟକ ମୂଲ୍ୟ",
    "govMspLabel": "ସରକାରୀ ଏମଏସପି (MSP)",
    "guaranteedMspLabel": "କ୍ୱିଣ୍ଟାଲ ପିଛା (ନିଶ୍ଚିତ ସହାୟତା)",
    "recActionTitle": "ପରାମର୍ଶିତ ବଜାର ପଦକ୍ଷେପ:",
    "alertsBadge": "ସୂଚନା ଓ ଚେତାବନୀ",
    "alertsMainTitle": "ଆପଣଙ୍କ ଜମି ପାଇଁ ସକ୍ରିୟ ସତର୍କତା",
    "listenAllAlerts": "ସମସ୍ତ ସତର୍କତା ଶୁଣନ୍ତୁ 🔊",
    "schemesBadge": "ସରକାରୀ ସୁରକ୍ଷା କବଚ",
    "schemesMainTitle": "ଆପଣଙ୍କ ପାଇଁ ଉପଯୁକ୍ତ ସରକାରୀ ଯୋଜନା",
    "listenAllSchemes": "ସମସ୍ତ ଯୋଜନା ଶୁଣନ୍ତୁ 🔊",
    "officerBadge": "ପ୍ରଶାସନ ଓ କୃଷି ବିସ୍ତାର ପୋର୍ଟାଲ୍",
    "officerMainTitle": "ଜିଲ୍ଲା କୃଷି ସଙ୍କଟ ନିରୀକ୍ଷଣ ଓ ସହାୟତା",
    "officerMainSub": "ବ୍ଲକ କୃଷି ଅଧିକାରୀଙ୍କ ପାଇଁ ଆଇସିଏଆର-କ୍ରିଡା ପୂର୍ବ-ସୂଚନା ଡ୍ୟାସବୋର୍ଡ।",
    "playOfficerBriefing": "ଜିଲ୍ଲା ବିବରଣୀ ଶୁଣନ୍ତୁ",
    "metricTotal": "ମୋଟ ନିରୀକ୍ଷଣ ଅଧୀନ",
    "metricTotalSub": "୩ଟି କୃଷି ଜିଲ୍ଲାରେ",
    "metricHigh": "ଉଚ୍ଚ ବିପଦ ଆଲର୍ଟ",
    "metricHighSub": "ତୁରନ୍ତ ସହାୟତା ଆବଶ୍ୟକ",
    "metricMed": "ମଧ୍ୟମ ବିପଦ",
    "metricMedSub": "ନିରୀକ୍ଷଣ ଅଧୀନରେ",
    "metricLow": "କମ୍ ବିପଦ",
    "metricLowSub": "ସ୍ଥିର କୃଷି ପରିସ୍ଥିତି",
    "calibratorTitle": "କ୍ରିଡା ଏଫଡିଆଇ ଭାରାଙ୍କ ନିୟନ୍ତ୍ରଣ — ୬ଟି ଦିଗ",
    "calibratorSub": "ସଙ୍କଟ ସ୍କୋର ପୁନଃଗଣନା ପାଇଁ ୬ଟି ଦିଗର ଭାରାଙ୍କ ଆବଶ୍ୟକ ଅନୁସାରେ ପରିବର୍ତ୍ତନ କରନ୍ତୁ।",
    "resetDefaults": "କ୍ରିଡା ମୂଳ ମାନ ରିସେଟ୍ କରନ୍ତୁ",
    "sliderExposure": "ସଙ୍କଟ ବିପଦ (E):",
    "sliderExposureSub": "ବର୍ଷା ଅଭାବ, ତାପମାତ୍ରା ପରିବର୍ତ୍ତନ ଓ ଦର ହ୍ରାସ ଜନିତ ସଙ୍କଟ",
    "sliderSensitivity": "ଜଳସେଚନ ସମ୍ବେଦନଶୀଳତା (S):",
    "sliderSensitivitySub": "ଅଣଜଳସେଚିତ ଜମି ଓ ମାଟିର ଆର୍ଦ୍ରତା ଅଭାବ",
    "sliderAC": "ଅନୁକୂଳନ କ୍ଷମତା (AC - ଓଲଟା):",
    "sliderACSub": "କ୍ଷୁଦ୍ର ଚାଷୀ, ଅଣକୃଷି ଆୟର ଅଭାବ ଓ ସମ୍ପତ୍ତି ସୁରକ୍ଷା",
    "sliderMitigation": "ସୁରକ୍ଷା ଅଭାବ (M):",
    "sliderMitigationSub": "ଫସଲ ବୀମା ଓ କିଷାନ କ୍ରେଡିଟ୍ କାର୍ଡ (KCC) ର ଅନୁପଲବ୍ଧତା",
    "sliderTrigger": "ଆର୍ଥିକ ଧକ୍କା (T):",
    "sliderTriggerSub": "ଋଣ ପରିଶୋଧର ସମୟସୀମା ଓ ମହାଜନଙ୍କ ଉପରେ ନିର୍ଭରଶୀଳତା",
    "sliderDF": "ଜିଲ୍ଲା ସମ୍ବେଦନଶୀଳତା (DF):",
    "sliderDFSub": "ଐତିହାସିକ ମରୁଡ଼ି ସୂଚକାଙ୍କ ଓ ଭୂତଳ ଜଳସ୍ତର",
    "registryTitle": "ପ୍ରତ୍ୟକ୍ଷ ଚାଷୀ ସଙ୍କଟ ତାଲିକା",
    "registrySub": "କ୍ରିଡା ମଲ୍ଟି-କ୍ରାଇଟେରିଆ ମଡେଲ୍ ଦ୍ୱାରା ପ୍ରସ୍ତୁତ ବିପଦ ତାଲିକା।",
    "filterLabel": "ବିପଦ ସ୍ତର ଅନୁସାରେ ବାଛନ୍ତୁ:",
    "filterAll": "ସମସ୍ତ ବିପଦ ସ୍ତର",
    "filterHigh": "ଉଚ୍ଚ ବିପଦ (ସ୍କୋର ≥ ୬୦)",
    "filterMed": "ମଧ୍ୟମ ବିପଦ (ସ୍କୋର ୩୦-୫୯)",
    "filterLow": "କମ୍ ବିପଦ (ସ୍କୋର < ୩୦)",
    "thDistressScore": "ଏଫଡିଆଇ ସଙ୍କଟ ସ୍କୋର",
    "thCropStage": "ଫସଲ ଓ ଅବସ୍ଥା",
    "thTopTrigger": "ମୁଖ୍ୟ ସଙ୍କଟ କାରଣ",
    "thContactChannel": "ଯୋଗାଯୋଗ ମାଧ୍ୟମ",
    "thRecommendedScheme": "ପ୍ରାଥମିକ ସରକାରୀ ଯୋଜନା",
    "modalBreakdownTitle": "କ୍ରିଡା ୬-ଦିଗ ସ୍କୋର ବିବରଣୀ",
    "modalExplanationsTitle": "ସରଳ ଭାଷାରେ ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା",
    "modalReachabilityTitle": "ଚାଷୀ ଯୋଗାଯୋଗ ସାଧନ",
    "modalLandTitle": "ଜମି ଓ ମାଟି ବିବରଣୀ",
    "modalFragilityTitle": "ଜିଲ୍ଲା ଭିତ୍ତିଭୂମି ସ୍ଥିତି",
    "modalInterventionsTitle": "ସୁରକ୍ଷା କବଚ ଓ ସହାୟତା ଯୋଜନା",
    "modalListenBriefing": "ବିବରଣୀ ଶୁଣନ୍ତୁ 🔊",
    "modalCloseBtn": "ବନ୍ଦ କରନ୍ତୁ",
    "simBadge": "ଟେଲିଫୋନି ସିମ୍ୟୁଲେଟର",
    "simTitle": "ଆଇଭିଆର କଲ୍ ଓ ଏସଏମଏସ ଏମୁଲେଟର",
    "simSub": "ସାଧାରଣ କିପ୍ୟାଡ୍ ଫୋନରେ ସ୍ୱୟଂଚାଳିତ କଲ୍ ଓ ଏସଏମଏସ ଦ୍ୱାରା ପରାମର୍ଶ ପ୍ରଦାନ।",
    "ivrHeaderTitle": "ଇଣ୍ଟରାକ୍ଟିଭ୍ ଭଏସ୍ ରେସପନ୍ସ (IVR) ସିମ୍ୟୁଲେଟର",
    "ivrSpeakPrompt": "କୁହନ୍ତୁ / କୃଷି ମିତ୍ରଙ୍କୁ ପଚାରନ୍ତୁ",
    "pressKeypad": "କିପ୍ୟାଡ୍ ଦବାନ୍ତୁ",
    "keyAdvisory": "୧: ଫସଲ ପରାମର୍ଶ",
    "keyMandi": "୨: ମଣ୍ଡି ଦର",
    "keySchemes": "୩: ସରକାରୀ ଯୋଜନା",
    "keyOfficer": "୯: ଅଧିକାରୀଙ୍କ ସହ କଥା ହୁଅନ୍ତୁ",
    "ivrRestartCall": "କଲ୍ ପୁନରାରମ୍ଭ କରନ୍ତୁ",
    "smsEmulatorTitle": "ଏସଏମଏସ ସୂଚନା ଏମୁଲେଟର",
    "smsEmulatorSub": "ସମସ୍ତ ୬ଟି ଆଞ୍ଚଳିକ ଭାଷାରେ ଏସଏମଏସ ପଠାଇବା ସୁବିଧା।",
    "sendTestSms": "ଗେଟୱେ ମାଧ୍ୟମରେ ଏସଏମଏସ ପଠାନ୍ତୁ",
    "simDesignNoteTitle": "କ୍ରିଡା ଭଏସ୍ ଓ ଏସଏମଏସ ବୈଷୟିକ ବିବରଣୀ:",
    "simDesignNote1": "• ଡିଟିଏମଏଫ୍ କିପ୍ୟାଡ୍ ଦ୍ୱାରା ବିନା ଇଣ୍ଟରନେଟରେ ସହଜ ବ୍ୟବହାର।",
    "simDesignNote2": "• କଲ୍ ରେ ୩୦ ସେକେଣ୍ଡର ଛୋଟ ଓ ସରଳ ବାକ୍ୟର ପ୍ରୟୋଗ।",
    "simDesignNote3": "• ଭାରତୀୟ ଭାଷା ପାଇଁ ୟୁନିକୋଡ୍ (UCS-2) ଏନକୋଡିଂ ଓ ସ୍ୱୟଂଚାଳିତ ଗଣନା।",
    "recommendedActionLabel": "ପରାମର୍ଶିତ ବଜାର ପଦକ୍ଷେପ:",
    "contingencyBoxTitle": "ICAR-CRIDA ପରାମର୍ଶିତ ଜରୁରୀକାଳୀନ ବିକଳ୍ପ ଫସଲ:",
    "voiceBtnText": "ସମ୍ପୂର୍ଣ୍ଣ ପରାମର୍ଶ ଶୁଣନ୍ତୁ 🔊"
  },
  "as": {
    "appTitle": "স্মাৰ্ট কৃষি • PS-02",
    "cropAdvisory": "শস্য পৰামৰ্শ",
    "mandiPrice": "📈 বজাৰ দৰ",
    "myAlerts": "🔔 সতৰ্কবাণী",
    "govtSchemes": "🛡️ চৰকাৰী সুৰক্ষা কৱচ",
    "accessMode": "ব্যৱহাৰ মোড",
    "assistedMode": "সহায়তাপ্রাপ্ত মোড (কৃষি মিত্ৰ / CSC)",
    "selfService": "স্বয়ং সেৱা (কৃষক মোড)",
    "language": "ভাষা:",
    "quickLangSwitch": "ভাষা বাছক:",
    "tapToListen": "শুনMessage বাবে টিপক 🔊",
    "tapToListenShort": "শুনMessage বাবে টিপক 🔊",
    "playing": "অডিঅ' চলি আছে…",
    "whyNeedLabel": "📌 আপোনাৰ কিয় প্ৰয়োজন:",
    "howHelpsLabel": "✨ ইয়াৰ দ্বাৰা কি লাভ হ’ব:",
    "listenSchemeCard": "শুনMessage বাবে টিপক 🔊",
    "officialPortal": "চৰকাৰী পৰ্টেল ↗",
    "tabForYou": "🌟 আপোনাৰ বাবে",
    "tabFinance": "💳 বিত্তীয় আৰু ঋণ সাহায্য",
    "tabCropManagement": "শস্য ব্যৱস্থাপনা",
    "tabDisaster": "🛡️ দুৰ্যোগ আৰু সাহায্য",
    "CRITICAL": "অতি গুৰুত্বপূৰ্ণ",
    "HIGH": "উচ্চ সতৰ্কবাণী",
    "MEDIUM": "মধ্যম",
    "LOW": "স্বাভাৱিক",
    "cropAdvisorySub": "বতৰ আৰু শস্যৰ যত্ন",
    "mandiPriceSub": "বজাৰ মূল্য বনাম চৰকাৰী সমৰ্থন মূল্য",
    "myAlertsSub": "বৰষুণ আৰু ঋণৰ জাননী",
    "govtSchemesSub": "শস্য বীমা, KCC আৰু সাহায্য আঁচনি",
    "weatherContextTitle": "পথাৰৰ বতৰ আৰু মাটিৰ অৱস্থা",
    "listenAllWeather": "বতৰ আৰু মাটিৰ তথ্য শুনক 🔊",
    "rainDevLabel": "বৰষুণৰ নাটনি",
    "drySpellLabel": "খৰাং অৱধি",
    "monsoonOnsetLabel": "মৌচুমী আগমন",
    "soilTypeLabel": "মাটিৰ প্ৰকাৰ",
    "mandiBadge": "APMC বজাৰ নিৰীক্ষণ",
    "mandiMainTitle": "বজাৰ দৰ বনাম চৰকাৰী সমৰ্থন মূল্য (MSP)",
    "listenMandi": "বজাৰ দৰ শুনক 🔊",
    "todayMandiLabel": "আজিৰ বজাৰ মূল্য",
    "perQuintalLabel": "প্ৰতি কুইন্টলত",
    "govFloorPrice": "চৰকাৰী ন্যূনতম নিৰ্ধাৰিত মূল্য",
    "govMspLabel": "চৰকাৰী সমৰ্থন মূল্য (MSP)",
    "guaranteedMspLabel": "প্ৰতি কুইন্টলত (নিৰাপদ সমৰ্থন)",
    "recActionTitle": "পৰামৰ্শিত বজাৰ ব্যৱস্থা:",
    "alertsBadge": "জাননী আৰু সতৰ্কবাণী",
    "alertsMainTitle": "আপোনাৰ খেতিৰ বাবে সক্ৰিয় সতৰ্কবাৰ্তা",
    "listenAllAlerts": "সকলো সতৰ্কবাৰ্তা শুনক 🔊",
    "schemesBadge": "চৰকাৰী সুৰক্ষা কৱচ",
    "schemesMainTitle": "আপোনাৰ বাবে উপযুক্ত চৰকাৰী আঁচনিসমূহ",
    "listenAllSchemes": "সকলো আঁচনি শুনক 🔊",
    "officerBadge": "প্ৰশাসন আৰু কৃষি সম্প্ৰসাৰণ পৰ্টেল",
    "officerMainTitle": "জিলা কৃষি সংকট নিৰীক্ষণ আৰু ব্যৱস্থা",
    "officerMainSub": "খণ্ড কৃষি বিষয়া আৰু কৰ্মীসকলৰ বাবে ICAR-CRIDA আগতীয়া জাননী ডেছব’ৰ্ড।",
    "playOfficerBriefing": "জিলা প্ৰতিবেদন শুনক",
    "metricTotal": "মুঠ নিৰীক্ষণধীন",
    "metricTotalSub": "৩ খন কৃষি জিলাত",
    "metricHigh": "উচ্চ বিপদ সতৰ্কবাৰ্তা",
    "metricHighSub": "তাৎক্ষণিক ব্যৱস্থা প্ৰয়োজন",
    "metricMed": "মধ্যম বিপদ",
    "metricMedSub": "নিৰীক্ষণৰ অধীনত",
    "metricLow": "কম বিপদ",
    "metricLowSub": "স্বাভাৱিক অৱস্থা",
    "calibratorTitle": "CRIDA FDI গুৰুত্ব মান সমাযোজন — ৬ টা দিশ",
    "calibratorSub": "সংকট স্কোৰ পুনৰ গণনাৰ বাবে ৬ টা দিশৰ গুৰুত্ব মান প্ৰয়োজন অনুসৰি সলনি কৰক।",
    "resetDefaults": "CRIDA মূল মান পুনৰ সংস্থাপন কৰক",
    "sliderExposure": "সংকট বিপদ (E):",
    "sliderExposureSub": "বৰষুণ নাটনি, উষ্ণতাৰ পৰিৱৰ্তন আৰু দৰ হ্ৰাসজনিত সংকট",
    "sliderSensitivity": "জলসিঞ্চন সংবেদনশীলতা (S):",
    "sliderSensitivitySub": "অসিঞ্চিত মাটি আৰু মাটিৰ আৰ্দ্ৰতাৰ অভাৱ",
    "sliderAC": "অভিযোজন ক্ষমতা (AC - বিপৰীত):",
    "sliderACSub": "ক্ষুদ্ৰ কৃষক, অকৃষি আয়ৰ নাটনি আৰু সম্পদ",
    "sliderMitigation": "সুৰক্ষাৰ অভাৱ (M):",
    "sliderMitigationSub": "শস্য বীমা আৰু কিষাণ ক্ৰেডিট কাৰ্ড (KCC) ৰ অনুপস্থিতি",
    "sliderTrigger": "বিত্তীয় সংকট (T):",
    "sliderTriggerSub": "ঋণ পৰিশোধৰ সময়সীমা আৰু মহাজনৰ ওপৰত নিৰ্ভৰশীলতা",
    "sliderDF": "জিলা সংবেদনশীলতা (DF):",
    "sliderDFSub": "ঐতিহাসিক খৰাং সূচকাংক আৰু ভূগৰ্ভস্থ জলস্তৰ",
    "registryTitle": "প্ৰত্যক্ষ কৃষক সংকট পঞ্জীয়ন বহী",
    "registrySub": "CRIDA মাল্টি-ক্ৰাইটেৰিয়া মডেলৰ দ্বাৰা প্ৰস্তুত সংকট তালিকা।",
    "filterLabel": "বিপদৰ মাত্ৰা অনুসৰি বাছক:",
    "filterAll": "সকলো বিপদৰ মাত্ৰা",
    "filterHigh": "উচ্চ বিপদ (স্কোৰ ≥ ৬০)",
    "filterMed": "মধ্যম বিপদ (স্কোৰ ৩০-৫৯)",
    "filterLow": "কম বিপদ (স্কোৰ < ৩০)",
    "thDistressScore": "FDI সংকট স্কোৰ",
    "thCropStage": "শস্য আৰু অৱস্থা",
    "thTopTrigger": "প্ৰধান সংকটৰ কাৰণ",
    "thContactChannel": "যোগাযোগৰ মাধ্যম",
    "thRecommendedScheme": "প্ৰাথমিক চৰকাৰী আঁচনি",
    "modalBreakdownTitle": "CRIDA ৬-দিশ স্কোৰ বিশ্লেষণ",
    "modalExplanationsTitle": "সহজ ভাষাত সম্পূৰ্ণ বিৱৰণ",
    "modalReachabilityTitle": "কৃষক যোগাযোগৰ মাধ্যম",
    "modalLandTitle": "মাটি আৰু শস্যৰ তথ্য",
    "modalFragilityTitle": "জিলা ভিত্তিমূলক অৱস্থা",
    "modalInterventionsTitle": "সুৰক্ষা কৱচ আৰু সাহায্য আঁচনি",
    "modalListenBriefing": "বিৱৰণ শুনক 🔊",
    "modalCloseBtn": "বন্ধ কৰক",
    "simBadge": "টেলিফোনি ছিমুলেটৰ",
    "simTitle": "IVR কল আৰু SMS এমুলেটৰ",
    "simSub": "সাধাৰণ কীপেড ফোনত স্বয়ংক্ৰিয় কল আৰু SMS ৰ জৰিয়তে পৰামৰ্শ প্ৰদান।",
    "ivrHeaderTitle": "ইণ্টাৰেক্টিভ ভয়েচ ৰেচপন্স (IVR) ছিমুলেটৰ",
    "ivrSpeakPrompt": "কওক / কৃষি মিত্ৰক সোধক",
    "pressKeypad": "কীপ্যাড টিপক",
    "keyAdvisory": "১: শস্য পৰামৰ্শ",
    "keyMandi": "২: বজাৰ দৰ",
    "keySchemes": "৩: চৰকাৰী আঁচনি",
    "keyOfficer": "৯: বিষয়াৰ সৈতে কথা পাতক",
    "ivrRestartCall": "কল পুনৰ আৰম্ভ কৰক",
    "smsEmulatorTitle": "SMS জাননী এমুলেটৰ",
    "smsEmulatorSub": "সকলো ৬ টা আঞ্চলিক ভাষাত SMS প্ৰেৰণ ব্যৱস্থা।",
    "sendTestSms": "গেটৱেৰ জৰিয়তে SMS প্ৰেৰণ কৰক",
    "simDesignNoteTitle": "CRIDA ভয়েচ আৰু SMS কাৰিকৰী বিৱৰণ:",
    "simDesignNote1": "• DTMF কীপ্যাডৰ জৰিয়তে সাধাৰণ ফোনত ইণ্টাৰনেটবিহীন ব্যৱহাৰ।",
    "simDesignNote2": "• কলত ৩০ ছেকেণ্ডৰ সৰল আৰু স্পষ্ট বাক্যৰ প্ৰয়োগ।",
    "simDesignNote3": "• ভাৰতীয় ভাষাৰ বাবে ইউনিক’ড (UCS-2) এনক’ডিং আৰু স্বয়ংক্ৰিয় গণনা।",
    "recommendedActionLabel": "পৰামৰ্শিত বজাৰ ব্যৱস্থা:",
    "contingencyBoxTitle": "ICAR-CRIDA পৰামৰ্শিত বিকল্প শস্য তালিকা:",
    "voiceBtnText": "সম্পূৰ্ণ পৰামৰ্শ শুনক 🔊"
  },
  "kn": {
    "appTitle": "ಸ್ಮಾರ್ಟ್ ಕೃಷಿ • PS-02",
    "cropAdvisory": "ಬೆಳೆ ಸಲಹೆ",
    "mandiPrice": "📈 ಮಾರುಕಟ್ಟೆ ದರ",
    "myAlerts": "🔔 ಎಚ್ಚರಿಕೆಗಳು",
    "govtSchemes": "🛡️ ಸರ್ಕಾರಿ ಸುರಕ್ಷತಾ ಕವಚ",
    "accessMode": "ಬಳಕೆ ವಿಧಾನ",
    "assistedMode": "ಸಹಾಯಿತ ಮೋಡ್ (ಕಿಸಾನ್ ಮಿತ್ರ / CSC)",
    "selfService": "ಸ್ವಯಂ ಸೇವೆ (ರೈತ ಮೋಡ್)",
    "language": "ಭಾಷೆ:",
    "quickLangSwitch": "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ:",
    "tapToListen": "ಕೇಳಲು ಟ್ಯಾಪ್ ಮಾಡಿ 🔊",
    "tapToListenShort": "ಕೇಳಲು ಟ್ಯಾಪ್ ಮಾಡಿ 🔊",
    "playing": "ಆಡಿಯೋ ಚಾಲನೆಯಲ್ಲಿದೆ…",
    "whyNeedLabel": "📌 ನಿಮಗೆ ಇದು ಏಕೆ ಬೇಕು:",
    "howHelpsLabel": "✨ ಇದರಿಂದ ನಿಮಗೆ ಏನು ಪ್ರಯೋಜನ:",
    "listenSchemeCard": "ಕೇಳಲು ಟ್ಯಾಪ್ ಮಾಡಿ 🔊",
    "officialPortal": "ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್ ↗",
    "tabForYou": "🌟 ನಿಮಗಾಗಿ",
    "tabFinance": "💳 ಹಣಕಾಸು ಮತ್ತು ಸಾಲ ನೆರವು",
    "tabCropManagement": "ಬೆಳೆ ನಿರ್ವಹಣೆ",
    "tabDisaster": "🛡️ ವಿಪತ್ತು ಮತ್ತು ಪರಿಹಾರ",
    "CRITICAL": "ತುರ್ತು",
    "HIGH": "ಹೆಚ್ಚಿನ ಗಮನ",
    "MEDIUM": "ಮಧ್ಯಮ",
    "LOW": "ಸಾಮಾನ್ಯ",
    "cropAdvisorySub": "ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ಪೋಷಣೆ",
    "mandiPriceSub": "ಮಾರುಕಟ್ಟೆ ದರ ಮತ್ತು ಬೆಂಬಲ ಬೆಲೆ",
    "myAlertsSub": "ಮಳೆ ಮತ್ತು ಸಾಲ ಮರುಪಾವತಿ ಸೂಚನೆಗಳು",
    "govtSchemesSub": "ಬೆಳೆ ವಿಮೆ, ಕೆಸಿಸಿ ಮತ್ತು ಪರಿಹಾರ ಯೋಜನೆಗಳು",
    "weatherContextTitle": "ಜಮೀನಿನ ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣಿನ ಸ್ಥಿತಿ",
    "listenAllWeather": "ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣಿನ ಮಾಹಿತಿ ಕೇಳಿ 🔊",
    "rainDevLabel": "ಮಳೆ ಕೊರತೆ",
    "drySpellLabel": "ಒಣ ಹವೆ ಅವಧಿ",
    "monsoonOnsetLabel": "ಮುಂಗಾರು ಆಗಮನ",
    "soilTypeLabel": "ಮಣ್ಣಿನ ಪ್ರಕಾರ",
    "mandiBadge": "ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ ಕಣ್ಗಾವಲು",
    "mandiMainTitle": "ಮಾರುಕಟ್ಟೆ ದರ ಮತ್ತು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ (MSP)",
    "listenMandi": "ಮಾರುಕಟ್ಟೆ ದರ ಕೇಳಿ 🔊",
    "todayMandiLabel": "ಇಂದಿನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ",
    "perQuintalLabel": "ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ",
    "govFloorPrice": "ಸರ್ಕಾರಿ ಕನಿಷ್ಠ ಬೆಂಬಲ ಬೆಲೆ",
    "govMspLabel": "ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ (MSP)",
    "guaranteedMspLabel": "ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ (ಖಾತರಿ ಮಾನದಂಡ)",
    "recActionTitle": "ಶಿಫಾರಸು ಮಾಡಲಾದ ಮಾರುಕಟ್ಟೆ ಕ್ರಮ:",
    "alertsBadge": "ಸೂಚನೆಗಳು ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳು",
    "alertsMainTitle": "ನಿಮ್ಮ ಜಮೀನಿಗೆ ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು",
    "listenAllAlerts": "ಎಲ್ಲಾ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಕೇಳಿ 🔊",
    "schemesBadge": "ಸರ್ಕಾರಿ ಸುರಕ್ಷತಾ ಕವಚ",
    "schemesMainTitle": "ನಿಮ್ಮ ಬೆಳೆ ಸ್ಥಿತಿಗೆ ಸೂಕ್ತವಾದ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
    "listenAllSchemes": "ಎಲ್ಲಾ ಯೋಜನೆಗಳನ್ನು ಕೇಳಿ 🔊",
    "officerBadge": "ಆಡಳಿತ ಮತ್ತು ವಿಸ್ತರಣಾ ಪೋರ್ಟಲ್",
    "officerMainTitle": "ಜಿಲ್ಲಾ ಕೃಷಿ ಸಂಕಷ್ಟ ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ಕ್ರಮಗಳು",
    "officerMainSub": "ತಾಲೂಕು ಕೃಷಿ ಅಧಿಕಾರಿಗಳಿಗೆ ಐಸಿಎಆರ್-ಕ್ರೀಡಾ ಮುನ್ನೆಚ್ಚರಿಕೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್.",
    "playOfficerBriefing": "ಜಿಲ್ಲಾ ವರದಿ ಕೇಳಿ",
    "metricTotal": "ಒಟ್ಟು ನೋಂದಾಯಿತ",
    "metricTotalSub": "೩ ಕೃಷಿ ಜಿಲ್ಲೆಗಳಲ್ಲಿ",
    "metricHigh": "ಹೆಚ್ಚಿನ ಅಪಾಯದ ಎಚ್ಚರಿಕೆ",
    "metricHighSub": "ತಕ್ಷಣದ ನೆರವು ಅಗತ್ಯ",
    "metricMed": "ಮಧ್ಯಮ ಅಪಾಯ",
    "metricMedSub": "ಮೇಲ್ವಿಚಾರಣೆಯಲ್ಲಿದೆ",
    "metricLow": "ಕಡಿಮೆ ಅಪಾಯ",
    "metricLowSub": "ಸ್ಥಿರ ಪರಿಸ್ಥಿತಿ",
    "calibratorTitle": "ಕ್ರೀಡಾ ಎಫ್‌ಡಿಐ ತೂಕ ಮಾಪನಾಂಕ ನಿರ್ಣಯ — ೬ ಅಂಶಗಳು",
    "calibratorSub": "ಸಂಕಷ್ಟ ಸ್ಕೋರ್ ಮರು ಲೆಕ್ಕಾಚಾರಕ್ಕಾಗಿ ೬ ಅಂಶಗಳ ತೂಕವನ್ನು ಅಗತ್ಯಕ್ಕೆ ತಕ್ಕಂತೆ ಬದಲಾಯಿಸಿ.",
    "resetDefaults": "ಕ್ರೀಡಾ ಮೂಲ ಮಾನ ಮರುಹೊಂದಿಸಿ",
    "sliderExposure": "ಸಂಕಷ್ಟ ಅಪಾಯ (E):",
    "sliderExposureSub": "ಮಳೆ ಕೊರತೆ, ತಾಪಮಾನ ವ್ಯತ್ಯಾಸ ಮತ್ತು ಬೆಲೆ ಕುಸಿತದ ಅಪಾಯ",
    "sliderSensitivity": "ನೀರಾವರಿ ಸೂಕ್ಷ್ಮತೆ (S):",
    "sliderSensitivitySub": "ಮಳೆಯಾಶ್ರಿತ ಭೂಮಿ ಮತ್ತು ಮಣ್ಣಿನ ತೇವಾಂಶದ ಕೊರತೆ",
    "sliderAC": "ಹೊಂದಿಕೊಳ್ಳುವ ಸಾಮರ್ಥ್ಯ (AC - ವಿರುದ್ಧ):",
    "sliderACSub": "ಸಣ್ಣ ರೈತರು, ಕೃಷಿಯೇತರ ಆದಾಯದ ಕೊರತೆ ಮತ್ತು ಆಸ್ತಿ",
    "sliderMitigation": "ಸುರಕ್ಷತೆಯ ಕೊರತೆ (M):",
    "sliderMitigationSub": "ಬೆಳೆ ವಿಮೆ ಮತ್ತು ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC) ಕೊರತೆ",
    "sliderTrigger": "ಆರ್ಥಿಕ ಆಘಾತ (T):",
    "sliderTriggerSub": "ಸಾಲ ಮರುಪಾವತಿ ಗಡುವು ಮತ್ತು ಖಾಸಗಿ ಲೇವಾದೇವಿದಾರರ ಮೇಲಿನ ಅವಲಂಬನೆ",
    "sliderDF": "ಜಿಲ್ಲಾ ಸೂಕ್ಷ್ಮತೆ (DF):",
    "sliderDFSub": "ಐತಿಹಾಸಿಕ ಬರ ಸೂಚ್ಯಂಕ ಮತ್ತು ಅಂತರ್ಜಲ ಮಟ್ಟ",
    "registryTitle": "ಪ್ರತ್ಯಕ್ಷ ರೈತರ ಸಂಕಷ್ಟ ಅಪಾಯ ನೋಂದಣಿ",
    "registrySub": "ಕ್ರೀಡಾ ಬಹು-ಮಾನದಂಡ ನಿರ್ಧಾರ ಮಾದರಿಯ ಮೂಲಕ ಸಿದ್ಧಪಡಿಸಲಾದ ಅಪಾಯದ ಪಟ್ಟಿ.",
    "filterLabel": "ಅಪಾಯದ ಮಟ್ಟಕ್ಕೆ ಅನುಗುಣವಾಗಿ ಆಯ್ಕೆಮಾಡಿ:",
    "filterAll": "ಎಲ್ಲಾ ಅಪಾಯದ ಮಟ್ಟಗಳು",
    "filterHigh": "ಹೆಚ್ಚಿನ ಅಪಾಯ (ಸ್ಕೋರ್ ≥ ೬೦)",
    "filterMed": "ಮಧ್ಯಮ ಅಪಾಯ (ಸ್ಕೋರ್ ೩೦-೫೯)",
    "filterLow": "ಕಡಿಮೆ ಅಪಾಯ (ಸ್ಕೋರ್ < ೩೦)",
    "thDistressScore": "ಎಫ್‌ಡಿಐ ಸಂಕಷ್ಟ ಸ್ಕೋರ್",
    "thCropStage": "ಬೆಳೆ ಮತ್ತು ಹಂತ",
    "thTopTrigger": "ಮುಖ್ಯ ಸಂಕಷ್ಟ ಕಾರಣ",
    "thContactChannel": "ಸಂಪರ್ಕ ಮಾಧ್ಯಮ",
    "thRecommendedScheme": "ಆದ್ಯತೆಯ ಸರ್ಕಾರಿ ಯೋಜನೆ",
    "modalBreakdownTitle": "ಕ್ರೀಡಾ ೬-ಅಂಶ ಸ್ಕೋರ್ ವಿವರಣೆ",
    "modalExplanationsTitle": "ಸರಳ ಭಾಷೆಯಲ್ಲಿ ಸಂಪೂರ್ಣ ವಿವರಣೆ",
    "modalReachabilityTitle": "ರೈತ ಸಂಪರ್ಕ ಮಾಧ್ಯಮಗಳು",
    "modalLandTitle": "ಭೂಮಿ ಮತ್ತು ಮಣ್ಣಿನ ವಿವರ",
    "modalFragilityTitle": "ಜಿಲ್ಲಾ ಮೂಲಸೌಕರ್ಯ ಸ್ಥಿತಿ",
    "modalInterventionsTitle": "ಸುರಕ್ಷತಾ ಕವಚ ಮತ್ತು ಪರಿಹಾರ ಯೋಜನೆಗಳು",
    "modalListenBriefing": "ವಿವರಣೆ ಕೇಳಿ 🔊",
    "modalCloseBtn": "ಮುಚ್ಚಿ",
    "simBadge": "ಟೆಲಿಫೋನಿ ಸಿಮ್ಯುಲೇಟರ್",
    "simTitle": "ಐವಿಆರ್ ಕರೆ ಮತ್ತು ಎಸ್‌ಎಂಎಸ್ ಎಮ್ಯುಲೇಟರ್",
    "simSub": "ಸಾಮಾನ್ಯ ಕೀಪ್ಯಾಡ್ ಫೋನ್‌ಗಳಲ್ಲಿ ಸ್ವಯಂಚಾಲಿತ ಕರೆ ಮತ್ತು ಎಸ್‌ಎಂಎಸ್ ಮೂಲಕ ಸಲಹೆ ನೀಡುವ ವ್ಯವಸ್ಥೆ.",
    "ivrHeaderTitle": "ಇಂಟರ್ಯಾಕ್ಟಿವ್ ವಾಯ್ಸ್ ರೆಸ್ಪಾನ್ಸ್ (IVR) ಸಿಮ್ಯುಲೇಟರ್",
    "ivrSpeakPrompt": "ಮಾತನಾಡಿ / ಕಿಸಾನ್ ಮಿತ್ರರನ್ನು ಕೇಳಿ",
    "pressKeypad": "ಕೀಪ್ಯಾಡ್ ಒತ್ತಿ",
    "keyAdvisory": "೧: ಬೆಳೆ ಸಲಹೆ",
    "keyMandi": "೨: ಮಾರುಕಟ್ಟೆ ದರ",
    "keySchemes": "೩: ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
    "keyOfficer": "೯: ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಮಾತನಾಡಿ",
    "ivrRestartCall": "ಕರೆಯನ್ನು ಮರುಪ್ರಾರಂಭಿಸಿ",
    "smsEmulatorTitle": "ಎಸ್‌ಎಂಎಸ್ ಸೂಚನಾ ಎಮ್ಯುಲೇಟರ್",
    "smsEmulatorSub": "ಎಲ್ಲಾ ೬ ಪ್ರಾದೇಶಿಕ ಭಾಷೆಗಳಲ್ಲಿ ಎಸ್‌ಎಂಎಸ್ ಕಳುಹಿಸುವ ವ್ಯವಸ್ಥೆ.",
    "sendTestSms": "ಗೇಟ್‌ವೇ ಮೂಲಕ ಎಸ್‌ಎಂಎಸ್ ಕಳುಹಿಸಿ",
    "simDesignNoteTitle": "ಕ್ರೀಡಾ ವಾಯ್ಸ್ ಮತ್ತು ಎಸ್‌ಎಂಎಸ್ ತಾಂತ್ರಿಕ ವಿವರ:",
    "simDesignNote1": "• ಡಿಟಿಎಂಎಫ್ ಕೀಪ್ಯಾಡ್ ಮೂಲಕ ಸಾಮಾನ್ಯ ಫೋನ್‌ನಲ್ಲಿ ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆ ಸುಲಭ ಬಳಕೆ.",
    "simDesignNote2": "• ಕರೆಯಲ್ಲಿ ೩೦ ಸೆಕೆಂಡ್‌ಗಳ ಸರಳ ಮತ್ತು ಸ್ಪಷ್ಟ ವಾಕ್ಯಗಳ ಬಳಕೆ.",
    "simDesignNote3": "• ಭಾರತೀಯ ಭಾಷೆಗಳಿಗಾಗಿ ಯುನಿಕೋಡ್ (UCS-2) ಎನ್‌ಕೋಡಿಂಗ್ ಮತ್ತು ಸ್ವಯಂಚಾಲಿತ ಲೆಕ್ಕಾಚಾರ.",
    "recommendedActionLabel": "ಶಿಫಾರಸು ಮಾಡಲಾದ ಮಾರುಕಟ್ಟೆ ಕ್ರಮ:",
    "contingencyBoxTitle": "ICAR-CRIDA ಶಿಫಾರಸು ಮಾಡಿದ ಪರ್ಯಾಯ ಬೆಳೆಗಳು:",
    "voiceBtnText": "ಸಂಪೂರ್ಣ ಸಲಹೆಯನ್ನು ಆಲಿಸಿ 🔊"
  }
};

// ─── MASTER LOCALIZATION DICTIONARIES & HELPER FUNCTIONS ───

const CROP_NAMES_I18N = {
  onion: { en: 'Onion', hi: 'प्याज', mr: 'कांदा', or: 'ପିଆଜ', as: 'পিয়াঁজ', kn: 'ಈರುಳ್ಳಿ' },
  cotton: { en: 'Cotton', hi: 'कपास', mr: 'कापूस', or: 'କପା', as: 'কপাহ', kn: 'ಹತ್ತಿ' },
  soybean: { en: 'Soybean', hi: 'सोयाबीन', mr: 'सोयाबीन', or: 'ସୋୟାବିନ୍', as: 'চয়াবিন', kn: 'ಸೋಯಾಬೀನ್' },
  rice: { en: 'Paddy (Rice)', hi: 'धान (चावल)', mr: 'भात (धान)', or: 'ଧାନ', as: 'ধান', kn: 'ಭತ್ತ (ಅಕ್ಕಿ)' },
  paddy: { en: 'Paddy (Rice)', hi: 'धान (चावल)', mr: 'भात (धान)', or: 'ଧାନ', as: 'ধান', kn: 'ಭತ್ತ (ಅಕ್ಕಿ)' },
  maize: { en: 'Maize (Corn)', hi: 'मक्का', mr: 'मका', or: 'ମକା', as: 'মাকৈ', kn: 'ಮೆಕ್ಕೆಜೋಳ' },
  bajra: { en: 'Pearl Millet (Bajra)', hi: 'बाजरा', mr: 'बाजरी', or: 'ବାଜରା', as: 'বজৰা', kn: 'ಸಜ್ಜೆ' },
  pigeonpea: { en: 'Pigeonpea (Arhar)', hi: 'अरहर (तुअर)', mr: 'तूर', or: 'ହରଡ଼', as: 'অৰহৰ', kn: 'ತೊಗರಿ' },
  arhar: { en: 'Pigeonpea (Arhar)', hi: 'अरहर (तुअर)', mr: 'तूर', or: 'ହରଡ଼', as: 'অৰহৰ', kn: 'ತೊಗರಿ' },
  tur: { en: 'Pigeonpea (Arhar)', hi: 'अरहर (तुअर)', mr: 'तूर', or: 'ହରଡ଼', as: 'অৰহৰ', kn: 'ತೊಗರಿ' },
  pulses: { en: 'Pulses (Early-Maturing)', hi: 'कम अवधि वाली दलहन', mr: 'कमी कालावधीची कडधान्ये', or: 'ଡାଲି ଜାତୀୟ ଫସଲ', as: 'মাহজাতীয় শস্য', kn: 'ದ್ವಿದಳ ಧಾನ್ಯಗಳು' }
};

const STAGE_NAMES_I18N = {
  vegetative: { en: 'Vegetative Growth', hi: 'वानस्पतिक बढ़वार', mr: 'शाकीय वाढ अवस्था', or: 'ଗଛ ବୃଦ୍ଧି ଅବସ୍ଥା', as: 'বৃদ্ধিৰ অৱস্থা', kn: 'ಸಸ್ಯ ಬೆಳವಣಿಗೆ ಹಂತ' },
  sowing: { en: 'Sowing / Germination', hi: 'बुवाई / अंकुरण', mr: 'पेरणी / उगवण अवस्था', or: 'ବୁଣା / ଗଜା ଅବସ୍ଥା', as: 'সিঁচনৰ অৱস্থা', kn: 'ಬಿತ್ತನೆ / ಮೊಳಕೆಯೊಡೆಯುವ ಹಂತ' },
  flowering: { en: 'Flowering Stage', hi: 'फूल आने की अवस्था', mr: 'फुलोरा अवस्था', or: 'ଫୁଲ ଫୁଟିବା ଅବସ୍ଥା', as: 'ফুল ফুলাৰ অৱস্থা', kn: 'ಹೂವಾಡುವ ಹಂತ' },
  maturity: { en: 'Pod / Grain Maturity', hi: 'दाना भराव व परिपक्वता', mr: 'दाणे भरणे व पक्वता', or: 'ଦାନା ପରିପକ୍ୱତା', as: 'শস্য পকাৰ অৱস্থা', kn: 'ಕಾಳು ಮಾಗುವ ಹಂತ' },
  harvest: { en: 'Harvest Stage', hi: 'कटाई की अवस्था', mr: 'कापणीची अवस्था', or: 'ଅମଳ ଅବସ୍ଥା', as: 'চপোৱাৰ অৱস্থা', kn: 'ಕೊಯ್ಲು ಹಂತ' }
};

const SOIL_NAMES_I18N = {
  black: { en: 'Black Cotton Soil (Regur)', hi: 'काली कपास मिट्टी (रेगुर)', mr: 'काळी कसदार जमीन (रेगूर)', or: 'କଳା କପା ମାଟି (ରେଗୁର)', as: 'কলা কপাহী মাটি', kn: 'ಕಪ್ಪು ಹತ್ತಿ ಮಣ್ಣು' },
  'black cotton': { en: 'Black Cotton Soil (Regur)', hi: 'काली कपास मिट्टी (रेगुर)', mr: 'काळी कसदार जमीन (रेगूर)', or: 'କଳା କପା ମାଟି (ରେଗୁର)', as: 'কলা কপাহী মাটি', kn: 'ಕಪ್ಪು ಹತ್ತಿ ಮಣ್ಣು' },
  alluvial: { en: 'Alluvial Loam Soil', hi: 'जलोढ़ दोमट मिट्टी', mr: 'गाळाची सुपीक जमीन', or: 'ପଟୁ ମାଟି', as: 'পলি মাটি', kn: 'ಮೆಕ್ಕಲು ಮಣ್ಣು' },
  red: { en: 'Red Sandy Loam Soil', hi: 'लाल रेतीली मिट्टी', mr: 'तांबडी वालुकामय जमीन', or: 'ନାଲି ବାଲିଆ ମାଟି', as: 'ৰঙা বালিয়া মাটি', kn: 'ಕೆಂಪು ಮರಳು ಮಿಶ್ರಿತ ಮಣ್ಣು' },
  laterite: { en: 'Laterite Clay Soil', hi: 'लैटेराइट चिकनी मिट्टी', mr: 'जांभी चिकणमाती', or: 'ଲେଟେରାଇଟ୍ ମାଟି', as: 'লেটেৰাইট মাটি', kn: 'ಲ್ಯಾಟರೈಟ್ ಜೇಡಿ ಮಣ್ಣು' },
  sandy: { en: 'Arid Desert / Sandy Soil', hi: 'बलुई / मरुस्थलीय मिट्टी', mr: 'वाळवंटी / रेताड जमीन', or: 'ବାଲିଆ ମାଟି', as: 'বালিচহীয়া মাটি', kn: 'ಮರಳು ಭೂಮಿ' },
  saline: { en: 'Saline & Alkaline Soil', hi: 'लवणीय एवं क्षारीय मिट्टी', mr: 'खारवट व चोपण जमीन', or: 'ଲୁଣି ମାଟି', as: 'লৱণাক্ত মাটি', kn: 'ಉಪ್ಪು ಮಿಶ್ರಿತ ಮಣ್ಣು' },
  peaty: { en: 'Peaty / Marshy Organic Soil', hi: 'दलदली / जैविक मिट्टी', mr: 'दलदलीची सेंद्रिय जमीन', or: 'ଜୈବିକ ମାଟି', as: 'জৈৱিক মাটি', kn: 'ಜೌಗು ಸಾವಯವ ಮಣ್ಣು' },
  loamy: { en: 'Fertile Medium Loam Soil', hi: 'उर्वर मध्यम दोमट मिट्टी', mr: 'सुपीक मध्यम पोयटा जमीन', or: 'ଉର୍ବର ଦୋରସା ମାଟି', as: 'উৰ্বৰ পলসুৱা মাটি', kn: 'ಫಲವತ್ತಾದ ಗೋಡು ಮಣ್ಣು' }
};

const MARKET_NAMES_I18N = {
  'lasalgaon apmc': { en: 'Lasalgaon APMC', hi: 'लासलगांव एपीएमसी मंडी', mr: 'लासलगाव कृषी उत्पन्न बाजार समिती', or: 'ଲାସଲଗାଓଁ ଏପିଏମସି ମଣ୍ଡି', as: 'লাছালগাঁও APMC বজাৰ', kn: 'ಲಾಸಲಗಾಂವ್ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ' },
  'lasalgaon mandi': { en: 'Lasalgaon Mandi', hi: 'लासलगांव मंडी', mr: 'लासलगाव बाजार समिती', or: 'ଲାସଲଗାଓଁ ମଣ୍ଡି', as: 'লাছালগাঁও বজাৰ', kn: 'ಲಾಸಲಗಾಂವ್ ಮಾರುಕಟ್ಟೆ' },
  'akola apmc': { en: 'Akola APMC', hi: 'अकोला एपीएमसी मंडी', mr: 'अकोला कृषी उत्पन्न बाजार समिती', or: 'ଆକୋଲା ଏପିଏମସି ମଣ୍ଡି', as: 'আকোলা APMC বজাৰ', kn: 'ಅಕೋಲಾ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ' },
  'anantapur apmc': { en: 'Anantapur APMC', hi: 'अनंतपुर एपीएमसी मंडी', mr: 'अनंतपूर कृषी उत्पन्न बाजार समिती', or: 'ଅନନ୍ତପୁର ଏପିଏମସି ମଣ୍ଡି', as: 'অনন্তপুৰ APMC বজাৰ', kn: 'ಅನಂತಪುರ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ' }
};

function getLocalizedCrop(crop, lang) {
  const k = (crop || '').toLowerCase().trim();
  return CROP_NAMES_I18N[k]?.[lang] || CROP_NAMES_I18N[k]?.['en'] || crop || 'Crop';
}

function getLocalizedStage(stage, lang) {
  const k = (stage || '').toLowerCase().trim();
  return STAGE_NAMES_I18N[k]?.[lang] || STAGE_NAMES_I18N[k]?.['en'] || stage || 'Stage';
}

function getLocalizedSoil(soil, lang) {
  const k = (soil || '').toLowerCase().trim();
  return SOIL_NAMES_I18N[k]?.[lang] || SOIL_NAMES_I18N[k]?.['en'] || soil || 'Soil';
}

function getLocalizedMarket(market, lang) {
  const k = (market || '').toLowerCase().trim();
  return MARKET_NAMES_I18N[k]?.[lang] || MARKET_NAMES_I18N[k]?.['en'] || market || 'APMC Mandi';
}


// ─── HIGH-PERFORMANCE INSTANT AUDIO & ATOMIC PLAYBACK ENGINE ───

const audioBlobCache = new Map();
let activeAudioSessionId = 0;
let activeAudioAbortController = null;
const allActiveAudios = new Set();

/**
 * Non-blocking background audio pre-fetcher.
 * Downloads and prepares audio into memory before the user even clicks the button!
 */
async function prefetchAudio(textToSpeak, langCode) {
  if (!textToSpeak || typeof textToSpeak !== 'string') return;
  const lang = langCode || state.selectedLanguage || 'en';
  const cacheKey = `${lang}:${textToSpeak.trim()}`;
  
  if (audioBlobCache.has(cacheKey)) return;

  try {
    const audioUrl = `${API_BASE}/tts?text=${encodeURIComponent(textToSpeak)}&lang=${encodeURIComponent(lang)}`;
    const res = await fetch(audioUrl);
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioBlobCache.set(cacheKey, blobUrl);
    }
  } catch (e) {
    // Silent prefetch fallback
  }
}

/**
 * Stop ALL active audio instances, speech utterances, and in-flight fetch requests.
 */
function stopSpeech() {
  // 1. Invalidate active session ID so in-flight async tasks immediately abort
  activeAudioSessionId++;

  // 2. Abort any in-flight HTTP fetch requests
  if (activeAudioAbortController) {
    try {
      activeAudioAbortController.abort();
    } catch (e) {}
    activeAudioAbortController = null;
  }

  // 3. Stop and purge all active Audio elements
  allActiveAudios.forEach(audio => {
    try {
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    } catch (e) {}
  });
  allActiveAudios.clear();

  if (state.currentAudio) {
    try {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
      state.currentAudio.src = '';
    } catch (e) {}
    state.currentAudio = null;
  }

  // 4. Cancel any native speech synthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  state.isSpeaking = false;
  state.currentAudioTrigger = null;
  updateVoiceButtonUI(false);
  document.querySelectorAll('.tts-listen-btn').forEach(b => b.classList.remove('tts-playing'));
}

/**
 * Ultra-responsive atomic speech player with ZERO possibility of overlapping audio.
 */
async function speakText(textToSpeak, langCode, triggerKey) {
  if (!textToSpeak || typeof textToSpeak !== 'string') return;

  const lang = langCode || state.selectedLanguage || 'en';
  const t = i18n[lang] || i18n['en'];
  const key = triggerKey || textToSpeak.slice(0, 40);

  // If user tapped the EXACT same button that is currently playing -> toggle off
  if (state.isSpeaking && state.currentAudioTrigger === key) {
    stopSpeech();
    return;
  }

  // 1. Atomically kill everything playing right now
  stopSpeech();

  // 2. Mint a new session token for this unique playback request
  const thisSessionId = ++activeAudioSessionId;
  const abortController = new AbortController();
  activeAudioAbortController = abortController;

  state.isSpeaking = true;
  state.currentAudioTrigger = key;
  updateVoiceButtonUI(true);
  showTTSToast(t.playing || 'Playing audio…');

  const cacheKey = `${lang}:${textToSpeak.trim()}`;

  try {
    let playUrl = audioBlobCache.get(cacheKey);

    if (!playUrl) {
      const audioUrl = `${API_BASE}/tts?text=${encodeURIComponent(textToSpeak)}&lang=${encodeURIComponent(lang)}`;
      const res = await fetch(audioUrl, { signal: abortController.signal });
      if (!res.ok) throw new Error(`TTS server returned ${res.status}`);
      const blob = await res.blob();

      // Check if session was superseded while fetching
      if (thisSessionId !== activeAudioSessionId) return;

      playUrl = URL.createObjectURL(blob);
      audioBlobCache.set(cacheKey, playUrl);
    }

    // Check again before playing
    if (thisSessionId !== activeAudioSessionId) return;

    const audio = new Audio(playUrl);
    allActiveAudios.add(audio);
    state.currentAudio = audio;

    audio.onended = () => {
      if (thisSessionId === activeAudioSessionId) {
        stopSpeech();
      }
    };

    audio.onerror = (err) => {
      console.warn('Audio playback error:', err);
      if (thisSessionId === activeAudioSessionId) {
        stopSpeech();
      }
    };

    await audio.play();

    // Check if another sound was started while play() was resolving
    if (thisSessionId !== activeAudioSessionId) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      allActiveAudios.delete(audio);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Audio playback exception:', err);
    }
    if (thisSessionId === activeAudioSessionId) {
      stopSpeech();
    }
  }
}

function updateVoiceButtonUI(playing) {
  const btn = document.getElementById('btn-play-voice');
  if (!btn) return;
  if (playing) {
    btn.classList.add('bg-purple-700', 'ring-2', 'ring-purple-400', 'animate-pulse');
  } else {
    btn.classList.remove('bg-purple-700', 'ring-2', 'ring-purple-400', 'animate-pulse');
  }
}

function showTTSToast(msg) {
  let toast = document.getElementById('tts-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'tts-toast';
    toast.className = 'fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 pointer-events-none transition-all duration-200 transform translate-y-10 opacity-0';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>🔊</span><span>${msg}</span>`;
  toast.classList.remove('translate-y-10', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  if (window._ttsToastTimer) clearTimeout(window._ttsToastTimer);
  window._ttsToastTimer = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-10', 'opacity-0');
  }, 2200);
}


async function playButtonAudio(buttonKey, event) {
  if (event) event.stopPropagation();

  const lang = state.selectedLanguage || 'en';
  const t    = i18n[lang] || i18n['en'];

  const textMap = {
    cropAdvisory: {
      en: 'Crop Advisory: Personalized weather stress guidance, soil profile analysis, and contingency crop management.',
      hi: 'फसल सलाह: मौसम संकट मार्गदर्शन, मिट्टी विश्लेषण एवं आकस्मिक फसल प्रबंधन।',
      mr: 'पीक सल्ला: हवामान संकट मार्गदर्शन, माती परीक्षण आणि आपत्कालीन पीक व्यवस्थापन.',
      or: 'ଫସଲ ପରାମର୍ଶ: ପାଣିପାଗ ସଙ୍କଟ ମାର୍ଗଦର୍ଶନ, ମାଟି ପରୀକ୍ଷା ଏବଂ ଆପତକାଳୀନ ଫସଲ ପରିଚାଳନା।',
      as: 'শস্য পৰামৰ্শ: বতৰৰ সংকট নিৰ্দেশনা, মাটিৰ গুণাগুণ আৰু জৰুৰীকালীন শস্য ব্যৱস্থাপনা।',
      kn: 'ಬೆಳೆ ಸಲಹೆ: ಹವಾಮಾನ ಸಂಕಷ್ಟ ಮಾರ್ಗದರ್ಶನ, ಮಣ್ಣಿನ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ತುರ್ತು ಬೆಳೆ ನಿರ್ವಹಣೆ.'
    },
    mandiPrice: {
      en: 'APMC Mandi Prices: Real-time market rates and Minimum Support Price MSP price-gap intelligence.',
      hi: 'मंडी भाव: वास्तविक बाजार दर एवं सरकारी समर्थन मूल्य MSP अंतर विश्लेषण।',
      mr: 'बाजार भाव: थेट बाजार भाव आणि शासकीय हमीभाव फरक विश्लेषण.',
      or: 'ମଣ୍ଡି ଦର: ବାସ୍ତବ ବଜାର ଦର ଏବଂ ସରକାରୀ ସର୍ବନିମ୍ନ ସହାୟକ ମୂଲ୍ୟ MSP ବିଶ୍ଳେଷଣ।',
      as: 'বজাৰ দৰ: প্ৰকৃত বজাৰ মূল্য আৰু চৰকাৰী সমৰ্থন মূল্য MSP विश्लेषण।',
      kn: 'ಮಾರುಕಟ್ಟೆ ದರ: ನೈಜ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಮತ್ತು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ MSP ವಿಶ್ಲೇಷಣೆ.'
    },
    myAlerts: {
      en: 'My Alerts: Real-time crop distress early warnings, weather alerts, and financial reminders.',
      hi: 'अलर्ट एवं सूचनाएं: संकट पूर्व-चेतावनी, मौसम अलर्ट एवं वित्तीय सूचनाएं।',
      mr: 'महत्त्वाचे इशारे: पीक संकट पूर्व-सूचना, हवामान इशारे आणि आर्थिक स्मरणपत्रे.',
      or: 'ସତର୍କତା ଓ ସୂଚନା: ଫସଲ ସଙ୍କଟ ପୂର୍ବ-ଚେତାବନୀ, ପାଣିପାଗ ସତର୍କତା ଏବଂ ଆର୍ଥିକ ସୂଚନା।',
      as: 'সতৰ্কবাণী: শস্য সংকট আগতীয়া জাননী, বতৰৰ সতৰ୍କবাৰ্তা আৰু বিত্তীয় তথ্য।',
      kn: 'ಎಚ್ಚರಿಕೆಗಳು: ಬೆಳೆ ಸಂಕಷ್ಟ ಮುನ್ನೆಚ್ಚರಿಕೆ ಸಂದೇಶಗಳು, ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ ಮತ್ತು ಆರ್ಥಿಕ ನೆನಪಿಸುವಿಕೆ.'
    },
    govtSchemes: {
      en: 'Government Safety Net: Subsidized relief schemes, KCC debt restructuring, PMFBY insurance, and input grants.',
      hi: 'सरकारी सुरक्षा कवच: राहत योजनाएं, केसीसी ऋण पुनर्गठन, फसल बीमा एवं सरकारी अनुदान।',
      mr: 'शासकीय सुरक्षा कवच: दिलासा योजना, केसीसी कर्ज पुनर्रचना, पीक विमा आणि शासकीय अनुदान.',
      or: 'ସରକାରୀ ସୁରକ୍ଷା କବଚ: ସହାୟତା ଯୋଜନା, କେସିସି ଋଣ ପୁନର୍ଗଠନ, ଫସଲ ବୀମା ଏବଂ ସରକାରୀ ସବସିଡି।',
      as: 'চৰকাৰী সুৰক্ষা কৱচ: সাহায্য আঁচনি, KCC ঋণ পুনৰ্গঠন, শস্য বীমা আৰু চৰকাৰী ৰাজসাহায্য।',
      kn: 'ಸರ್ಕಾರಿ ಸುರಕ್ಷತಾ ಕವಚ: ಪರಿಹಾರ ಯೋಜನೆಗಳು, ಕೆಸಿಸಿ ಸಾಲ ಮರುಹೊಂದಾಣಿಕೆ, ಬೆಳೆ ವಿಮೆ ಮತ್ತು ಸರ್ಕಾರಿ ಸಬ್ಸಿಡಿಗಳು.'
    }
  };

  let textToSpeak = '';
  if (textMap[buttonKey]) {
    textToSpeak = textMap[buttonKey][lang] || textMap[buttonKey]['en'];
  } else if (t[buttonKey]) {
    textToSpeak = t[buttonKey];
  } else {
    textToSpeak = buttonKey;
  }

  if (event) {
    const btn = event.currentTarget || event.target.closest('.tts-listen-btn');
    if (btn) {
      document.querySelectorAll('.tts-listen-btn').forEach(b => b.classList.remove('tts-playing'));
      btn.classList.add('tts-playing');
    }
  }

  await speakText(textToSpeak, lang, `btn-${buttonKey}`);
}

// ─── INITIALIZATION & EVENT LISTENERS ───

document.addEventListener('DOMContentLoaded', async () => {
  initLanguageSelector();
  initIvrSimulator();
  await Promise.all([
    loadFarmersList(),
    fetchOfficerData()
  ]);
});

function initLanguageSelector() {
  const select = document.getElementById('lang-select');
  if (!select) return;
  const currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || state.selectedLanguage || 'en';
  state.selectedLanguage = currentLang;
  select.value = currentLang;
}

async function loadFarmersList() {
  try {
    const res = await fetch(`${API_BASE}/farmers`);
    state.farmers = await res.json();

    // Prioritize active authenticated farmer if logged in
    const authUser = window.AuthService && window.AuthService.getUser();
    if (authUser && authUser.id) {
      const match = state.farmers.find(f => f.id === authUser.id);
      if (match) {
        state.selectedFarmerId = match.id;
      }
    }

    const farmerSelect = document.getElementById('farmer-select');
    if (farmerSelect) {
      farmerSelect.innerHTML = '';
      state.farmers.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        const cropDisplay = f.crop ? f.crop.toUpperCase() : 'CROP';
        const locDisplay = f.village || f.district_id || '';
        opt.textContent = locDisplay ? `${f.name} — ${cropDisplay} (${locDisplay})` : `${f.name} — ${cropDisplay}`;
        if (f.id === state.selectedFarmerId) opt.selected = true;
        farmerSelect.appendChild(opt);
      });
    }

    if (state.farmers.length > 0) {
      const targetId = state.selectedFarmerId || state.farmers[0].id;
      await selectFarmer(targetId);
    }
  } catch (err) {
    console.error('Failed to load farmers list:', err);
  }
}

// ─── VIEW & TAB SWITCHING ───

function switchMainView(viewName) {
  state.activeView = viewName;
  stopSpeech();

  const views = ['farmer', 'officer', 'simulator', 'sandbox'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const btn = document.getElementById(`nav-${v}-btn`);
    if (el) {
      if (v === viewName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
    if (btn) {
      if (v === viewName) {
        btn.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all bg-sky-600 text-white shadow";
      } else {
        btn.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all text-slate-300 hover:text-white hover:bg-slate-700";
      }
    }
  });

  if (viewName === 'officer') {
    fetchOfficerData();
  } else if (viewName === 'sandbox') {
    runSandboxEvaluation();
  }
}

function setFarmerAccessMode(mode) {
  state.farmerAccessMode = mode;
}

function showFarmerTab(tabName) {
  state.activeFarmerTab = tabName;
  stopSpeech();

  const tabs = ['advisory', 'mandi', 'alerts', 'schemes'];
  tabs.forEach(t => {
    const el = document.getElementById(`farmer-tab-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (el) {
      if (t === tabName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tabName) {
        btn.classList.add('ring-4', 'ring-emerald-500/30', 'border-sky-600');
      } else {
        btn.classList.remove('ring-4', 'ring-emerald-500/30', 'border-sky-600');
      }
    }
  });

  if (tabName === 'mandi') renderFarmerMandiPrice();
  if (tabName === 'alerts') renderFarmerAlerts();
  if (tabName === 'schemes') renderFarmerSchemes();
}

async function onFarmerSelected(farmerId) {
  await selectFarmer(farmerId);
}

async function onLanguageChanged(lang) {
  if (!lang) return;
  const effectiveLang = lang.split('-')[0].toLowerCase();
  state.selectedLanguage = effectiveLang;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('sk_locale', effectiveLang);
  }

  if (window.AuthService && typeof window.AuthService.getUser === 'function') {
    const user = window.AuthService.getUser();
    if (user) {
      user.preferred_language = effectiveLang;
      if (typeof window.AuthService.setUser === 'function') {
        window.AuthService.setUser(user);
      }
    }
  }

  stopSpeech();
  applyI18n();

  const langSelect = document.getElementById('lang-select');
  if (langSelect) langSelect.value = effectiveLang;

  const simIvrSelect = document.getElementById('sim-ivr-lang-select');
  if (simIvrSelect) simIvrSelect.value = effectiveLang;
  state.ivrLanguage = effectiveLang;

  try {
    await Promise.all([
      renderFarmerProfileCard(),
      renderFarmerAdvisory(),
      renderFarmerMandiPrice(),
      renderFarmerAlerts(),
      renderFarmerSchemes(),
      renderOfficerMetrics(),
      renderOfficerTable(),
      startIvrCall(null, effectiveLang)
    ]);
  } catch (err) {
    console.warn('Language change re-render warning:', err);
  }
}

async function selectFarmer(farmerId) {
  state.selectedFarmerId = farmerId;

  // If farmers list not yet loaded or farmer not found, fetch dynamically
  if (!state.farmers || state.farmers.length === 0 || !state.farmers.find(f => f.id === farmerId)) {
    try {
      const res = await fetch(`${API_BASE}/farmers`);
      if (res.ok) {
        state.farmers = await res.json();
      }
    } catch (e) {
      console.warn('Could not refresh farmers list:', e);
    }
  }

  let farmer = state.farmers && state.farmers.find(f => f.id === farmerId);
  if (!farmer && state.farmers && state.farmers.length > 0) {
    farmer = state.farmers[0];
    state.selectedFarmerId = farmer.id;
  }
  if (!farmer) return;

  state.currentFarmer = farmer;

  // Sync Logged-In Farmer Badge
  const loggedInBadgeName = document.getElementById('farmer-logged-in-name');
  if (loggedInBadgeName) {
    loggedInBadgeName.textContent = farmer.name;
  }

  if (farmer.default_ui_mode) {
    setFarmerAccessMode(farmer.default_ui_mode);
  }

  // Strictly preserve active user chosen language
  const userChosenLang = (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || state.selectedLanguage || 'en';
  state.selectedLanguage = userChosenLang;

  const langSelect = document.getElementById('lang-select');
  if (langSelect) langSelect.value = state.selectedLanguage;
  applyI18n();

    const farmerSelect = document.getElementById('farmer-select');
  if (farmerSelect) farmerSelect.value = state.selectedFarmerId;

  const activeNameEl = document.getElementById('active-farmer-name-display');
  if (activeNameEl) activeNameEl.textContent = farmer.name;

  const activeMetaEl = document.getElementById('active-farmer-meta-display');
  if (activeMetaEl) activeMetaEl.textContent = `${farmer.crop} (${farmer.village || farmer.district_id})`;

  try {
    const [advRes, disRes] = await Promise.all([
      fetch(`${API_BASE}/farmers/${state.selectedFarmerId}/advisory`),
      fetch(`${API_BASE}/farmers/${state.selectedFarmerId}/distress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.weights)
      })
    ]);

    state.currentAdvisory = await advRes.json();
    state.currentDistress = await disRes.json();

    await Promise.all([
      renderFarmerProfileCard(),
      renderFarmerAdvisory(),
      renderFarmerMandiPrice(),
      renderFarmerAlerts(),
      renderFarmerSchemes()
    ]);

  } catch (err) {
    console.error('Error fetching farmer details:', err);
  }
}

function applyI18n() {
  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const t    = i18n[lang] || i18n['en'];

  const directMap = {
    'btn-text-advisory': t.cropAdvisory,
    'btn-text-mandi':    t.mandiPrice,
    'btn-text-alerts':   t.myAlerts,
    'btn-text-schemes':  t.govtSchemes,
    'label-access-mode': t.accessMode + ':',
  };
  Object.entries(directMap).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  document.querySelectorAll('.tts-listen-btn .tts-label').forEach(el => {
    el.textContent = t.tapToListen;
  });

  if (!state.isSpeaking) updateVoiceButtonUI(false);

  const scriptMap = {
    en: 'script-latin',
    hi: 'script-devanagari',
    mr: 'script-devanagari',
    or: 'script-odia',
    as: 'script-assamese',
    kn: 'script-kannada',
  };
  const allScripts = Object.values(scriptMap);
  document.body.classList.remove(...allScripts);
  document.body.classList.add(scriptMap[lang] || 'script-latin');
}

// ─── FARMER PROFILE & ADVISORY RENDERING ───

function formatDateToDDMMYYYY(dateStr) {
  if (!dateStr) return 'N/A';
  const ymd = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const day = ymd[3].padStart(2, '0');
    const month = ymd[2].padStart(2, '0');
    const year = ymd[1];
    return `${day}-${month}-${year}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}


async function renderFarmerProfileCard() {
  const f = state.currentFarmer;
  if (!f) return;

  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';

  // 100% Native Localized values
  const localizedCrop = getLocalizedCrop(f.crop, lang);
  
  const distNames = {
    D1: { en: 'Nashik', hi: 'नासिक', mr: 'नाशिक', or: 'ନାସିକ', as: 'নাছিক', kn: 'ನಾಸಿಕ್' },
    D2: { en: 'Akola', hi: 'अकोला', mr: 'अकोला', or: 'ଆକୋଲା', as: 'আকোলা', kn: 'ಅಕೋಲಾ' },
    D3: { en: 'Yavatmal', hi: 'यवतमाल', mr: 'यवतमाळ', or: 'ୟବତମାଳ', as: 'য়াৱাতমাল', kn: 'ಯವತ್ಮಾಳ್' },
    D_OD1: { en: 'Kalahandi', hi: 'कालाहांडी', mr: 'कालाहांडी', or: 'କଳାହାଣ୍ଡି', as: 'কালাহাণ্ডি', kn: 'ಕಲಹಂಡಿ' },
    D_OD2: { en: 'Balangir', hi: 'बलांगीर', mr: 'बलांगीर', or: 'ବଲାଙ୍ଗୀର', as: 'বলাঙ্গীৰ', kn: 'ಬಲಂಗೀರ್' },
    D_OD3: { en: 'Bargarh', hi: 'बरगढ़', mr: 'बरगड', or: 'ବରଗଡ଼', as: 'বৰগড়', kn: 'ಬರಗಢ' },
    D_AS1: { en: 'Nagaon', hi: 'नगांव', mr: 'नगाव', or: 'ନଗାଓଁ', as: 'নগাঁও', kn: 'ನಾಗಾಂವ್' },
    D_AS2: { en: 'Golaghat', hi: 'गोलाघाट', mr: 'गोलाघाट', or: 'ଗୋଲାଘାଟ', as: 'গোলাঘাট', kn: 'ಗೋಲಾಘಾಟ್' },
    D_AS3: { en: 'Barpeta', hi: 'बारपेटा', mr: 'बारपेटा', or: 'ବାରପେଟା', as: 'বৰপেটা', kn: 'ಬರ್ಪೇಟಾ' },
    D_KN1: { en: 'Raichur', hi: 'रायचूर', mr: 'रायचूर', or: 'ରାୟଚୁର', as: 'ৰায়চুৰ', kn: 'ರಾಯಚೂರು' },
    D_KN2: { en: 'Belagavi', hi: 'बेलगावी', mr: 'बेळगाव', or: 'ବେଲଗାଭୀ', as: 'বেলাগাভী', kn: 'ಬೆಳಗಾವಿ' },
    D_KN3: { en: 'Dharwad', hi: 'धारवाड़', mr: 'धारवाड', or: 'ଧାରୱାଡ଼', as: 'ধাৰৱাৰ', kn: 'ಧಾರವಾಡ' },
    D_UP1: { en: 'Varanasi', hi: 'वाराणसी', mr: 'वाराणसी', or: 'ବାରାଣସୀ', as: 'বাৰাণসী', kn: 'ವಾರಣಾಸಿ' },
    D_UP2: { en: 'Prayagraj', hi: 'प्रयागराज', mr: 'प्रयागराज', or: 'ପ୍ରୟାଗରାଜ', as: 'প্ৰয়াগৰাজ', kn: 'ಪ್ರಯಾಗ್‌ರಾಜ್' },
    D_UP3: { en: 'Gorakhpur', hi: 'गोरखपुर', mr: 'गोरखपूर', or: 'ଗୋରଖପୁର', as: 'গোৰখপুৰ', kn: 'ಗೋರಖ್‌ಪುರ' }
  };
  const dName = distNames[f.district_id]?.[lang] || f.district_name || f.district_id;
  const locationStr = f.village ? `${f.village}, ${dName}` : dName;

  const unitMap = { en: 'Hectares', hi: 'हेक्टेयर', mr: 'हेक्टर', or: 'ହେକ୍ଟର', as: 'হেক্টৰ', kn: 'ಹೆಕ್ಟೇರ್' };
  const loanDueMap = { en: 'Loan Due', hi: 'ऋण देय तिथि', mr: 'कर्ज मुदत', or: 'ଋଣ ଶେଷ ତାରିଖ', as: 'ঋণ পৰিশোধৰ তাৰিখ', kn: 'ಸಾಲ ಮರುಪಾವತಿ ದಿನಾಂಕ' };
  const vegLabelMap = { en: 'Vegetation:', hi: 'वनस्पति:', mr: 'वनस्पती:', or: 'ଉଦ୍ଭିଦ:', as: 'উদ্ভিদ:', kn: 'ಸಸ್ಯವರ್ಗ:' };

  const fpName = document.getElementById('fp-name');
  if (fpName) fpName.textContent = f.name;

  // 1) Below name: Vegetation:(crop name)
  const fpVegLabel = document.getElementById('fp-vegetation-label');
  if (fpVegLabel) fpVegLabel.textContent = vegLabelMap[lang] || 'Vegetation:';

  const fpCropBadge = document.getElementById('fp-crop-badge');
  if (fpCropBadge) fpCropBadge.textContent = localizedCrop;

  const fpLocation = document.getElementById('fp-location');
  if (fpLocation) fpLocation.textContent = `📍 ${locationStr}`;

  const fpLandholding = document.getElementById('fp-landholding');
  if (fpLandholding) fpLandholding.textContent = `📐 ${f.landholding_hectares || f.landholding_ha || '1.0'} ${unitMap[lang] || 'Hectares'}`;

  // 2) Date formatted strictly as DD-MM-YYYY
  const formattedLoanDate = formatDateToDDMMYYYY(f.loan_due_date || '2026-11-15');
  const fpLoan = document.getElementById('fp-loan');
  if (fpLoan) fpLoan.textContent = `💳 ${loanDueMap[lang] || 'Loan Due'}: ${formattedLoanDate}`;
}

async function renderFarmerAdvisory() {
  const adv = state.currentAdvisory;
  if (!adv) return;

  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const t = i18n[lang] || i18n['en'];

  // Title and Spoken text directly from backend multilingual advisory payload
  const title = (adv.title && adv.title[lang]) || (adv.title && adv.title['en']) || 'Crop Advisory';
  const text = (adv.text && adv.text[lang]) || (adv.text && adv.text['en']) || '';

  const titleEl = document.getElementById('advisory-title');
  if (titleEl) titleEl.textContent = title;

      // Format spoken advisory into short, clear, highly readable bullet points for farmers
  const spokenTextEl = document.getElementById('advisory-spoken-text');
  if (spokenTextEl) {
    if (!text || text.trim() === '') {
      spokenTextEl.innerHTML = '<p class="text-slate-500 font-medium">No active advisory notice for this farmer.</p>';
    } else {
      // Split on periods, newlines, or Devanagari danda
      const rawSentences = text
        .split(/(?:[।\n]|\.(?:\s|$))/)
        .map(s => s.trim())
        .filter(s => s.length > 2);

      const endChar = (lang === 'hi' || lang === 'mr') ? '।' : '.';
      if (rawSentences.length > 1) {
        const bulletsHtml = rawSentences.map(s => {
          const cleaned = s.replace(/[।\.]+$/, '').trim();
          return `
            <div class="flex items-start space-x-2.5 py-1">
              <span class="text-sky-600 font-black text-lg leading-none select-none mt-0.5">•</span>
              <span class="font-bold text-slate-900 leading-relaxed text-base sm:text-lg">${cleaned}${endChar}</span>
            </div>
          `;
        }).join('');
        spokenTextEl.innerHTML = `<div class="space-y-1.5">${bulletsHtml}</div>`;
      } else {
        spokenTextEl.innerHTML = `
          <div class="flex items-start space-x-2.5">
            <span class="text-sky-600 font-black text-lg leading-none select-none mt-0.5">•</span>
            <span class="font-bold text-slate-900 leading-relaxed text-base sm:text-lg">${text}</span>
          </div>
        `;
      }
    }
  }

  // 100% Native Advisory Badge
  const badge = document.getElementById('advisory-badge');
  if (badge) {
    const badgeMap = {
      market_intervention: {
        en: 'MARKET INTERVENTION (R-30)',
        hi: 'मंडी समर्थन हस्तक्षेप (R-30)',
        mr: 'बाजार भाव संरक्षण हस्तक्षेप (R-30)',
        or: 'ମଣ୍ଡି ସହାୟତା ପଦକ୍ଷେପ (R-30)',
        as: 'বজাৰ সুৰক্ষা ব্যৱস্থা (R-30)',
        kn: 'ಮಾರುಕಟ್ಟೆ ಬೆಂಬಲ ಕ್ರಮ (R-30)',
        css: 'bg-red-100 text-red-800'
      },
      contingency_crop_switch: {
        en: 'CRIDA CONTINGENCY SWITCH (R-10)',
        hi: 'क्रीडा आकस्मिक फसल बदलाव (R-10)',
        mr: 'क्रीडा आपत्कालीन पीक बदल (R-10)',
        or: 'କ୍ରିଡା ଜରୁରୀ ଫସଲ ପରିବର୍ତ୍ତନ (R-10)',
        as: 'ক্ৰিডা বিকল্প শস্য পৰামৰ্শ (R-10)',
        kn: 'ಕ್ರಿಡಾ ಪರ್ಯಾಯ ಬೆಳೆ ಯೋಜನೆ (R-10)',
        css: 'bg-amber-100 text-amber-800'
      },
      default: {
        en: 'AGRONOMY ADVISORY (R-20)',
        hi: 'सस्य वैज्ञानिक फसल सलाह (R-20)',
        mr: 'कृषी पीक संवर्धन सल्ला (R-20)',
        or: 'କୃଷି ଫସଲ ପରାମର୍ଶ (R-20)',
        as: 'কৃষি শস্য পৰামৰ্শ (R-20)',
        kn: 'ಕೃಷಿ ಬೆಳೆ ಸಲಹೆ (R-20)',
        css: 'bg-emerald-100 text-sky-800'
      }
    };

    const bInfo = badgeMap[adv.action_type] || badgeMap.default;
    badge.className = `px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${bInfo.css}`;
    badge.textContent = bInfo[lang] || bInfo['en'];
  }

  // Update voice button text
  const voiceBtnText = document.getElementById('voice-btn-text');
  if (voiceBtnText) {
    const vMap = {
      en: 'Play Spoken Advisory 🔊',
      hi: 'पूरी सलाह आवाज में सुनें 🔊',
      mr: 'संपूर्ण सल्ला आवाजात ऐका 🔊',
      or: 'ସମ୍ପୂର୍ଣ୍ଣ ପରାମର୍ଶ ଶୁଣନ୍ତୁ 🔊',
      as: 'সম্পূৰ্ণ পৰামৰ্শ শুনক 🔊',
      kn: 'ಸಂಪೂರ್ಣ ಸಲಹೆಯನ್ನು ಆಲಿಸಿ 🔊'
    };
    voiceBtnText.textContent = vMap[lang] || vMap['en'];
  }

  // Contingency crop list
  const contingencyBox = document.getElementById('contingency-box');
  const contingencyList = document.getElementById('contingency-crops-list');
  
  if (contingencyBox && contingencyList) {
    if (adv.contingency_crops && adv.contingency_crops.length > 0) {
      contingencyBox.classList.remove('hidden');
      
      const translatedCrops = adv.contingency_crops.map(c => {
        const cCrop = c.name || c.crop || c;
        const cName = getLocalizedCrop(cCrop, lang);
        
        const durPrefix = { en: 'Duration:', hi: 'अवधि:', mr: 'कालावधी:', or: 'ସମୟସୀମା:', as: 'সময়সীমা:', kn: 'ಅವಧಿ:' };
        const daysLabel = { en: 'Days', hi: 'दिन', mr: 'दिवस', or: 'ଦିନ', as: 'দিন', kn: 'ದಿನಗಳು' };
        const cDur = c.duration_days ? `${durPrefix[lang] || 'Duration:'} ${c.duration_days} ${daysLabel[lang] || 'Days'}` : '';
        const cRat = (c.rationale && c.rationale[lang]) || (c.reason && c.reason[lang]) || c.rationale || c.reason || '';

        return `
          <div class="bg-white p-3.5 rounded-xl border border-amber-200">
            <div class="font-extrabold text-slate-900 text-sm">${cName}</div>
            <div class="text-xs text-slate-600 mt-0.5">${cRat}</div>
            ${cDur ? `<div class="text-[11px] font-bold text-amber-800 mt-1">${cDur}</div>` : ''}
          </div>
        `;
      });

      contingencyList.innerHTML = translatedCrops.join('');
    } else {
      contingencyBox.classList.add('hidden');
    }
  }

  // 100% Native Weather & Soil Context Indicators
  if (adv.weather_data) {
    const wd = adv.weather_data;
    const f = state.currentFarmer;
    const rawSoil = f ? (f.soil_type || 'black') : 'black';
    const localizedSoil = getLocalizedSoil(rawSoil, lang);

    const rainDev = Math.abs(wd.rainfall_deviation_pct || 0).toFixed(1);
    const isDeficit = (wd.rainfall_deviation_pct || 0) < 0;
    const dryDays = wd.dry_spell_days || 0;
    const onset = wd.onset_status || 'normal';

    const rainMap = {
      deficit: {
        en: `-${rainDev}% Deficit`,
        hi: `-${rainDev}% कम बारिश`,
        mr: `-${rainDev}% पावसाची तूट`,
        or: `-${rainDev}% ବର୍ଷା ଅଭାବ`,
        as: `-${rainDev}% বৰষুণ নাটনি`,
        kn: `-${rainDev}% ಮಳೆ ಕೊರತೆ`
      },
      surplus: {
        en: `+${rainDev}% Surplus`,
        hi: `+${rainDev}% अधिक वर्षा`,
        mr: `+${rainDev}% जादा पाऊस`,
        or: `+${rainDev}% ଅଧିକ ବର୍ଷା`,
        as: `+${rainDev}% অধিক বৰষুণ`,
        kn: `+${rainDev}% ಹೆಚ್ಚುವರಿ ಮಳೆ`
      }
    };

    const dryMap = {
      en: `${dryDays} Days Dry`,
      hi: `${dryDays} दिन सूखा खंड`,
      mr: `${dryDays} दिवस पाऊस खंड`,
      or: `${dryDays} ଦିନ ଶୁଖିଲା ପାଗ`,
      as: `${dryDays} দিন খৰাং`,
      kn: `${dryDays} ದಿನ ಒಣ ಹವೆ`
    };

    const onsetMap = {
      normal: {
        en: 'Normal Onset',
        hi: 'समय पर सामान्य',
        mr: 'वेळेवर सामान्य',
        or: 'ସ୍ୱାଭାବିକ ସମୟରେ',
        as: 'স্বাভাৱিক সময়ত',
        kn: 'ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ'
      },
      delayed: {
        en: `Delayed (${wd.onset_delay_days || 0}d)`,
        hi: `विलंब (${wd.onset_delay_days || 0} दिन)`,
        mr: `उशीर (${wd.onset_delay_days || 0} दिवस)`,
        or: `ବିଳମ୍ବ (${wd.onset_delay_days || 0} ଦିନ)`,
        as: `পলম (${wd.onset_delay_days || 0} দিন)`,
        kn: `ವಿಳಂಬ (${wd.onset_delay_days || 0} ದಿನ)`
      }
    };

    const tRainValue = isDeficit ? (rainMap.deficit[lang] || rainMap.deficit['en']) : (rainMap.surplus[lang] || rainMap.surplus['en']);
    const tDryValue = dryMap[lang] || dryMap['en'];
    const tOnsetValue = onset === 'delayed' ? (onsetMap.delayed[lang] || onsetMap.delayed['en']) : (onsetMap.normal[lang] || onsetMap.normal['en']);

    const ctxRain = document.getElementById('ctx-rainfall');
    if (ctxRain) ctxRain.textContent = tRainValue;

    const ctxDry = document.getElementById('ctx-dryspell');
    if (ctxDry) ctxDry.textContent = tDryValue;

    const ctxOnset = document.getElementById('ctx-onset');
    if (ctxOnset) ctxOnset.textContent = tOnsetValue;

    const ctxSoil = document.getElementById('ctx-soil');
    if (ctxSoil) ctxSoil.textContent = localizedSoil;
  }
}

// ─── MANDI PRICE RENDERING & VOICE (100% NATIVE MULTILINGUAL) ───

const MANDI_I18N = {
  en: {
    badge: 'APMC Market Surveillance',
    title: 'Mandi Price vs Government MSP',
    listenBtn: 'Listen Mandi Price 🔊',
    updatedPrefix: 'Updated:',
    todayMandi: "Today's Mandi Price",
    perQuintal: 'per Quintal',
    govFloor: 'Govt Floor Price',
    govMsp: 'Government MSP',
    benchmark: 'per Quintal (Guaranteed Benchmark)',
    recActionTitle: 'Recommended Market Action:',
    distressBadge: 'Distress Warning',
    stableBadge: 'Stable Price',
    belowTitle: 'Price is BELOW Government MSP!',
    aboveTitle: 'Price is ABOVE Government MSP',
    belowBody: (diff, shortfall) => `Current Mandi price is ₹${diff}/quintal (${shortfall}%) below Government MSP. Avoid panic selling at a loss. Avail e-NAM MSP enrollment or WDRA warehouse pledge loan.`,
    aboveBody: (price) => `Current market price is ₹${price}/quintal, maintaining healthy stability above the Government MSP benchmark.`,
    belowActions: (diff) => [
      `1. Avoid immediate Mandi distress sale: Selling today causes an estimated ₹${diff}/quintal loss.`,
      `2. e-NAM & WDRA Warehouse Receipt: Store produce safely in a certified warehouse and avail 70% pledge loan at 7% interest.`,
      `3. PM-AASHA Enrollment: Register at the Taluka procurement center for government price deficit compensation.`
    ],
    aboveActions: [
      `1. Favorable Market Realization: Current mandi prices are above the MSP floor benchmark.`,
      `2. Direct APMC e-NAM Auction: Sell through electronic auction for maximum competitive bids.`,
      `3. Quality Grading: Grade produce as FAQ (Fair Average Quality) to command premium market price.`
    ]
  },
  hi: {
    badge: 'एपीएमसी मंडी निगरानी',
    title: 'मंडी भाव बनाम सरकारी समर्थन मूल्य (MSP)',
    listenBtn: 'मंडी भाव सुनें 🔊',
    updatedPrefix: 'अद्यतन:',
    todayMandi: 'आज का मंडी भाव',
    perQuintal: 'प्रति क्विंटल',
    govFloor: 'सरकारी न्यूनतम मूल्य',
    govMsp: 'सरकारी समर्थन मूल्य (MSP)',
    benchmark: 'प्रति क्विंटल (गारंटीड बेंचमार्क)',
    recActionTitle: 'अनुशंसित बाजार कदम:',
    distressBadge: 'संकट चेतावनी',
    stableBadge: 'संतोषजनक भाव',
    belowTitle: 'मंडी भाव सरकारी समर्थन मूल्य (MSP) से कम है!',
    aboveTitle: 'मंडी भाव सरकारी समर्थन मूल्य से ऊपर है',
    belowBody: (diff, shortfall) => `वर्तमान मंडी भाव सरकारी समर्थन मूल्य (MSP) से ₹${diff}/क्विंटल (${shortfall}%) कम है। घाटे में न बेचें। ई-नाम या वेयरहाउस रसीद पर सस्ता ऋण लें।`,
    aboveBody: (price) => `वर्तमान मंडी भाव ₹${price}/क्विंटल है, जो सरकारी समर्थन मूल्य (MSP) से ऊपर संतोषजनक स्थिति में है।`,
    belowActions: (diff) => [
      `१. तुरंत घाटे में बेचने से बचें: आज बेचने पर प्रति क्विंटल लगभग ₹${diff} का सीधा नुकसान होगा।`,
      `२. ई-नाम एवं वेयरहाउस रसीद (NWR): फसल को सरकारी गोदाम में रखें और ७% ब्याज पर ७०% बंधक ऋण प्राप्त करें।`,
      `३. पीएम-आशा (PM-AASHA) पंजीकरण: मूल्य घाटा राहत सहायता प्राप्त करने के लिए तहसील खरीद केंद्र पर पंजीकरण कराएं।`
    ],
    aboveActions: [
      `१. अनुकूल बाजार भाव: वर्तमान मंडी भाव सरकारी समर्थन मूल्य के बेंचमार्क से ऊपर है।`,
      `२. ई-नाम इलेक्ट्रॉनिक नीलामी: अधिकतम प्रतिस्पर्धी बोलियां प्राप्त करने हेतु ई-नाम के माध्यम से बेचें।`,
      `३. गुणवत्ता ग्रेडिंग: बेहतर दाम पाने के लिए फसल की छंटाई व ग्रेडिंग करके बेचें।`
    ]
  },
  mr: {
    badge: 'एपीएमसी बाजार भाव देखरेख',
    title: 'बाजार भाव विरुद्ध शासकीय हमीभाव (MSP)',
    listenBtn: 'बाजार भाव ऐका 🔊',
    updatedPrefix: 'अद्ययावत:',
    todayMandi: 'आजचा बाजार भाव',
    perQuintal: 'प्रति क्विंटल',
    govFloor: 'शासकीय हमीभाव आधार',
    govMsp: 'शासकीय हमीभाव (MSP)',
    benchmark: 'प्रति क्विंटल (हमीभाव बेंचमार्क)',
    recActionTitle: 'शिफारस केलेले बाजार पाऊल:',
    distressBadge: 'संकट पूर्वसूचना',
    stableBadge: 'समाधानकारक भाव',
    belowTitle: 'बाजार भाव हमीभावापेक्षा कमी आहे!',
    aboveTitle: 'बाजार भाव हमीभावापेक्षा चांगला आहे',
    belowBody: (diff, shortfall) => `सध्याचा बाजार भाव शासकीय हमीभावापेक्षा ₹${diff}/क्विंटल (${shortfall}%) कमी आहे. घाईत नुकसान सहन करून विकू नका. ई-नाम किंवा गोदामात माल ठेवून कर्ज मिळवा.`,
    aboveBody: (price) => `सध्याचा बाजार भाव ₹${price}/क्विंटल असून तो हमीभावापेक्षा समाधानकारक आहे.`,
    belowActions: (diff) => [
      `१. घाईघाईत कमी भावात विक्री टाळा: आज माल विकल्यास प्रति क्विंटल अंदाजे ₹${diff} चे नुकसान होईल.`,
      `२. ई-नाम व वेअरहाऊस पावती (NWR): माल गोदामात सुरक्षित ठेवून ७% सवलत दराने ७०% तारण कर्ज मिळवा.`,
      `३. पीएम-आशा (PM-AASHA) नोंदणी: हमीभाव तूट भरपाईसाठी तालुका खरेदी केंद्रात तात्काळ नोंदणी करा.`
    ],
    aboveActions: [
      `१. फायदेशीर बाजार भाव: सध्याचा भाव हमीभावापेक्षा चांगल्या पातळीवर आहे.`,
      `२. ई-नाम द्वारे थेट ई-लिलाव: जास्त स्पर्धात्मक बोली मिळवण्यासाठी ई-नाम वर विक्री करा.`,
      `३. प्रतवारी (Grading): अधिक चांगला भाव मिळवण्यासाठी मालाची प्रतवारी करून विक्री करा.`
    ]
  },
  or: {
    badge: 'ଏପିଏମସି ମଣ୍ଡି ନିରୀକ୍ଷଣ',
    title: 'ମଣ୍ଡି ଦର ବନାମ ସରକାରୀ ଏମଏସପି (MSP)',
    listenBtn: 'ମଣ୍ଡି ଦର ଶୁଣନ୍ତୁ 🔊',
    updatedPrefix: 'ଅପଡେଟ୍:',
    todayMandi: 'ଆଜିର ମଣ୍ଡି ଦର',
    perQuintal: 'କ୍ୱିଣ୍ଟାଲ ପିଛା',
    govFloor: 'ସରକାରୀ ସର୍ବନିମ୍ନ ସହାୟକ ମୂଲ୍ୟ',
    govMsp: 'ସରକାରୀ ଏମଏସପି (MSP)',
    benchmark: 'କ୍ୱିଣ୍ଟାଲ ପିଛା (ନିଶ୍ଚିତ ସହାୟତା)',
    recActionTitle: 'ପରାମର୍ଶିତ ବଜାର ପଦକ୍ଷେପ:',
    distressBadge: 'ସଙ୍କଟ ଚେତାବନୀ',
    stableBadge: 'ସ୍ଥିର ଦର',
    belowTitle: 'ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି ଠାରୁ କମ୍ ଅଛି!',
    aboveTitle: 'ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି ଠାରୁ ଅଧିକ ଅଛି',
    belowBody: (diff, shortfall) => `ବର୍ତ୍ତମାନ ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି ଠାରୁ ₹${diff}/କ୍ୱିଣ୍ଟାଲ (${shortfall}%) କମ୍। କ୍ଷତିରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। ଇ-ନାମ୍ କିମ୍ବା ୱେରହାଉସ୍ ବନ୍ଧକ ଋଣ ସୁବିଧା ନିଅନ୍ତୁ।`,
    aboveBody: (price) => `ବର୍ତ୍ତମାନ ବଜାର ଦର ₹${price}/କ୍ୱିଣ୍ଟାଲ ଅଛି, ଯାହା ସରକାରୀ ଏମଏସପି ଠାରୁ ଉପରେ ସନ୍ତୋଷଜନକ।`,
    belowActions: (diff) => [
      `୧. କ୍ଷତିରେ ତୁରନ୍ତ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ: ଆଜି ବିକ୍ରି କଲେ କ୍ୱିଣ୍ଟାଲ ପିଛା ପ୍ରାୟ ₹${diff} କ୍ଷତି ହେବ।`,
      `୨. ଇ-ନାମ୍ ଓ ଗୋଦାମ ରସିଦ (NWR): ଫସଲକୁ ସରକାରୀ ଗୋଦାମରେ ରଖି ୭% ସୁଧରେ ୭୦% ବନ୍ଧକ ଋଣ ପାଆନ୍ତୁ।`,
      `୩. ପିଏମ୍-ଆଶା (PM-AASHA) ପଞ୍ଜୀକରଣ: ମୂଲ୍ୟ କ୍ଷତିପୂରଣ ସହାୟତା ପାଇଁ ବ୍ଲକ କ୍ରୟ କେନ୍ଦ୍ରରେ ପଞ୍ଜୀକରଣ କରନ୍ତୁ।`
    ],
    aboveActions: [
      `୧. ଲାଭଜନକ ବଜାର ସ୍ଥିତି: ବର୍ତ୍ତମାନ ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି ଠାରୁ ଭଲ ସ୍ଥିତିରେ ଅଛି।`,
      `୨. ଇ-ନାମ୍ ନିଲାମ ବିକ୍ରି: ସର୍ବାଧିକ ଦର ପାଇବା ପାଇଁ ଇ-ନାମ୍ ମାଧ୍ୟମରେ ବିକ୍ରି କରନ୍ତୁ।`,
      `୩. ଗ୍ରେଡିଂ ଓ ପୃଥକୀକରଣ: ଉତ୍ତମ ମୂଲ୍ୟ ପାଇବା ପାଇଁ ଫସଲକୁ ଗ୍ରେଡିଂ କରି ବିକ୍ରି କରନ୍ତୁ।`
    ]
  },
  as: {
    badge: 'APMC বজাৰ নিৰীক্ষণ',
    title: 'বজাৰ দৰ বনাম চৰকাৰী সমৰ্থন মূল্য (MSP)',
    listenBtn: 'বজাৰ দৰ শুনক 🔊',
    updatedPrefix: 'আপডেট:',
    todayMandi: 'আজিৰ বজাৰ মূল্য',
    perQuintal: 'প্ৰতি কুইন্টলত',
    govFloor: 'চৰকাৰী ন্যূনতম নিৰ্ধাৰিত মূল্য',
    govMsp: 'চৰকাৰী সমৰ্থন মূল্য (MSP)',
    benchmark: 'প্ৰতি কুইন্টলত (নিৰাপদ সমৰ্থন)',
    recActionTitle: 'পৰামৰ্শিত বজাৰ ব্যৱস্থা:',
    distressBadge: 'সংকটৰ সতৰ্কবাৰ্তা',
    stableBadge: 'সন্তোষজনক দৰ',
    belowTitle: 'বজাৰ মূল্য চৰকাৰী সমৰ্থন মূল্যতকৈ কম!',
    aboveTitle: 'বজাৰ মূল্য চৰকাৰী সমৰ্থন মূল্যতকৈ অধিক',
    belowBody: (diff, shortfall) => `বৰ্তমান বজাৰ মূল্য চৰকাৰী সমৰ্থন মূল্যতকৈ ₹${diff}/কুইন্টল (${shortfall}%) কম। লোকচানত বিক্ৰী নকৰিব। ই-নাম বা গুদাম বন্ধকী ঋণ গ্ৰহণ কৰক।`,
    aboveBody: (price) => `বৰ্তমান বজাৰ দৰ ₹${price}/কুইন্টল, যি চৰকাৰী সমৰ্থন মূল্যৰ ওপৰত সন্তোষজনক অৱস্থাত আছে।`,
    belowActions: (diff) => [
      `১. লোকচানত বিক্ৰী কৰাৰ পৰা বিৰত থাকক: আজি বিক্ৰী কৰিলে প্ৰতি কুইন্টলত প্ৰায় ₹${diff} লোকচান হ’ব।`,
      `২. ই-নাম আৰু গুদাম ৰচিদ (NWR): শস্য গুদামত ৰাখি ৭% সুতত ৭০% বন্ধকী ঋণ লওক।`,
      `৩. পিএম-আশা (PM-AASHA) পঞ্জীয়ন: ক্ষতিপূৰণ সাহায্য লাভৰ বাবে ব্লক ক্ৰয় কেন্দ্ৰত নাম পঞ্জীয়ন কৰক।`
    ],
    aboveActions: [
      `১. লাভজনক বজাৰ দৰ: বৰ্তমানৰ দৰ চৰকাৰী সমৰ্থন মূল্যতকৈ অধিক সন্তোষজনক।`,
      `২. ই-নাম ইলেক্ট্ৰনিক নিলাম: সৰ্বাধিক দৰ লাভৰ বাবে ই-নামৰ জৰিয়তে বিক্ৰী কৰক।`,
      `৩. গুণমান গ্ৰেডিং: অধিক মূল্য লাভৰ বাবে শস্য শ্ৰেণীবিভাজন কৰি বিক্ৰী কৰক।`
    ]
  },
  kn: {
    badge: 'ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ ಕಣ್ಗಾವಲು',
    title: 'ಮಾರುಕಟ್ಟೆ ದರ ಮತ್ತು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ (MSP)',
    listenBtn: 'ಮಾರುಕಟ್ಟೆ ದರ ಕೇಳಿ 🔊',
    updatedPrefix: 'ಅಪ್‌ಡೇಟ್:',
    todayMandi: 'ಇಂದಿನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ',
    perQuintal: 'ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ',
    govFloor: 'ಸರ್ಕಾರಿ ಕನಿಷ್ಠ ಬೆಂಬಲ ಬೆಲೆ',
    govMsp: 'ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ (MSP)',
    benchmark: 'ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ (ಖಾತರಿ ಮಾನದಂಡ)',
    recActionTitle: 'ಶಿಫಾರಸು ಮಾಡಲಾದ ಮಾರುಕಟ್ಟೆ ಕ್ರಮ:',
    distressBadge: 'ಸಂಕಷ್ಟ ಎಚ್ಚರಿಕೆ',
    stableBadge: 'ಸ್ಥಿರ ಬೆಲೆ',
    belowTitle: 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆಯು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಕಡಿಮೆಯಿದೆ!',
    aboveTitle: 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆಯು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಉತ್ತಮವಾಗಿದೆ',
    belowBody: (diff, shortfall) => `ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ದರವು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ₹${diff}/ಕ್ವಿಂಟಾಲ್ (${shortfall}%) ಕಡಿಮೆಯಿದೆ. ನಷ್ಟದಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬೇಡಿ. ಇ-ನ್ಯಾಮ್ ಅಥವಾ ಗೋದಾಮು ರಸೀದಿ ಸಾಲ ಬಳಸಿ.`,
    aboveBody: (price) => `ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ದರ ₹${price}/ಕ್ವಿಂಟಾಲ್ ಆಗಿದ್ದು, ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಉತ್ತಮ ಸ್ಥಿತಿಯಲ್ಲಿದೆ.`,
    belowActions: (diff) => [
      `೧. ತಕ್ಷಣ ನಷ್ಟದಲ್ಲಿ ಮಾರಾಟ ಮಾಡುವುದನ್ನು ತಪ್ಪಿಸಿ: ಇಂದು ಮಾರಾಟ ಮಾಡಿದರೆ ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹${diff} ನಷ್ಟವಾಗುತ್ತದೆ.`,
      `೨. ಇ-ನ್ಯಾಮ್ ಮತ್ತು ಉಗ್ರಾಣ ರಶೀದಿ (NWR): ಬೆಳೆಯನ್ನು ಗೋದಾಮಿನಲ್ಲಿಟ್ಟು ಶೇ ೭% ಬಡ್ಡಿದರದಲ್ಲಿ ೭೦% ಸಾಲ ಪಡೆಯಿರಿ.`,
      `೩. ಪಿಎಂ-ಆಶಾ (PM-AASHA) ನೋಂದಣಿ: ನಷ್ಟ ಪರಿಹಾರ ಪಡೆಯಲು ತಾಲೂಕು ಖರೀದಿ ಕೇಂದ್ರದಲ್ಲಿ ನೋಂದಾಯಿಸಿ.`
    ],
    aboveActions: [
      `೧. ಉತ್ತಮ ಮಾರುಕಟ್ಟೆ ಸ್ಥಿತಿ: ಪ್ರಸ್ತುತ ಬೆಲೆಗಳು ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಉತ್ತಮವಾಗಿವೆ.`,
      `೨. ಇ-ನ್ಯಾಮ್ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಹರಾಜು: ಗರಿಷ್ಠ ದರ ಪಡೆಯಲು ಇ-ನ್ಯಾಮ್ ಮೂಲಕ ಮಾರಾಟ ಮಾಡಿ.`,
      `೩. ಗುಣಮಟ್ಟ ಗ್ರೇಡಿಂಗ್: ಉತ್ತಮ ಬೆಲೆ ಪಡೆಯಲು ಬೆಳೆಯನ್ನು ಗ್ರೇಡಿಂಗ್ ಮಾಡಿ ಮಾರಾಟ ಮಾಡಿ.`
    ]
  }
};

async function renderFarmerMandiPrice() {
  const adv = state.currentAdvisory;
  if (!adv || !adv.price_data) return;

  const pd = adv.price_data;
  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const mLoc = MANDI_I18N[lang] || MANDI_I18N['en'];

    const localizedCrop = getLocalizedCrop(pd.crop, lang);
  const localizedMarket = getLocalizedMarket(pd.market_name, lang);
  
  const mandiNameEl = document.getElementById('mandi-name');
  if (mandiNameEl) mandiNameEl.textContent = `${localizedMarket} • ${localizedCrop.toUpperCase()}`;

  const updatedEl = document.getElementById('mandi-updated-date');
  if (updatedEl) {
    const uMap = {
      en: 'Updated: 25 Aug 2026',
      hi: 'अद्यतन: २५ अगस्त २०२६',
      mr: 'अद्ययावत: २५ ऑगस्ट २०२६',
      or: 'ଅପଡେଟ୍: ୨୫ ଅଗଷ୍ଟ ୨୦୨୬',
      as: 'আপডেট: ২৫ আগষ্ট ২০২৬',
      kn: 'ದಿನಾಂಕ: ೨೫ ಆಗಸ್ಟ್ ೨୦೨೬'
    };
    updatedEl.textContent = uMap[lang] || uMap['en'];
  }

  const currentPriceEl = document.getElementById('mandi-current-price');
  if (currentPriceEl) currentPriceEl.textContent = `₹${pd.current_price.toLocaleString('en-IN')}`;

  const mspPriceEl = document.getElementById('mandi-msp-price');
  if (mspPriceEl) mspPriceEl.textContent = `₹${pd.govt_msp.toLocaleString('en-IN')}`;

  const alertBox = document.getElementById('mandi-alert-box');
  const alertIcon = document.getElementById('mandi-alert-icon');
  const alertTitle = document.getElementById('mandi-alert-title');
  const alertText = document.getElementById('mandi-alert-text');
  const alertBadge = document.getElementById('mandi-alert-badge');

  const diff = pd.govt_msp - pd.current_price;
  const shortfall = pd.shortfall_pct || '26.7';

  if (pd.is_below_msp) {
    if (alertBox) alertBox.className = "bg-red-50 border-2 border-red-400 rounded-2xl p-5 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4";
    if (alertIcon) alertIcon.textContent = "⚠️";
    if (alertTitle) alertTitle.textContent = mLoc.belowTitle;
    if (alertText) alertText.textContent = mLoc.belowBody(diff, shortfall);
    if (alertBadge) {
      alertBadge.textContent = mLoc.distressBadge;
      alertBadge.className = "bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-lg whitespace-nowrap";
    }
  } else {
    if (alertBox) alertBox.className = "bg-emerald-50 border-2 border-sky-400 rounded-2xl p-5 text-sky-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4";
    if (alertIcon) alertIcon.textContent = "✅";
    if (alertTitle) alertTitle.textContent = mLoc.aboveTitle;
    if (alertText) alertText.textContent = mLoc.aboveBody(pd.current_price);
    if (alertBadge) {
      alertBadge.textContent = mLoc.stableBadge;
      alertBadge.className = "bg-sky-600 text-white font-black text-xs px-3 py-1.5 rounded-lg whitespace-nowrap";
    }
  }

  // Render 100% Localized Recommended Actions
  const recListEl = document.getElementById('mandi-recommendations-list');
  if (recListEl) {
    const actionItems = pd.is_below_msp ? mLoc.belowActions(diff) : mLoc.aboveActions;
    recListEl.innerHTML = actionItems.map(act => `<p>${act}</p>`).join('');
  }
}


async function playMandiAudio() {
  const adv = state.currentAdvisory;
  if (!adv || !adv.price_data) {
    showTTSToast('Mandi price data is not available.');
    return;
  }

  const pd = adv.price_data;
  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';

  const localizedCrop = getLocalizedCrop(pd.crop, lang);
  const localizedMarket = getLocalizedMarket(pd.market_name, lang);
  const diff = Math.round(pd.govt_msp - pd.current_price);
  const currentPrice = Math.round(pd.current_price);
  const mspPrice = Math.round(pd.govt_msp);

  let script = "";
  if (pd.is_below_msp) {
    if (lang === 'hi') {
      script = `${localizedMarket} में ${localizedCrop} का आज का मंडी भाव ₹${currentPrice} प्रति क्विंटल है, जो सरकारी समर्थन मूल्य ₹${mspPrice} से ₹${diff} कम है। घाटे में तुरंत न बेचें। पहला: गोदामात माल सुरक्षित रखकर ७% ब्याज पर ७०% ऋण प्राप्त करें। दूसरा: पीएम-आशा योजना में मूल्य भरपाई हेतु पंजीकरण करें। तीसरा: ई-नाम मंडी में ऑनलाइन नीलामी द्वारा बेहतर भाव प्राप्त करें।`;
    } else if (lang === 'mr') {
      script = `${localizedMarket} मध्ये ${localizedCrop} चा आजचा बाजार भाव ₹${currentPrice} प्रति क्विंटल आहे, जो शासकीय हमीभाव ₹${mspPrice} पेक्षा ₹${diff} ने कमी आहे. घाईघाईत कमी भावात नुकसान सोसून विकू नका. पहिला सल्ला: माल गोदामात सुरक्षित ठेवून ७% सवलत दराने ७०% तारण कर्ज मिळवा. दुसरा सल्ला: हमीभाव तूट भरपाईसाठी पीएम-आशा योजनेत तालुका खरेदी केंद्रात नोंदणी करा. तिसरा सल्ला: ई-नाम राष्ट्रीय बाजार समितीमध्ये उत्तम भावासाठी इलेक्ट्रॉनिक लिलावात सहभागी व्हा.`;
    } else if (lang === 'or') {
      script = `${localizedMarket} ରେ ${localizedCrop} ର ଆଜିର ମଣ୍ଡି ଦର କ୍ୱିଣ୍ଟାଲ ପିଛା ₹${currentPrice} ଅଛି, ଯାହା ସରକାରୀ ଏମଏସପି ₹${mspPrice} ଠାରୁ ₹${diff} କମ୍। କ୍ଷତିରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। ପ୍ରଥମ ପଦକ୍ଷେପ: ଗୋଦାମରେ ମାଲ ରଖି ୭୦% ଋଣ ସୁବିଧା ନିଅନ୍ତୁ। ଦ୍ୱିତୀୟ ପଦକ୍ଷେପ: ପିଏମ୍-ଆଶା ଯୋଜନାରେ ପଞ୍ଜୀକରଣ କରନ୍ତୁ। ତୃତୀୟ ପଦକ୍ଷେପ: ଇ-ନାମ୍ ରେ ଉତ୍ତମ ଦର ପାଇଁ ବିକ୍ରି କରନ୍ତୁ।`;
    } else if (lang === 'as') {
      script = `${localizedMarket}ত ${localizedCrop}ৰ আজিৰ বজাৰ দৰ প্ৰতি কুইন্টলত ₹${currentPrice}, যি চৰকাৰী সমৰ্থন মূল্য ₹${mspPrice}তকৈ ₹${diff} কম। ক্ষতি স্বীকাৰ কৰি এতিয়াই বিক্ৰী নকৰিব। প্ৰথম: গুদামত শস্য জমা ৰাখি কম সুতত ৭০% ঋণ লওক। দ্বিতীয়: পিএম-আশা আঁচনিত নামভৰ্তি কৰক। তৃতীয়: ই-নাম অনলাইন নিলাম ব্যৱস্থা ব্যৱহাৰ কৰক।`;
    } else if (lang === 'kn') {
      script = `${localizedMarket} ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ${localizedCrop} ಇಂದಿನ ದರ ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹${currentPrice} ಆಗಿದ್ದು, ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ ₹${mspPrice} ಗಿಂತ ₹${diff} ಕಡಿಮೆಯಾಗಿದೆ. ಆತುರದಲ್ಲಿ ನಷ್ಟಕ್ಕೆ ಮಾರಾಟ ಮಾಡಬೇಡಿ. ಮೊದಲನೆಯದಾಗಿ: ಗೋದಾಮಿನಲ್ಲಿ ಸಂಗ್ರಹಿಸಿ ೭% ಬಡ್ಡಿಗೆ ೭೦% ರಸೀದಿ ಸಾಲ ಪಡೆಯಿರಿ. ಎರಡನೆಯದಾಗಿ: ಪಿಎಂ-ಆಶಾ ಯೋಜನೆಯಲ್ಲಿ ನೋಂದಾಯಿಸಿ. ಮೂರನೆಯದಾಗಿ: ಉತ್ತಮ ಬೆಲೆಗಾಗಿ ಇ-ನ್ಯಾಮ್ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಹರಾಜಿನಲ್ಲಿ ಮಾರಾಟ ಮಾಡಿ.`;
    } else {
      script = `Today's Mandi price for ${localizedCrop} at ${localizedMarket} is ₹${currentPrice} per quintal, which is ₹${diff} below the Government MSP of ₹${mspPrice}. Avoid distress sale. Step 1: Store in a WDRA warehouse and avail a 70% pledge loan at 7% interest. Step 2: Register for PM-AASHA price deficit support at the procurement center. Step 3: Utilize e-NAM electronic auction for better market discovery.`;
    }
  } else {
    if (lang === 'hi') {
      script = `${localizedMarket} में ${localizedCrop} का आज का मंडी भाव ₹${currentPrice} प्रति क्विंटल है। यह सरकारी समर्थन मूल्य ₹${mspPrice} से ऊपर संतोषजनक एवं लाभदायक स्थिति में है।`;
    } else if (lang === 'mr') {
      script = `${localizedMarket} मध्ये ${localizedCrop} चा आजचा बाजार भाव ₹${currentPrice} प्रति क्विंटल असून शासकीय हमीभाव ₹${mspPrice} पेक्षा जास्त आणि फायदेशीर आहे.`;
    } else if (lang === 'or') {
      script = `${localizedMarket} ରେ ${localizedCrop} ର ଆଜିର ମଣ୍ଡି ଦର ₹${currentPrice} ଅଛି, ଯାହା ସରକାରୀ ଏମଏସପି ₹${mspPrice} ଠାରୁ ଅଧିକ ଏବଂ ଲାଭଜନକ ଅଟେ।`;
    } else if (lang === 'as') {
      script = `${localizedMarket}ত ${localizedCrop}ৰ আজিৰ বজাৰ দৰ ₹${currentPrice}, যি চৰকাৰী সমৰ্থন মূল্য ₹${mspPrice}তকৈ ওপৰত সন্তোষজনক আৰু লাভজনক।`;
    } else if (lang === 'kn') {
      script = `${localizedMarket} ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ${localizedCrop} ಇಂದಿನ ದರ ₹${currentPrice} ಆಗಿದ್ದು, ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ ₹${mspPrice} ಗಿಂತ ಉತ್ತಮವಾಗಿದೆ.`;
    } else {
      script = `Today's Mandi price for ${localizedCrop} at ${localizedMarket} is ₹${currentPrice} per quintal, maintaining strong stability above Government MSP of ₹${mspPrice}.`;
    }
  }

  await speakText(script, lang, 'mandi-price');
}

// ─── ALERTS TAB RENDERING & VOICE (100% NATIVE MULTILINGUAL) ───

const ALERTS_DATA_I18N = {
  price_distress: {
    icon: '🚨',
    severity: { en: 'CRITICAL', hi: 'अति आवश्यक', mr: 'अति गंभीर', or: 'ଜରୁରୀ', as: 'অতি গুৰুত্বপূৰ্ণ', kn: 'ತುರ್ತು' },
    color: 'border-red-400 bg-red-50 text-red-950',
    title: {
      en: 'Market Distress Warning: Price Below MSP',
      hi: 'मंडी संकट चेतावनी: समर्थन मूल्य से कम भाव',
      mr: 'बाजार भाव संकट सूचना: हमीभावापेक्षा कमी दर',
      or: 'ମଣ୍ଡି ସଙ୍କଟ ଚେତାବନୀ: ଏମଏସପି ଠାରୁ କମ୍ ଦର',
      as: 'বজাৰ সংকটৰ সতৰ্কবাৰ্তা: সমৰ্থন মূল্যতকৈ কম দৰ',
      kn: 'ಮಾರುಕಟ್ಟೆ ಸಂಕಷ್ಟ ಎಚ್ಚರಿಕೆ: ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಕಡಿಮೆ'
    },
    body: (diff, price) => ({
      en: `Current Mandi price (₹${price}) is ₹${diff}/quintal below Government MSP. Avoid panic selling. Register on e-NAM or store in warehouse.`,
      hi: `वर्तमान मंडी भाव (₹${price}) सरकारी समर्थन मूल्य से ₹${diff}/क्विंटल कम है। घबराकर कम भाव में न बेचें। ई-नाम या गोदाम रसीद ऋण लें।`,
      mr: `सध्याचा बाजार भाव (₹${price}) हमीभावापेक्षा ₹${diff}/क्विंटल कमी आहे. घाईत नुकसान करून विकू नका. ई-नाम किंवा गोदामात साठवणूक करा.`,
      or: `ବର୍ତ୍ତମାନ ମଣ୍ଡି ଦର (₹${price}) ସରକାରୀ ଏମଏସପି ଠାରୁ ₹${diff}/କ୍ୱିଣ୍ଟାଲ କମ୍। କ୍ଷତିରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। ଇ-ନାମ୍ ବା ଗୋଦାମ ଋଣ ସୁବିଧା ନିଅନ୍ତୁ।`,
      as: `বৰ্তমান বজাৰ মূল্য (₹${price}) চৰকাৰী সমৰ্থন মূল্যতকৈ ₹${diff}/কুইন্টল কম। চিন্তিত হৈ কম দৰত বিক্ৰী নকৰিব। ই-নাম বা গুদাম ঋণ ব্যৱহাৰ কৰক।`,
      kn: `ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ದರ (₹${price}) ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ₹${diff}/ಕ್ವಿಂಟಾಲ್ ಕಡಿಮೆಯಿದೆ. ಆತಂಕದಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬೇಡಿ. ಇ-ನ್ಯಾಮ್ ಅಥವಾ ಗೋದಾಮು ರಸೀದಿ ಸಾಲ ಬಳಸಿ.`
    })
  },
  rainfall_deficit: {
    icon: '🌦️',
    severity: { en: 'HIGH', hi: 'उच्च प्राथमिकता', mr: 'उच्च जोखीम', or: 'ଉଚ୍ଚ ସତର୍କତା', as: 'উচ্চ সতৰ্কবাণী', kn: 'ಹೆಚ್ಚಿನ ಗಮನ' },
    color: 'border-amber-400 bg-amber-50 text-amber-950',
    title: {
      en: 'Rainfall Deficit & Dry Spell Notice',
      hi: 'वर्षा कमी एवं सूखा खंड सूचना',
      mr: 'पावसाची तूट व दुष्काळ खंड सूचना',
      or: 'ବର୍ଷା ଅଭାବ ଓ ଶୁଖିଲା ପାଗ ସୂଚନା',
      as: 'বৰষুণ নাটনি আৰু খৰাং জাননী',
      kn: 'ಮಳೆ ಕೊರತೆ ಮತ್ತು ಒಣ ಹವೆ ಎಚ್ಚರಿಕೆ'
    },
    body: (dev, dryDays) => ({
      en: `Monsoon rainfall is currently ${dev}% below normal with ${dryDays} days dry spell. Apply soil mulch and prepare for PMFBY crop survey.`,
      hi: `वर्षा सामान्य से ${dev}% कम है और ${dryDays} दिनों का सूखा खंड है। खेतों में मल्चिंग करें और पीएम फसल बीमा सर्वे की तैयारी रखें।`,
      mr: `पाऊस सरासरीपेक्षा ${dev}% कमी असून ${dryDays} दिवसांचा खंड आहे. शेतात आच्छादन करा व पीक विमा पाहणीसाठी तयार राहा.`,
      or: `ମୌସୁମୀ ବର୍ଷା ${dev}% କମ୍ ଏବଂ ${dryDays} ଦିନ ଧରି ଶୁଖିଲା ପାଗ ରହିଛି। ଜମିରେ ଆଚ୍ଛାଦନ ଦିଅନ୍ତୁ ଓ PMFBY ସର୍ଭେ ପାଇଁ ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ।`,
      as: `বৰষুণ সাধাৰণ অৱস্থাতকৈ ${dev}% কম আৰু ${dryDays} দিন ধৰি খৰাং হৈছে। মাটিত আৱৰণ দিয়ক আৰু শস্য বীমা সমীক্ষাৰ বাবে প্ৰস্তুত থাকক।`,
      kn: `ಮಳೆ ಸಾಮಾನ್ಯಕ್ಕಿಂತ ಶೇಕಡಾ ${dev} ಕಡಿಮೆಯಾಗಿದೆ ಮತ್ತು ${dryDays} ದಿನಗಳ ಒಣ ಹವೆಯಿದೆ. ಹೊದಿಕೆ ಬಳಸಿ ಮತ್ತು ಪಿಎಂ ಬೆಳೆ ವಿಮೆ ಸಮೀಕ್ಷೆಗೆ ಸಿದ್ಧರಾಗಿ.`
    })
  },
  loan_reminder: {
    icon: '💳',
    severity: { en: 'MEDIUM', hi: 'मध्यम', mr: 'मध्यम', or: 'ମଧ୍ୟମ', as: 'মধ্যম', kn: 'ಮಧ್ಯಮ' },
    color: 'border-purple-400 bg-purple-50 text-purple-950',
    title: {
      en: 'KCC Crop Loan Repayment Reminder',
      hi: 'केसीसी फसल ऋण अदायगी स्मरण',
      mr: 'केसीसी पीक कर्ज मुदत स्मरणपत्र',
      or: 'କେସିସି ଫସଲ ଋଣ ପରିଶୋଧ ସ୍ମାରକପତ୍ର',
      as: 'KCC শস্য ঋণ পৰিশোধৰ জাননী',
      kn: 'ಕೆಸಿಸಿ ಬೆಳೆ ಸಾಲ ಮರುಪಾವತಿ ನೆನಪೋಲೆ'
    },
    body: (days) => ({
      en: `Loan repayment deadline is in ${days} days. Visit your primary cooperative bank for 3% interest subvention renewal or restructuring.`,
      hi: `ऋण वापसी की अंतिम तिथि में ${days} दिन शेष हैं। ३% ब्याज छूट नवीनीकरण अथवा ऋण पुनर्गठन हेतु बैंक शाखा संपर्क करें।`,
      mr: `कर्ज परतफेडीसाठी ${days} दिवस बाकी आहेत. ३% व्याज सवलत नूतनीकरण किंवा कर्ज पुनर्रचनेसाठी बँकेत संपर्क करा.`,
      or: `ଋଣ ପରିଶୋଧ ପାଇଁ ${days} ଦିନ ବାକି ଅଛି। ୩% ସୁଧ ରିହାତି ନବୀକରଣ ବା ଋଣ ପୁନର୍ଗଠନ ପାଇଁ ବ୍ୟାଙ୍କ ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ।`,
      as: `ঋণ পৰিশোধৰ অন্তিম তাৰিখলৈ ${days} দিন বাকী। ৩% ৰেহাই নৱীকৰণ বা ঋণ পুনৰ্গঠনৰ বাবে বেংকত যোগাযোগ কৰক।`,
      kn: `ಸಾಲ ಮರುಪಾವತಿಗೆ ${days} ದಿನಗಳು ಬಾಕಿ ಇವೆ. ೩% ಬಡ್ಡಿ ರಿಯಾಯಿತಿ ನವೀಕರಣ ಅಥವಾ ಸಾಲ ಮರುಹೊಂದಾಣಿಕೆಗಾಗಿ ಬ್ಯಾಂಕ್ ಸಂಪರ್ಕಿಸಿ.`
    })
  },
  all_normal: {
    icon: '✅',
    severity: { en: 'INFO', hi: 'सामान्य', mr: 'सामान्य', or: 'ସ୍ୱାଭାବିକ', as: 'স্বাভাৱিক', kn: 'ಸಾಮಾನ್ಯ' },
    color: 'border-sky-300 bg-emerald-50 text-sky-950',
    title: {
      en: 'All Farm Systems Normal',
      hi: 'खेत के सभी संकेत सामान्य',
      mr: 'शेतातील सर्व स्थिती समाधानकारक',
      or: 'ସମସ୍ତ ପରିସ୍ଥିତି ସ୍ୱାଭାବିକ',
      as: 'সকলো অৱস্থা স্বাভাৱিক',
      kn: 'ಎಲ್ಲಾ ಪರಿಸ್ಥಿತಿಗಳು ಸಾಮಾನ್ಯ'
    },
    body: () => ({
      en: 'Weather conditions, soil moisture, and market prices are currently stable for your crop.',
      hi: 'मौसम, मिट्टी की नमी एवं मंडी भाव वर्तमान में आपकी फसल के लिए स्थिर व सामान्य हैं।',
      mr: 'हवामान, जमिनीतील ओलावा व बाजार भाव सध्या पिकासाठी समाधानकारक व स्थिर आहेत.',
      or: 'ପାଣିପାଗ, ମାଟିର ଆର୍ଦ୍ରତା ଓ ବଜାର ଦର ବର୍ତ୍ତମାନ ଆପଣଙ୍କ ଫସଲ ପାଇଁ ସ୍ଥିର ଓ ସନ୍ତୋଷଜନକ ଅଛି।',
      as: 'বতৰ, মাটিৰ আৰ্দ্ৰতা আৰু বজাৰ মূল্য বৰ্তমান আপোনাৰ খেতিৰ বাবে স্বাভাৱিক আৰু স্থিৰ আছে।',
      kn: 'ಹವಾಮಾನ, ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ದರಗಳು ಪ್ರಸ್ತುತ ನಿಮ್ಮ ಬೆಳೆಗೆ ಸ್ಥಿರವಾಗಿವೆ.'
    })
  }
};

async function renderFarmerAlerts() {
  const dis = state.currentDistress;
  const adv = state.currentAdvisory;
  const container = document.getElementById('farmer-alerts-container');
  if (!container) return;

  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const t = i18n[lang] || i18n['en'];
  const alerts = [];

  // 1. Price distress alert
  if (adv && adv.price_data && adv.price_data.is_below_msp) {
    const pd = adv.price_data;
    const diff = pd.govt_msp - pd.current_price;
    const item = ALERTS_DATA_I18N.price_distress;
    const bodyDict = item.body(diff, pd.current_price);
    alerts.push({
      icon: item.icon,
      title: item.title[lang] || item.title['en'],
      body: bodyDict[lang] || bodyDict['en'],
      severity: item.severity[lang] || item.severity['en'],
      color: item.color,
      audioText: `${item.title[lang] || item.title['en']}। ${bodyDict[lang] || bodyDict['en']}`
    });
  }

  // 2. Rainfall deficit alert
  if (adv && adv.weather_data && Math.abs(adv.weather_data.rainfall_deviation_pct) > 20) {
    const wd = adv.weather_data;
    const dev = Math.abs(wd.rainfall_deviation_pct).toFixed(1);
    const dryDays = wd.dry_spell_days || 0;
    const item = ALERTS_DATA_I18N.rainfall_deficit;
    const bodyDict = item.body(dev, dryDays);
    alerts.push({
      icon: item.icon,
      title: item.title[lang] || item.title['en'],
      body: bodyDict[lang] || bodyDict['en'],
      severity: item.severity[lang] || item.severity['en'],
      color: item.color,
      audioText: `${item.title[lang] || item.title['en']}। ${bodyDict[lang] || bodyDict['en']}`
    });
  }

  // 3. Loan reminder alert
  if (dis && dis.days_until_loan_due !== undefined && dis.days_until_loan_due <= 30) {
    const item = ALERTS_DATA_I18N.loan_reminder;
    const bodyDict = item.body(dis.days_until_loan_due);
    alerts.push({
      icon: item.icon,
      title: item.title[lang] || item.title['en'],
      body: bodyDict[lang] || bodyDict['en'],
      severity: item.severity[lang] || item.severity['en'],
      color: item.color,
      audioText: `${item.title[lang] || item.title['en']}। ${bodyDict[lang] || bodyDict['en']}`
    });
  }

  if (alerts.length === 0) {
    const item = ALERTS_DATA_I18N.all_normal;
    const bodyDict = item.body();
    alerts.push({
      icon: item.icon,
      title: item.title[lang] || item.title['en'],
      body: bodyDict[lang] || bodyDict['en'],
      severity: item.severity[lang] || item.severity['en'],
      color: item.color,
      audioText: `${item.title[lang] || item.title['en']}। ${bodyDict[lang] || bodyDict['en']}`
    });
  }

  state.currentAlerts = alerts;
  const tapListen = t.tapToListen || 'Tap to listen 🔊';

  const cardsHtml = alerts.map((a, idx) => `
    <div class="p-5 rounded-2xl border-2 ${a.color} flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-sm hover:shadow-md transition">
      <div class="flex items-start space-x-3.5">
        <div class="text-3xl">${a.icon}</div>
        <div>
          <div class="flex items-center space-x-2">
            <h4 class="font-extrabold text-base">${a.title}</h4>
            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/10">${a.severity}</span>
          </div>
          <p class="text-sm font-medium mt-1 leading-relaxed">${a.body}</p>
        </div>
      </div>
      <button onclick="playAlertCardAudio(${idx})" class="tts-listen-btn text-xs font-bold px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white active:scale-95 transition cursor-pointer self-end sm:self-center shadow-sm flex items-center space-x-1 whitespace-nowrap">
        <span>🔊</span>
        <span class="tts-label">${tapListen}</span>
      </button>
    </div>
  `);

  container.innerHTML = cardsHtml.join('');
}


async function playAllAlertsAudio() {
  const alerts = state.currentAlerts || [];
  if (alerts.length === 0) return;
  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const fullText = alerts.map(a => a.audioText || a.body).join('। ');
  await speakText(fullText, lang, 'alerts-all');
}

async function playAlertCardAudio(index) {
  const alert = state.currentAlerts?.[index];
  if (!alert) return;
  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  await speakText(alert.audioText || alert.body, lang, `alert-card-${index}`);
}

// ─── MASTER GOVERNMENT SCHEMES DATASET (4 PARTITIONED CATEGORIES WITH MULTILINGUAL WHY & HOW) ───
const ALL_GOVT_SCHEMES = [
  // === 1. FINANCE & DEBT RELIEF (finance) ===
  {
    scheme_id: 'S2',
    name: 'Kisan Credit Card (KCC) Restructuring & 3% Interest Subvention',
    category: 'finance',
    categories: ['finance', 'for_you'],
    urgency: 'HIGH',
    benefit_badge: {
      en: '3% Interest Subsidy + 1-Yr Moratorium',
      hi: '३% ब्याज छूट + १ साल की मोहलत',
      mr: '३% व्याज सवलत + १ वर्ष मुदतवाढ',
      or: '୩% ସୁଧ ରିହାତି + ୧ ବର୍ଷ ଅଧିକ ସମୟ',
      as: '৩% সুত ৰেহাই + ১ বছৰৰ ৰেহাই সময়',
      kn: '೩% ಬಡ್ಡಿ ರಿಯಾಯಿತಿ + ೧ ವರ್ಷ ವಿಸ್ತರಣೆ'
    },
    title: {
      en: 'KCC Loan Restructuring & 3% Interest Subvention',
      hi: 'किसान क्रेडिट कार्ड (KCC) ऋण पुनर्गठन एवं ३% ब्याज छूट',
      mr: 'किसान क्रेडिट कार्ड (KCC) कर्ज पुनर्रचना व ३% व्याज सवलत',
      or: 'କିସାନ କ୍ରେଡିଟ୍ କାର୍ଡ (KCC) ଋଣ ପୁନର୍ଗଠନ ଓ ୩% ସୁଧ ରିହାତି',
      as: 'কিষাণ ক্ৰেডিট কাৰ্ড (KCC) ঋণ পুনৰ্গঠন আৰু ৩% সুত ৰেহাই',
      kn: 'ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC) ಸಾಲ ಮರುಹೊಂದಾಣಿಕೆ ಮತ್ತು ೩% ಬಡ್ಡಿ ರಿಯಾಯಿತಿ'
    },
    why_needed: {
      en: 'Your crop loan repayment date is near and cash is tight due to current harvest or weather stress.',
      hi: 'आपकी बैंक कर्ज चुकाने की तारीख नजदीक आ गई है और फसल की स्थिति के कारण पैसों की तंगी है।',
      mr: 'बँकेचे पीक कर्ज फेडण्याची तारीख जवळ आली असून सध्याच्या परिस्थितीमुळे पैशांची मोठी अडचण आहे.',
      or: 'ଆପଣଙ୍କ ବ୍ୟାଙ୍କ ଋଣ ସୁଝିବା ତାରିଖ ପାଖେଇ ଆସିଛି ଏବଂ ଆପଣଙ୍କ ପାଖରେ ଟଙ୍କାର ଅଭାବ ଅଛି।',
      as: 'আপোনাৰ বেংকৰ ঋণ পৰিশোধ কৰাৰ তাৰিখ ওচৰ চাপিছে আৰু টকাৰ নাটনি হৈছে।',
      kn: 'ಬ್ಯಾಂಕ್ ಬೆಳೆ ಸಾಲ ಮರುಪಾವತಿ ದಿನಾಂಕ ಹತ್ತಿರವಿದ್ದು ಕೈಯಲ್ಲಿ ಹಣದ ಕೊರತೆ ಇದೆ.'
    },
    how_it_helps: {
      en: 'Get 1 full extra year to repay your bank loan without penalty, plus a 3% government discount on interest.',
      hi: 'बैंक कर्ज चुकाने के लिए १ साल का अतिरिक्त समय मिलेगा और ब्याज में ३% की सीधी सरकारी छूट मिलेगी।',
      mr: 'कर्ज फेडण्यासाठी १ पूर्ण वर्षाची मुदतवाढ मिळेल आणि व्याजात ३% थेट सरकारी सवलत मिळेल.',
      or: 'ଋଣ ସୁଝିବା ପାଇଁ ୧ ବର୍ଷ ଅତିରିକ୍ତ ସମୟ ମିଳିବ ଏବଂ ସୁଧ ଉପରେ ସରକାରଙ୍କଠାରୁ ୩% ରିହାତି ମିଳିବ।',
      as: 'ঋণ পৰিশোধৰ বাবে ১ বছৰ অতিৰিক্ত সময় পোৱাৰ লগতে সুতত ৩% চৰকাৰী ৰেহাই লাভ কৰিব।',
      kn: 'ಸಾಲ ತೀರಿಸಲು ೧ ವರ್ಷ ಹೆಚ್ಚುವರಿ ಕಾಲಾವಕಾಶ ಸಿಗುತ್ತದೆ ಮತ್ತು ಬಡ್ಡಿಯಲ್ಲಿ ಸರ್ಕಾರದಿಂದ ೩% ರಿಯಾಯಿತಿ ಸಿಗುತ್ತದೆ.'
    },
    portal_url: 'https://agricoop.gov.in/en/kcc',
    trigger_criteria: (farmer, dis) => ((dis && dis.days_until_loan_due <= 30) || (farmer && farmer.informal_debt) || (dis && dis.distress_score > 40))
  },
  {
    scheme_id: 'S5',
    name: 'PM-KISAN Direct Benefit Transfer (Aadhaar Seeding & Installment)',
    category: 'finance',
    categories: ['finance', 'for_you'],
    urgency: 'MEDIUM',
    benefit_badge: {
      en: '₹6,000 / Year Direct Cash Deposit',
      hi: '₹६,००० / वर्ष सीधा बैंक खाते में',
      mr: '₹६,००० / वर्ष थेट बँक खात्यात',
      or: '₹୬,୦୦୦ / ବର୍ଷ ସିଧାସଳଖ ବ୍ୟାଙ୍କ ଖାତାରେ',
      as: 'বছৰি ₹৬,০০০ পোনপটীয়াকৈ বেংক একাউণ্টত',
      kn: 'ವರ್ಷಕ್ಕೆ ₹೬,೦೦೦ ನೇರ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ'
    },
    title: {
      en: 'PM-KISAN Direct Cash Benefit Transfer',
      hi: 'पीएम-किसान सम्मान निधि (सीधी नकद सहायता)',
      mr: 'पीएम-किसान थेट बँक खात्यात जमा (सन्मान निधी)',
      or: 'ପିଏମ୍-କିଷାନ ସିଧାସଳଖ ଆର୍ଥିକ ସହାୟତା (ସମ୍ମାନ ନିଧି)',
      as: 'পিএম-কিষাণ প্ৰত্যক্ষ নগদ সাহায্য',
      kn: 'ಪಿಎಂ-ಕಿಸಾನ್ ನೇರ ನಗದು ವರ್ಗಾವಣೆ ಯೋಜನೆ'
    },
    why_needed: {
      en: 'You need immediate cash in hand to buy seeds, fertilizers, or manage urgent household expenses.',
      hi: 'आपको बीज-खाद खरीदने या घर के जरूरी खर्च चलाने के लिए तुरंत नकद पैसों की जरूरत है।',
      mr: 'बियाणे, खते खरेदी करण्यासाठी किंवा तातडीच्या घरखर्चासाठी हातात रोख पैशांची गरज आहे.',
      or: 'ବିହନ, ଖତ କିଣିବା କିମ୍ବା ଘରୋଇ ଖର୍ଚ୍ଚ ପାଇଁ ଆପଣଙ୍କୁ ତୁରନ୍ତ ନଗଦ ଟଙ୍କା ଦରକାର।',
      as: 'বীজ, সাৰ ক্ৰয় কৰিবলৈ বা জৰুৰী ঘৰুৱা খৰচৰ বাবে হাতত নগদ টকাৰ প্ৰয়োজন।',
      kn: 'ಬೀಜ, ಗೊಬ್ಬರ ಖರೀದಿಸಲು ಅಥವಾ ತುರ್ತು ಮನೆ ಖರ್ಚಿಗೆ ತಕ್ಷಣದ ನಗದು ಹಣದ ಅಗತ್ಯವಿದೆ.'
    },
    how_it_helps: {
      en: 'Receive guaranteed ₹6,000 every year directly in your bank account in 3 installments of ₹2,000 each.',
      hi: 'हर साल ₹६,००० की निश्चित राशि सीधे आपके बैंक खाते में ₹२,००० की ३ किस्तों में जमा की जाती है।',
      mr: 'दरवर्षी ₹६,००० ची खात्रीशीर रक्कम ३ हप्त्यांत (प्रत्येकी ₹२,०००) थेट तुमच्या बँक खात्यात जमा होते.',
      or: 'ପ୍ରତିବର୍ଷ ₹୬,୦୦୦ ଟଙ୍କା ସିଧାସଳଖ ଆପଣଙ୍କ ବ୍ୟାଙ୍କ ଖାତାରେ ₹୨,୦୦୦ ର ୩ଟି କିସ୍ତିରେ ଜମା ହେବ।',
      as: 'প্ৰতি বছৰে ₹৬,০০০ কৈ নিশ্চিত ধন ৩টা কিস্তিত (প্ৰতিবাৰত ₹২,০০০) পোনে পোনে আপোনাৰ একাউণ্টত জমা হ’ব।',
      kn: 'ಪ್ರತಿ ವರ್ಷ ₹೬,೦೦೦ ಖಚಿತ ಮೊತ್ತವು ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ₹೨,೦೦೦ ರಂತೆ ೩ ಕಂತುಗಳಲ್ಲಿ ನೇರವಾಗಿ ಜಮೆಯಾಗುತ್ತದೆ.'
    },
    portal_url: 'https://pmkisan.gov.in',
    trigger_criteria: (farmer, dis) => (farmer && farmer.landholding_hectares <= 2.0)
  },
  {
    scheme_id: 'S3',
    name: 'e-NAM & WDRA Negotiable Warehouse Receipt (NWR) Pledge Loan',
    category: 'finance',
    categories: ['finance', 'for_you'],
    urgency: 'HIGH',
    benefit_badge: {
      en: '70% Crop Value Loan @ 7% Concessional Interest',
      hi: '७०% फसल मूल्य पर सस्ता ऋण @ ७% ब्याज',
      mr: '७०% पीक मूल्यावर ७% सवलत दराने कर्ज',
      or: '୭୦% ଫସଲ ମୂଲ୍ୟରେ ୭% ରିହାତି ଋଣ',
      as: '৭০% শস্যৰ মূল্যৰ ভিত্তিত ৭% ৰেহাই সুতৰ ঋণ',
      kn: 'ಶೇ ೭೦ ರಷ್ಟು ಬೆಳೆ ಮೌಲ್ಯದ ಮೇಲೆ ೭% ಬಡ್ಡಿದರದ ಸಾಲ'
    },
    title: {
      en: 'e-NAM & WDRA Warehouse Receipt (NWR) Pledge Loan',
      hi: 'ई-नाम एवं वेयरहाउस रसीद (NWR) बंधक ऋण योजना',
      mr: 'ई-नाम व वेअरहाऊस पावती (NWR) तारण कर्ज योजना',
      or: 'ଇ-ନାମ୍ ଓ ଗୋଦାମ ରସିଦ (NWR) ବନ୍ଧକ ଋଣ ଯୋଜନା',
      as: 'ই-নাম আৰু গুদাম ৰচিদ (NWR) বন্ধকী ঋণ আঁচনি',
      kn: 'ಇ-ನ್ಯಾಮ್ ಮತ್ತು ಉಗ್ರಾಣ ರಶೀದಿ (NWR) ಅಡಮಾನ ಸಾಲ ಯೋಜನೆ'
    },
    why_needed: {
      en: 'Current mandi market price is very low below government MSP and you are being forced to sell at a loss.',
      hi: 'मंडी में फसल के दाम सरकारी समर्थन मूल्य (MSP) से बहुत कम मिल रहे हैं और घाटे में बेचने की मजबूरी है।',
      mr: 'बाजारात पिकाचे भाव हमीभावापेक्षा कमी मिळत असून नुकसान सहन करून माल विकण्याची वेळ आली आहे.',
      or: 'ମଣ୍ଡିରେ ଫସଲର ଦର ସରକାରୀ ସର୍ବନିମ୍ନ ମୂଲ୍ୟ (MSP) ଠାରୁ ବହୁତ କମ୍ ଅଛି ଏବଂ କ୍ଷତିରେ ବିକ୍ରି କରିବାକୁ ପଡ଼ୁଛି।',
      as: 'বজাৰত শস্যৰ দাম চৰকাৰী সমৰ্থন মূল্যতকৈ (MSP) বহুত কম আৰু লোকচানত বিক্ৰী কৰিবলগীয়া হৈছে।',
      kn: 'ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಬೆಲೆಯು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ (MSP) ಕಡಿಮೆಯಿದ್ದು ನಷ್ಟದಲ್ಲಿ ಮಾರಾಟ ಮಾಡುವ ಪರಿಸ್ಥಿತಿ ಇದೆ.'
    },
    how_it_helps: {
      en: 'Keep your produce safely in a certified warehouse and get an instant 70% low-interest loan until prices rise.',
      hi: 'फसल को सरकारी गोदाम में सुरक्षित रखें और तुरंत ७०% सस्ता लोन पाएं, ताकि बाद में अच्छे दाम पर बेच सकें।',
      mr: 'माल गोदामात सुरक्षित ठेवा आणि लगेच ७०% स्वस्त कर्ज घ्या, ज्यामुळे भाव वाढल्यावर चांगल्या नफ्यात विकता येईल.',
      or: 'ଫସଲକୁ ସରକାରୀ ଗୋଦାମରେ ରଖନ୍ତୁ ଏବଂ ତୁରନ୍ତ ୭୦% ଶସ୍ତା ଋଣ ନିଅନ୍ତୁ, ଯାହାଫଳରେ ଦର ବଢ଼ିଲେ ଲାଭରେ ବିକିପାରିବେ।',
      as: 'শস্য গুদামত সুৰক্ষিত ৰাখক আৰু লগে লগে ৭০% কম সুতৰ ঋণ লওক, যাতে পিছত ভাল দামত বিক্ৰী কৰিব পাৰে।',
      kn: 'ಬೆಳೆಯನ್ನು ಗೋದಾಮಿನಲ್ಲಿಟ್ಟು ತಕ್ಷಣ ಶೇ ೭೦ ರಿಯಾಯಿತಿ ಸಾಲ ಪಡೆಯಿರಿ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ದರ ಹೆಚ್ಚಾದಾಗ ಲಾಭಕ್ಕೆ ಮಾರಿ.'
    },
    portal_url: 'https://wdra.gov.in',
    trigger_criteria: (farmer, dis) => ((dis && dis.top_contributing_signal && dis.top_contributing_signal.dimension === 'exposure_hazard') || (farmer && farmer.crop_stage === 'harvest') || (dis && dis.distress_score > 45))
  },
  {
    scheme_id: 'S6',
    name: 'Agriculture Infrastructure Fund (AIF) Storage & Processing Loans',
    category: 'finance',
    categories: ['finance'],
    urgency: 'LOW',
    benefit_badge: {
      en: '3% Interest Subvention on Storage Loans',
      hi: 'गोदाम व सोलर स्टोरेज पर ३% ब्याज छूट',
      mr: 'गोदाम व सोलर युनिटसाठी ३% व्याज सवलत',
      or: 'ଗୋଦାମ ନିର୍ମାଣ ଋଣରେ ୩% ସୁଧ ରିହାତି',
      as: 'গুদাম নিৰ্মাণ ঋণত ৩% সুত ৰেহাই',
      kn: 'ಗೋದಾಮು ನಿರ್ಮಾಣ ಸಾಲಕ್ಕೆ ೩% ಬಡ್ಡಿ ರಿಯಾಯಿತಿ'
    },
    title: {
      en: 'Agriculture Infrastructure Fund (AIF Storage Loans)',
      hi: 'कृषि अवसंरचना कोष (AIF गोदाम एवं कोल्ड स्टोरेज ऋण)',
      mr: 'कृषी पायाभूत सुविधा निधी (AIF साठवणूक व प्रक्रिया कर्ज)',
      or: 'କୃଷି ଭିତ୍ତିଭୂମି ପାଣ୍ଠି (AIF ଗୋଦାମ ଓ କୋଲ୍ଡ ଷ୍ଟୋରେଜ୍ ଋଣ)',
      as: 'কৃষি আন্তঃগাঁথনি পুঁজি (AIF সংৰক্ষণ আৰু সংসাধন ঋণ)',
      kn: 'ಕೃಷಿ ಮೂಲಸೌಕರ್ಯ ನಿಧಿ (AIF ದಾಸ್ತಾನು ಮತ್ತು ಸಂಸ್ಕರಣಾ ಸಾಲ)'
    },
    why_needed: {
      en: 'You do not have a solar cold room or storage shed near your farm to prevent harvested crops from rotting.',
      hi: 'आपके खेत के पास फसल को सड़ने या खराब होने से बचाने के लिए सुरक्षित शेड या कोल्ड स्टोरेज नहीं है।',
      mr: 'काढणीनंतर माल खराब होऊ नये म्हणून शेताजवळ साठवणूक शेड किंवा सोलर कोल्ड स्टोरेजची सोय नाही.',
      or: 'ଅମଳ ପରେ ଫସଲ ନଷ୍ଟ ନହେବା ପାଇଁ ଆପଣଙ୍କ ଜମି ପାଖରେ କୌଣସି ଗୋଦାମ ବା କୋଲ୍ଡ ଷ୍ଟୋରେଜ୍ ସୁବିଧା ନାହିଁ।',
      as: 'শস্য নষ্ট নোহোৱাকৈ ৰাখিবলৈ পথাৰৰ ওচৰত কোনো সংৰক্ষণ গৃহ বা সৌৰ শীতলীকৰণৰ ব্যৱস্থা নাই।',
      kn: 'ಕೊಯ್ಲಿನ ನಂತರ ಬೆಳೆ ಹಾಳಾಗದಂತೆ ತಡೆಯಲು ಜಮೀನಿನ ಬಳಿ ಯಾವುದೇ ಗೋದಾಮು ಅಥವಾ ಸೋಲಾರ್ ಶೀತಲೀಕರಣ ಘಟಕವಿಲ್ಲ.'
    },
    how_it_helps: {
      en: 'Get an affordable bank loan with a 3% interest discount and government guarantee to build on-farm storage.',
      hi: 'अपने खेत पर गोदाम या सोलर कोल्ड स्टोरेज बनाने के लिए ३% सस्ती ब्याज दर पर आसान सरकारी लोन पाएं।',
      mr: 'स्वतःच्या शेतात गोदाम किंवा सोलर कोल्ड युनिट उभारण्यासाठी ३% व्याज सवलतीसह सुलभ बँक कर्ज मिळवा.',
      or: 'ନିଜ ଜମିରେ ଗୋଦାମ ବା ସୌର କୋଲ୍ଡ ଷ୍ଟୋରେଜ୍ ତିଆରି ପାଇଁ ୩% ସୁଧ ରିହାତିରେ ସହଜ ବ୍ୟାଙ୍କ ଋଣ ପାଆନ୍ତୁ।',
      as: 'নিজৰ পথাৰত গুদাম নিৰ্মাণ কৰিবলৈ ৩% ৰেহাই সুত আৰু চৰকাৰী নিশ্চিতিসহ সহজ বেংক ঋণ লাভ কৰক।',
      kn: 'ಸ್ವಂತ ಗೋದಾಮು ನಿರ್ಮಿಸಲು ೩% ಬಡ್ಡಿ ರಿಯಾಯಿತಿ ಮತ್ತು ಸರ್ಕಾರಿ ಖಾತರಿಯೊಂದಿಗೆ ಸುಲಭ ಸಾಲ ಪಡೆಯಿರಿ.'
    },
    portal_url: 'https://agriinfra.dac.gov.in',
    trigger_criteria: (farmer, dis) => true
  },

  // === 2. CROP MANAGEMENT & INPUT SUBSIDIES (crop_management) ===
  {
    scheme_id: 'S7',
    name: 'PM Krishi Sinchayee Yojana (PMKSY) — Per Drop More Crop (Micro-Irrigation)',
    category: 'crop_management',
    categories: ['crop_management', 'for_you'],
    urgency: 'HIGH',
    benefit_badge: {
      en: '55% Direct Subsidy on Drip & Sprinklers',
      hi: 'ड्रिप व फव्वारा सिंचाई पर ५५% सरकारी सब्सिडी',
      mr: 'ठिबक व तुषार सिंचनावर ५५% थेट सरकारी अनुदान',
      or: 'ବିନ୍ଦୁ ଓ ସ୍ପ୍ରିଙ୍କଲର ସେଟ୍ ଉପରେ ୫୫% ସବସିଡି',
      as: 'ড্ৰিপ আৰু স্প্ৰিংকলাৰত ৫৫% চৰকাৰী ৰাজসাহায্য',
      kn: 'ಹನಿ ಮತ್ತು ತುಂತುರು ನೀರಾವರಿಗೆ ಶೇ ೫೫ ನೇರ ಸಬ್ಸಿಡಿ'
    },
    title: {
      en: 'PMKSY Micro-Irrigation Drip & Sprinkler Subsidy',
      hi: 'प्रधानमंत्री कृषि सिंचाई योजना (ड्रिप एवं स्प्रिंकलर ५५% सब्सिडी)',
      mr: 'प्रधानमंत्री कृषी सिंचन योजना (ठिबक व तुषार सिंचन ५५% अनुदान)',
      or: 'ପ୍ରଧାନମନ୍ତ୍ରୀ କୃଷି ସିଞ୍ଚାଇ ଯୋଜନା (ବିନ୍ଦୁ ଓ ସ୍ପ୍ରିଙ୍କଲର ୫୫% ସବସିଡି)',
      as: 'প্ৰধানমন্ত্ৰী কৃষি সিঞ্চাই যোজনা (ড্ৰিপ আৰু স্প্ৰিংকলাৰ ৫৫% ৰাজসাহায্য)',
      kn: 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕೃಷಿ ಸಿಂಚಾಯಿ ಯೋಜನೆ (ಹನಿ/ತುಂತುರು ನೀರಾವರಿ ೫೫% ಸಬ್ಸಿಡಿ)'
    },
    why_needed: {
      en: 'Your farm depends heavily on rainfall and water in your well or borewell is running very low.',
      hi: 'आपकी फसल केवल बारिश पर निर्भर है और कुएं या बोरवेल में पानी का स्तर लगातार गिर रहा है।',
      mr: 'तुमची शेती पावसावर अवलंबून असून विहीर किंवा बोअरवेलमधील पाण्याची पातळी खालावली आहे.',
      or: 'ଆପଣଙ୍କ ଚାଷ କେବଳ ବର୍ଷା ଉପରେ ନିର୍ଭରଶୀଳ ଏବଂ କୂଅ ବା ବୋରୱେଲରେ ପାଣି କମିଯାଉଛି।',
      as: 'আপোনাৰ খেতি কেৱল বৰষুণৰ ওপৰত নিৰ্ভৰশীল আৰু নাদ বা নলীনাদৰ পানী কমি গৈছে।',
      kn: 'ನಿಮ್ಮ ಕೃಷಿ ಮಳೆಯನ್ನೇ ಅವಲಂಬಿಸಿದ್ದು ಬಾವಿ ಅಥವಾ ಬೋರ್‌ವೆಲ್‌ನಲ್ಲಿ ನೀರಿನ ಮಟ್ಟ ಕುಸಿದಿದೆ.'
    },
    how_it_helps: {
      en: 'Government pays 55% of the total cost directly to install modern drip irrigation or sprinkler sets in your field.',
      hi: 'खेत में ड्रिप पाइप या स्प्रिंकलर लगवाने के कुल खर्चे का ५५% पैसा सरकार सीधे आपके खाते में देती है।',
      mr: 'शेतात ठिबक किंवा तुषार सिंचन बसवण्यासाठी एकूण खर्चाच्या ५५% रक्कम सरकारकडून थेट अनुदान म्हणून मिळते.',
      or: 'ଜମିରେ ବିନ୍ଦୁ ବା ସ୍ପ୍ରିଙ୍କଲର ପାଇପ୍ ଲଗାଇବା ଖର୍ଚ୍ଚର ୫୫% ଟଙ୍କା ସରକାର ସିଧାସଳଖ ପ୍ରଦାନ କରନ୍ତି।',
      as: 'পথাৰত ড্ৰিপ বা স্প্ৰিংকলাৰ বহুৱাবলৈ মুঠ খৰচৰ ৫৫% ধন চৰকাৰে পোনপটীয়াকৈ ৰাজসাহায্য হিচাপে দিয়ে।',
      kn: 'ಜಮೀನಿನಲ್ಲಿ ಹನಿ ಅಥವಾ ತುಂತುರು ನೀರಾವರಿ ಅಳವಡಿಸಲು ತಗಲುವ ಒಟ್ಟು ವೆಚ್ಚದಲ್ಲಿ ಶೇ ೫೫ ಹಣವನ್ನು ಸರ್ಕಾರವೇ ಭರಿಸುತ್ತದೆ.'
    },
    portal_url: 'https://pmksy.gov.in',
    trigger_criteria: (farmer, dis) => ((farmer && farmer.irrigation_type === 'rainfed') || (farmer && farmer.borewell_failed) || (dis && dis.distress_score > 35))
  },
  {
    scheme_id: 'S8',
    name: 'National Mission on Natural Farming & Soil Health Card Scheme',
    category: 'crop_management',
    categories: ['crop_management'],
    urgency: 'MEDIUM',
    benefit_badge: {
      en: 'Free Soil Testing + 50% Organic Fertilizer Subsidy',
      hi: 'मुफ्त मिट्टी जांच + ५०% जैविक खाद छूट',
      mr: 'मोफत माती परीक्षण + ५०% सेंद्रिय खत अनुदान',
      or: 'ମାଗଣା ମାଟି ପରୀକ୍ଷା + ୫୦% ଜୈବିକ ଖତ ରିହାତି',
      as: 'বিনামূলীয়া মাটি পৰীক্ষা + ৫০% জৈৱিক সাৰ ৰাজসাহায্য',
      kn: 'ಉಚಿತ ಮಣ್ಣು ಪರೀಕ್ಷೆ + ೫೦% ಸಾವಯವ ಗೊಬ್ಬರ ಸಬ್ಸಿಡಿ'
    },
    title: {
      en: 'Soil Health Card & Organic Fertilizer Subsidy',
      hi: 'मृदा स्वास्थ्य कार्ड एवं जैविक खाद प्रोत्साहन योजना',
      mr: 'मृदा आरोग्य पत्रिका व सेंद्रिय खत प्रोत्साहन योजना',
      or: 'ମୃତ୍ତିକା ସ୍ୱାସ୍ଥ୍ୟ କାର୍ଡ ଓ ଜୈବିକ ଖତ ପ୍ରୋତ୍ସାହନ ଯୋଜନା',
      as: 'মৃত্তিকা স্বাস্থ্য কাৰ্ড আৰু জৈৱিক সাৰ প্ৰোৎসাহন আঁচনি',
      kn: 'ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಮತ್ತು ಸಾವಯವ ಕೃಷಿ ಪ್ರೋತ್ಸಾಹ ಯೋಜನೆ'
    },
    why_needed: {
      en: 'Chemical fertilizer costs are rising and your soil is losing moisture retention and strength.',
      hi: 'रासायनिक खाद पर बहुत ज्यादा खर्च हो रहा है और खेत की मिट्टी की उपजाऊ शक्ति कमजोर हो रही है।',
      mr: 'रासायनिक खतांचा खर्च खूप वाढला असून शेतातील मातीची पाणी धरून ठेवण्याची क्षमता कमी होत आहे.',
      or: 'ରାସାୟନିକ ଖତର ଖର୍ଚ୍ଚ ବଢ଼ିଚାଲିଛି ଏବଂ ଜମିର ଉର୍ବରତା ତଥା ପାଣି ଧରି ରଖିବା ଶକ୍ତି କମୁଛି।',
      as: 'ৰাসায়নিক সাৰৰ খৰচ বৃদ্ধি পাইছে আৰু পথাৰৰ মাটিৰ উৰ্বৰতা হ্ৰাস পাইছে।',
      kn: 'ರಸಗೊಬ್ಬರಗಳ ಖರ್ಚು ಹೆಚ್ಚಾಗುತ್ತಿದ್ದು ಜಮೀನಿನ ಫಲವತ್ತತೆ ಮತ್ತು ತೇವಾಂಶ ಹಿಡಿದಿಡುವ ಸಾಮರ್ಥ್ಯ ಕಡಿಮೆಯಾಗುತ್ತಿದೆ.'
    },
    how_it_helps: {
      en: 'Get your farm soil tested 100% free by experts, and receive a 50% government subsidy on bio-fertilizers and micronutrients.',
      hi: 'कृषि वैज्ञानिकों से अपनी मिट्टी की १००% मुफ्त जांच कराएं और जैविक खाद पर ५०% सरकारी छूट पाएं।',
      mr: 'तज्ज्ञांकडून जमिनीची १००% मोफत माती तपासणी करून घ्या आणि सेंद्रिय खतांवर ५०% सरकारी सवलत मिळवा.',
      or: 'କୃଷି ବିଶେଷଜ୍ଞଙ୍କ ଦ୍ୱାରା ମାଟିର ମାଗଣା ପରୀକ୍ଷା କରାଇ ଜୈବିକ ଖତ ଉପରେ ୫୦% ସରକାରୀ ସବସିଡି ପାଆନ୍ତୁ।',
      as: 'কৃষি বিশেষজ্ঞৰ দ্বাৰা মাটিৰ ১০০% বিনামূলীয়া পৰীক্ষা কৰাওক আৰু জৈৱিক সাৰত ৫০% চৰকাৰী ৰাজসাহায্য লাভ কৰক।',
      kn: 'ಕೃಷಿ ತಜ್ಞರಿಂದ ಉಚಿತ ಮಣ್ಣು ಪರೀಕ್ಷೆ ಮಾಡಿಸಿ ಮತ್ತು ಜೈವಿಕ ಗೊಬ್ಬರಗಳಿಗೆ ಸರ್ಕಾರದಿಂದ ೫೦% ಸಬ್ಸಿಡಿ ಪಡೆಯಿರಿ.'
    },
    portal_url: 'https://soilhealth.dac.gov.in',
    trigger_criteria: (farmer, dis) => true
  },
  {
    scheme_id: 'S9',
    name: 'ICAR-CRIDA Contingency Crop Seed Distribution (NFSM / Seeds Mission)',
    category: 'crop_management',
    categories: ['crop_management', 'for_you'],
    urgency: 'HIGH',
    benefit_badge: {
      en: '100% Free Short-Duration Seed Mini-Kits',
      hi: '१००% मुफ्त कम अवधि वाले सूखा-रोधी बीज',
      mr: '१००% मोफत कमी कालावधीचे दुष्काळ-प्रतिरोधक बियाणे',
      or: '୧୦୦% ମାଗଣା ମରୁଡ଼ି-ସହଣୀୟ ବିହନ କିଟ୍',
      as: '১০০% বিনামূলীয়া খৰাং-প্ৰতিৰোধী বীজ কিট',
      kn: '೧೦೦% ಉಚಿತ ಬರ-ನಿರೋಧಕ ಬೀಜ ಮಿನಿ-ಕಿಟ್‌ಗಳು'
    },
    title: {
      en: 'ICAR-CRIDA Drought Contingency Seed Mini-Kit Distribution',
      hi: 'आईसीएआर-क्रीडा सूखा आकस्मिक बीज मिनी-किट वितरण',
      mr: 'ICAR-CRIDA दुष्काळ आपत्कालीन बियाणे किट वाटप योजना',
      or: 'ICAR-CRIDA ମରୁଡ଼ି ଆପତକାଳୀନ ବିହନ ମିନି-କିଟ୍ ବଣ୍ଟନ',
      as: 'ICAR-CRIDA খৰাংকালীন বীজ মিনি-কিট বিতৰণ আঁচনি',
      kn: 'ICAR-CRIDA ಬರಗಾಲ ತುರ್ತು ಬೀಜ ಮಿನಿ-ಕಿಟ್ ವಿತರಣಾ ಯೋಜನೆ'
    },
    why_needed: {
      en: 'Monsoon was delayed by more than 10 days and main long-duration crop sowing window has passed.',
      hi: 'मानसून में १० दिन से ज्यादा की देरी हो गई है और मुख्य फसल बोने का समय निकल चुका है।',
      mr: 'पावसाला १० दिवसांपेक्षा जास्त उशीर झाला असून मुख्य पिकाच्या पेरणीची वेळ निघून गेली आहे.',
      or: 'ମୌସୁମୀ ବର୍ଷା ୧୦ ଦିନରୁ ଅଧିକ ବିଳମ୍ବ ହୋଇଛି ଏବଂ ମୁଖ୍ୟ ଫସଲ ବୁଣିବା ସମୟ ବିତିଯାଇଛି।',
      as: 'বাৰিষা ১০ দিনতকৈ অধিক পলম হ’ল আৰু মূল শস্য সিঁচাৰ সময় পাৰ হৈ গ’ল।',
      kn: 'ಮುಂಗಾರು ಮಳೆ ೧೦ ದಿನಗಳಿಗಿಂತ ತಡವಾಗಿದ್ದು ಮುಖ್ಯ ಬೆಳೆ ಬಿತ್ತನೆ ಸಮಯ ಮೀರಿಹೋಗಿದೆ.'
    },
    how_it_helps: {
      en: 'Collect certified short-duration drought-tolerant seeds (Bajra, Horsegram, Pulses) 100% free from your block agriculture office.',
      hi: 'कम समय में तैयार होने वाले सूखा-सहनशील बीज (बाजरा, कुलथी, दालें) अपने ब्लॉक कृषि केंद्र से १००% मुफ्त प्राप्त करें।',
      mr: 'कमी कालावधीत भरपूर उत्पादन देणारे बियाणे (बाजरी, हुलगा, कडधान्ये) तालुका कृषी कार्यालयातून १००% मोफत मिळवा.',
      or: 'କମ୍ ସମୟରେ ଅମଳ ହେଉଥିବା ମରୁଡ଼ି-ସହଣୀୟ ବିହନ (ବାଜରା, କୋଳଥ, ଡାଲି) ବ୍ଲକ୍ କୃଷି ଅଫିସରୁ ୧୦୦% ମାଗଣାରେ ସଂଗ୍ରହ କରନ୍ତୁ।',
      as: 'কম দিনত উৎপাদিত হোৱা খৰাং-সহনশীল বীজ (বাজৰা, দাইল) ব্লক কৃষি কাৰ্যালয়ৰ পৰা ১০০% বিনামূলীয়াকৈ সংগ্ৰহ কৰক।',
      kn: 'ಕಡಿಮೆ ಅವಧಿಯಲ್ಲಿ ಬೆಳೆಯುವ ಬರ-ನಿರೋಧಕ ಬೀಜಗಳನ್ನು (ಸಜ್ಜೆ, ಹುರುಳಿ, ಕಾಳುಗಳು) ತಾಲೂಕು ಕೃಷಿ ಕಚೇರಿಯಿಂದ ೧೦೦% ಉಚಿತವಾಗಿ ಪಡೆಯಿರಿ.'
    },
    portal_url: 'https://crida.in',
    trigger_criteria: (farmer, dis) => ((dis && dis.onset_delay_days > 7) || (dis && dis.dry_spell_days > 7) || (dis && dis.distress_score > 40))
  },
  {
    scheme_id: 'S10',
    name: 'Sub-Mission on Agricultural Mechanization (SMAM) Custom Hiring',
    category: 'crop_management',
    categories: ['crop_management'],
    urgency: 'LOW',
    benefit_badge: {
      en: '40-50% Subsidized Machinery Rental & Solar Pumps',
      hi: 'ट्रैक्टर व मशीन किराए पर ४०-५०% सरकारी छूट',
      mr: 'ट्रॅक्टर व अवजारे भाड्यावर ४०-५०% सरकारी सवलत',
      or: 'ଟ୍ରାକ୍ଟର ଓ ଯନ୍ତ୍ରପାତି ଭଡ଼ାରେ ୪୦-୫୦% ସବସିଡି',
      as: 'ট্ৰেক্টৰ আৰু যন্ত্ৰৰ ভাড়াত ৪০-৫০% চৰকাৰী ৰাজসাহায্য',
      kn: 'ಟ್ರ್ಯಾಕ್ಟರ್ ಮತ್ತು ಯಂತ್ರಗಳ ಬಾಡಿಗೆಗೆ ೪೦-೫೦% ಸಬ್ಸಿಡಿ'
    },
    title: {
      en: 'SMAM Custom Farm Machinery Rental Center',
      hi: 'कृषि यंत्रीकरण उप-मिशन (कस्टम हायरिंग सेंटर एवं उपकरण सब्सिडी)',
      mr: 'कृषी यांत्रिकीकरण उप-अभियान (कस्टम हायरिंग केंद्र व अवजारे अनुदान)',
      or: 'କୃଷି ଯନ୍ତ୍ରୀକରଣ ଉପ-ମିଶନ (ଯନ୍ତ୍ରପାତି ଭଡ଼ା କେନ୍ଦ୍ର ସୁବିଧା)',
      as: 'কৃষি যান্ত্ৰিকীকৰণ উপ-মিছন (যন্ত্ৰপাতি ভাড়াকেন্দ্ৰ ৰাজসাহায্য)',
      kn: 'ಕೃಷಿ ಯಾಂತ್ರೀಕರಣ ಉಪ-ಮಿಷನ್ (ಯಂತ್ರೋಪಕರಣ ಬಾಡಿಗೆ ಕೇಂದ್ರ ಯೋಜನೆ)'
    },
    why_needed: {
      en: 'Farm labor is scarce and purchasing heavy machinery like tractors or power sprayers is unaffordable.',
      hi: 'मजदूरों की कमी है और जुताई-कटाई के लिए महंगे ट्रैक्टर या स्प्रेयर मशीन खरीदना संभव नहीं है।',
      mr: 'मजुरांची टंचाई आहे आणि नांगरणी, फवारणीसाठी स्वतःचे महागडे ट्रॅक्टर किंवा यंत्रे खरेदी करणे परवडत नाही.',
      or: 'ମୂଲିଆ ମିଳିବା କଷ୍ଟକର ଏବଂ ଚାଷ ପାଇଁ ଦାମୀ ଟ୍ରାକ୍ଟର କିମ୍ବା ମେସିନ୍ କିଣିବା ସମ୍ଭବ ନୁହେଁ।',
      as: 'শ্ৰমিকৰ নাটনি হৈছে আৰু খেতিৰ বাবে দামী ট্ৰেক্টৰ বা স্প্ৰেয়াৰ যন্ত্ৰ ক্ৰয় কৰিব পৰা সামৰ্থ্য নাই।',
      kn: 'ಕೂಲಿ ಆಳುಗಳ ಕೊರತೆಯಿದ್ದು ಸ್ವಂತ ದುಬಾರಿ ಟ್ರ್ಯಾಕ್ಟರ್ ಅಥವಾ ಸಿಂಪಡಣೆ ಯಂತ್ರಗಳನ್ನು ಖರೀದಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.'
    },
    how_it_helps: {
      en: 'Book modern tractors, zero-till drills, and solar pumps from your village center at 40-50% government subsidized rental rates.',
      hi: 'गांव के कस्टम हायरिंग केंद्र से ४०-५०% सस्ते सरकारी किराए पर आधुनिक ट्रैक्टर और मशीनें बुक करें।',
      mr: 'गावातील कृषी केंद्रावरून ४०-५०% सवलतीच्या शासकीय दराने आधुनिक ट्रॅक्टर आणि अवजारे भाड्याने मिळवा.',
      or: 'ଗାଁର କଷ୍ଟମ ହାୟରିଂ କେନ୍ଦ୍ରରୁ ୪୦-୫୦% ଶସ୍ତା ସରକାରୀ ଭଡ଼ାରେ ଆଧୁନିକ ଟ୍ରାକ୍ଟର ଓ ଯନ୍ତ୍ରପାତି ବ୍ୟବହାର କରନ୍ତୁ।',
      as: 'গাঁওৰ কেন্দ্ৰৰ পৰা ৪০-৫০% কম চৰকাৰী ভাড়াত উন্নত ট্ৰেক্টৰ আৰু যন্ত্ৰপাতি ব্যৱহাৰ কৰক।',
      kn: 'ಗ್ರಾಮದ ಕೇಂದ್ರದಿಂದ ಶೇ ೪೦-೫೦ ರಿಯಾಯಿತಿ ದರದಲ್ಲಿ ಆಧುನಿಕ ಟ್ರ್ಯಾಕ್ಟರ್ ಮತ್ತು ಕೃಷಿ ಯಂತ್ರಗಳನ್ನು ಬಾಡಿಗೆಗೆ ಪಡೆಯಿರಿ.'
    },
    portal_url: 'https://agrimachinery.nic.in',
    trigger_criteria: (farmer, dis) => true
  },

  // === 3. DISASTER & CLIMATE RELIEF (disaster) ===
  {
    scheme_id: 'S1',
    name: 'PMFBY (Pradhan Mantri Fasal Bima Yojana - Comprehensive Crop Insurance)',
    category: 'disaster',
    categories: ['disaster', 'for_you'],
    urgency: 'CRITICAL',
    benefit_badge: {
      en: 'Direct Bank Insurance Payout for Crop Loss',
      hi: 'फसल नुकसान का सीधा बीमा क्लेम बैंक खाते में',
      mr: 'पीक नुकसानीचा थेट विमा क्लेम बँक खात्यात',
      or: 'ଫସଲ କ୍ଷତିର ସିଧାସଳଖ ବୀମା କ୍ଲେମ୍ ରାଶି ବ୍ୟାଙ୍କ ଖାତାରେ',
      as: 'শস্য ক্ষতিৰ পোনপটীয়া বীমা ক্ষতিপূৰণ বেংক একাউণ্টত',
      kn: 'ಬೆಳೆ ನಷ್ಟಕ್ಕೆ ನೇರ ವಿಮಾ ಪರಿಹಾರ ಹಣ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ'
    },
    title: {
      en: 'PMFBY Crop Loss Insurance Claim & Sowing Relief',
      hi: 'प्रधानमंत्री फसल बीमा योजना (PMFBY फसल नुकसान मुआवजा)',
      mr: 'प्रधानमंत्री पीक विमा योजना (PMFBY पीक नुकसान भरपाई)',
      or: 'ପ୍ରଧାନମନ୍ତ୍ରୀ ଫସଲ ବୀମା ଯୋଜନା (PMFBY ଫସଲ କ୍ଷତିପୂରଣ)',
      as: 'প্ৰধানমন্ত্ৰী ফচল বীমা যোজনা (PMFBY শস্য ক্ষতিপূৰণ)',
      kn: 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ (PMFBY ಬೆಳೆ ನಷ್ಟ ಪರಿಹಾರ)'
    },
    why_needed: {
      en: 'Severe dry spell, heavy rainfall deficit, or unseasonal calamity damaged your standing crop or prevented sowing.',
      hi: 'गंभीर सूखे, कम बारिश या बेमौसम आंधी-तूफान के कारण आपकी खड़ी फसल बर्बाद हो गई या बुआई नहीं हो पाई।',
      mr: 'तीव्र दुष्काळ, पावसाचा खंड किंवा अवकाळी संकटाने उभे पीक वाया गेले किंवा पेरणीच होऊ शकली नाही.',
      or: 'ପ୍ରବଳ ମରୁଡ଼ି, କମ୍ ବର୍ଷା କିମ୍ବା ପ୍ରାକୃତିକ ବିପର୍ଯ୍ୟୟ ଯୋଗୁଁ ଠିଆ ଫସଲ ନଷ୍ଟ ହୋଇଛି ବା ବୁଣା ହୋଇପାରି ନାହିଁ।',
      as: 'তীব্ৰ খৰাং বা প্ৰাকৃতিক দুৰ্যোগৰ ফলত আপোনাৰ পথাৰৰ শস্য ধ্বংস হ’ল বা সিঁচিব পৰা নগ’ল।',
      kn: 'ತೀವ್ರ ಬರ, ಮಳೆಯ ಕೊರತೆ ಅಥವಾ ಪ್ರಕೃತಿ ವಿಕೋಪದಿಂದ ಜಮೀನಿನ ಬೆಳೆ ನಾಶವಾಗಿದೆ ಅಥವಾ ಬಿತ್ತನೆ ವಿಫಲವಾಗಿದೆ.'
    },
    how_it_helps: {
      en: 'File a localized claim within 72 hours and receive full crop loss insurance money credited directly to your bank account.',
      hi: '७२ घंटे के अंदर नुकसान की सूचना दर्ज कराएं और फसल नुकसान का पूरा बीमा क्लेम सीधे अपने बैंक खाते में पाएं।',
      mr: '७२ तासांच्या आत नुकसानीची पूर्वसूचना नोंदवा आणि पूर्ण पीक विमा भरपाई थेट बँक खात्यात मिळवा.',
      or: '୭୨ ଘଣ୍ଟା ମଧ୍ୟରେ କ୍ଷତିର ସୂଚନା ଦିଅନ୍ତୁ ଏବଂ ସମ୍ପୂର୍ଣ୍ଣ ବୀମା କ୍ଷତିପୂରଣ ଟଙ୍କା ସିଧାସଳଖ ବ୍ୟାଙ୍କ ଖାତାରେ ପାଆନ୍ତୁ।',
      as: '৭২ ঘণ্টাৰ ভিতৰত ক্ষতিৰ আবেদন জনাওক আৰু সম্পূৰ্ণ শস্য বীমা ক্ষতিপূৰণ পোনে পোনে বেংক একাউণ্টত লাভ কৰক।',
      kn: '೭೨ ಗಂಟೆಗಳ ಒಳಗೆ ಹಾನಿಯ ಮಾಹಿತಿ ನೀಡಿ ಮತ್ತು ಸಂಪೂರ್ಣ ಬೆಳೆ ವಿಮಾ ಪರಿಹಾರ ಹಣವನ್ನು ನೇರವಾಗಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಪಡೆಯಿರಿ.'
    },
    portal_url: 'https://pmfby.gov.in',
    trigger_criteria: (farmer, dis) => ((dis && dis.distress_score > 45) || (dis && dis.rainfall_deficit_pct > 20) || (farmer && farmer.has_pmfby_insurance === 0))
  },
  {
    scheme_id: 'S4',
    name: 'State Disaster Response Fund (SDRF) / NDRF Calamity Compensation',
    category: 'disaster',
    categories: ['disaster', 'for_you'],
    urgency: 'CRITICAL',
    benefit_badge: {
      en: 'Up to ₹17,000 / Hectare Calamity Grant + Bill Waiver',
      hi: '₹१७,०००/हेक्टेयर आपातकालीन अनुदान + बिजली बिल छूट',
      mr: 'प्रति हेक्टर ₹१७,००० पर्यंत मदत + वीज बिल माफी',
      or: 'ହେକ୍ଟର ପିଛା ₹୧୭,୦୦୦ ପର୍ଯ୍ୟନ୍ତ ସହାୟତା + ବିଦ୍ୟୁତ୍ ବିଲ୍ ଛାଡ଼',
      as: 'হেক্টৰত ₹১৭,০০০ লৈকে অনুদান + বিদ্যুৎ বিল ৰেহাই',
      kn: 'ಹೆಕ್ಟೇರ್‌ಗೆ ₹೧೭,೦೦೦ ವರೆಗೆ ಪರಿಹಾರ + ವಿದ್ಯುತ್ ಬಿಲ್ ಮನ್ನಾ'
    },
    title: {
      en: 'State Disaster Response Fund (SDRF / NDRF Calamity Grant)',
      hi: 'राज्य आपदा राहत कोष (SDRF / NDRF आपातकालीन सूखा सहायता)',
      mr: 'राज्य आपत्ती निवारण निधी (SDRF / NDRF आपत्कालीन दुष्काळ मदत)',
      or: 'ରାଜ୍ୟ ବିପର୍ଯ୍ୟୟ ପ୍ରଶମନ ପାଣ୍ଠି (SDRF / NDRF ଜରୁରୀକାଳୀନ ସହାୟତା)',
      as: 'ৰাজ্যিক দুৰ্যোগ সাহায্য পুঁজি (SDRF / NDRF জৰুৰীকালীন সাহায্য)',
      kn: 'ರಾಜ್ಯ ವಿಪತ್ತು ಪರಿಹಾರ ನಿಧಿ (SDRF / NDRF ತುರ್ತು ಬರ ಪರಿಹಾರ)'
    },
    why_needed: {
      en: 'Your district has officially declared widespread agrarian drought and your farm is severely distressed.',
      hi: 'आपके जिले में आधिकारिक रूप से सूखा घोषित किया गया है और आपकी आजीविका संकट में है।',
      mr: 'तुमच्या तालुक्यात अधिकृतपणे दुष्काळ जाहीर झाला असून शेतीचे मोठे आर्थिक नुकसान झाले आहे.',
      or: 'ଆପଣଙ୍କ ଜିଲ୍ଲାରେ ସରକାରୀ ଭାବେ ମରୁଡ଼ି ଘୋଷଣା ହୋଇଛି ଏବଂ ଆପଣଙ୍କ ରୋଜଗାର ପ୍ରଭାବିତ ହୋଇଛି।',
      as: 'আপোনাৰ জিলাত চৰকাৰীভাৱে খৰাং ঘোষণা কৰা হৈছে আৰু আপোনাৰ জীৱিকা সংকটত পৰিছে।',
      kn: 'ನಿಮ್ಮ ಜಿಲ್ಲೆಯಲ್ಲಿ ಅಧಿಕೃತವಾಗಿ ಬರ ಘೋಷಣೆಯಾಗಿದ್ದು ನಿಮ್ಮ ಕೃಷಿ ಜೀವನ ಸಂಕಷ್ಟದಲ್ಲಿದೆ.'
    },
    how_it_helps: {
      en: 'Receive up to ₹17,000 per hectare emergency cash grant credited by direct bank transfer, plus full agricultural power tariff waiver.',
      hi: 'प्रति हेक्टेयर ₹१७,००० तक की सीधी आपातकालीन सरकारी आर्थिक मदद और खेती के बिजली बिल में पूरी छूट पाएं।',
      mr: 'प्रति हेक्टर ₹१७,००० पर्यंत थेट बँक खात्यात तातडीची रोख मदत आणि शेतीपंपाच्या वीज बिलात संपूर्ण माफी मिळवा.',
      or: 'ପ୍ରତି ହେକ୍ଟର ପିଛା ₹୧୭,୦୦୦ ପର୍ଯ୍ୟନ୍ତ ନଗଦ ସହାୟତା ସିଧା ବ୍ୟାଙ୍କ ଖାତାରେ ଏବଂ ଚାଷ ବିଦ୍ୟୁତ୍ ବିଲ୍ ସମ୍ପୂର୍ଣ୍ଣ ଛାଡ଼ ପାଆନ୍ତୁ।',
      as: 'প্ৰতি হেক্টৰত ₹১৭,০০০ লৈকে জৰুৰীকালীন নগদ সাহায্য পোনে পোনে বেংক একাউণ্টত আৰু কৃষি বিদ্যুৎ বিল ৰেহাই লাভ কৰক।',
      kn: 'ಪ್ರತಿ ಹೆಕ್ಟೇರ್‌ಗೆ ₹೧೭,೦೦೦ ವರೆಗೆ ನೇರ ಪರಿಹಾರ ಧನ ಮತ್ತು ಕೃಷಿ ಪಂಪ್‌ಸೆಟ್ ವಿದ್ಯುತ್ ಬಿಲ್‌ನಲ್ಲಿ ಸಂಪೂರ್ಣ ರಿಯಾಯಿತಿ ಪಡೆಯಿರಿ.'
    },
    portal_url: 'https://mahabhumi.gov.in',
    trigger_criteria: (farmer, dis) => ((dis && dis.distress_score > 60) || (dis && dis.structural_risk_context && dis.structural_risk_context.district_fragility_index > 70))
  },
  {
    scheme_id: 'S11',
    name: 'Restructured Weather Based Crop Insurance Scheme (RWBCIS)',
    category: 'disaster',
    categories: ['disaster'],
    urgency: 'HIGH',
    benefit_badge: {
      en: 'Automated Weather-Triggered Bank Payout',
      hi: 'मौसम केंद्र आंकड़ों से सीधा स्वचालित बैंक भुगतान',
      mr: 'हवामान नोंदींवर आधारित थेट स्वयंचलित भरपाई',
      or: 'ପାଣିପାଗ ତଥ୍ୟ ଆଧାରରେ ସ୍ୱୟଂଚାଳିତ ବ୍ୟାଙ୍କ କ୍ଷତିପୂରଣ',
      as: 'বতৰ তথ্যৰ ভিত্তিত স্বয়ংক্ৰিয় বেংক ক্ষতিপূৰণ',
      kn: 'ಹವಾಮಾನ ಆಧಾರಿತ ಸ್ವಯಂಚಾಲಿತ ನೇರ ಪರಿಹಾರ ಪಾವತಿ'
    },
    title: {
      en: 'Restructured Weather Based Crop Insurance (RWBCIS)',
      hi: 'पुनर्गठित मौसम आधारित फसल बीमा योजना (RWBCIS)',
      mr: 'पुनर्रचित हवामान आधारित पीक विमा योजना (RWBCIS)',
      or: 'ପୁନର୍ଗଠିତ ପାଣିପାଗ ଭିତ୍ତିକ ଫସଲ ବୀମା ଯୋଜନା (RWBCIS)',
      as: 'পুনৰ্গঠিত বতৰভিত্তিক শস্য বীমা আঁচনি (RWBCIS)',
      kn: 'ಹವಾಮಾನ ಆಧಾರಿತ ಬೆಳೆ ವಿಮೆ ಯೋಜನೆ (RWBCIS)'
    },
    why_needed: {
      en: 'Unseasonal temperature spikes, high humidity, or sudden localized cloudbursts ruined your horticulture crops.',
      hi: 'अचानक तेज तापमान, बेमौसम अत्यधिक बारिश या ओलावृष्टि से आपकी फल या संवेदनशील फसल बर्बाद हुई है।',
      mr: 'अचानक वाढलेले तापमान, गारपीट किंवा अवकाळी अतिवृष्टीमुळे फळबागा किंवा नाजूक पिकांचे नुकसान झाले आहे.',
      or: 'ଅତ୍ୟଧିକ ଖରା, କୁଆପଥର ମାଡ଼ କିମ୍ବା ଅଦିନିଆ ପ୍ରବଳ ବର୍ଷାରେ ପନିପରିବା ବା ଫଳ ଫସଲ ନଷ୍ଟ ହୋଇଛି।',
      as: 'অস্বাভাৱিক গৰম বা অসময়ৰ ধুমুহা-বৰষুণত আপোনাৰ ফল-মূল বা শস্যৰ ব্যাপক ক্ষতি হৈছে।',
      kn: 'ಅತಿಯಾದ ತಾಪಮಾನ, ಅಕಾಲಿಕ ಅತಿವೃಷ್ಟಿ ಅಥವಾ ಆಲಿಕಲ್ಲು ಮಳೆಯಿಂದ ತೋಟಗಾರಿಕೆ ಬೆಳೆಗಳು ಹಾನಿಗೊಳಗಾಗಿವೆ.'
    },
    how_it_helps: {
      en: 'Get compensation credited automatically to your bank account based on government weather station data without needing a field panchnama.',
      hi: 'बिना किसी कागजी सर्वे या पंचनामे के, सरकारी मौसम केंद्र के आंकड़ों के आधार पर सीधा पैसा बैंक खाते में आ जाता है।',
      mr: 'कोणत्याही पंचनाम्याची वाट न पाहता सरकारी हवामान केंद्राच्या नोंदीनुसार थेट नुकसान भरपाई खात्यात जमा होते.',
      or: 'କୌଣସି ପଞ୍ଚନାମା ନକରି ସରକାରୀ ପାଣିପାଗ କେନ୍ଦ୍ରର ତଥ୍ୟ ଆଧାରରେ ସିଧାସଳଖ ଟଙ୍କା ବ୍ୟାଙ୍କ ଖାତାରେ ଆସିଯାଏ।',
      as: 'কোনো পঞ্চনামাৰ প্ৰয়োজন নোহোৱাকৈ বতৰ কেন্দ্ৰৰ তথ্যৰ ভিত্তিত পোনপটীয়া ক্ষতিপূৰণ বেংক একাউণ্টত জমা হয়।',
      kn: 'ಯಾವುದೇ ಸ್ಥಳ ತಪಾಸಣೆ ಇಲ್ಲದೆ ಹವಾಮಾನ ಕೇಂದ್ರದ ಮಾಹಿತಿ ಆಧಾರದ ಮೇಲೆ ನೇರವಾಗಿ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಪರಿಹಾರ ಜಮೆಯಾಗುತ್ತದೆ.'
    },
    portal_url: 'https://pmfby.gov.in',
    trigger_criteria: (farmer, dis) => true
  },
  {
    scheme_id: 'S12',
    name: 'Emergency Cattle Fodder Subsidy & Drought Relief Camp Program',
    category: 'disaster',
    categories: ['disaster', 'for_you'],
    urgency: 'HIGH',
    benefit_badge: {
      en: 'Free Cattle Green Fodder, Water & Medical Care',
      hi: 'पशुओं के लिए मुफ्त चारा, पानी एवं दवाइयां',
      mr: 'जनावरांसाठी मोफत चारा, पाणी व औषधोपचार',
      or: 'ପଶୁଙ୍କ ପାଇଁ ମାଗଣା ଘାସ, ପାଣି ଓ ଡାକ୍ତରୀ ଚିକିତ୍ସା',
      as: 'পশুধনৰ বাবে বিনামূলীয়া খাদ্য, পানী আৰু চিকিৎসা',
      kn: 'ಜಾನುವಾರುಗಳಿಗೆ ಉಚಿತ ಮೇವು, ನೀರು ಮತ್ತು ವೈದ್ಯಕೀಯ ಸೇವೆ'
    },
    title: {
      en: 'Emergency Drought Cattle Camp & Green Fodder Subsidy',
      hi: 'आपातकालीन सूखा राहत पशु छावनी एवं चारा सहायता',
      mr: 'आपत्कालीन दुष्काळ जनावरांची छावणी व चारा अनुदान',
      or: 'ଜରୁରୀକାଳୀନ ମରୁଡ଼ି ଗୋ-ସହାୟତା ଶିବିର ଓ ଘାସ ସବସିଡି',
      as: 'জৰুৰীকালীন খৰাং পশু সাহায্য শিবিৰ আৰু খাদ্য যোগান',
      kn: 'ತುರ್ತು ಬರಗಾಲ ಜಾನುವಾರು ಶಿಬಿರ ಮತ್ತು ಮೇವು ಸಬ್ಸಿಡಿ'
    },
    why_needed: {
      en: 'Severe drought dried up grass and water sources, leaving your farm livestock without daily fodder.',
      hi: 'सूखे के कारण खेतों में चारा खत्म हो गया है और मवेशियों के लिए पीने के पानी और चारे का गंभीर संकट है।',
      mr: 'तीव्र दुष्काळामुळे शेतात चारा संपला असून जनावरांसाठी चारा आणि पिण्याच्या पाण्याचा गंभीर प्रश्न निर्माण झाला आहे.',
      or: 'ମରୁଡ଼ି ଯୋଗୁଁ ଘାସ ଶୁଖିଯାଇଛି ଏବଂ ଗୃହପାଳିତ ପଶୁଙ୍କ ପାଇଁ ଖାଦ୍ୟ ଓ ପାଣିର ଘୋର ଅଭାବ ଦେଖାଦେଇଛି।',
      as: 'খৰাং পৰিস্থিতিৰ বাবে ঘাঁহ-বন শুকাই গৈছে আৰু পশুধনৰ খাদ্য তথা খোৱাপানীৰ নাটনি হৈছে।',
      kn: 'ತೀವ್ರ ಬರಗಾಲದಿಂದ ಹೊಲದಲ್ಲಿ ಮೇವು ಮುಗಿದಿದ್ದು ಜಾನುವಾರುಗಳಿಗೆ ಕುಡಿಯುವ ನೀರು ಮತ್ತು ಮೇವಿನ ತೀವ್ರ ಕೊರತೆಯಾಗಿದೆ.'
    },
    how_it_helps: {
      en: 'Register your cattle at the taluka drought relief camp to receive free nutritious green fodder, clean drinking water, and veterinary medicine.',
      hi: 'तालुका राहत पशु शिविर में अपने पशुओं का पंजीकरण कराएं और मुफ्त पौष्टिक हरा चारा, पानी और डॉक्टर की दवाइयां प्राप्त करें।',
      mr: 'तालुका दुष्काळ चारा छावणीत जनावरांची नोंदणी करा आणि मोफत सकस हिरवा चारा, पाणी व डॉक्टरांची औषधे मिळवा.',
      or: 'ବ୍ଲକ୍ ରିଲିଫ୍ କ୍ୟାମ୍ପରେ ପଶୁଙ୍କ ନାମ ଲେଖାନ୍ତୁ ଏବଂ ମାଗଣାରେ ସବୁଜ ଘାସ, ପିଇବା ପାଣି ଓ ଡାକ୍ତରୀ ଚିକିତ୍ସା ପାଆନ୍ତୁ।',
      as: 'সাহায্য শিবিৰত পশুধনৰ নাম পঞ্জীয়ন কৰক আৰু বিনামূলীয়া সেউজীয়া খাদ্য, বিশুদ্ধ পানী আৰু পশু চিকিৎসা লাভ কৰক।',
      kn: 'ತಾಲೂಕು ಬರ ಶಿಬಿರದಲ್ಲಿ ಜಾನುವಾರುಗಳನ್ನು ನೋಂದಾಯಿಸಿ ಮತ್ತು ಉಚಿತ ಹಸಿರು ಮೇವು, ನೀರು ಮತ್ತು ಪಶುವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ ಪಡೆಯಿರಿ.'
    },
    portal_url: 'https://dahd.nic.in',
    trigger_criteria: (farmer, dis) => ((dis && dis.distress_score > 65))
  }
];

function getPersonalizedSchemes(farmer, distress) {
  if (!farmer) return ALL_GOVT_SCHEMES.filter(s => s.categories && s.categories.includes('for_you'));

  // 1. Gather all schemes whose trigger_criteria matches
  let matched = ALL_GOVT_SCHEMES.filter(s => {
    try {
      return s.trigger_criteria && s.trigger_criteria(farmer, distress);
    } catch (e) {
      return false;
    }
  });

  const dScore = distress ? (distress.distress_score || 0) : 0;

  // 2. Dynamic distress & signal prioritization:
  // If price deficit / market shock is high, ensure S3 (e-NAM/WDRA) is included
  const isMarketShock = (distress && distress.top_contributing_signal && distress.top_contributing_signal.dimension === 'exposure_hazard') ||
                        (farmer && farmer.crop_stage === 'harvest');
  if (isMarketShock && !matched.some(m => m.scheme_id === 'S3')) {
    const s3 = ALL_GOVT_SCHEMES.find(s => s.scheme_id === 'S3');
    if (s3) matched.unshift(s3);
  }

  // If distress score > 50, prioritize critical financial and disaster relief schemes
  if (dScore > 50) {
    const priorityIds = ['S1', 'S2', 'S4', 'S3'];
    priorityIds.forEach(id => {
      const idx = matched.findIndex(m => m.scheme_id === id);
      if (idx > -1) {
        const item = matched.splice(idx, 1)[0];
        matched.unshift(item);
      } else {
        const item = ALL_GOVT_SCHEMES.find(s => s.scheme_id === id);
        if (item) matched.push(item);
      }
    });
  }

  // Remove any duplicates while preserving priority order
  const uniqueMatched = [];
  const seenIds = new Set();
  matched.forEach(s => {
    if (!seenIds.has(s.scheme_id)) {
      seenIds.add(s.scheme_id);
      uniqueMatched.push(s);
    }
  });

  // 3. Fallback: if no matches or empty distress, provide clean baseline safety net
  if (uniqueMatched.length === 0) {
    return ALL_GOVT_SCHEMES.filter(s => ['S1', 'S2', 'S7', 'S3'].includes(s.scheme_id));
  }

  return uniqueMatched;
}

function updateSchemeCategoryCounts() {
  const dis = state.currentDistress;
  const farmer = state.currentFarmer;
  
  const forYouCount = getPersonalizedSchemes(farmer, dis).length;
  const finCount = ALL_GOVT_SCHEMES.filter(s => s.category === 'finance' || (s.categories && s.categories.includes('finance'))).length;
  const cropCount = ALL_GOVT_SCHEMES.filter(s => s.category === 'crop_management' || (s.categories && s.categories.includes('crop_management'))).length;
  const disCount = ALL_GOVT_SCHEMES.filter(s => s.category === 'disaster' || (s.categories && s.categories.includes('disaster'))).length;

  const counts = {
    for_you: forYouCount,
    finance: finCount,
    crop_management: cropCount,
    disaster: disCount
  };

  const activeCat = state.activeSchemeCategory || 'for_you';
  Object.entries(counts).forEach(([cat, count]) => {
    const badge = document.getElementById(`scheme-count-${cat}`);
    if (badge) {
      badge.textContent = count;
      if (cat === activeCat) {
        badge.className = "px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white ml-1";
      } else {
        badge.className = "px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 ml-1";
      }
    }
  });
}

function switchSchemeCategory(category) {
  state.activeSchemeCategory = category || 'for_you';
  
  const cats = ['for_you', 'finance', 'crop_management', 'disaster'];
  cats.forEach(c => {
    const btn = document.getElementById(`scheme-cat-${c}`);
    if (btn) {
      if (c === state.activeSchemeCategory) {
        btn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center space-x-1.5 transition-all bg-sky-600 text-white shadow-sm border border-emerald-700 cursor-pointer";
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center space-x-1.5 transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer";
        btn.setAttribute('aria-selected', 'false');
      }
    }
  });

  updateSchemeCategoryCounts();
  renderFarmerSchemes();
}

async function renderFarmerSchemes() {
  const dis = state.currentDistress;
  const farmer = state.currentFarmer;
  const container = document.getElementById('farmer-schemes-container');
  if (!container) return;

  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const t = i18n[lang] || i18n['en'];
  const activeCategory = state.activeSchemeCategory || 'for_you';

  let activeSchemes = [];
  if (activeCategory === 'for_you') {
    activeSchemes = getPersonalizedSchemes(farmer, dis);
  } else {
    activeSchemes = ALL_GOVT_SCHEMES.filter(s => s.category === activeCategory || (s.categories && s.categories.includes(activeCategory)));
  }

  if (activeSchemes.length === 0) {
    activeSchemes = ALL_GOVT_SCHEMES.filter(s => ['S1', 'S2', 'S7'].includes(s.scheme_id));
  }

  updateSchemeCategoryCounts();

  // Save current schemes state with full multilingual metadata
  state.currentSchemes = activeSchemes.map(s => {
    const sTitle = (s.title && s.title[lang]) || s.name;
    const sWhy = (s.why_needed && s.why_needed[lang]) || (s.why_needed && s.why_needed['en']) || s.trigger_cause;
    const sHow = (s.how_it_helps && s.how_it_helps[lang]) || (s.how_it_helps && s.how_it_helps['en']) || s.action_item;
    const sBenefit = (s.benefit_badge && s.benefit_badge[lang]) || s.benefit_type;

    return {
      scheme_id: s.scheme_id,
      scheme_name: sTitle,
      raw_name: s.name,
      category: s.category,
      urgency: s.urgency,
      benefit_badge: sBenefit,
      why_needed: sWhy,
      how_it_helps: sHow,
      portal_url: s.portal_url
    };
  });

  const whyLabel = t.whyNeedLabel || '📌 Why You Need This:';
  const howLabel = t.howHelpsLabel || '✨ How It Benefits You:';
  const tapListen = t.listenSchemeCard || t.tapToListen || 'Tap to listen 🔊';
  const portalLabel = t.officialPortal || 'Official Portal ↗';

  const catBadgeMap = {
    finance: { text: t.tabFinance || 'Finance & Credit', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    crop_management: { text: t.tabCropManagement || 'Crop Management', color: 'bg-emerald-50 text-sky-800 border-sky-200' },
    disaster: { text: t.tabDisaster || 'Disaster & Relief', color: 'bg-amber-50 text-amber-800 border-amber-200' }
  };

  const cardsHtml = state.currentSchemes.map((item, idx) => {
    const urgency = t[item.urgency] || item.urgency;
    const urgencyColor = item.urgency === 'CRITICAL'
      ? 'bg-red-100 text-red-800 border border-red-300'
      : item.urgency === 'HIGH'
      ? 'bg-amber-100 text-amber-800 border border-amber-300'
      : 'bg-emerald-100 text-sky-800 border border-sky-300';

    const catInfo = catBadgeMap[item.category] || catBadgeMap.finance;

    return `
      <div class="bg-white border-2 border-slate-200 hover:border-sky-500 rounded-3xl p-5 sm:p-6 space-y-4 transition shadow-sm hover:shadow-md flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <span class="px-2.5 py-0.5 rounded-md font-mono text-xs font-black bg-slate-900 text-emerald-400 border border-slate-700">${item.scheme_id}</span>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${catInfo.color}">${catInfo.text}</span>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">${item.benefit_badge}</span>
              </div>
              <h4 class="text-base sm:text-lg font-black text-slate-900 mt-2 leading-snug">${item.scheme_name}</h4>
            </div>
            <span class="text-xs font-black uppercase px-2.5 py-1 rounded-full ${urgencyColor} whitespace-nowrap shadow-sm">${urgency}</span>
          </div>

          <!-- Line 1: Why You Need It (Simple Problem Statement) -->
          <div class="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200">
            <div class="text-[11px] font-black text-amber-900 uppercase tracking-wider">${whyLabel}</div>
            <div class="text-xs sm:text-sm font-bold text-amber-950 mt-1 leading-relaxed">${item.why_needed}</div>
          </div>

          <!-- Line 2: How It Helps You (Simple Benefit Statement) -->
          <div class="bg-emerald-50/80 p-3.5 rounded-2xl border border-sky-200">
            <div class="text-[11px] font-black text-emerald-900 uppercase tracking-wider">${howLabel}</div>
            <div class="text-xs sm:text-sm font-bold text-sky-950 mt-1 leading-relaxed">${item.how_it_helps}</div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button onclick="playSchemeCardAudio(${idx}, event)" class="tts-listen-btn text-xs font-bold text-sky-800 hover:text-sky-950 bg-emerald-100 hover:bg-emerald-200 active:scale-95 px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-sm">
            <span>🔊</span>
            <span class="tts-label">${tapListen}</span>
          </button>
          ${item.portal_url ? `
            <a href="${item.portal_url}" target="_blank" rel="noopener noreferrer" class="text-xs font-extrabold text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-3.5 py-2 rounded-xl transition flex items-center space-x-1 border border-slate-200 hover:border-purple-300">
              <span>🌐</span>
              <span>${portalLabel}</span>
            </a>
          ` : ''}
        </div>
      </div>
    `;
  });

  
  // Asynchronous background pre-fetching for instant audio playback
  setTimeout(() => {
    state.currentSchemes.forEach((item, idx) => {
      const whyPrefix = lang === 'hi' ? 'आपको इसकी आवश्यकता क्यों है:' : lang === 'mr' ? 'आपल्याला याची गरज का आहे:' : lang === 'or' ? 'ଆପଣଙ୍କୁ ଏହା କାହିଁକି ଦରକାର:' : lang === 'as' ? 'আপোনাৰ কিয় প্ৰয়োজন:' : lang === 'kn' ? 'ನಿಮಗೆ ಇದು ಏಕೆ ಬೇಕು:' : 'Why you need this:';
      const howPrefix = lang === 'hi' ? 'इससे आपको क्या फायदा होगा:' : lang === 'mr' ? 'यामुळे काय फायदा होईल:' : lang === 'or' ? 'ଏଥିରୁ ଆପଣଙ୍କୁ କି ଲାଭ ମିଳିବ:' : lang === 'as' ? 'ইয়াৰ দ্বাৰা কি লাভ হ’ব:' : lang === 'kn' ? 'ಇದರಿಂದ ನಿಮಗೆ ಏನು ಪ್ರಯೋಜನ:' : 'How it helps you:';
      const spokenScript = `${item.scheme_name}। ${whyPrefix} ${item.why_needed}। ${howPrefix} ${item.how_it_helps}।`;
      prefetchAudio(spokenScript, lang);
    });
  }, 100);

  container.innerHTML = cardsHtml.join('');
}

async function playAllSchemesAudio(event) {
  if (event) event.stopPropagation();
  const schemes = state.currentSchemes || [];
  if (schemes.length === 0) return;
  const lang = state.selectedLanguage || 'en';

  const introPrefix = lang === 'hi' ? `सरकारी सुरक्षा कवच में कुल ${schemes.length} योजनाएं उपलब्ध हैं।`
    : lang === 'mr' ? `सरकारी सुरक्षा कवच अंतर्गत एकूण ${schemes.length} योजना उपलब्ध आहेत.`
    : lang === 'or' ? `ସରକାରୀ ସୁରକ୍ଷା କବଚରେ ମୋଟ ${schemes.length} ଟି ଯୋଜନା ଉପଲବ୍ଧ ଅଛି।`
    : lang === 'as' ? `চৰকাৰী সুৰক্ষা কৱচত মুঠ ${schemes.length} খন আঁচনি উপলব্ধ আছে।`
    : lang === 'kn' ? `ಸರ್ಕಾರಿ ಸುರಕ್ಷತಾ ಕವಚದಲ್ಲಿ ಒಟ್ಟು ${schemes.length} ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ.`
    : `There are ${schemes.length} government schemes available for you.`;

  const scriptParts = schemes.map((s, i) => {
    const num = i + 1;
    const whyIntro = lang === 'hi' ? 'जरूरत:' : lang === 'mr' ? 'गरज:' : lang === 'or' ? 'ଆବଶ୍ୟକତା:' : lang === 'as' ? 'প্ৰয়োজন:' : lang === 'kn' ? 'ಅಗತ್ಯ:' : 'Why:';
    const howIntro = lang === 'hi' ? 'फायदा:' : lang === 'mr' ? 'फायदा:' : lang === 'or' ? 'ଲାଭ:' : lang === 'as' ? 'লাভ:' : lang === 'kn' ? 'ಪ್ರಯೋಜನ:' : 'Benefit:';
    return `${num}. ${s.scheme_name}। ${whyIntro} ${s.why_needed}। ${howIntro} ${s.how_it_helps}।`;
  });

  const fullSpokenScript = `${introPrefix} ${scriptParts.join(' ')}`;
  await speakText(fullSpokenScript, lang, 'schemes-all');
}

async function playSchemeCardAudio(index, event) {
  if (event) event.stopPropagation();
  const scheme = state.currentSchemes?.[index];
  if (!scheme) return;
  const lang = state.selectedLanguage || 'en';

  const whyPrefix = lang === 'hi' ? 'आपको इसकी आवश्यकता क्यों है:'
    : lang === 'mr' ? 'आपल्याला याची गरज का आहे:'
    : lang === 'or' ? 'ଆପଣଙ୍କୁ ଏହା କାହିଁକି ଦରକାର:'
    : lang === 'as' ? 'আপোনাৰ কিয় প্ৰয়োজন:'
    : lang === 'kn' ? 'ನಿಮಗೆ ಇದು ಏಕೆ ಬೇಕು:'
    : 'Why you need this:';

  const howPrefix = lang === 'hi' ? 'इससे आपको क्या फायदा होगा:'
    : lang === 'mr' ? 'यामुळे काय फायदा होईल:'
    : lang === 'or' ? 'ଏଥିରୁ ଆପଣଙ୍କୁ କି ଲାଭ ମିଳିବ:'
    : lang === 'as' ? 'ইয়াৰ দ্বাৰা কি লাভ হ’ব:'
    : lang === 'kn' ? 'ಇದರಿಂದ ನಿಮಗೆ ಏನು ಪ್ರಯೋಜನ:'
    : 'How it helps you:';

  const spokenScript = `${scheme.scheme_name}। ${whyPrefix} ${scheme.why_needed}। ${howPrefix} ${scheme.how_it_helps}।`;
  await speakText(spokenScript, lang, `scheme-card-${scheme.scheme_id}`);
}

// ─── SPOKEN ADVISORY & WEATHER METRIC AUDIO ───

async function playCurrentAdvisoryAudio() {
  const adv = state.currentAdvisory;
  if (!adv) return;

  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  
  let title = (adv.title && adv.title[lang]) ? adv.title[lang] : '';
  let text = (adv.text && adv.text[lang]) ? adv.text[lang] : '';

  if (!title || !text) {
    const srcTitle = (adv.title && (adv.title['hi'] || adv.title['en'])) || (typeof adv.title === 'string' ? adv.title : 'Crop Advisory');
    const srcText = (adv.text && (adv.text['hi'] || adv.text['en'])) || (typeof adv.text === 'string' ? adv.text : '');
    const [tTitle, tText] = await Promise.all([
      getTranslation(srcTitle, lang),
      getTranslation(srcText, lang)
    ]);
    if (adv.title && typeof adv.title === 'object') adv.title[lang] = tTitle;
    if (adv.text && typeof adv.text === 'object') adv.text[lang] = tText;
    title = tTitle;
    text = tText;
  }

  let contingencyDetails = "";
  if (adv.contingency_crops && adv.contingency_crops.length > 0) {
    const cropNames = await Promise.all(adv.contingency_crops.map(async c => await getTranslation(c.name || c.crop || c, lang)));
    const contPrefix = lang === 'hi' ? 'वैकल्पिक सुझाई गई फसलें: '
      : lang === 'mr' ? 'पर्यायी सुचवलेली पिके: '
      : lang === 'or' ? 'ବିକଳ୍ପ ଫସଲ ସୁପାରିଶ: '
      : lang === 'as' ? 'বিকল্প শস্য পৰামৰ্শ: '
      : lang === 'kn' ? 'ಪರ್ಯಾಯ ಬೆಳೆಗಳ ಶಿಫಾರಸು: '
      : 'Recommended contingency crops: ';
    contingencyDetails = ` ${contPrefix}${cropNames.join(', ')}`;
  }

  const fullSpokenScript = `${title}। ${text}${contingencyDetails}`;
  await speakText(fullSpokenScript, lang, 'advisory-main');
}

async function playWeatherMetricAudio(metricKey) {
  const adv = state.currentAdvisory;
  const f = state.currentFarmer;
  if (!adv || !adv.weather_data) return;

  const wd = adv.weather_data;
  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const soil = f ? (f.soil_type || 'Black Cotton') : 'Black Cotton';
  const rainDev = Math.abs(wd.rainfall_deviation_pct || 0).toFixed(1);
  const isDeficit = (wd.rainfall_deviation_pct || 0) < 0;
  const dryDays = wd.dry_spell_days || 0;
  const localizedSoil = await getTranslation(soil, lang);

  let script = "";
  if (metricKey === 'rainfall') {
    script = lang === 'hi' ? `वर्षा विचलन: मानसून वर्षा सामान्य से ${rainDev}% ${isDeficit ? 'कम' : 'अधिक'} है।`
      : lang === 'mr' ? `पाऊस स्थिती: पाऊस सरासरीपेक्षा ${rainDev}% ${isDeficit ? 'कमी' : 'जास्त'} आहे.`
      : lang === 'or' ? `ବର୍ଷା ସୂଚକ: ମୌସୁମୀ ବର୍ଷା ସ୍ୱାଭାବିକ ଠାରୁ ${rainDev}% ${isDeficit ? 'କମ୍' : 'ଅଧିକ'} ଅଛି।`
      : lang === 'as' ? `বৰষুণৰ তথ্য: বৰষুণ সাধাৰণ স্তৰতকৈ ${rainDev}% ${isDeficit ? 'কম' : 'অধিক'}।`
      : lang === 'kn' ? `ಮಳೆಯ ಪ್ರಮಾಣ: ಮಳೆ ಸಾಮಾನ್ಯಕ್ಕಿಂತ ${rainDev}% ${isDeficit ? 'ಕಡಿಮೆ' : 'ಹೆಚ್ಚು'} ಇದೆ.`
      : `Rainfall status: Monsoon rainfall is ${rainDev}% ${isDeficit ? 'below' : 'above'} normal.`;
  } else if (metricKey === 'dryspell') {
    script = lang === 'hi' ? `सूखे दिनों की अवधि: खेत में लगातार ${dryDays} दिनों से वर्षा का खंड है।`
      : lang === 'mr' ? `पावसाचा खंड: शेतात सलग ${dryDays} दिवसांचा पावसाचा खंड पडला आहे.`
      : lang === 'or' ? `ଶୁଖିଲା ପାଗ ଅବଧି: ଲଗାତାର ${dryDays} ଦିନ ଧରି ବର୍ଷାର ଅଭାବ ରହିଛି।`
      : lang === 'as' ? `খৰাং দিনৰ দৈৰ্ঘ্য: একেৰাহে ${dryDays} দিন ধৰি বৰষুণ হোৱা নাই।`
      : lang === 'kn' ? `ಮಳೆ ಕೊರತೆಯ ದಿನಗಳು: ಸತತ ${dryDays} ದಿನಗಳಿಂದ ಮಳೆ ಬಂದಿಲ್ಲ.`
      : `Dry spell duration: There has been a dry spell of ${dryDays} consecutive days.`;
  } else if (metricKey === 'onset') {
    script = lang === 'hi' ? `मानसून आगमन: मानसून आगमन में ${wd.onset_delay_days || 0} दिनों का विलंब हुआ है।`
      : lang === 'mr' ? `मान्सून आगमन: मान्सून आगमनास ${wd.onset_delay_days || 0} दिवसांचा उशीर झाला आहे.`
      : lang === 'or' ? `ମୌସୁମୀ ଆଗମନ: ମୌସୁମୀ ଆସିବାରେ ${wd.onset_delay_days || 0} ଦିନ ବିଳମ୍ବ ହୋଇଛି।`
      : lang === 'as' ? `মৌচুমী আগমন: মৌচুমী আগমণত ${wd.onset_delay_days || 0} দিন পলম হৈছে।`
      : lang === 'kn' ? `ಮುಂಗಾರು ಪ್ರವೇಶ: ಮುಂಗಾರು ಪ್ರವೇಶದಲ್ಲಿ ${wd.onset_delay_days || 0} ದಿನಗಳ ವಿಳಂಬವಾಗಿದೆ.`
      : `Monsoon onset status: Monsoon arrival was delayed by ${wd.onset_delay_days || 0} days.`;
  } else if (metricKey === 'soil') {
    script = lang === 'hi' ? `मिट्टी का प्रकार: आपके खेत की मिट्टी ${localizedSoil} है।`
      : lang === 'mr' ? `मातीचा प्रकार: आपल्या शेतातील माती ${localizedSoil} प्रकारची आहे.`
      : lang === 'or' ? `ମାଟି ପ୍ରକାର: ଆପଣଙ୍କ ଜମିର ମାଟି ${localizedSoil} ଅଟେ।`
      : lang === 'as' ? `মাটিৰ প্ৰকাৰ: আপোনাৰ খেতিৰ মাটি ${localizedSoil} শ্ৰেণীৰ।`
      : lang === 'kn' ? `ಮಣ್ಣಿನ ವಿಧ: ನಿಮ್ಮ ಜಮೀನಿನ ಮಣ್ಣು ${localizedSoil} ಆಗಿದೆ.`
      : `Soil profile: Soil type for your field is ${localizedSoil}.`;
  } else if (metricKey === 'all') {
    script = lang === 'hi' ? `मौसम एवं मिट्टी रिपोर्ट: वर्षा सामान्य से ${rainDev}% ${isDeficit ? 'कम' : 'अधिक'} है और ${dryDays} दिनों का सूखा खंड है। खेत की मिट्टी ${localizedSoil} है। नमी संरक्षण के उपाय करें।`
      : lang === 'mr' ? `हवामान व जमीन सविस्तर अहवाल: पाऊस ${rainDev}% ${isDeficit ? 'कमी' : 'जास्त'} असून ${dryDays} दिवसांचा खंड आहे. शेतातील माती ${localizedSoil} आहे. जमिनीवर आच्छादन करा.`
      : lang === 'or' ? `ପାଣିପାଗ ଓ ମାଟି ରିପୋର୍ଟ: ବର୍ଷା ${rainDev}% ${isDeficit ? 'କମ୍' : 'ଅଧିକ'} ଓ ${dryDays} ଦିନ ଶୁଖିଲା ପାଗ। ମାଟି ${localizedSoil} ଅଟେ। ଆର୍ଦ୍ରତା ରକ୍ଷା ପାଇଁ ପଦକ୍ଷେପ ନିଅନ୍ତୁ।`
      : lang === 'as' ? `বতৰ আৰু মাটিৰ প্ৰতিবেদন: বৰষুণ ${rainDev}% ${isDeficit ? 'কম' : 'অধিক'} আৰু ${dryDays} দিন খৰাং। মাটি ${localizedSoil} শ্ৰেণীৰ। আৰ্দ্ৰতা সংৰক্ষণ কৰক।`
      : lang === 'kn' ? `ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣಿನ ಸಮಗ್ರ ವರದಿ: ಮಳೆ ${rainDev}% ${isDeficit ? 'ಕಡಿಮೆ' : 'ಹೆಚ್ಚು'} ಮತ್ತು ${dryDays} ದಿನಗಳ ಮಳೆ ಕೊರತೆಯಿದೆ. ಮಣ್ಣು ${localizedSoil} ಆಗಿದೆ. ತೇವಾಂಶ ಸಂರಕ್ಷಣೆಗೆ ಕ್ರಮ ಕೈಗೊಳ್ಳಿ.`
      : `Agro-weather and soil report: Rainfall is ${rainDev}% ${isDeficit ? 'below' : 'above'} normal with a ${dryDays}-day dry spell. Soil profile is ${localizedSoil}. Implement straw mulching and protective irrigation.`;
  }

  if (script) {
    await speakText(script, lang, 'mandi-price');
  }
}


async function fetchOfficerData() {
  try {
    const res = await fetch(`${API_BASE}/officer/farmers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.weights)
    });
    const data = await res.json();
    state.officerFarmers = data.farmers || (Array.isArray(data) ? data : []);
    state.officerMetrics = data.metrics || {
      total_farmers: state.officerFarmers.length,
      high_risk_count: state.officerFarmers.filter(f => (f.risk_band || '').toUpperCase() === 'HIGH').length,
      medium_risk_count: state.officerFarmers.filter(f => (f.risk_band || '').toUpperCase() === 'MEDIUM').length,
      low_risk_count: state.officerFarmers.filter(f => (f.risk_band || '').toUpperCase() === 'LOW').length,
    };
    renderOfficerMetrics();
    renderOfficerTable();
  } catch (err) {
    console.error('Error fetching officer dashboard data:', err);
  }
}

function renderOfficerMetrics() {
  const m = state.officerMetrics;
  if (!m) return;

  document.getElementById('metric-total').textContent = m.total_farmers || 0;
  document.getElementById('metric-high').textContent = m.high_risk_count || 0;
  document.getElementById('metric-med').textContent = m.medium_risk_count || 0;
  document.getElementById('metric-low').textContent = m.low_risk_count || 0;
}

// Crop and Crop Stage Translations for Officer and Multilingual Views
const CROP_TRANSLATIONS = {
  onion:   { en: 'Onion', hi: 'प्याज', mr: 'कांदा', or: 'ପିଆଜ', as: 'পিয়াঁজ', kn: 'ಈರುಳ್ಳಿ' },
  cotton:  { en: 'Cotton', hi: 'कपास', mr: 'कापूस', or: 'କପା', as: 'কপাহ', kn: 'ಹತ್ತಿ' },
  soybean: { en: 'Soybean', hi: 'सोयाबीन', mr: 'सोयाबीन', or: 'ସୋୟାବିନ୍', as: 'ছয়াবিন', kn: 'ಸೋಯಾಬೀನ್' },
  rice:    { en: 'Rice', hi: 'धान / चावल', mr: 'भात / तांदूळ', or: 'ଧାନ', as: 'ধান', kn: 'ಭತ್ತ / ಅಕ್ಕಿ' },
  paddy:   { en: 'Paddy', hi: 'धान', mr: 'भात', or: 'ଧାନ', as: 'ধান', kn: 'ಭತ್ತ' },
  maize:   { en: 'Maize', hi: 'मक्का', mr: 'मका', or: 'ମକା', as: 'মাকৈ', kn: 'ಮೆಕ್ಕೆಜೋಳ' },
  bajra:   { en: 'Bajra', hi: 'बाजरा', mr: 'बाजरी', or: 'ବାଜରା', as: 'বজৰা', kn: 'ಸಜ್ಜೆ' },
  wheat:   { en: 'Wheat', hi: 'गेहूं', mr: 'गहू', or: 'ଗହମ', as: 'গম', kn: 'ಗೋಧಿ' },
};

const STAGE_TRANSLATIONS = {
  harvest:    { en: 'Harvest Stage', hi: 'कटाई अवस्था', mr: 'कापणी अवस्था', or: 'ଅମଳ ପର୍ଯ୍ୟାୟ', as: 'চপোৱা পৰ্যায়', kn: 'ಕೊಯ್ಲು ಹಂತ' },
  sowing:     { en: 'Sowing Stage', hi: 'बुवाई अवस्था', mr: 'पेरणी अवस्था', or: 'ବୁଣା ପର୍ଯ୍ୟାୟ', as: 'সিঁচাৰ পৰ্যায়', kn: 'ಬಿತ್ತನೆ ಹಂತ' },
  flowering:  { en: 'Flowering Stage', hi: 'फूल आने की अवस्था', mr: 'फुलधारणा अवस्था', or: 'ଫୁଲ ଆସିବା ପର୍ଯ୍ୟାୟ', as: 'ফুল ফুলিবৰ পৰ্যায়', kn: 'ಹೂಬಿಡುವ ಹಂತ' },
  vegetative: { en: 'Vegetative Stage', hi: 'वानस्पतिक वृद्धि अवस्था', mr: 'शाकीय वाढ अवस्था', or: 'ବୃଦ୍ଧି ପର୍ଯ୍ୟାୟ', as: 'বৃদ্ধি পৰ্যায়', kn: 'ಬೆಳವಣಿಗೆ ಹಂತ' },
  'pod development': { en: 'Pod Development', hi: 'फली विकास अवस्था', mr: 'शेंगा भरण्याची अवस्था', or: 'ଛୁଇଁ ବିକାଶ ପର୍ଯ୍ୟାୟ', as: 'শুঁটি বিকাশ', kn: 'ಕಾಯಿ ಕಟ್ಟುವ ಹಂತ' },
};

function renderOfficerTable() {
  const tbody = document.getElementById('officer-table-body');
  if (!tbody) return;

  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const t = i18n[lang] || i18n['en'];

  const filter = (document.getElementById('filter-risk')?.value || 'ALL').toUpperCase();
  const filtered = state.officerFarmers.filter(f => {
    if (filter === 'ALL') return true;
    return (f.risk_band || '').toUpperCase() === filter;
  });

  tbody.innerHTML = filtered.map(f => {
    const bandLabel = f.risk_band === 'High'
      ? (lang === 'hi' ? 'गंभीर' : lang === 'mr' ? 'गंभीर' : lang === 'or' ? 'ଅତି ଗମ୍ଭୀର' : lang === 'as' ? 'গুৰুতৰ' : lang === 'kn' ? 'ಗಂಭೀರ' : 'HIGH')
      : f.risk_band === 'Medium'
      ? (lang === 'hi' ? 'मध्यम' : lang === 'mr' ? 'मध्यम' : lang === 'or' ? 'ମଧ୍ୟମ' : lang === 'as' ? 'মধ্যম' : lang === 'kn' ? 'ಮಧ್ಯಮ' : 'MED')
      : (lang === 'hi' ? 'कम' : lang === 'mr' ? 'कमी' : lang === 'or' ? 'କମ୍' : lang === 'as' ? 'কম' : lang === 'kn' ? 'ಕಡಿಮೆ' : 'LOW');

    const bandBadge = f.risk_band === 'High'
      ? `<span class="px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">${bandLabel} (71+)</span>`
      : f.risk_band === 'Medium'
      ? `<span class="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">${bandLabel} (41-70)</span>`
      : `<span class="px-2.5 py-1 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-300">${bandLabel} (0-40)</span>`;

    const channelText = f.recommended_channel === 'ivr_or_sms' ? (t.callIvr || 'Call / IVR') : (t.appPush || 'App Push');
    const channelBadge = f.recommended_channel === 'ivr_or_sms'
      ? `<span class="inline-flex items-center space-x-1 font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-xs"><span>☎️</span><span>${channelText}</span></span>`
      : `<span class="inline-flex items-center space-x-1 font-bold text-sky-700 bg-emerald-50 px-2 py-1 rounded-lg border border-sky-200 text-xs"><span>📱</span><span>${channelText}</span></span>`;

    const cropKey = (f.crop || '').toLowerCase();
    const localizedCrop = (CROP_TRANSLATIONS[cropKey] && CROP_TRANSLATIONS[cropKey][lang]) || f.crop;
    const stageKey = (f.crop_stage || '').toLowerCase();
    const localizedStage = (STAGE_TRANSLATIONS[stageKey] && STAGE_TRANSLATIONS[stageKey][lang]) || f.crop_stage;

    const safeName = (f.farmer_name || 'Farmer').replace(/'/g, "\\'");

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-4">
          <div class="flex items-center space-x-2 mb-1">
            <span class="px-2 py-0.5 rounded-md font-mono font-black text-xs bg-slate-900 text-emerald-400 border border-slate-700 shadow-sm">${f.farmer_id}</span>
            <span class="font-black text-slate-900 text-sm sm:text-base">${f.farmer_name}</span>
          </div>
          <div class="text-xs text-slate-500 flex items-center space-x-1">
            <span>📍</span>
            <span>${f.village || ''}, ${f.district_name}</span>
          </div>
        </td>
        <td class="px-4 py-4">
          <div class="space-y-1 text-xs">
            <div class="font-bold text-slate-800 flex items-center space-x-1">
              <span>📞</span>
              <span class="font-mono text-sky-800">${f.phone || 'N/A'}</span>
            </div>
            <div class="text-[11px] text-slate-500">
              ${(f.device_type || 'phone').replace('_', ' ')} • <span class="font-semibold">${f.network_quality || '4G'}</span>
            </div>
          </div>
        </td>
        <td class="px-4 py-4">
          <div class="font-bold text-slate-900 capitalize">${localizedCrop}</div>
          <div class="text-xs text-slate-500 uppercase">${localizedStage}</div>
        </td>
        <td class="px-4 py-4">
          <div class="flex items-center space-x-2">
            <span class="text-lg font-black text-slate-900 font-mono">${f.distress_score}</span>
            ${bandBadge}
          </div>
        </td>
        <td class="px-4 py-4 text-xs font-semibold text-slate-700 max-w-xs">
          ${f.top_contributing_signal ? f.top_contributing_signal.label : 'Normal'}
        </td>
        <td class="px-4 py-4">
          <span class="text-xs font-extrabold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
            ${f.primary_recommended_scheme || 'PMFBY'}
          </span>
        </td>
        <td class="px-4 py-4">
          ${channelBadge}
        </td>
        <td class="px-5 py-4 text-right">
          <div class="flex items-center justify-end space-x-1.5">
            <button onclick="openOfficerModal('${f.farmer_id}')" title="View Full Risk Breakdown" class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition">
              <span>🔍</span>
              <span class="hidden xl:inline">Details</span>
            </button>
            <button onclick="loginAsFarmer('${f.farmer_id}')" title="Login as ${safeName} in Farmer App" class="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow transition">
              <span>👨‍🌾</span>
              <span class="hidden xl:inline">Login As</span>
            </button>
            <button onclick="deleteFarmerAccount('${f.farmer_id}', '${safeName}')" title="Delete Farmer Account" class="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-600 text-red-700 hover:text-white border border-red-300 hover:border-red-600 font-bold text-xs transition">
              <span>🗑️</span>
              <span class="hidden xl:inline">Delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loginAsFarmer(farmerId) {
  const farmer = state.officerFarmers.find(f => f.farmer_id === farmerId) || state.farmers.find(f => f.id === farmerId);
  if (!farmer) return;

  const fName = farmer.farmer_name || farmer.name;

  if (window.AuthService) {
    window.AuthService.setUser({
      id: farmerId,
      name: fName,
      phone: farmer.phone,
      district_id: farmer.district_id,
      preferred_language: farmer.language || state.selectedLanguage || 'hi'
    });
    window.AuthService.setToken(`token_farmer_${farmerId}`);
  }

  // Switch to farmer view and load farmer data
  switchMainView('farmer');
  await selectFarmer(farmerId);
  showTTSToast(`Logged in as ${fName} (${farmerId}) 🌾`);
}

async function deleteFarmerAccount(farmerId, farmerName) {
  const name = farmerName || farmerId;
  const confirmed = window.confirm(`⚠️ Are you sure you want to permanently delete the farmer account for ${name} (${farmerId})?\n\nThis will remove all farm details, registered crop distress data, and login access.`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/farmers/${farmerId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Server returned error ${res.status}`);
    }

    showTTSToast(`Farmer account ${name} (${farmerId}) deleted successfully 🗑️`);

    // Refresh officer data and farmers list
    await Promise.all([
      fetchOfficerData(),
      loadFarmersList()
    ]);

  } catch (err) {
    console.error('Error deleting farmer:', err);
    alert(`Could not delete farmer account: ${err.message}`);
  }
}

function applyOfficerFilters() {
  renderOfficerTable();
}

function onWeightSliderChange() {
  const eVal  = parseFloat(document.getElementById('slider-w-exposure').value);
  const sVal  = parseFloat(document.getElementById('slider-w-sensitivity').value);
  const acVal = parseFloat(document.getElementById('slider-w-ac').value);
  const mVal  = parseFloat(document.getElementById('slider-w-mitigation').value);
  const tVal  = parseFloat(document.getElementById('slider-w-trigger').value);
  const dfVal = parseFloat(document.getElementById('slider-w-df').value);

  const sum = eVal + sVal + acVal + mVal + tVal + dfVal;
  if (sum === 0) return;

  state.weights = {
    exposure:           eVal  / sum,
    sensitivity:        sVal  / sum,
    adaptive_capacity:  acVal / sum,
    mitigation_deficit: mVal  / sum,
    trigger:            tVal  / sum,
    district_fragility: dfVal / sum
  };

  // Update live label percentages
  document.getElementById('label-w-exposure').textContent     = `${Math.round(state.weights.exposure           * 100)}%`;
  document.getElementById('label-w-sensitivity').textContent  = `${Math.round(state.weights.sensitivity        * 100)}%`;
  document.getElementById('label-w-ac').textContent           = `${Math.round(state.weights.adaptive_capacity  * 100)}%`;
  document.getElementById('label-w-mitigation').textContent   = `${Math.round(state.weights.mitigation_deficit * 100)}%`;
  document.getElementById('label-w-trigger').textContent      = `${Math.round(state.weights.trigger            * 100)}%`;
  document.getElementById('label-w-df').textContent           = `${Math.round(state.weights.district_fragility * 100)}%`;

  // Instantly re-rank table via backend recalculation
  fetchOfficerData();
}

function resetDistressWeights() {
  state.weights = {
    exposure:           0.25,
    sensitivity:        0.15,
    adaptive_capacity:  0.15,
    mitigation_deficit: 0.15,
    trigger:            0.20,
    district_fragility: 0.10
  };

  document.getElementById('slider-w-exposure').value   = 25;
  document.getElementById('slider-w-sensitivity').value = 15;
  document.getElementById('slider-w-ac').value          = 15;
  document.getElementById('slider-w-mitigation').value  = 15;
  document.getElementById('slider-w-trigger').value     = 20;
  document.getElementById('slider-w-df').value          = 10;

  document.getElementById('label-w-exposure').textContent     = '25%';
  document.getElementById('label-w-sensitivity').textContent  = '15%';
  document.getElementById('label-w-ac').textContent           = '15%';
  document.getElementById('label-w-mitigation').textContent   = '15%';
  document.getElementById('label-w-trigger').textContent      = '20%';
  document.getElementById('label-w-df').textContent           = '10%';

  fetchOfficerData();
}

// Spoken District Distress Briefing for Officers
async function playOfficerBriefingAudio() {
  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const m = state.officerMetrics || { total_farmers: 6, high_risk_count: 2, medium_risk_count: 3, low_risk_count: 1 };
  
  const officerBriefings = {
    hi: `कृषि अधिकारी सारांश: जिले के कुल ${m.total_farmers} पंजीकृत किसानों में से ${m.high_risk_count} किसान गंभीर संकट में हैं, और ${m.medium_risk_count} किसान मध्यम जोखिम में हैं। मुख्य कारण बारिश में देरी और मंडी भाव में गिरावट है। त्वरित पीएमएफबीवाई फसल सर्वेक्षण एवं ई-नाम पंजीकरण प्रारंभ करने की सिफारिश है।`,
    mr: `कृषी अधिकारी सारांश: जिल्ह्यातील एकूण ${m.total_farmers} शेतकर्‍यांपैकी ${m.high_risk_count} शेतकरी गंभीर संकटात आहेत, आणि ${m.medium_risk_count} शेतकरी मध्यम संकटात आहेत. पावसाची तूट आणि बाजारभावात झालेली घसरण ही मुख्य कारणे आहेत. तातडीने पीक विमा व ई-नाम नोंदणी मोहीम सुरू करावी.`,
    or: `କୃଷି ଅଧିକାରୀ ସାରାଂଶ: ଜିଲ୍ଲାର ମୋଟ ${m.total_farmers} ଜଣ ପଞ୍ଜୀକୃତ କୃଷକଙ୍କ ମଧ୍ୟରୁ ${m.high_risk_count} ଜଣ ଅତି ଗମ୍ଭୀର ସଙ୍କଟରେ ଅଛନ୍ତି, ଏବଂ ${m.medium_risk_count} ଜଣ ମଧ୍ୟମ ସଙ୍କଟରେ ଅଛନ୍ତି। ମୁଖ୍ୟ କାରଣ ବର୍ଷା ଅଭାବ ଏବଂ ମଣ୍ଡିରେ କମ୍ ଦର। ତୁରନ୍ତ ଫସଲ ବୀମା କ୍ଲେମ୍ ଓ ଇ-ନାମ ସହାୟତା ପଦକ୍ଷେପ ନିଅନ୍ତୁ।`,
    as: `কৃষি বিষয়া সাৰাংশ: জিলাৰ মুঠ ${m.total_farmers} গৰাকী কৃষকৰ ভিতৰত ${m.high_risk_count} গৰাকী কৃষক গুৰুতৰ সংকটত আৰু ${m.medium_risk_count} গৰাকী মধ্যম সংকটত আছে। মূল কাৰণ বৰষুণৰ নাটনি আৰু সমৰ্থন মূল্যতকৈ কম বজাৰ দৰ। তৎকালীনভাৱে শস্য বীমা আৰু ই-নাম সুবিধা প্ৰদান কৰক।`,
    kn: `ಕೃಷಿ ಅಧಿಕಾರಿಗಳ ಸಾರಾಂಶ: ಜಿಲ್ಲೆಯ ಒಟ್ಟು ${m.total_farmers} ರೈತರಲ್ಲಿ ${m.high_risk_count} ರೈತರು ಗಂಭೀರ ಸಂಕಷ್ಟದಲ್ಲಿದ್ದಾರೆ, ಮತ್ತು ${m.medium_risk_count} ರೈತರು ಮಧ್ಯಮ ಅಪಾಯದಲ್ಲಿದ್ದಾರೆ. ಮಳೆ ಕೊರತೆ ಮತ್ತು ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಕಡಿಮೆ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಮುಖ್ಯ ಕಾರಣಗಳಾಗಿವೆ. ತಕ್ಷಣವೇ ಬೆಳೆ ವಿಮೆ ಮತ್ತು ಇ-ನಾಮ್ ನೆರವು ನೀಡಿ.`,
    en: `District Agro-Distress Briefing: Out of ${m.total_farmers} monitored farmers, ${m.high_risk_count} farmers are in High Distress and ${m.medium_risk_count} are in Medium Risk. Top triggers include delayed monsoon and below-MSP realizations. Immediate PMFBY crop loss claims and e-NAM warehouse loan mobilization are recommended.`
  };

  const script = officerBriefings[lang] || officerBriefings['en'];
  await speakText(script, lang, 'mandi-price');
}

// --- OFFICER DETAIL MODAL ---

function openOfficerModal(farmerId) {
  const farmer = state.officerFarmers.find(f => f.farmer_id === farmerId);
  if (!farmer) return;

  state.selectedOfficerFarmer = farmer;
  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const t = i18n[lang] || i18n['en'];

  const cropKey = (farmer.crop || '').toLowerCase();
  const localizedCrop = (CROP_TRANSLATIONS[cropKey] && CROP_TRANSLATIONS[cropKey][lang]) || farmer.crop;
  const stageKey = (farmer.crop_stage || '').toLowerCase();
  const localizedStage = (STAGE_TRANSLATIONS[stageKey] && STAGE_TRANSLATIONS[stageKey][lang]) || farmer.crop_stage;

  document.getElementById('modal-farmer-name').textContent = farmer.farmer_name;
  document.getElementById('modal-farmer-sub').textContent = `📍 ${farmer.village}, ${farmer.district_name} • ${localizedCrop.toUpperCase()} (${localizedStage.toUpperCase()})`;

  const bandLabel = farmer.risk_band === 'High'
    ? (lang === 'hi' ? 'गंभीर' : lang === 'mr' ? 'गंभीर' : lang === 'or' ? 'ଅତି ଗମ୍ଭୀର' : lang === 'as' ? 'গুৰুতৰ' : lang === 'kn' ? 'ಗಂಭೀರ' : 'HIGH')
    : farmer.risk_band === 'Medium'
    ? (lang === 'hi' ? 'मध्यम' : lang === 'mr' ? 'मध्यम' : lang === 'or' ? 'ମଧ୍ୟମ' : lang === 'as' ? 'মধ্যম' : lang === 'kn' ? 'ಮಧ್ಯಮ' : 'MEDIUM')
    : (lang === 'hi' ? 'कम' : lang === 'mr' ? 'कमी' : lang === 'or' ? 'କମ୍' : lang === 'as' ? 'কম' : lang === 'kn' ? 'ಕಡಿಮೆ' : 'LOW');

  const badge = document.getElementById('modal-risk-badge');
  badge.textContent = `${bandLabel.toUpperCase()} (${farmer.distress_score})`;
  badge.className = farmer.risk_band === 'High'
    ? 'px-3 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800'
    : farmer.risk_band === 'Medium'
    ? 'px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800'
    : 'px-3 py-0.5 rounded-full text-xs font-black bg-green-100 text-green-800';

  // Reachability guidance
  const isIvr = farmer.recommended_channel === 'ivr_or_sms';
  document.getElementById('modal-reachability-note').innerHTML = isIvr
    ? `⚠️ <strong>High Adaptive Vulnerability:</strong> Farmer uses a <strong>${farmer.device_type.replace('_', ' ')}</strong> on <strong>${farmer.network_quality} network</strong> (tech literacy: ${farmer.tech_literacy}). <strong>Call directly or dispatch Kisan Mitra VLE. Do NOT rely on app push notifications.</strong>`
    : `✅ <strong>Digital Access Available:</strong> Farmer uses a smartphone with ${farmer.network_quality} network. In-app spoken notifications and advisories are active.`;

  // CRIDA 6-Dimension Points Breakdown (officer-facing)
  const pts = farmer.points_breakdown || {};
  const rd  = farmer.raw_dimensions   || {};
  const sub = farmer.sub_components   || {};

  // Rebuild the breakdown table dynamically if the element exists
  const breakdownEl = document.getElementById('modal-dimension-breakdown');
  if (breakdownEl) {
    const dimRows = [
      { code:'E',  label: t.sliderExposure || 'Exposure (Climate & Price)', pts: pts.exposure_pts,           raw: rd.E,       detail: `Rain ${sub.rain_component ?? 0}% + Price ${sub.price_component ?? 0}% deficit` },
      { code:'S',  label: t.sliderSensitivity || 'Sensitivity (Irrigation)',   pts: pts.sensitivity_pts,        raw: rd.S,       detail: farmer.irrigation_type ? `${farmer.irrigation_type}` : '' },
      { code:'AC', label: t.sliderAC || 'Adaptive Capacity (Inv.)',   pts: pts.adaptive_capacity_pts,  raw: rd.AC_risk, detail: `Land ${sub.land_score ?? 0}/100, Income ${sub.income_score ?? 0}/100` },
      { code:'M',  label: t.sliderMitigation || 'Mitigation Deficit',        pts: pts.mitigation_deficit_pts, raw: rd.M,       detail: `Protection score ${sub.protection_score ?? 0}/100` },
      { code:'T',  label: t.sliderTrigger || 'Trigger (Loan & Debt)',      pts: pts.trigger_pts,            raw: rd.T,       detail: `Loan urgency ${sub.loan_urgency ?? 0}, Informal ${sub.informal_shock ?? 0}` },
      { code:'DF', label: t.sliderDF || 'District Fragility',        pts: pts.district_fragility_pts, raw: rd.DF,      detail: `Structural context — not shown to farmer` },
    ];
    breakdownEl.innerHTML = dimRows.map(d => `
      <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
        <div>
          <span class="font-black text-xs bg-slate-900 text-white px-1.5 py-0.5 rounded mr-2">${d.code}</span>
          <span class="text-sm font-semibold text-slate-800">${d.label}</span>
          <div class="text-[10px] text-slate-400 ml-7 mt-0.5">${d.detail}</div>
        </div>
        <div class="text-right min-w-[80px]">
          <span class="text-base font-black text-slate-900">${(d.pts ?? 0).toFixed(1)} pts</span>
          <div class="text-[10px] text-slate-400">raw ${(d.raw ?? 0).toFixed(0)}/100</div>
        </div>
      </div>
    `).join('');
  }

  // Explanations
  const expList = document.getElementById('modal-explanations');
  expList.innerHTML = (farmer.explanation || []).map(e => `
    <li class="flex items-center space-x-2">
      <span class="text-emerald-600 font-bold">•</span>
      <span>${e}</span>
    </li>
  `).join('');

  // Context notes
  document.getElementById('modal-land-context').textContent = farmer.landholding_context || '1.0 ha marginal landholding';
  const struct = farmer.structural_risk_context || {};
  document.getElementById('modal-fragility-context').textContent = `Fragility Index: ${struct.district_fragility_index || 0}/100 — ${struct.assessment || 'Historical Agrarian Zone'} (${struct.soil_type || 'Loamy'}).`;

  // Interventions List
  const intList = document.getElementById('modal-interventions');
  intList.innerHTML = (farmer.recommended_interventions || []).map(i => `
    <div class="p-3 bg-emerald-50/70 rounded-xl border border-sky-200 space-y-1">
      <div class="flex items-center justify-between">
        <span class="font-black text-sm text-sky-950">${i.scheme_name}</span>
        <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200 text-sky-800">${i.urgency}</span>
      </div>
      <div class="text-xs text-slate-600"><strong>Trigger:</strong> ${i.trigger}</div>
      <div class="text-xs text-emerald-900 font-bold">📋 <strong>Officer Field Action:</strong> ${i.action_item}</div>
    </div>
  `).join('');

  document.getElementById('officer-detail-modal').classList.remove('hidden');
}

function closeOfficerModal() {
  document.getElementById('officer-detail-modal').classList.add('hidden');
}

// Spoken Case Briefing for Individual Farmer in Modal
async function playModalCaseBriefingAudio() {
  const farmer = state.selectedOfficerFarmer;
  if (!farmer) return;

  const lang = state.selectedLanguage || (typeof localStorage !== 'undefined' && localStorage.getItem('sk_locale')) || 'en';
  const cropKey = (farmer.crop || '').toLowerCase();
  const localizedCrop = (CROP_TRANSLATIONS[cropKey] && CROP_TRANSLATIONS[cropKey][lang]) || farmer.crop;
  const topIntervention = (farmer.recommended_interventions && farmer.recommended_interventions[0]) || { scheme_name: 'PMFBY', action_item: 'Field visit' };

  const caseBriefings = {
    hi: `किसान ${farmer.farmer_name}, गांव ${farmer.village}, फसल ${localizedCrop}। संकट स्कोर ${farmer.distress_score}, जोखिम स्तर ${farmer.risk_band}। मुख्य कारण: ${farmer.top_contributing_signal ? farmer.top_contributing_signal.label : 'जोखिम'}। अनुशंसित सरकारी योजना: ${topIntervention.scheme_name}। अधिकारी फील्ड कार्रवाई: ${topIntervention.action_item}।`,
    mr: `शेतकरी ${farmer.farmer_name}, गाव ${farmer.village}, पीक ${localizedCrop}. संकट गुणांक ${farmer.distress_score}, गट ${farmer.risk_band}. मुख्य कारण: ${farmer.top_contributing_signal ? farmer.top_contributing_signal.label : 'धोका'}. शासकीय योजना: ${topIntervention.scheme_name}. कृषी अधिकारी कृती: ${topIntervention.action_item}.`,
    or: `କୃଷକ ${farmer.farmer_name}, ଗ୍ରାମ ${farmer.village}, ଫସଲ ${localizedCrop}। ସଙ୍କଟ ସ୍କୋର ${farmer.distress_score}, ରିସ୍କ ସ୍ତର ${farmer.risk_band}। ମୁଖ୍ୟ କାରଣ: ${farmer.top_contributing_signal ? farmer.top_contributing_signal.label : 'ସଙ୍କଟ'}। ପ୍ରସ୍ତାବିତ ଯୋଜନା: ${topIntervention.scheme_name}। ଅଧିକାରୀ କାର୍ଯ୍ୟାନୁଷ୍ଠାନ: ${topIntervention.action_item}।`,
    as: `কৃষক ${farmer.farmer_name}, গাঁও ${farmer.village}, শস্য ${localizedCrop}। সংকট নম্বৰ ${farmer.distress_score}, স্তৰ ${farmer.risk_band}। মূল কাৰণ: ${farmer.top_contributing_signal ? farmer.top_contributing_signal.label : 'সংকট'}। প্ৰস্তাৱিত আঁচনি: ${topIntervention.scheme_name}। বিষয়াৰ পদক্ষেপ: ${topIntervention.action_item}।`,
    kn: `ರೈತ ${farmer.farmer_name}, ಗ್ರಾಮ ${farmer.village}, ಬೆಳೆ ${localizedCrop}. ಸಂಕಷ್ಟ ಅಂಕ ${farmer.distress_score}, ಹಂತ ${farmer.risk_band}. ಪ್ರಮುಖ ಕಾರಣ: ${farmer.top_contributing_signal ? farmer.top_contributing_signal.label : 'ಅಪಾಯ'}. ಶಿಫಾರಸು ಯೋಜನೆ: ${topIntervention.scheme_name}. ಅಧಿಕಾರಿಗಳ ಕ್ರಮ: ${topIntervention.action_item}.`,
    en: `Farmer ${farmer.farmer_name} from village ${farmer.village}, cultivating ${farmer.crop}. Compound distress score ${farmer.distress_score}, classified as ${farmer.risk_band} Risk. Primary trigger: ${farmer.top_contributing_signal ? farmer.top_contributing_signal.label : 'distress signal'}. Recommended scheme: ${topIntervention.scheme_name}. Field action item: ${topIntervention.action_item}.`
  };

  const script = caseBriefings[lang] || caseBriefings['en'];
  await speakText(script, lang, 'mandi-price');
}

// --- MODULE 3: SMS & IVR FALLBACK SIMULATOR ---

async function onSimFarmerChange(farmerId) {
  await startIvrCall(farmerId);
  await triggerSmsDelivery(farmerId);
}

// Dedicated IVR Keypad Language Switcher
async function onIvrLanguageSelect(lang) {
  state.ivrLanguage = lang;
  await startIvrCall(null, lang);
  playIvrAudioPrompt();
}

async function switchIvrLanguage(lang) {
  state.ivrLanguage = lang;
  const select = document.getElementById('sim-ivr-lang-select');
  if (select) select.value = lang;
  await startIvrCall(null, lang);
  playIvrAudioPrompt();
}

async function startIvrCall(customFarmerId, customLang) {
  const farmerId = customFarmerId || document.getElementById('sim-farmer-select')?.value || state.selectedFarmerId;
  const lang = customLang || state.ivrLanguage || state.selectedLanguage || 'hi';
  try {
    const res = await fetch(`${API_BASE}/simulate/ivr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmer_id: farmerId, language: lang })
    });

    state.ivrState = await res.json();
    state.ivrLanguage = state.ivrState.language || lang;

    // Sync select dropdown
    const select = document.getElementById('sim-ivr-lang-select');
    if (select && state.ivrState.language) select.value = state.ivrState.language;

    document.getElementById('ivr-screen-text').textContent = state.ivrState.voice_prompt_text;
    document.getElementById('ivr-status-pill').textContent = '● IN CALL (MAIN MENU)';
    document.getElementById('ivr-lang-pill').textContent = `LANG: ${(state.ivrState.language || lang).toUpperCase()}`;

    // Auto-trigger SMS emulator to match
    await triggerSmsDelivery(farmerId, state.ivrLanguage);

  } catch (err) {
    console.error('Error starting IVR call:', err);
  }
}

async function pressIvrKey(digit) {
  const farmerId = document.getElementById('sim-farmer-select')?.value || state.selectedFarmerId;
  const lang = state.ivrLanguage || state.selectedLanguage || 'hi';
  try {
    const res = await fetch(`${API_BASE}/simulate/ivr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmer_id: farmerId, digit_pressed: digit, language: lang })
    });

    state.ivrState = await res.json();
    if (state.ivrState.language) {
      state.ivrLanguage = state.ivrState.language;
      const select = document.getElementById('sim-ivr-lang-select');
      if (select) select.value = state.ivrState.language;
      document.getElementById('ivr-lang-pill').textContent = `LANG: ${state.ivrState.language.toUpperCase()}`;
    }

    document.getElementById('ivr-screen-text').textContent = state.ivrState.voice_prompt_text;
    document.getElementById('ivr-status-pill').textContent = `● KEY [${digit}] PRESSED`;

    // Speak response
    playIvrAudioPrompt();

  } catch (err) {
    console.error('Error pressing IVR key:', err);
  }
}

function playIvrAudioPrompt() {
  if (state.ivrState && state.ivrState.voice_prompt_text) {
    speakText(state.ivrState.voice_prompt_text, state.ivrState.language || state.ivrLanguage || state.selectedLanguage || 'hi');
  }
}

async function triggerSmsDelivery(customFarmerId, customLang) {
  const farmerId = customFarmerId || document.getElementById('sim-farmer-select')?.value || state.selectedFarmerId;
  const lang = customLang || state.ivrLanguage || state.selectedLanguage || 'hi';
  try {
    const res = await fetch(`${API_BASE}/simulate/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmer_id: farmerId, language: lang })
    });

    const data = await res.json();
    document.getElementById('sms-screen-body').textContent = data.sms_body;
    document.getElementById('sms-char-count').textContent = `Length: ${data.character_count} chars (${data.sms_segments} SMS)`;
    document.getElementById('sms-time').textContent = '16:45 IST';

  } catch (err) {
    console.error('Error triggering SMS delivery:', err);
  }
}

function initIvrSimulator() {
  const simLangSelect = document.getElementById("sim-ivr-lang-select");
  if (simLangSelect) {
    simLangSelect.value = state.selectedLanguage || "hi";
  }
}

// Global exports for Onboarding and Interop
window.state = state;
window.selectFarmer = selectFarmer;
window.fetchFarmers = loadFarmersList;
window.loadFarmersList = loadFarmersList;
window.fetchFarmerData = selectFarmer;
window.switchGlobalLanguage = onLanguageChanged;
window.speakText = speakText;
window.showTTSToast = showTTSToast;
window.loginAsFarmer = loginAsFarmer;
window.deleteFarmerAccount = deleteFarmerAccount;
window.switchSchemeCategory = switchSchemeCategory;
window.renderFarmerSchemes = renderFarmerSchemes;





// ─── ENGINE SANDBOX & MVP TESTER LOGIC ───
let currentSandboxData = null;

async function runSandboxEvaluation() {
  const nameInput = document.getElementById('sb-farmer-name');
  if (!nameInput) return; // Not on sandbox view

  const payload = {
    farmer: {
      name: nameInput.value || 'Demo Farmer',
      village: 'Nashik Village',
      district_id: document.getElementById('sb-district').value,
      crop: document.getElementById('sb-crop').value,
      crop_stage: document.getElementById('sb-stage').value,
      landholding_hectares: parseFloat(document.getElementById('sb-land').value || 1.2),
      soil_type: document.getElementById('sb-soil')?.value || 'black',
      irrigation_type: document.getElementById('sb-irrigation').value,
      borewell_failed: document.getElementById('sb-borewell-failed').checked,
      has_pmfby_insurance: document.getElementById('sb-pmfby').checked,
      has_kcc: document.getElementById('sb-kcc').checked,
      informal_debt: document.getElementById('sb-informal-debt').checked,
      loan_due_date: document.getElementById('sb-loan-date')?.value || '2026-11-15',
      loan_amount_inr: 50000,
      language: document.getElementById('sb-lang').value
    },
    current_mandi_price: parseFloat(document.getElementById('sb-cur-price').value || 0),
    govt_msp: parseFloat(document.getElementById('sb-msp-price').value || 0),
    rainfall_deviation_pct: parseFloat(document.getElementById('sb-rain-dev').value || 0),
    dry_spell_days: parseInt(document.getElementById('sb-dry-days').value || 0),
    onset_delay_days: parseInt(document.getElementById('sb-onset-delay').value || 0),
    language: document.getElementById('sb-lang').value
  };

  try {
    const res = await fetch('/api/simulator/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentSandboxData = data;
    renderSandboxResults(data);
  } catch (err) {
    console.error('Failed to run Sandbox evaluation:', err);
  }
}

function renderSandboxResults(data) {
  const adv = data.advisory;
  const dist = data.distress;
  const trace = data.decision_trace;
  const lang = data.inputs_received.language || state.selectedLanguage || 'en';

  // 1. Advisory Card
  const ruleBadge = document.getElementById('sb-out-rule-badge');
  if (ruleBadge) {
    if (adv.rule_id === 'R-30') {
      ruleBadge.textContent = '🚨 RULE R-30: MARKET DISTRESS OVERRIDE';
      ruleBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300 shadow-sm';
    } else if (adv.rule_id === 'R-10') {
      ruleBadge.textContent = '⚠️ RULE R-10: CRIDA CONTINGENCY CROP SWITCH';
      ruleBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-sm';
    } else if (adv.rule_id === 'R-15') {
      ruleBadge.textContent = '💧 RULE R-15: PROTECTIVE IRRIGATION ADVISORY';
      ruleBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300 shadow-sm';
    } else {
      ruleBadge.textContent = '🌱 RULE R-20: STANDARD ICAR-CRIDA AGRONOMY';
      ruleBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-300 shadow-sm';
    }
  }

  const titleEl = document.getElementById('sb-out-title');
  if (titleEl) {
    titleEl.textContent = (adv.title && adv.title[lang]) || (adv.title && adv.title['en']) || 'Crop Guidance Notice';
  }

  const textEl = document.getElementById('sb-out-text');
  if (textEl) {
    textEl.textContent = (adv.text && adv.text[lang]) || (adv.text && adv.text['en']) || '';
  }

  // 2. Decision Trace
  const traceContainer = document.getElementById('sb-trace-container');
  if (traceContainer) {
    traceContainer.innerHTML = trace.map(t => {
      const isFired = t.triggered;
      return `
        <div class="p-3.5 rounded-2xl border ${isFired ? 'bg-emerald-50/80 border-emerald-300 shadow-sm ring-2 ring-emerald-400/20' : 'bg-slate-50 border-slate-200 opacity-70'} flex items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-black font-mono px-2 py-0.5 rounded ${isFired ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}">P-${t.priority}</span>
              <span class="font-bold text-xs sm:text-sm ${isFired ? 'text-emerald-950 font-extrabold' : 'text-slate-700'}">${t.rule}</span>
            </div>
            <div class="text-[11px] font-mono text-slate-500">Condition: ${t.condition}</div>
            <div class="text-[11px] font-medium text-slate-600">Evaluated: ${t.evaluated}</div>
          </div>
          <span class="text-xs font-black uppercase px-2.5 py-1 rounded-full flex-shrink-0 ${isFired ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}">
            ${isFired ? '✓ Triggered' : '✕ Skipped'}
          </span>
        </div>
      `;
    }).join('');
  }

  // 3. Distress Breakdown
  const fdiScoreEl = document.getElementById('sb-fdi-score-badge');
  const fdiScore = dist.distress_score !== undefined ? dist.distress_score : (dist.fdi_score || 0);
  const band = dist.risk_band || (fdiScore >= 70 ? 'High' : fdiScore >= 40 ? 'Medium' : 'Low');

  if (fdiScoreEl) {
    fdiScoreEl.textContent = `${band.toUpperCase()} RISK (${fdiScore.toFixed(1)})`;
    fdiScoreEl.className = band === 'High' ? 'px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300' :
      band === 'Medium' ? 'px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300' :
      'px-3 py-1 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-300';
  }

  const fdiFormulaEl = document.getElementById('sb-fdi-formula');
  if (fdiFormulaEl && dist.breakdown) {
    const b = dist.breakdown;
    fdiFormulaEl.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
        <div class="bg-white p-2 rounded-xl border border-slate-200">
          <div class="text-slate-400 font-bold">Exposure (E)</div>
          <div class="font-black text-slate-900 text-sm mt-0.5">${(b.E !== undefined ? b.E : (b.exposure||0)).toFixed(1)}</div>
        </div>
        <div class="bg-white p-2 rounded-xl border border-slate-200">
          <div class="text-slate-400 font-bold">Sensitivity (S)</div>
          <div class="font-black text-slate-900 text-sm mt-0.5">${(b.S !== undefined ? b.S : (b.sensitivity||0)).toFixed(1)}</div>
        </div>
        <div class="bg-white p-2 rounded-xl border border-slate-200">
          <div class="text-slate-400 font-bold">Adaptive (AC)</div>
          <div class="font-black text-slate-900 text-sm mt-0.5">${(b.AC !== undefined ? b.AC : (b.adaptive_capacity||0)).toFixed(1)}</div>
        </div>
        <div class="bg-white p-2 rounded-xl border border-slate-200">
          <div class="text-slate-400 font-bold">Mitigation (M)</div>
          <div class="font-black text-slate-900 text-sm mt-0.5">${(b.M !== undefined ? b.M : (b.mitigation_deficit||0)).toFixed(1)}</div>
        </div>
        <div class="bg-white p-2 rounded-xl border border-slate-200">
          <div class="text-slate-400 font-bold">Trigger (T)</div>
          <div class="font-black text-slate-900 text-sm mt-0.5">${(b.T !== undefined ? b.T : (b.trigger||0)).toFixed(1)}</div>
        </div>
        <div class="bg-white p-2 rounded-xl border border-slate-200">
          <div class="text-slate-400 font-bold">Fragility (DF)</div>
          <div class="font-black text-slate-900 text-sm mt-0.5">${(b.DF !== undefined ? b.DF : (b.district_fragility||0)).toFixed(1)}</div>
        </div>
      </div>
    `;
  }
}

function loadSandboxPreset(presetKey) {
  if (presetKey === 'market_crash') {
    document.getElementById('sb-farmer-name').value = 'Ramesh Patil';
    document.getElementById('sb-district').value = 'D1';
    document.getElementById('sb-crop').value = 'onion';
    document.getElementById('sb-stage').value = 'harvest';
    document.getElementById('sb-land').value = '1.2';
    document.getElementById('sb-irrigation').value = 'protective_well';
    document.getElementById('sb-borewell-failed').checked = false;
    document.getElementById('sb-pmfby').checked = true;
    document.getElementById('sb-kcc').checked = true;
    document.getElementById('sb-informal-debt').checked = true;
    document.getElementById('sb-cur-price').value = '1100';
    document.getElementById('sb-msp-price').value = '1500';
    document.getElementById('sb-rain-dev').value = '-10';
    document.getElementById('sb-dry-days').value = '2';
    document.getElementById('sb-onset-delay').value = '0';
  } else if (presetKey === 'drought_switch') {
    document.getElementById('sb-farmer-name').value = 'Sunita Shinde';
    document.getElementById('sb-district').value = 'D2';
    document.getElementById('sb-crop').value = 'cotton';
    document.getElementById('sb-stage').value = 'sowing';
    document.getElementById('sb-land').value = '0.8';
    document.getElementById('sb-irrigation').value = 'rainfed';
    document.getElementById('sb-borewell-failed').checked = false;
    document.getElementById('sb-pmfby').checked = false;
    document.getElementById('sb-kcc').checked = false;
    document.getElementById('sb-informal-debt').checked = true;
    document.getElementById('sb-cur-price').value = '6500';
    document.getElementById('sb-msp-price').value = '6620';
    document.getElementById('sb-rain-dev').value = '-55';
    document.getElementById('sb-dry-days').value = '16';
    document.getElementById('sb-onset-delay').value = '22';
  } else if (presetKey === 'fragility_relief') {
    document.getElementById('sb-farmer-name').value = 'Ganesh Rao';
    document.getElementById('sb-district').value = 'D2';
    document.getElementById('sb-crop').value = 'soybean';
    document.getElementById('sb-stage').value = 'vegetative';
    document.getElementById('sb-land').value = '0.6';
    document.getElementById('sb-irrigation').value = 'rainfed';
    document.getElementById('sb-borewell-failed').checked = false;
    document.getElementById('sb-pmfby').checked = false;
    document.getElementById('sb-kcc').checked = false;
    document.getElementById('sb-informal-debt').checked = true;
    document.getElementById('sb-cur-price').value = '4600';
    document.getElementById('sb-msp-price').value = '4600';
    document.getElementById('sb-rain-dev').value = '0';
    document.getElementById('sb-dry-days').value = '0';
    document.getElementById('sb-onset-delay').value = '0';
  }

  runSandboxEvaluation();
}

async function speakSandboxAdvisory() {
  if (!currentSandboxData || !currentSandboxData.advisory) return;

  const adv = currentSandboxData.advisory;
  const lang = currentSandboxData.inputs_received.language || state.selectedLanguage || 'en';
  const text = (adv.text && adv.text[lang]) || (adv.text && adv.text['en']) || (adv.text && adv.text['hi']) || '';
  await speakText(text, lang, 'sandbox-engine');
}

// Expose core app hooks to window
window.state = state;
window.selectFarmer = selectFarmer;
window.loadFarmersList = loadFarmersList;
window.onLanguageChanged = onLanguageChanged;
window.switchGlobalLanguage = onLanguageChanged;
window.applyI18n = applyI18n;
window.showTTSToast = showTTSToast;
window.speakText = speakText;
window.switchMainView = switchMainView;
window.runSandboxEvaluation = runSandboxEvaluation;
window.loadSandboxPreset = loadSandboxPreset;
window.speakSandboxAdvisory = speakSandboxAdvisory;
