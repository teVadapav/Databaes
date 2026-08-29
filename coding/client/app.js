/**
 * PS-02: Smart Crop Advisory & Farmer Distress Early-Warning System (v3)
 * Frontend Application Logic (Vanilla JS + Modern Component Architecture)
 */

// Application State
const state = {
  activeView: 'farmer',         // 'farmer' | 'officer' | 'simulator'
  farmerAccessMode: 'assisted', // 'assisted' | 'self'
  selectedFarmerId: 'F1',
  selectedLanguage: 'hi',
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
  isSpeaking: false,
  translationCache: {},
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
  en: {
    accessMode: 'Access Mode', assistedMode: '🤝 Assisted Mode (Kisan Mitra / CSC)',
    selfService: '📱 Self-Service', selectFarmer: 'Select Farmer:', language: 'Language:',
    cropAdvisory: 'Crop Advisory', cropAdvisorySub: 'Weather & Crop Care Guidance',
    mandiPrice: 'Mandi Price', mandiPriceSub: 'Current Market vs Govt MSP',
    myAlerts: 'My Alerts', myAlertsSub: 'Rainfall & Loan Due Notices',
    govtSchemes: 'Govt Schemes', govtSchemesSub: 'PMFBY, KCC & Debt Relief',
    tapToListen: 'Tap to listen 🔊', playAdvisory: 'Play Spoken Advisory (Voice)',
    stopAudio: 'Stop Audio ⏹️', playing: 'Playing advisory audio…',
    optimalChannel: 'Optimal Channel', translating: 'Translating…',

    // Weather & Soil Context
    weatherContextTitle: 'Weather & Soil Indicators',
    listenAllWeather: 'Listen Weather & Soil 🔊',
    tapToListenShort: 'Tap to listen 🔊',
    rainDevLabel: 'Rainfall Deviation',
    drySpellLabel: 'Dry Spell Length',
    monsoonOnsetLabel: 'Monsoon Onset',
    soilTypeLabel: 'Soil Type',

    // Mandi Price Tab
    mandiBadge: 'APMC Market Surveillance',
    mandiMainTitle: 'Mandi Price vs Government MSP',
    listenMandi: 'Listen Mandi Price 🔊',
    todayMandiLabel: "Today's Mandi Price",
    perQuintalLabel: 'per Quintal',
    govFloorPrice: 'Govt Floor Price',
    govMspLabel: 'Government MSP',
    guaranteedMspLabel: 'per Quintal (Guaranteed Benchmark)',
    recommendedActionLabel: 'Recommended Market Action:',
    distressWarning: 'Distress Warning',
    stablePrice: 'Stable Price',
    belowMspTitle: 'Price is BELOW Government MSP!',
    aboveMspTitle: 'Price is ABOVE Government MSP',

    // Alerts Tab
    alertsBadge: 'Notifications & Reminders',
    alertsMainTitle: 'Active Notifications for Your Farm',
    listenAllAlerts: 'Listen All Alerts 🔊',

    // Govt Schemes Tab
    schemesBadge: 'Government Safety Net',
    schemesMainTitle: 'Eligible Schemes Based on Your Stress Signals',
    listenAllSchemes: 'Listen All Schemes 🔊',
    triggerCauseLabel: 'Trigger Cause:',
    farmerActionLabel: 'Action for Farmer:',

    // Officer Dashboard
    officerBadge: 'Administration & Extension Portal',
    officerMainTitle: 'District Agro-Distress Monitoring & Interventions',
    officerMainSub: 'ICAR-CRIDA FDI framework early-warning dashboard for block agriculture officers and field workers.',
    playOfficerBriefing: 'Listen to District Briefing 🔊',
    metricTotal: 'Total Monitored', metricTotalSub: 'Across 3 Agro-Districts',
    metricHigh: 'High Risk Alert', metricHighSub: 'Immediate intervention required',
    metricMed: 'Medium Risk', metricMedSub: 'Under advisory monitoring',
    metricLow: 'Low Risk', metricLowSub: 'Stable agronomic conditions',
    calibratorTitle: 'CRIDA FDI Weight Calibrator — 6 Dimensions',
    calibratorSub: 'Adjust dimension weights (ICAR-CRIDA FDI Framework). Sliders auto-normalize to 100% and re-rank the farmer list live. DF shown to officer only.',
    resetDefaults: 'Reset to CRIDA Defaults (25/15/15/15/20/10)',
    sliderExposure: '🌦️ E — Exposure (Climate & Price)', sliderExposureSub: 'Rainfall deficit + MSP price shortfall exposure (Dim. 1)',
    sliderSensitivity: '💧 S — Sensitivity (Irrigation)', sliderSensitivitySub: 'Irrigation dependency: rainfed / borewell / canal (Dim. 2)',
    sliderAC: '🌱 AC — Adaptive Capacity (Inverted)', sliderACSub: 'Landholding size + income diversification (Dim. 3, inverted)',
    sliderMitigation: '🏛️ M — Mitigation Deficit (PMFBY/KCC)', sliderMitigationSub: 'Uninsured & no KCC = maximum deficit (Dim. 4)',
    sliderTrigger: '💳 T — Trigger (Loan & Informal Debt)', sliderTriggerSub: 'Loan urgency + moneylender informal debt shock (Dim. 5)',
    sliderDF: '🏔️ DF — District Fragility (Officer-only)', sliderDFSub: 'Historical agrarian crisis index — not shown to farmers (Dim. 6)',
    registryTitle: 'Farmer Distress Early-Warning Registry',
    registrySub: 'Ranked by compound distress risk score. Maps individual triggers directly to actionable government interventions.',
    filterLabel: 'Filter:', filterAll: 'All Risk Bands', filterHigh: 'High Risk Only (71-100)', filterMed: 'Medium Risk (41-70)', filterLow: 'Low Risk (0-40)',
    thFarmerVillage: 'Farmer & Village', thDistrict: 'District', thCropStage: 'Crop & Stage', thDistressScore: 'Distress Score',
    thTopTrigger: 'Top Trigger Signal', thRecommendedScheme: 'Recommended Scheme', thContactChannel: 'Contact Channel', thActions: 'Actions',
    viewDetails: 'View Details 🔍', callIvr: 'Call / IVR', appPush: 'App Push',

    // Modal
    modalListenBriefing: 'Listen Case Summary 🔊',
    modalReachabilityTitle: 'Field Contact & Reachability Guidance:',
    modalBreakdownTitle: 'Distress Score Breakdown — ICAR-CRIDA 6-Dimension FDI (Reddy et al., 2021):',
    modalExplanationsTitle: 'Contributing Signal Explanations:',
    modalLandTitle: 'Landholding Context', modalFragilityTitle: 'District Fragility Index (Structural)',
    modalInterventionsTitle: 'Actionable Scheme Interventions (Field Paperwork to Bring):',
    modalCloseBtn: 'Close Registry Detail',

    // Simulator & Keypad
    simBadge: 'Adaptive Capacity Fallback Layer',
    simTitle: 'Interactive IVR Voice & Plain-Text SMS Simulator',
    simSub: 'Over 65% of smallholder farmers in vulnerable districts operate basic feature phones or suffer from 2G/poor rural network. This simulator demonstrates how the system delivers actionable advisories and distress warnings via automated voice calls (IVR) and plain-text SMS.',
    ivrHeaderTitle: 'Interactive IVR Voice Call', ivrSpeakPrompt: 'Speak Prompt (TTS)', ivrRestartCall: 'Restart Call 🔄',
    pressKeypad: 'Press Phone Keypad:', keyAdvisory: 'ADVISORY', keyMandi: 'MANDI/MSP', keySchemes: 'SCHEMES', keyOfficer: 'OFFICER',
    quickLangSwitch: 'Keypad Language Direct Switch:',
    smsEmulatorTitle: 'Feature Phone SMS Emulator', smsEmulatorSub: 'Plain-text 160-character GSM SMS Delivery', sendTestSms: 'Send Test SMS 📨',
    simDesignNoteTitle: 'Adaptive Capacity Design Validation:',
    simDesignNote1: '• Plain text without markdown ensures 100% compatibility on 2G feature phones.',
    simDesignNote2: '• Standardized toll-free helpline number allows immediate one-touch callback.',
    simDesignNote3: '• Automatically localized into farmer\'s registered language preference.'
  },
  hi: {
    accessMode: 'उपयोग मोड', assistedMode: '🤝 सहायता मोड (किसान मित्र / सीएससी)',
    selfService: '📱 सेल्फ-सर्विस (स्वयं उपयोग)', selectFarmer: 'किसान चुनें:', language: 'भाषा:',
    cropAdvisory: 'फसल सलाह', cropAdvisorySub: 'मौसम एवं फसल देखभाल मार्गदर्शन',
    mandiPrice: 'मंडी भाव', mandiPriceSub: 'वर्तमान बाजार भाव बनाम सरकारी एमएसपी',
    myAlerts: 'महत्वपूर्ण अलर्ट', myAlertsSub: 'वर्षा कमी एवं ऋण अदायगी नोटिस',
    govtSchemes: 'सरकारी योजनाएं', govtSchemesSub: 'फसल बीमा (PMFBY), केसीसी एवं ऋण राहत',
    tapToListen: 'सुनने के लिए टैप करें 🔊', playAdvisory: 'पूरी सलाह सुनें (आवाज)',
    stopAudio: 'आवाज बंद करें ⏹️', playing: 'सलाह की आवाज चालू है…',
    optimalChannel: 'सुझाया गया संपर्क माध्यम', translating: 'अनुवाद हो रहा है…',

    // Weather & Soil Context
    weatherContextTitle: 'मौसम एवं मिट्टी के मुख्य संकेतक',
    listenAllWeather: 'मौसम व मिट्टी रिपोर्ट सुनें 🔊',
    tapToListenShort: 'सुनने के लिए टैप करें 🔊',
    rainDevLabel: 'वर्षा में विचलन',
    drySpellLabel: 'सूखे दिनों की अवधि',
    monsoonOnsetLabel: 'मानसून आगमन',
    soilTypeLabel: 'मिट्टी का प्रकार',

    // Mandi Price Tab
    mandiBadge: 'कृषि उपज मंडी समिति (APMC) निगरानी',
    mandiMainTitle: 'मंडी भाव बनाम सरकारी एमएसपी (MSP)',
    listenMandi: 'मंडी भाव सुनें 🔊',
    todayMandiLabel: 'आज का मंडी भाव',
    perQuintalLabel: 'प्रति क्विंटल',
    govFloorPrice: 'सरकारी न्यूनतम समर्थन मूल्य',
    govMspLabel: 'सरकारी एमएसपी (MSP)',
    guaranteedMspLabel: 'प्रति क्विंटल (सरकारी गारंटी मूल्य)',
    recommendedActionLabel: 'सुझाई गई बाजार रणनीति:',
    distressWarning: 'संकट चेतावनी',
    stablePrice: 'स्थिर भाव',
    belowMspTitle: 'मंडी भाव सरकारी एमएसपी से कम है!',
    aboveMspTitle: 'मंडी भाव सरकारी एमएसपी से ऊपर है',

    // Alerts Tab
    alertsBadge: 'अधिसूचनाएं एवं स्मरण पत्र',
    alertsMainTitle: 'आपके खेत के सक्रिय अलर्ट',
    listenAllAlerts: 'सभी अलर्ट सुनें 🔊',

    // Govt Schemes Tab
    schemesBadge: 'सरकारी सुरक्षा कवच',
    schemesMainTitle: 'आपके संकट संकेतों के आधार पर पात्र योजनाएं',
    listenAllSchemes: 'सभी योजनाएं सुनें 🔊',
    triggerCauseLabel: 'संकट का कारण:',
    farmerActionLabel: 'किसान के लिए कदम:',

    // Officer Dashboard
    officerBadge: 'प्रशासन एवं कृषि विस्तार पोर्टल',
    officerMainTitle: 'जिला कृषि संकट निगरानी एवं सरकारी हस्तक्षेप डैशबोर्ड',
    officerMainSub: 'प्रखंड कृषि अधिकारियों और फील्ड कार्यकर्ताओं के लिए ICAR-CRIDA FDI पूर्व-चेतावनी प्रणाली।',
    playOfficerBriefing: 'जिला सारांश सुनें 🔊',
    metricTotal: 'कुल पंजीकृत किसान', metricTotalSub: '३ कृषि जिलों में',
    metricHigh: 'गंभीर संकट (High Risk)', metricHighSub: 'तत्काल फील्ड विजिट व सहायता आवश्यक',
    metricMed: 'मध्यम संकट (Medium Risk)', metricMedSub: 'सलाह निगरानी के अंतर्गत',
    metricLow: 'कम जोखिम (Low Risk)', metricLowSub: 'संतोषजनक कृषि स्थिति',
    calibratorTitle: 'CRIDA FDI भार कैलिब्रेटर — ६ आयाम',
    calibratorSub: 'आयामों का भार समायोजित करें (ICAR-CRIDA ढांचा)। स्लाइडर स्वतः १००% पर संतुलित होकर लाइव सूची अपडेट करते हैं।',
    resetDefaults: 'CRIDA मानक भार पर लौटें (25/15/15/15/20/10)',
    sliderExposure: '🌦️ E — मौसम व मूल्य संकट (Exposure)', sliderExposureSub: 'बारिश की कमी + एमएसपी से कम भाव का जोखिम (आयाम १)',
    sliderSensitivity: '💧 S — सिंचाई संवेदनशीलता (Sensitivity)', sliderSensitivitySub: 'सिंचाई निर्भरता: वर्षा आधारित / नलकूप / नहर (आयाम २)',
    sliderAC: '🌱 AC — अनुकूलन क्षमता (Adaptive Capacity)', sliderACSub: 'जमीन का आकार + अन्य आय स्रोत (आयाम ३, उल्टा)',
    sliderMitigation: '🏛️ M — सुरक्षा का अभाव (Mitigation Deficit)', sliderMitigationSub: 'बीमा और केसीसी नहीं होना = अधिकतम अभाव (आयाम ४)',
    sliderTrigger: '💳 T — ऋण अदायगी दबाव (Trigger Signal)', sliderTriggerSub: 'ऋण वापसी समय + साहूकार का कर्ज (आयाम ५)',
    sliderDF: '🏔️ DF — जिला संवेदनशीलता (District Fragility)', sliderDFSub: 'ऐतिहासिक संकट सूचकांक — केवल अधिकारियों के लिए (आयाम ६)',
    registryTitle: 'किसान संकट पूर्व-चेतावनी पंजी',
    registrySub: 'कुल संकट स्कोर अनुसार क्रमबद्ध। व्यक्तिगत कारणों को सीधे सरकारी योजनाओं से जोड़ता है।',
    filterLabel: 'फ़िल्टर:', filterAll: 'सभी संकट स्तर', filterHigh: 'केवल गंभीर संकट (71-100)', filterMed: 'मध्यम संकट (41-70)', filterLow: 'कम जोखिम (0-40)',
    thFarmerVillage: 'किसान व गांव', thDistrict: 'जिला', thCropStage: 'फसल व अवस्था', thDistressScore: 'संकट स्कोर',
    thTopTrigger: 'मुख्य संकट कारण', thRecommendedScheme: 'प्रस्तावित सरकारी योजना', thContactChannel: 'संपर्क माध्यम', thActions: 'कार्रवाई',
    viewDetails: 'विवरण देखें 🔍', callIvr: 'कॉल / IVR', appPush: 'ऐप सूचना',

    // Modal
    modalListenBriefing: 'केस सारांश सुनें 🔊',
    modalReachabilityTitle: 'फील्ड संपर्क एवं पहुंच मार्गदर्शन:',
    modalBreakdownTitle: 'संकट स्कोर विश्लेषण — ICAR-CRIDA ६-आयाम FDI (रेड्डी एवं सहयोगी, २०२१):',
    modalExplanationsTitle: 'संकट के मुख्य कारण:',
    modalLandTitle: 'भूमि जोत संदर्भ', modalFragilityTitle: 'जिला संवेदनशीलता सूचकांक',
    modalInterventionsTitle: 'सरकारी सहायता योजनाएं (फील्ड विजिट में साथ लाने वाले दस्तावेज):',
    modalCloseBtn: 'विवरण बंद करें',

    // Simulator & Keypad
    simBadge: 'साधारण फोन बैकअप प्रणाली',
    simTitle: 'इंटरैक्टिव IVR वॉयस एवं साधारण SMS सिम्युलेटर',
    simSub: 'ग्रामीण क्षेत्रों के ६५% से अधिक किसान बेसिक कीपैड फोन इस्तेमाल करते हैं। यह सिम्युलेटर दिखाता है कि स्वचालित वॉयस कॉल और एसएमएस के माध्यम से जानकारी कैसे पहुंचाई जाती है।',
    ivrHeaderTitle: 'स्वचालित IVR वॉयस कॉल', ivrSpeakPrompt: 'आवाज में सुनें (TTS)', ivrRestartCall: 'कॉल पुनः शुरू करें 🔄',
    pressKeypad: 'फोन कीपैड दबाएं:', keyAdvisory: 'फसल सलाह', keyMandi: 'मंडी भाव', keySchemes: 'योजनाएं', keyOfficer: 'अधिकारी',
    quickLangSwitch: 'कीपैड से भाषा सीधे बदलें:',
    smsEmulatorTitle: 'फीचर फोन SMS एमुलेटर', smsEmulatorSub: '१६० अक्षरों का साधारण हिंदी SMS संदेश', sendTestSms: 'टेस्ट SMS भेजें 📨',
    simDesignNoteTitle: '२G फोन अनुकूलन विशेषताएं:',
    simDesignNote1: '• इंटरनेट के बिना २G फीचर फोन पर १००% सुगम कार्यक्षमता।',
    simDesignNote2: '• १८००-१८०-१५५१ टोल-फ्री नंबर पर एक बटन दबाकर सहायता।',
    simDesignNote3: '• किसान की पंजीकृत क्षेत्रीय भाषा में स्वतः संदेश।'
  },
  mr: {
    accessMode: 'वापर पद्धत', assistedMode: '🤝 साहाय्यक पद्धत (किसान मित्र / सीएससी)',
    selfService: '📱 स्वतः वापरा', selectFarmer: 'शेतकरी निवडा:', language: 'भाषा:',
    cropAdvisory: 'पीक सल्ला', cropAdvisorySub: 'हवामान व पीक संरक्षण मार्गदर्शन',
    mandiPrice: 'बाजार भाव', mandiPriceSub: 'सध्याचा बाजार भाव विरुद्ध हमीभाव (MSP)',
    myAlerts: 'महत्त्वाच्या सूचना', myAlertsSub: 'पावसाचा खंड व पीक कर्ज परतफेड सूचना',
    govtSchemes: 'सरकारी योजना', govtSchemesSub: 'पीक विमा (PMFBY), केसीसी व कर्ज सवलत',
    tapToListen: 'ऐकण्यासाठी टॅप करा 🔊', playAdvisory: 'सल्ला ऐका (आवाज)',
    stopAudio: 'आवाज बंद करा ⏹️', playing: 'सल्ला ऑडिओ सुरू आहे…',
    optimalChannel: 'शिफारस केलेले माध्यम', translating: 'भाषांतर होत आहे…',

    // Weather & Soil Context
    weatherContextTitle: 'हवामान व जमीन निर्देशक',
    listenAllWeather: 'हवामान व जमीन माहिती ऐका 🔊',
    tapToListenShort: 'ऐकण्यासाठी टॅप करा 🔊',
    rainDevLabel: 'पावसातील तूट/वाढ',
    drySpellLabel: 'पावसाचा खंड (दिवस)',
    monsoonOnsetLabel: 'मान्सून आगमन',
    soilTypeLabel: 'मातीचा प्रकार',

    // Mandi Price Tab
    mandiBadge: 'कृषी उत्पन्न बाजार समिती (APMC) देखरेख',
    mandiMainTitle: 'बाजार भाव विरुद्ध शासकीय हमीभाव (MSP)',
    listenMandi: 'बाजार भाव ऐका 🔊',
    todayMandiLabel: 'आजचा बाजार भाव',
    perQuintalLabel: 'प्रति क्विंटल',
    govFloorPrice: 'शासकीय हमीभाव',
    govMspLabel: 'सरकारी हमीभाव (MSP)',
    guaranteedMspLabel: 'प्रति क्विंटल (हमीभाव आधार)',
    recommendedActionLabel: 'शिफारस केलेली बाजार कृती:',
    distressWarning: 'संकट इशारा',
    stablePrice: 'स्थिर भाव',
    belowMspTitle: 'बाजार भाव सरकारी हमीभावापेक्षा कमी आहे!',
    aboveMspTitle: 'बाजार भाव हमीभावापेक्षा जास्त आहे',

    // Alerts Tab
    alertsBadge: 'महत्त्वाच्या सूचना व स्मरणपत्रे',
    alertsMainTitle: 'आपल्या शेतासाठीच्या सक्रिय सूचना',
    listenAllAlerts: 'सर्व सूचना ऐका 🔊',

    // Govt Schemes Tab
    schemesBadge: 'सरकारी सुरक्षा कवच',
    schemesMainTitle: 'आपल्या संकटाच्या कारणांनुसार पात्र योजना',
    listenAllSchemes: 'सर्व योजना ऐका 🔊',
    triggerCauseLabel: 'संकटाचे मुख्य कारण:',
    farmerActionLabel: 'शेतकऱ्यांसाठी कृती:',

    // Officer Dashboard
    officerBadge: 'प्रशासन व कृषी विस्तार पोर्टल',
    officerMainTitle: 'जिल्हा कृषी संकट देखरेख व शासकीय साहाय्य डॅशबोर्ड',
    officerMainSub: 'तालुका कृषी अधिकारी व क्षेत्रीय कर्मचाऱ्यांसाठी ICAR-CRIDA FDI पूर्व-सूचना प्रणाली.',
    playOfficerBriefing: 'जिल्हा सारांश ऐका 🔊',
    metricTotal: 'एकूण शेतकरी', metricTotalSub: '३ कृषी जिल्ह्यांमध्ये',
    metricHigh: 'अति-गंभीर संकट (High Risk)', metricHighSub: 'तातडीने प्रत्यक्ष भेट व साहाय्य आवश्यक',
    metricMed: 'मध्यम संकट (Medium Risk)', metricMedSub: 'सल्ला देखरेखीखाली',
    metricLow: 'कमी धोका (Low Risk)', metricLowSub: 'समाधानकारक पीक स्थिती',
    calibratorTitle: 'CRIDA FDI भार कॅलिब्रेटर — ६ परिमाणे',
    calibratorSub: 'परिमाणांचे भार बदला (ICAR-CRIDA प्रारूप). स्लायडर आपोआप १००% वर संतुलित होऊन शेतकरी यादी अपडेट करतात.',
    resetDefaults: 'CRIDA मूळ भारांवर या (25/15/15/15/20/10)',
    sliderExposure: '🌦️ E — हवामान व बाजार भाव धोका', sliderExposureSub: 'पावसाची तूट + हमीभावापेक्षा कमी भाव (परिमाण १)',
    sliderSensitivity: '💧 S — सिंचन संवेदनशीलता', sliderSensitivitySub: 'सिंचन अवलंबित्व: जिरायती / विहीर / कालवा (परिमाण २)',
    sliderAC: '🌱 AC — अनुकूलन क्षमता', sliderACSub: 'जमिनीचा आकार + इतर उत्पन्नाचे स्रोत (परिमाण ३, उलटे)',
    sliderMitigation: '🏛️ M — सुरक्षा उपयांचा अभाव', sliderMitigationSub: 'विमा व केसीसी नसणे = सर्वाधिक अभाव (परिमाण ४)',
    sliderTrigger: '💳 T — कर्ज परतफेड दबाव', sliderTriggerSub: 'कर्ज परतफेडीची मुदत + सावकारी कर्ज (परिमाण ५)',
    sliderDF: '🏔️ DF — जिल्हा संवेदनशीलता', sliderDFSub: 'ऐतिहासिक संकट निर्देशांक — फक्त अधिकाऱ्यांसाठी (परिमाण ६)',
    registryTitle: 'शेतकरी संकट पूर्व-सूचना नोंदवही',
    registrySub: 'एकूण संकट गुणांनुसार क्रमवारी. वैयक्तिक कारणांची थेट शासकीय योजनांशी सांगड घातली जाते.',
    filterLabel: 'फिल्टर:', filterAll: 'सर्व संकट गट', filterHigh: 'केवळ अति-गंभीर (71-100)', filterMed: 'मध्यम संकट (41-70)', filterLow: 'कमी धोका (0-40)',
    thFarmerVillage: 'शेतकरी व गाव', thDistrict: 'जिल्हा', thCropStage: 'पीक व अवस्था', thDistressScore: 'संकट गुण',
    thTopTrigger: 'प्रमुख संकट कारण', thRecommendedScheme: 'शिफारस केलेली योजना', thContactChannel: 'संपर्क माध्यम', thActions: 'कृती',
    viewDetails: 'तपशील पहा 🔍', callIvr: 'कॉल / IVR', appPush: 'अ‍ॅप सूचना',

    // Modal
    modalListenBriefing: 'केस सारांश ऐका 🔊',
    modalReachabilityTitle: 'क्षेत्रीय संपर्क व पोहोच मार्गदर्शन:',
    modalBreakdownTitle: 'संकट गुण विश्लेषण — ICAR-CRIDA ६-परिमाण FDI (रेड्डी व सहकारी, २०२१):',
    modalExplanationsTitle: 'संकटाची प्रमुख कारणे:',
    modalLandTitle: 'जमीन धारणा संदर्भ', modalFragilityTitle: 'जिल्हा संवेदनशीलता निर्देशांक',
    modalInterventionsTitle: 'शासकीय योजना साहाय्य (क्षेत्रीय भेटीत सोबत आणायची कागदपत्रे):',
    modalCloseBtn: 'तपशील बंद करा',

    // Simulator & Keypad
    simBadge: 'साध्या फोनसाठी साहाय्यक व्यवस्था',
    simTitle: 'इंटरॅक्टिव्ह IVR व्हॉईस व साधा SMS सिम्युलेटर',
    simSub: 'ग्रामीण भागातील ६५% शेतकरी साधे कीपॅड फोन वापरतात. हा सिम्युलेटर दाखवतो की स्वयंचलित व्हॉईस कॉल व एसएमएसद्वारे माहिती कशी पोहोचवली जाते.',
    ivrHeaderTitle: 'स्वयंचलित IVR व्हॉईस कॉल', ivrSpeakPrompt: 'आवाजात ऐका (TTS)', ivrRestartCall: 'कॉल पुन्हा सुरू करा 🔄',
    pressKeypad: 'फोन कीपॅड दाबा:', keyAdvisory: 'पीक सल्ला', keyMandi: 'बाजार भाव', keySchemes: 'योजना', keyOfficer: 'अधिकारी',
    quickLangSwitch: 'कीपॅडवरून भाषा थेट बदला:',
    smsEmulatorTitle: 'साधा फोन SMS सिम्युलेटर', smsEmulatorSub: '१६० अक्षरांचा साधा मराठी SMS संदेश', sendTestSms: 'चाचणी SMS पाठवा 📨',
    simDesignNoteTitle: '२G फोन अनुकूलन वैशिष्ट्ये:',
    simDesignNote1: '• इंटरनेट नसताना २G कीपॅड फोनवर १००% सुरळीत काम.',
    simDesignNote2: '• १८००-१८०-१५५१ या टोल-फ्री नंबरवर एका बटनावर साहाय्य.',
    simDesignNote3: '• शेतकऱ्यांच्या नोंदणीकृत प्रादेशिक भाषेत स्वयंचलित संदेश.'
  },
  or: {
    accessMode: 'ବ୍ୟବହାର ମୋଡ୍', assistedMode: '🤝 ସହାୟକ ମୋଡ୍ (କୃଷକ ମିତ୍ର / CSC)',
    selfService: '📱 ନିଜେ ବ୍ୟବହାର କରନ୍ତୁ', selectFarmer: 'କୃଷକ ବାଛନ୍ତୁ:', language: 'ଭାଷା:',
    cropAdvisory: 'ଫସଲ ପରାମର୍ଶ', cropAdvisorySub: 'ପାଣିପାଗ ଓ ଫସଲ ଯତ୍ନ ମାର୍ଗଦର୍ଶିକା',
    mandiPrice: 'ମଣ୍ଡି ଦର', mandiPriceSub: 'ବର୍ତ୍ତମାନ ବଜାର ଦର ବନାମ ସରକାରୀ ଏମଏସପି (MSP)',
    myAlerts: 'ଜରୁରୀ ସତର୍କତା', myAlertsSub: 'ବର୍ଷା ଅଭାବ ଓ କୃଷି ଋଣ ନୋଟିସ୍',
    govtSchemes: 'ସରକାରୀ ଯୋଜନା', govtSchemesSub: 'ଫସଲ ବୀମା (PMFBY), କେସିସି ଓ ଋଣ ରିହାତି',
    tapToListen: 'ଶୁଣିବା ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ 🔊', playAdvisory: 'ପରାମର୍ଶ ଶୁଣନ୍ତୁ (ଆବାଜ)',
    stopAudio: 'ଆବାଜ ବନ୍ଦ କରନ୍ତୁ ⏹️', playing: 'ପରାମର୍ଶ ବାଜୁଛି…',
    optimalChannel: 'ସୁପାରିଶ କରାଯାଇଥିବା ମାଧ୍ୟମ', translating: 'ଅନୁବାଦ ହେଉଛି…',

    // Weather & Soil Context
    weatherContextTitle: 'ପାଣିପାଗ ଓ ମାଟିର ମୁଖ୍ୟ ସୂଚକ',
    listenAllWeather: 'ପାଣିପାଗ ଓ ମାଟି ରିପୋର୍ଟ ଶୁଣନ୍ତୁ 🔊',
    tapToListenShort: 'ଶୁଣିବା ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ 🔊',
    rainDevLabel: 'ବର୍ଷା ବିଚ୍ୟୁତି',
    drySpellLabel: 'ଶୁଖିଲା ଦିନର ଅବଧି',
    monsoonOnsetLabel: 'ମୌସୁମୀ ଆଗମନ',
    soilTypeLabel: 'ମାଟିର ପ୍ରକାର',

    // Mandi Price Tab
    mandiBadge: 'କୃଷି ଉତ୍ପାଦ ବଜାର ସମିତି (APMC) ନିରୀକ୍ଷଣ',
    mandiMainTitle: 'ମଣ୍ଡି ଦର ବନାମ ସରକାରୀ ଏମଏସପି (MSP)',
    listenMandi: 'ମଣ୍ଡି ଦର ଶୁଣନ୍ତୁ 🔊',
    todayMandiLabel: 'ଆଜିର ମଣ୍ଡି ଦର',
    perQuintalLabel: 'କ୍ୱିଣ୍ଟାଲ ପିଛା',
    govFloorPrice: 'ସରକାରୀ ସର୍ବନିମ୍ନ ସହାୟକ ମୂଲ୍ୟ',
    govMspLabel: 'ସରକାରୀ ଏମଏସପି (MSP)',
    guaranteedMspLabel: 'କ୍ୱିଣ୍ଟାଲ ପିଛା (ସରକାରୀ ନିଶ୍ଚିତ ମୂଲ୍ୟ)',
    recommendedActionLabel: 'ସୁପାରିଶ କରାଯାଇଥିବା ବଜାର ପଦକ୍ଷେପ:',
    distressWarning: 'ସଙ୍କଟ ଚେତାବନୀ',
    stablePrice: 'ସ୍ଥିର ଦର',
    belowMspTitle: 'ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି ଠାରୁ କମ୍ ଅଛି!',
    aboveMspTitle: 'ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି ଠାରୁ ଅଧିକ ଅଛି',

    // Alerts Tab
    alertsBadge: 'ବିଜ୍ଞପ୍ତି ଓ ସ୍ମାରକପତ୍ର',
    alertsMainTitle: 'ଆପଣଙ୍କ ଜମି ପାଇଁ ସକ୍ରିୟ ସତର୍କତା',
    listenAllAlerts: 'ସମସ୍ତ ସତର୍କତା ଶୁଣନ୍ତୁ 🔊',

    // Govt Schemes Tab
    schemesBadge: 'ସରକାରୀ ସୁରକ୍ଷା କବଚ',
    schemesMainTitle: 'ଆପଣଙ୍କ ସଙ୍କଟ କାରଣ ଅନୁଯାୟୀ ଯୋଗ୍ୟ ଯୋଜନା',
    listenAllSchemes: 'ସମସ୍ତ ଯୋଜନା ଶୁଣନ୍ତୁ 🔊',
    triggerCauseLabel: 'ସଙ୍କଟର କାରଣ:',
    farmerActionLabel: 'ଚାଷୀଙ୍କ ପାଇଁ ପଦକ୍ଷେପ:',

    // Officer Dashboard
    officerBadge: 'ପ୍ରଶାସନ ଓ କୃଷି ବିସ୍ତାର ପୋର୍ଟାଲ',
    officerMainTitle: 'ଜିଲ୍ଲା କୃଷି ସଙ୍କଟ ନିରୀକ୍ଷଣ ଓ ସରକାରୀ ସହାୟତା ଡ୍ୟାସବୋର୍ଡ',
    officerMainSub: 'ବ୍ଲକ କୃଷି ଅଧିକାରୀ ଓ ଫିଲ୍ଡ କର୍ମଚାରୀଙ୍କ ପାଇଁ ICAR-CRIDA FDI ପୂର୍ବ-ସତର୍କତା ବ୍ୟବସ୍ଥା।',
    playOfficerBriefing: 'ଜିଲ୍ଲା ସାରାଂଶ ଶୁଣନ୍ତୁ 🔊',
    metricTotal: 'ମୋଟ ପଞ୍ଜୀକୃତ କୃଷକ', metricTotalSub: '୩ଟି କୃଷି ଜିଲ୍ଲାରେ',
    metricHigh: 'ଗମ୍ଭୀର ସଙ୍କଟ (High Risk)', metricHighSub: 'ତୁରନ୍ତ ଫିଲ୍ଡ ଭିଜିଟ୍ ଓ ସହାୟତା ଆବଶ୍ୟକ',
    metricMed: 'ମଧ୍ୟମ ସଙ୍କଟ (Medium Risk)', metricMedSub: 'ପରାମର୍ଶ ନିରୀକ୍ଷଣ ଅଧୀନରେ',
    metricLow: 'କମ୍ ବିପଦ (Low Risk)', metricLowSub: 'ସନ୍ତୋଷଜନକ କୃଷି ଅବସ୍ଥା',
    calibratorTitle: 'CRIDA FDI ଭାର କାଲିବ୍ରେଟର୍ — ୬ଟି ଆୟାମ',
    calibratorSub: 'ଆୟାମଗୁଡ଼ିକର ଭାର ସଜାଡ଼ନ୍ତୁ (ICAR-CRIDA ଢାଞ୍ଚା)। ସ୍ଲାଇଡର୍ ସ୍ୱତଃ ୧୦୦% ରେ ସନ୍ତୁଳିତ ହୋଇ ଲାଇଭ୍ ତାଲିକା ବଦଳାଏ।',
    resetDefaults: 'CRIDA ମୂଳ ଭାରକୁ ଫେରନ୍ତୁ (25/15/15/15/20/10)',
    sliderExposure: '🌦️ E — ପାଣିପାଗ ଓ ମୂଲ୍ୟ ବିପଦ (Exposure)', sliderExposureSub: 'ବର୍ଷା ଅଭାବ + ଏମଏସପି ଠାରୁ କମ୍ ଦର ବିପଦ (ଆୟାମ ୧)',
    sliderSensitivity: '💧 S — ଜଳସେଚନ ସମ୍ବେଦନଶୀଳତା (Sensitivity)', sliderSensitivitySub: 'ଜଳସେଚନ ନିର୍ଭରତା: ବର୍ଷା ଆଧାରିତ / ନଳକୂପ / କେନାଲ (ଆୟାମ ୨)',
    sliderAC: '🌱 AC — ଅନୁକୂଳନ କ୍ଷମତା (Adaptive Capacity)', sliderACSub: 'ଜମିର ଆକାର + ଅନ୍ୟାନ୍ୟ ଆୟ ଉତ୍ସ (ଆୟାମ ୩, ଓଲଟା)',
    sliderMitigation: '🏛️ M — ସୁରକ୍ଷା ଅଭାବ (Mitigation Deficit)', sliderMitigationSub: 'ବୀମାହୀନ ଓ କେସିସି ନଥିବା = ସର୍ବାଧିକ ଅଭାବ (ଆୟାମ ୪)',
    sliderTrigger: '💳 T — ଋଣ ପରିଶୋଧ ଚାପ (Trigger Signal)', sliderTriggerSub: 'ଋଣ ଚାପ + ମହାଜନୀ ଋଣ ଝଟକା (ଆୟାମ ୫)',
    sliderDF: '🏔️ DF — ଜିଲ୍ଲା ସମ୍ବେଦନଶୀଳତା (District Fragility)', sliderDFSub: 'ଐତିହାସିକ ସଙ୍କଟ ସୂଚକାଙ୍କ — କେବଳ ଅଧିକାରୀଙ୍କ ପାଇଁ (ଆୟାମ ୬)',
    registryTitle: 'କୃଷକ ସଙ୍କଟ ପୂର୍ବ-ସତର୍କତା ପଞ୍ଜିକା',
    registrySub: 'ସମୁଦାୟ ସଙ୍କଟ ସ୍କୋର ଅନୁସାରେ ତାଲିକାଭୁକ୍ତ। ନିର୍ଦ୍ଦିଷ୍ଟ କାରଣକୁ ସିଧାସଳଖ ସରକାରୀ ଯୋଜନା ସହ ଯୋଡ଼େ।',
    filterLabel: 'ଫିଲ୍ଟର୍:', filterAll: 'ସମସ୍ତ ସଙ୍କଟ ସ୍ତର', filterHigh: 'କେବଳ ଗମ୍ଭୀର ସଙ୍କଟ (71-100)', filterMed: 'ମଧ୍ୟମ ସଙ୍କଟ (41-70)', filterLow: 'କମ୍ ବିପଦ (0-40)',
    thFarmerVillage: 'କୃଷକ ଓ ଗ୍ରାମ', thDistrict: 'ଜିଲ୍ଲା', thCropStage: 'ଫସଲ ଓ ପର୍ଯ୍ୟାୟ', thDistressScore: 'ସଙ୍କଟ ସ୍କୋର',
    thTopTrigger: 'ମୁଖ୍ୟ ସଙ୍କଟ କାରଣ', thRecommendedScheme: 'ସୁପାରିଶ କରାଯାଇଥିବା ଯୋଜନା', thContactChannel: 'ଯୋଗାଯୋଗ ମାଧ୍ୟମ', thActions: 'ପଦକ୍ଷେପ',
    viewDetails: 'ବିବରଣୀ ଦେଖନ୍ତୁ 🔍', callIvr: 'କଲ୍ / IVR', appPush: 'ଆପ୍ ନୋଟିଫିକେସନ୍',

    // Modal
    modalListenBriefing: 'କେସ୍ ସାରାଂଶ ଶୁଣନ୍ତୁ 🔊',
    modalReachabilityTitle: 'କ୍ଷେତ୍ର ସମ୍ପର୍କ ଓ ଯୋଗାଯୋଗ ମାର୍ଗଦର୍ଶିକା:',
    modalBreakdownTitle: 'ସଙ୍କଟ ସ୍କୋର ବିଶ୍ଳେଷଣ — ICAR-CRIDA ୬-ଆୟାମ FDI (ରେଡ୍ଡୀ ଏବଂ ସହଯୋଗୀ, ୨୦୨୧):',
    modalExplanationsTitle: 'ସଙ୍କଟର ମୁଖ୍ୟ କାରଣ:',
    modalLandTitle: 'ଜମି ମାଲିକାନା ସନ୍ଦର୍ଭ', modalFragilityTitle: 'ଜିଲ୍ଲା ସମ୍ବେଦନଶୀଳତା ସୂଚକାଙ୍କ',
    modalInterventionsTitle: 'ସରକାରୀ ସହାୟତା ଯୋଜନା (କ୍ଷେତ୍ର ପରିଦର୍ଶନ ସମୟରେ ଆଣିବାକୁ ଥିବା ଦଲିଲ):',
    modalCloseBtn: 'ବିବରଣୀ ବନ୍ଦ କରନ୍ତୁ',

    // Simulator & Keypad
    simBadge: 'ସାଧାରଣ ଫୋନ୍ ସହାୟତା ପ୍ରଣାଳୀ',
    simTitle: 'ଇଣ୍ଟରାକ୍ଟିଭ୍ ଆଇଭିଆର (IVR) ଓ ସରଳ ଏସଏମଏସ ସିମୁଲେଟର୍',
    simSub: 'ଗ୍ରାମାଞ୍ଚଳରେ ୬୫% ରୁ ଅଧିକ କୃଷକ ସାଧାରଣ ବଟନ ଫୋନ୍ ବ୍ୟବହାର କରନ୍ତି। ଏହି ସିମୁଲେଟର୍ ଦର୍ଶାଏ କିପରି ସ୍ୱୟଂଚାଳିତ ଭଏସ୍ କଲ୍ ଓ ମେସେଜ୍ ମାଧ୍ୟମରେ ସୂଚନା ପହଞ୍ଚାଯାଏ।',
    ivrHeaderTitle: 'ସ୍ୱୟଂଚାଳିତ IVR ଭଏସ୍ କଲ୍', ivrSpeakPrompt: 'ଆବାଜରେ ଶୁଣନ୍ତୁ (TTS)', ivrRestartCall: 'କଲ୍ ପୁନର୍ବାର ଆରମ୍ଭ କରନ୍ତୁ 🔄',
    pressKeypad: 'ଫୋନ୍ କିପ୍ୟାଡ୍ ଦବାନ୍ତୁ:', keyAdvisory: 'ଫସଲ ପରାମର୍ଶ', keyMandi: 'ମଣ୍ଡି ଦର', keySchemes: 'ଯୋଜନା', keyOfficer: 'ଅଧିକାରୀ',
    quickLangSwitch: 'କିପ୍ୟାଡ୍ ଭାଷା ସିଧାସଳଖ ବଦଳାନ୍ତୁ:',
    smsEmulatorTitle: 'ଫିଚର୍ ଫୋନ୍ SMS ଏମୁଲେଟର୍', smsEmulatorSub: '୧୬୦ ଅକ୍ଷରର ସରଳ ଓଡ଼ିଆ SMS ବାର୍ତ୍ତା', sendTestSms: 'ଟେଷ୍ଟ SMS ପଠାନ୍ତୁ 📨',
    simDesignNoteTitle: '୨G ଫୋନ୍ ଅନୁକୂଳନ ଡିଜାଇନ୍:',
    simDesignNote1: '• ଇଣ୍ଟରନେଟ୍ ବିନା ୨G କିପ୍ୟାଡ୍ ଫୋନରେ ୧୦୦% ସୁଗମ କାର୍ଯ୍ୟକ୍ଷମ।',
    simDesignNote2: '• ୧୮୦୦-୧୮୦-୧୫୫୧ ଟୋଲ୍-ଫ୍ରି ନମ୍ବରରେ ଗୋଟିଏ ବଟନ୍ ଦବାଇ ସହାୟତା।',
    simDesignNote3: '• କୃଷକଙ୍କ ପଞ୍ଜୀକୃତ ଆଞ୍ଚଳିକ ଭାଷାରେ ସ୍ୱୟଂଚାଳିତ ବାର୍ତ୍ତା।'
  },
  as: {
    accessMode: 'ব্যৱহাৰৰ মাধ্যম', assistedMode: '🤝 সহায়কাৰী মাধ্যম (কৃষক মিত্ৰ / CSC কেন্দ্ৰ)',
    selfService: '📱 নিজে ব্যৱহাৰ কৰক', selectFarmer: 'কৃষক বাছনি কৰক:', language: 'ভাষা:',
    cropAdvisory: 'শস্যৰ পৰামৰ্শ', cropAdvisorySub: 'বতৰৰ বতৰা আৰু শস্যৰ যত্নৰ নিৰ্দেশনা',
    mandiPrice: 'বজাৰ দৰ', mandiPriceSub: 'বৰ্তমান বজাৰ মূল্য বনাম চৰকাৰী সমৰ্থন মূল্য (MSP)',
    myAlerts: 'জৰুৰী সতৰ্কবাৰ্তা', myAlertsSub: 'বৰষুণৰ অভাৱ আৰু কৃষি ঋণৰ জাননী',
    govtSchemes: 'চৰকাৰী আঁচনি', govtSchemesSub: 'শস্য বীমা (PMFBY), কেচিচি আৰু ৰাজসাহায্য',
    tapToListen: 'শুনিবলৈ টেপ কৰক 🔊', playAdvisory: 'পৰামৰ্শ শুনক (আৱাজ)',
    stopAudio: 'আৱাজ বন্ধ কৰক ⏹️', playing: 'পৰামৰ্শ বাজি আছে…',
    optimalChannel: 'উপযুক্ত মাধ্যম', translating: 'অনুবাদ হৈ আছে…',

    // Weather & Soil Context
    weatherContextTitle: 'বতৰ আৰু মাটিৰ মূল সূচক',
    listenAllWeather: 'বতৰ আৰু মাটিৰ প্ৰতিবেদন শুনক 🔊',
    tapToListenShort: 'শুনিবলৈ টেপ কৰক 🔊',
    rainDevLabel: 'বৰষুণৰ তাৰতম্য',
    drySpellLabel: 'খৰাং দিনৰ দৈৰ্ঘ্য',
    monsoonOnsetLabel: 'মৌচুমীৰ আগমন',
    soilTypeLabel: 'মাটিৰ প্ৰকাৰ',

    // Mandi Price Tab
    mandiBadge: 'কৃষি উৎপাদন বজাৰ সমিতি (APMC) নিৰীক্ষণ',
    mandiMainTitle: 'বজাৰ দৰ বনাম চৰকাৰী সমৰ্থন মূল্য (MSP)',
    listenMandi: 'বজাৰ দৰ শুনক 🔊',
    todayMandiLabel: 'আজিৰ বজাৰ দৰ',
    perQuintalLabel: 'প্ৰতি কুইন্টল',
    govFloorPrice: 'চৰকাৰী সমৰ্থন মূল্য',
    govMspLabel: 'চৰকাৰী সমৰ্থন মূল্য (MSP)',
    guaranteedMspLabel: 'প্ৰতি কুইন্টল (চৰকাৰী নিশ্চয়তা)',
    recommendedActionLabel: 'প্ৰস্তাৱিত বজাৰ ব্যৱস্থা:',
    distressWarning: 'সংকটৰ সতৰ্কবাৰ্তা',
    stablePrice: 'স্থিৰ মূল্য',
    belowMspTitle: 'বজাৰ দৰ চৰকাৰী সমৰ্থন মূল্যতকৈ কম!',
    aboveMspTitle: 'বজাৰ দৰ সমৰ্থন মূল্যতকৈ অধিক',

    // Alerts Tab
    alertsBadge: 'জাননী আৰু স্মাৰকপত্ৰ',
    alertsMainTitle: 'আপোনাৰ খেতিৰ বাবে সক্ৰিয় জাননী',
    listenAllAlerts: 'সকলো জাননী শুনক 🔊',

    // Govt Schemes Tab
    schemesBadge: 'চৰকাৰী সুৰক্ষা কৱচ',
    schemesMainTitle: 'আপোনাৰ সংকটৰ কাৰণ অনুযায়ী যোগ্য আঁচনি',
    listenAllSchemes: 'সকলো আঁচনি শুনক 🔊',
    triggerCauseLabel: 'সংকটৰ কাৰণ:',
    farmerActionLabel: 'কৃষকৰ বাবে পদক্ষেপ:',

    // Officer Dashboard
    officerBadge: 'প্ৰশাসন আৰু কৃষি সম্প্ৰসাৰণ পৰ্টেল',
    officerMainTitle: 'জিলা কৃষি সংকট নিৰীক্ষণ আৰু চৰকাৰী সাহায্য ডেশ্বব’ৰ্ড',
    officerMainSub: 'খণ্ড কৃষি বিষয়া আৰু ফিল্ড ষ্টাফৰ বাবে ICAR-CRIDA FDI পূৰ্ব-সতৰ্কীকৰণ ব্যৱস্থা।',
    playOfficerBriefing: 'জিলা সাৰাংশ শুনক 🔊',
    metricTotal: 'মুঠ পঞ্জীভুক্ত কৃষক', metricTotalSub: '৩টা কৃষি জিলাত',
    metricHigh: 'গুৰুতৰ সংকট (High Risk)', metricHighSub: 'তত্কালীন ফিল্ড ভিজিট আৰু সাহায্য প্ৰয়োজন',
    metricMed: 'मध्यम সংকট (Medium Risk)', metricMedSub: 'পৰামৰ্শ নিৰীক্ষণৰ অধীনত',
    metricLow: 'কম বিপদাশংকা (Low Risk)', metricLowSub: 'সন্তোষজনক কৃষি অৱস্থা',
    calibratorTitle: 'CRIDA FDI গুৰুত্ব কেলিব্ৰেটৰ — ৬টা মাত্ৰা',
    calibratorSub: 'মাত্ৰাৰ গুৰুত্ব সলনি কৰক (ICAR-CRIDA আৰ্হি)। স্লাইডাৰ নিজে নিজে ১০০%ত ভাৰসাম্য ৰাখি তালিকা নতুনকৈ সজায়।',
    resetDefaults: 'CRIDA মূল গুৰুত্বলৈ ঘূৰি যাওক (25/15/15/15/20/10)',
    sliderExposure: '🌦️ E — বতৰ আৰু মূল্যৰ বিপদাশংকা', sliderExposureSub: 'বৰষুণৰ নাটনি + সমৰ্থন মূল্যতকৈ কম দৰ (মাত্ৰা ১)',
    sliderSensitivity: '💧 S — জলসিঞ্চন সংবেদনশীলতা', sliderSensitivitySub: 'জলসিঞ্চন নিৰ্ভৰশীলতা: বৰষুণ ভিত্তিক / অগভীৰ নলীনাদ / খাল (মাত্ৰা ২)',
    sliderAC: '🌱 AC — অভিযোজন ক্ষমতা', sliderACSub: 'মাটিৰ পৰিমাণ + অন্যান্য উপাৰ্জনৰ উৎস (মাত্ৰা ৩, ওলোটা)',
    sliderMitigation: '🏛️ M — সুৰক্ষাৰ অভাৱ', sliderMitigationSub: 'বীমা আৰু কেচিচি নথকা = সৰ্বাধিক অভাৱ (মাত্ৰা ৪)',
    sliderTrigger: '💳 T — জৰুৰী ঋণৰ চাপ', sliderTriggerSub: 'ঋণ পৰিশোধৰ তাগিদ + মহাজনৰ ঋণ (মাত্ৰা ৫)',
    sliderDF: '🏔️ DF — জিলা সংবেদনশীলতা', sliderDFSub: 'ঐতিহাসিক সংকট সূচকাংক — কেৱল বিষয়াৰ বাবে (মাত্ৰা ৬)',
    registryTitle: 'কৃষক সংকট পূৰ্ব-সতৰ্কতা পঞ্জী',
    registrySub: 'মুঠ সংকট নম্বৰ অনুসৰি সজোৱা। বিশেষ কাৰণসমূহক পোने पोने চৰকাৰী আঁচনিৰ সৈতে সংযোগ কৰা হয়।',
    filterLabel: 'ফিল্টাৰ:', filterAll: 'সকলো সংকট স্তৰ', filterHigh: 'কেৱল গুৰুতৰ সংকট (71-100)', filterMed: 'मध्यम সংকট (41-70)', filterLow: 'কম বিপদ (0-40)',
    thFarmerVillage: 'কৃষক আৰু গাঁও', thDistrict: 'জিলা', thCropStage: 'শস্য আৰু পৰ্যায়', thDistressScore: 'সংকট নম্বৰ',
    thTopTrigger: 'মূল সংকটৰ কাৰণ', thRecommendedScheme: 'প্ৰস্তাৱিত আঁচনি', thContactChannel: 'যোগাযোগৰ মাধ্যম', thActions: 'পদক্ষেপ',
    viewDetails: 'বিস্তাৰিত চাওক 🔍', callIvr: 'কল / IVR', appPush: 'এপ জাননী',

    // Modal
    modalListenBriefing: 'কেচৰ সাৰাংশ শুনক 🔊',
    modalReachabilityTitle: 'ক্ষেত্ৰ যোগাযোগ আৰু প্ৰসাৰ নিৰ্দেশনা:',
    modalBreakdownTitle: 'সংকট নম্বৰ বিশ্লেষণ — ICAR-CRIDA ৬-মাত্ৰা FDI (ৰেড্ডী আৰু সহযোগী, ২০২১):',
    modalExplanationsTitle: 'সংকটৰ মূল কাৰণসমূহ:',
    modalLandTitle: 'ভূমিৰ পৰিমাণ প্ৰসংগ', modalFragilityTitle: 'জিলা সংবেদনশীলতা সূচকাংক',
    modalInterventionsTitle: 'চৰকাৰী আঁচনিৰ সাহায্য (ক্ষেত্ৰ পৰিদৰ্শনত আনিবলগীয়া নথিপত্ৰ):',
    modalCloseBtn: 'বিৱৰণ বন্ধ কৰক',

    // Simulator & Keypad
    simBadge: 'সাধাৰণ ফোন সাহায্য ব্যৱস্থা',
    simTitle: 'ইণ্টাৰেক্টিভ IVR ভইচ আৰু সাধাৰণ SMS চিমুলেটৰ',
    simSub: 'গ্ৰামাঞ্চলৰ ৬৫% কৃষকে সাধাৰণ বুটামৰ ফোন ব্যৱহাৰ কৰে। এই চিমুলেটৰে দেখুৱায় কিদৰে স্বয়ংক্ৰিয় ভইচ কল আৰু এছএমএছ যোগে তথ্য প্ৰেৰণ কৰা হয়।',
    ivrHeaderTitle: 'স্বয়ংক্ৰিয় IVR ভইচ কল', ivrSpeakPrompt: 'আৱাজত শুনক (TTS)', ivrRestartCall: 'কল পুনৰ আৰম্ভ কৰক 🔄',
    pressKeypad: 'ফোন কিপ্যাড টিপক:', keyAdvisory: 'শস্য পৰামৰ্শ', keyMandi: 'বজাৰ দৰ', keySchemes: 'আঁচনি', keyOfficer: 'বিষয়া',
    quickLangSwitch: 'কিপ্যাডৰ ভাষা পোনে পোনে সলনি কৰক:',
    smsEmulatorTitle: 'ফিচাৰ ফোন SMS এমুলেটৰ', smsEmulatorSub: '১৬০টা আখৰৰ সাধাৰণ অসমীয়া SMS বাৰ্তা', sendTestSms: 'পৰীক্ষামূলক SMS পঠিয়াওক 📨',
    simDesignNoteTitle: '২G ফোন অনুকূলন বৈশিষ্টসমূহ:',
    simDesignNote1: '• ইণ্টাৰনেট অবিহনে ২G বুটাম থকা ফোনত ১০০% কাৰ্যকৰী।',
    simDesignNote2: '• ১৮০০-১৮০-১৫৫১ নম্বৰত এটা বুটাম টিপি সাহায্য।',
    simDesignNote3: '• কৃষকৰ পঞ্জীভুক্ত আঞ্চলিক ভাষাত স্বয়ংক্ৰিয় বাৰ্তা।'
  },
  kn: {
    accessMode: 'ಬಳಕೆಯ ವಿಧಾನ', assistedMode: '🤝 ಸಹಾಯಕ ವಿಧಾನ (ಕಿಸಾನ್ ಮಿತ್ರ / CSC ಕೇಂದ್ರ)',
    selfService: '📱 ಸ್ವಯಂ ಸೇವೆ', selectFarmer: 'ರೈತರನ್ನು ಆಯ್ಕೆ ಮಾಡಿ:', language: 'ಭಾಷೆ:',
    cropAdvisory: 'ಬೆಳೆ ಸಲಹೆ', cropAdvisorySub: 'ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ರಕ್ಷಣೆ ಮಾರ್ಗದರ್ಶನ',
    mandiPrice: 'ಮಾರುಕಟ್ಟೆ ದರ', mandiPriceSub: 'ಇಂದಿನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ vs ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ (MSP)',
    myAlerts: 'ತುರ್ತು ಎಚ್ಚರಿಕೆಗಳು', myAlertsSub: 'ಮಳೆ ಕೊರತೆ ಮತ್ತು ಸಾಲ ಮರುಪಾವತಿ ನೋಟಿಸ್‌ಗಳು',
    govtSchemes: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು', govtSchemesSub: 'ಬೆಳೆ ವಿಮೆ (PMFBY), ಕೆಸಿಸಿ ಮತ್ತು ಸಾಲ ಸೌಲಭ್ಯ',
    tapToListen: 'ಕೇಳಲು ಇಲ್ಲಿ ಒತ್ತಿ 🔊', playAdvisory: 'ಸಲಹೆ ಆಲಿಸಿ (ಧ್ವನಿ)',
    stopAudio: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ ⏹️', playing: 'ಸಲಹೆ ಆಡಿಯೋ ಪ್ಲೇ ಆಗುತ್ತಿದೆ…',
    optimalChannel: 'ಸೂಕ್ತ ಸಂಪರ್ಕ ಮಾಧ್ಯಮ', translating: 'ಅನುವಾದಿಸಲಾಗುತ್ತಿದೆ…',

    // Weather & Soil Context
    weatherContextTitle: 'ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣಿನ ಪ್ರಮುಖ ಸೂಚಕಗಳು',
    listenAllWeather: 'ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣಿನ ವರದಿ ಆಲಿಸಿ 🔊',
    tapToListenShort: 'ಕೇಳಲು ಇಲ್ಲಿ ಒತ್ತಿ 🔊',
    rainDevLabel: 'ಮಳೆ ವ್ಯತ್ಯಾಸ',
    drySpellLabel: 'ಮಳೆ ಕೊರತೆ (ದಿನಗಳು)',
    monsoonOnsetLabel: 'ಮುಂಗಾರು ಪ್ರವೇಶ',
    soilTypeLabel: 'ಮಣ್ಣಿನ ವಿಧ',

    // Mandi Price Tab
    mandiBadge: 'ಕೃಷಿ ಉತ್ಪನ್ನ ಮಾರುಕಟ್ಟೆ ಸಮಿತಿ (APMC) ನಿಗಾ',
    mandiMainTitle: 'ಮಾರುಕಟ್ಟೆ ದರ vs ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ (MSP)',
    listenMandi: 'ಮಾರುಕಟ್ಟೆ ದರ ಆಲಿಸಿ 🔊',
    todayMandiLabel: 'ಇಂದಿನ ಮಾರುಕಟ್ಟೆ ದರ',
    perQuintalLabel: 'ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ',
    govFloorPrice: 'ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ',
    govMspLabel: 'ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆ (MSP)',
    guaranteedMspLabel: 'ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ (ಖಾತರಿ ಬೆಲೆ)',
    recommendedActionLabel: 'ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರುಕಟ್ಟೆ ಕ್ರಮ:',
    distressWarning: 'ಸಂಕಷ್ಟದ ಎಚ್ಚರಿಕೆ',
    stablePrice: 'ಸ್ಥಿರ ಬೆಲೆ',
    belowMspTitle: 'ಮಾರುಕಟ್ಟೆ ದರವು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಕಡಿಮೆಯಿದೆ!',
    aboveMspTitle: 'ಮಾರುಕಟ್ಟೆ ದರವು ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಹೆಚ್ಚಾಗಿದೆ',

    // Alerts Tab
    alertsBadge: 'ಸೂಚನೆಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳು',
    alertsMainTitle: 'ನಿಮ್ಮ ಜಮೀನಿನ ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು',
    listenAllAlerts: 'ಎಲ್ಲಾ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಆಲಿಸಿ 🔊',

    // Govt Schemes Tab
    schemesBadge: 'ಸರ್ಕಾರಿ ಸುರಕ್ಷತಾ ಕವಚ',
    schemesMainTitle: 'ನಿಮ್ಮ ಸಂಕಷ್ಟಕ್ಕೆ ಸೂಕ್ತವಾದ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು',
    listenAllSchemes: 'ಎಲ್ಲಾ ಯೋಜನೆಗಳನ್ನು ಆಲಿಸಿ 🔊',
    triggerCauseLabel: 'ಸಂಕಷ್ಟದ ಮೂಲ ಕಾರಣ:',
    farmerActionLabel: 'ರೈತರು ಕೈಗೊಳ್ಳಬೇಕಾದ ಕ್ರಮ:',

    // Officer Dashboard
    officerBadge: 'ಆಡಳಿತ ಮತ್ತು ಕೃಷಿ ವಿಸ್ತರಣಾ ಪೋರ್ಟಲ್',
    officerMainTitle: 'ಜಿಲ್ಲಾ ಕೃಷಿ ಸಂಕಷ್ಟ ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ಮಧ್ಯಸ್ಥಿಕೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    officerMainSub: 'ತಾಲೂಕು ಕೃಷಿ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ಕ್ಷೇತ್ರ ಕಾರ್ಯಕರ್ತರಿಗೆ ICAR-CRIDA FDI ಮುನ್ನೆಚ್ಚರಿಕೆ ವ್ಯವಸ್ಥೆ.',
    playOfficerBriefing: 'ಜಿಲ್ಲಾ ಸಾರಾಂಶ ಆಲಿಸಿ 🔊',
    metricTotal: 'ಒಟ್ಟು ರೈತರು', metricTotalSub: '೩ ಕೃಷಿ ಜಿಲ್ಲೆಗಳಲ್ಲಿ',
    metricHigh: 'ಅತಿ ಹೆಚ್ಚು ಅಪಾಯ (High Risk)', metricHighSub: 'ತಕ್ಷಣದ ಭೇಟಿ ಮತ್ತು ನೆರವು ಅಗತ್ಯ',
    metricMed: 'ಮಧ್ಯಮ ಅಪಾಯ (Medium Risk)', metricMedSub: 'ಸಲಹಾ ಮೇಲ್ವಿಚಾರಣೆಯಲ್ಲಿದೆ',
    metricLow: 'ಕಡಿಮೆ ಅಪಾಯ (Low Risk)', metricLowSub: 'ಸ್ಥಿರ ಕೃಷಿ ಸ್ಥಿತಿ',
    calibratorTitle: 'CRIDA FDI ತೂಕ ಮಾಪಕ — ೬ ಆಯಾಮಗಳು',
    calibratorSub: 'ಆಯಾಮಗಳ ತೂಕವನ್ನು ಹೊಂದಿಸಿ (ICAR-CRIDA ಚೌಕಟ್ಟು). ಸ್ಲೈಡರ್‌ಗಳು ಸ್ವಯಂ-ಸಾಮಾನ್ಯೀಕರಣಗೊಂಡು ರೈತರ ಪಟ್ಟಿಯನ್ನು ಲೈವ್ ಆಗಿ ನವೀಕರಿಸುತ್ತವೆ.',
    resetDefaults: 'CRIDA ಮೂಲ ತೂಕಕ್ಕೆ ಹಿಂತಿರುಗಿ (25/15/15/15/20/10)',
    sliderExposure: '🌦️ E — ಹವಾಮಾನ ಮತ್ತು ಬೆಲೆ ಅಪಾಯ', sliderExposureSub: 'ಮಳೆ ಕೊರತೆ + ಎಂಎಸ್‌ಪಿ ಬೆಲೆ ನಷ್ಟದ ಅಪಾಯ (ಆಯಾಮ ೧)',
    sliderSensitivity: '💧 S — ನೀರಾವರಿ ಸೂಕ್ಷ್ಮತೆ', sliderSensitivitySub: 'ನೀರಾವರಿ ಅವಲಂಬನೆ: ಮಳೆಯಾಶ್ರಿತ / ಬೋರ್‌ವೆಲ್ / ಕಾಲುವೆ (ಆಯಾಮ ೨)',
    sliderAC: '🌱 AC — ಹೊಂದಿಕೊಳ್ಳುವ ಸಾಮರ್ಥ್ಯ', sliderACSub: 'ಭೂಮಿಯ ವಿಸ್ತೀರ್ಣ + ಆದಾಯದ ಮೂಲಗಳು (ಆಯಾಮ ೩, ಹಿಮ್ಮುಖ)',
    sliderMitigation: '🏛️ M — ಪರಿಹಾರ ಕೊರತೆ', sliderMitigationSub: 'ವಿಮೆ ಮತ್ತು ಕೆಸಿಸಿ ಇಲ್ಲದಿರುವುದು = ಗರಿಷ್ಠ ಕೊರತೆ (ಆಯಾಮ ೪)',
    sliderTrigger: '💳 T — ಸಾಲದ ತುರ್ತು ಒತ್ತಡ', sliderTriggerSub: 'ಸಾಲ ಮರುಪಾವತಿ ಗಡುವು + ಖಾಸಗಿ ಸಾಲದ ಹೊರೆ (ಆಯಾಮ ೫)',
    sliderDF: '🏔️ DF — ಜಿಲ್ಲಾ ಸೂಕ್ಷ್ಮತೆ', sliderDFSub: 'ಐತಿಹಾಸಿಕ ಕೃಷಿ ಬಿಕ್ಕಟ್ಟಿನ ಸೂಚ್ಯಂಕ — ಅಧಿಕಾರಿಗಳಿಗೆ ಮಾತ್ರ (ಆಯಾಮ ೬)',
    registryTitle: 'ರೈತರ ಸಂಕಷ್ಟ ಮುನ್ನೆಚ್ಚರಿಕೆ ನೋಂದಣಿ',
    registrySub: 'ಒಟ್ಟು ಸಂಕಷ್ಟದ ಅಂಕಗಳ ಆಧಾರದ ಮೇಲೆ ಶ್ರೇಣೀಕರಿಸಲಾಗಿದೆ. ಪ್ರತಿಯೊಂದು ಕಾರಣವನ್ನು ನೇರವಾಗಿ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    filterLabel: 'ಫಿಲ್ಟರ್:', filterAll: 'ಎಲ್ಲಾ ಅಪಾಯದ ಮಟ್ಟಗಳು', filterHigh: 'ಅತಿ ಹೆಚ್ಚು ಅಪಾಯ (71-100)', filterMed: 'ಮಧ್ಯಮ ಅಪಾಯ (41-70)', filterLow: 'ಕಡಿಮೆ ಅಪಾಯ (0-40)',
    thFarmerVillage: 'ರೈತ ಮತ್ತು ಗ್ರಾಮ', thDistrict: 'ಜಿಲ್ಲೆ', thCropStage: 'ಬೆಳೆ ಮತ್ತು ಹಂತ', thDistressScore: 'ಸಂಕಷ್ಟದ ಅಂಕ',
    thTopTrigger: 'ಮುಖ್ಯ ಕಾರಣ', thRecommendedScheme: 'ಶಿಫಾರಸು ಮಾಡಿದ ಯೋಜನೆ', thContactChannel: 'ಸಂಪರ್ಕ ಮಾಧ್ಯಮ', thActions: 'ಕ್ರಮಗಳು',
    viewDetails: 'ವಿವರ ನೋಡಿ 🔍', callIvr: 'ಕರೆ / IVR', appPush: 'ಆ್ಯಪ್ ಸಂದೇಶ',

    // Modal
    modalListenBriefing: 'ಪ್ರಕರಣದ ಸಾರಾಂಶ ಆಲಿಸಿ 🔊',
    modalReachabilityTitle: 'ಕ್ಷೇತ್ರ ಸಂಪರ್ಕ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ:',
    modalBreakdownTitle: 'ಸಂಕಷ್ಟ ಅಂಕಗಳ ವಿಶ್ಲೇಷಣೆ — ICAR-CRIDA ೬-ಆಯಾಮಗಳ FDI (ರೆಡ್ಡಿ ಮತ್ತಿತರರು, ೨೦೨೧):',
    modalExplanationsTitle: 'ಸಂಕಷ್ಟದ ಮುಖ್ಯ ವಿವರಣೆಗಳು:',
    modalLandTitle: 'ಭೂಹಿಡುವಳಿ ವಿವರ', modalFragilityTitle: 'ಜಿಲ್ಲಾ ಸೂಕ್ಷ್ಮತೆಯ ಸೂಚ್ಯಂಕ',
    modalInterventionsTitle: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ನೆರವು (ಕ್ಷೇತ್ರ ಭೇಟಿಗೆ ತರಬೇಕಾದ ದಾಖಲೆಗಳು):',
    modalCloseBtn: 'ವಿವರ ಮುಚ್ಚಿರಿ',

    // Simulator & Keypad
    simBadge: 'ಸಾಮಾನ್ಯ ಫೋನ್ ಹೊಂದಾಣಿಕೆ ವ್ಯವಸ್ಥೆ',
    simTitle: 'ಇಂಟರ್ಯಾಕ್ಟಿವ್ IVR ಧ್ವನಿ ಮತ್ತು ಸರಳ SMS ಸಿಮ್ಯುಲೇಟರ್',
    simSub: 'ಗ್ರಾಮೀಣ ಭಾಗದ ಶೇಕಡಾ ೬೫ಕ್ಕೂ ಹೆಚ್ಚು ರೈತರು ಸಾಮಾನ್ಯ ಕೀಪ್ಯಾಡ್ ಫೋನ್ ಬಳಸುತ್ತಾರೆ. ಈ ಸಿಮ್ಯುಲೇಟರ್ ಸ್ವಯಂಚಾಲಿತ ಧ್ವನಿ ಕರೆ ಮತ್ತು ಎಸ್ಎಂಎಸ್ ಮೂಲಕ ಹೇಗೆ ಮಾಹಿತಿ ನೀಡಲಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ತೋರಿಸುತ್ತದೆ.',
    ivrHeaderTitle: 'ಸ್ವಯಂಚಾಲಿತ IVR ಧ್ವನಿ ಕರೆ', ivrSpeakPrompt: 'ಧ್ವನಿಯಲ್ಲಿ ಆಲಿಸಿ (TTS)', ivrRestartCall: 'ಕರೆ ಮರುಪ್ರಾರಂಭಿಸಿ 🔄',
    pressKeypad: 'ಫೋನ್ ಕೀಪ್ಯಾಡ್ ಒತ್ತಿರಿ:', keyAdvisory: 'ಬೆಳೆ ಸಲಹೆ', keyMandi: 'ಮಾರುಕಟ್ಟೆ ದರ', keySchemes: 'ಯೋಜನೆಗಳು', keyOfficer: 'ಅಧಿಕಾರಿ',
    quickLangSwitch: 'ಕೀಪ್ಯಾಡ್ ಭಾಷೆಯನ್ನು ನೇರವಾಗಿ ಬದಲಾಯಿಸಿ:',
    smsEmulatorTitle: 'ಸಾಮಾನ್ಯ ಫೋನ್ SMS ಸಿಮ್ಯುಲೇಟರ್', smsEmulatorSub: '೧೬೦ ಅಕ್ಷರಗಳ ಸರಳ ಕನ್ನಡ SMS ಸಂದೇಶ', sendTestSms: 'ಪರೀಕ್ಷಾರ್ಥ SMS ಕಳುಹಿಸಿ 📨',
    simDesignNoteTitle: '೨G ಫೋನ್ ಹೊಂದಾಣಿಕೆಯ ವೈಶಿಷ್ಟ್ಯಗಳು:',
    simDesignNote1: '• ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆ ೨G ಕೀಪ್ಯಾಡ್ ಫೋನ್‌ಗಳಲ್ಲಿ ೧೦೦% ಸರಾಗವಾಗಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ.',
    simDesignNote2: '• ೧೮೦೦-೧೮೦-೧೫೫೧ ಉಚಿತ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗೆ ಒಂದೇ ಬಟನ್ ಒತ್ತಿ ಸಂಪರ್ಕಿಸಬಹುದು.',
    simDesignNote3: '• ರೈತರ ನೋಂದಾಯಿತ ಪ್ರಾದೇಶಿಕ ಭಾಷೆಯಲ್ಲಿ ಸ್ವಯಂಚಾಲಿತ ಸಂದೇಶ.'
  }
};

// ─── Comprehensive Translation Dictionary (Agricultural & Government Terms) ───
const TRANSLATION_DICTIONARY = {
  // Crops
  'onion': { hi: 'प्याज', mr: 'कांदा', or: 'ପିଆଜ', as: 'পিয়াঁজ', kn: 'ಈರುಳ್ಳಿ', en: 'Onion' },
  'cotton': { hi: 'कपास', mr: 'कापूस', or: 'କପା', as: 'কপাহ', kn: 'ಹತ್ತಿ', en: 'Cotton' },
  'soybean': { hi: 'सोयाबीन', mr: 'सोयाबीन', or: 'ସୋୟାବିନ୍', as: 'ছয়াবিন', kn: 'ಸೋಯಾಬೀನ್', en: 'Soybean' },
  'rice': { hi: 'धान / चावल', mr: 'भात / तांदूळ', or: 'ଧାନ', as: 'ধান', kn: 'ಭತ್ತ / ಅಕ್ಕಿ', en: 'Rice / Paddy' },
  'maize': { hi: 'मक्का', mr: 'मका', or: 'ମକା', as: 'গোমধান / মাকৈ', kn: 'ಮೆಕ್ಕೆಜೋಳ', en: 'Maize / Corn' },

  // Stages
  'harvest': { hi: 'कटाई', mr: 'काढणी', or: 'ଅମଳ', as: 'চপোৱা', kn: 'ಕೊಯ್ಲು', en: 'Harvest' },
  'vegetative': { hi: 'वानस्पतिक वृद्धि', mr: 'वाढ', or: 'ବୃଦ୍ଧି', as: 'বৃদ্ধি', kn: 'ಬೆಳವಣಿಗೆ', en: 'Vegetative' },
  'sowing': { hi: 'बुआई', mr: 'पेरणी', or: 'ବୁଣା', as: 'সিঁচা', kn: 'ಬಿತ್ತನೆ', en: 'Sowing' },
  'flowering': { hi: 'फूल आना', mr: 'फुलोरा', or: 'ଫୁଲ ଧରିବା', as: 'ফুল ফুলা', kn: 'ಹೂಬಿಡುವಿಕೆ', en: 'Flowering' },

  // Mandi / Markets
  'Lasalgaon APMC': { hi: 'लासलगांव एपीएमसी मंडी', mr: 'लासलगाव कृषी उत्पन्न बाजार समिती', or: 'ଲାସଲଗାଓଁ ଏପିଏମସି ମଣ୍ଡି', as: 'লাছালগাঁও এপিএমচি বজাৰ', kn: 'ಲಾಸಲಗಾಂವ್ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ', en: 'Lasalgaon APMC' },
  'Yavatmal APMC': { hi: 'यवतमाल एपीएमसी मंडी', mr: 'यवतमाळ कृषी उत्पन्न बाजार समिती', or: 'ୟବତମାଳ ଏପିଏମସି ମଣ୍ଡି', as: 'য়াভাটমাল এপিএমচি বজাৰ', kn: 'ಯವತ್ಮಾಲ್ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ', en: 'Yavatmal APMC' },
  'Latur APMC': { hi: 'लातूर एपीएमसी मंडी', mr: 'लातूर कृषी उत्पन्न बाजार समिती', or: 'ଲାତୁର ଏପିଏମସି ମଣ୍ଡି', as: 'লাতুৰ এপিএমচি বজাৰ', kn: 'ಲಾತೂರ್ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ', en: 'Latur APMC' },
  'Raigad APMC': { hi: 'रायगढ़ एपीएमसी मंडी', mr: 'रायगड कृषी उत्पन्न बाजार समिती', or: 'ରାୟଗଡ଼ ଏପିଏମସି ମଣ୍ଡି', as: 'ৰায়গড় এপিএমচি বজাৰ', kn: 'ರಾಯಗಡ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ', en: 'Raigad APMC' },
  'District APMC': { hi: 'जिला एपीएमसी मंडी', mr: 'जिल्हा कृषी उत्पन्न बाजार समिती', or: 'ଜିଲ୍ଲା ଏପିଏମସି ମଣ୍ଡି', as: 'জিলা এপিএমচি বজাৰ', kn: 'ಜಿಲ್ಲಾ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆ', en: 'District APMC' },

  // Schemes
  'PMFBY (Pradhan Mantri Fasal Bima Yojana - Crop Insurance)': {
    hi: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
    mr: 'प्रधानमंत्री पीक विमा योजना (PMFBY)',
    or: 'ପ୍ରଧାନମନ୍ତ୍ରୀ ଫସଲ ବୀମା ଯୋଜନା (PMFBY)',
    as: 'প্ৰধানমন্ত্ৰী ফচল বীমা যোজনা (PMFBY)',
    kn: 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ (PMFBY)',
    en: 'PMFBY (Pradhan Mantri Fasal Bima Yojana - Crop Insurance)'
  },
  'Kisan Credit Card (KCC) Restructuring / Interest Subvention Scheme': {
    hi: 'किसान क्रेडिट कार्ड (KCC) पुनर्गठन एवं ब्याज छूट योजना',
    mr: 'किसान क्रेडिट कार्ड (KCC) पुनर्रचना व ३% व्याज सवलत योजना',
    or: 'କିସାନ କ୍ରେଡିଟ୍ କାର୍ଡ (KCC) ପୁନର୍ଗଠନ ଓ ସୁଧ ରିହାତି ଯୋଜନା',
    as: 'কিষাণ ক্ৰেডিট কাৰ্ড (KCC) পুনৰ্গঠন আৰু সুত ৰেহাই আঁচনি',
    kn: 'ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC) ಪುನರ್‌ರಚನೆ ಮತ್ತು ಬಡ್ಡಿ ರಿಯಾಯಿತಿ ಯೋಜನೆ',
    en: 'Kisan Credit Card (KCC) Restructuring / Interest Subvention Scheme'
  },
  'PM-AASHA / e-NAM Procurement Support': {
    hi: 'पीएम-आशा / ई-नाम सरकारी खरीद सहायता',
    mr: 'पीएम-आशा / ई-नाम हमीभाव खरेदी साहाय्य',
    or: 'ପିଏମ୍-ଆଶା / ଇ-ନାମ୍ ସରକାରୀ ସହାୟକ କ୍ରୟ ସୁବିଧା',
    as: 'পিএম-আশা / ই-নাম চৰকাৰী ক্ৰয় সাহায্য',
    kn: 'ಪಿಎಂ-ಆಶಾ / ಇ-ನ್ಯಾಮ್ ಸರ್ಕಾರಿ ಖರೀದಿ ಬೆಂಬಲ',
    en: 'PM-AASHA / e-NAM Procurement Support'
  },
  'State Drought Relief Package (district-declared)': {
    hi: 'राज्य विशेष सूखा राहत पैकेज (जिला घोषित)',
    mr: 'राज्य विशेष दुष्काळ साहाय्य पॅकेज (जिल्हा घोषित)',
    or: 'ରାଜ୍ୟ ସ୍ୱତନ୍ତ୍ର ମରୁଡ଼ି ସହାୟତା ପ୍ୟାକେଜ୍ (ଜିଲ୍ଲା ଘୋଷିତ)',
    as: 'ৰাজ্যিক খৰাং সাহায্য পেকেজ (জিলা ঘোষিত)',
    kn: 'ರಾಜ್ಯ ಬರ ಪರಿಹಾರ ಪ್ಯಾಕೇಜ್ (ಜಿಲ್ಲಾ ಘೋಷಿತ)',
    en: 'State Drought Relief Package (district-declared)'
  },
  'PM-KISAN Direct Benefit Transfer (installment check)': {
    hi: 'पीएम-किसान प्रत्यक्ष लाभ अंतरण (किस्त सत्यापन)',
    mr: 'पीएम-किसान थेट बँक खात्यात जमा (हप्ता तपासणी)',
    or: 'ପିଏମ୍-କିଷାନ ସିଧାସଳଖ ଆର୍ଥିକ ସହାୟତା (କିସ୍ତି ଯାଞ୍ଚ)',
    as: 'পিএম-কিষাণ প্ৰত্যক্ষ সাহায্য (কিস্তি পৰীক্ষা)',
    kn: 'ಪಿಎಂ-ಕಿಸಾನ್ ನೇರ ನಗದು ವರ್ಗಾವಣೆ (ಕಂತು ಪರಿಶೀಲನೆ)',
    en: 'PM-KISAN Direct Benefit Transfer (installment check)'
  },
  'Micro-Irrigation / Watershed Development Subsidy (PMKSY-PDMC)': {
    hi: 'सूक्ष्म सिंचाई एवं ड्रिप सब्सिडी (PMKSY-PDMC)',
    mr: 'ठिबक व तुषार सिंचन अनुदान योजना (PMKSY-PDMC)',
    or: 'କ୍ଷୁଦ୍ର ଜଳସେଚନ / ଡ୍ରିପ୍ ସବସିଡି (PMKSY-PDMC)',
    as: 'টোপাল জলসিঞ্চন ৰাজসাহায্য (PMKSY-PDMC)',
    kn: 'ಹನಿ ಮತ್ತು ತುಂತುರು ನೀರಾವರಿ ಸಬ್ಸಿಡಿ (PMKSY-PDMC)',
    en: 'Micro-Irrigation / Watershed Development Subsidy (PMKSY-PDMC)'
  },
  'PMFBY Enrollment (Uninsured Farmer)': {
    hi: 'पीएमएफबीवाई नामांकन (गैर-बीमाकृत किसान)',
    mr: 'पीएमएफबीवाय पीक विमा नोंदणी (विमा नसलेले शेतकरी)',
    or: 'ପିଏମଏଫବିୱାଇ ନାମାଙ୍କନ (ବୀମାହୀନ କୃଷକ)',
    as: 'পিএমএফবিৱাই শস্য বীমা পঞ্জীয়ন (বীমা নথকা কৃষক)',
    kn: 'ಪಿಎಂಎಫ್‌ಬಿವೈ ನೋಂದಣಿ (ವಿಮೆ ಹೊಂದಿರದ ರೈತರು)',
    en: 'PMFBY Enrollment (Uninsured Farmer)'
  },

  // Alert & Scheme Triggers
  'Monsoon onset delayed > 15 days, soil moisture depleted': {
    hi: 'मानसून आगमन १५ दिनों से अधिक विलंबित, मिट्टी में नमी अत्यंत कम',
    mr: 'मान्सून आगमनास १५ दिवसांपेक्षा जास्त उशीर, जमिनीतील ओलावा घटला',
    or: 'ମୌସୁମୀ ଆଗମନ ୧୫ ଦିନରୁ ଅଧିକ ବିଳମ୍ବ, ମାଟିରେ ଆର୍ଦ୍ରତା ହ୍ରାସ',
    as: 'মৌচুমী আগমন ১৫ দিনতকৈ পলম, মাটিত আৰ্দ্ৰতা কমি গৈছে',
    kn: 'ಮುಂಗಾರು ಪ್ರವೇಶ ೧೫ ದಿನಗಳಿಗಿಂತ ತಡವಾಗಿದೆ, ಮಣ್ಣಿನಲ್ಲಿ ತೇವಾಂಶ ಕೊರತೆ',
    en: 'Monsoon onset delayed > 15 days, soil moisture depleted'
  },
  'Rainfall deficit > 25% during critical vegetative stage': {
    hi: 'फसल की मुख्य वृद्धि अवस्था में वर्षा में २५% से अधिक कमी',
    mr: 'वाढीच्या संवेदनशील टप्प्यात २५% पेक्षा जास्त पावसाची तूट',
    or: 'ଫସଲ ବୃଦ୍ଧି ସମୟରେ ବର୍ଷାରେ ୨୫% ରୁ ଅଧିକ ଅଭାବ',
    as: 'শস্য বৃদ্ধিৰ গুৰুত্বপূৰ্ণ সময়ত বৰষুণৰ ২৫% তকৈ অধিক নাটনি',
    kn: 'ಬೆಳೆಯ ಮುಖ್ಯ ಹಂತದಲ್ಲಿ ಶೇಕಡಾ ೨೫ಕ್ಕಿಂತ ಹೆಚ್ಚು ಮಳೆ ಕೊರತೆ',
    en: 'Rainfall deficit > 25% during critical vegetative stage'
  },
  'Mandi price realized below Government MSP': {
    hi: 'मंडी भाव सरकारी न्यूनतम समर्थन मूल्य (MSP) से नीचे दर्ज',
    mr: 'सध्याचा बाजार भाव शासकीय हमीभावापेक्षा (MSP) खाली',
    or: 'ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି (MSP) ଠାରୁ କମ୍ ଅଛି',
    as: 'বজাৰ দৰ চৰকাৰী সমৰ্থন মূল্যতকৈ (MSP) তলত আছে',
    kn: 'ಮಾರುಕಟ್ಟೆ ದರವು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ (MSP) ಕಡಿಮೆಯಾಗಿದೆ',
    en: 'Mandi price realized below Government MSP'
  },
  'Uninsured crop (No PMFBY coverage on record)': {
    hi: 'गैर-बीमाकृत फसल (रिकॉर्ड पर कोई फसल बीमा नहीं)',
    mr: 'असुरक्षित पीक (नोंदीवर कोणताही पीक विमा नाही)',
    or: 'ଅସୁରକ୍ଷିତ ଫସଲ (କୌଣସି ଫସଲ ବୀମା ପଞ୍ଜୀକୃତ ନାହିଁ)',
    as: 'অসুৰক্ষিত শস্য (কোনো শস্য বীমা পঞ্জীয়ন নাই)',
    kn: 'ವಿಮೆ ಇಲ್ಲದ ಬೆಳೆ (ಯಾವುದೇ ಬೆಳೆ ವಿಮೆ ದಾಖಲಾಗಿಲ್ಲ)',
    en: 'Uninsured crop (No PMFBY coverage on record)'
  },
  'High informal debt + loan repayment due within 30 days': {
    hi: 'साहूकार का अधिक कर्ज + ३० दिनों के भीतर बैंक ऋण अदायगी देय',
    mr: 'सावकारी कर्ज जास्त + ३० दिवसांत बँक कर्ज परतफेडीची मुदत',
    or: 'ଅଧିକ ମହାଜନୀ ଋଣ + ୩୦ ଦିନ ମଧ୍ୟରେ ବ୍ୟାଙ୍କ ଋଣ ପରିଶୋଧ ତାରିଖ',
    as: 'মহাজনৰ ঋণৰ চাপ + ৩০ দিনৰ ভিতৰত বেংক ঋণ পৰিশোধৰ তাৰিখ',
    kn: 'ಹೆಚ್ಚಿನ ಖಾಸಗಿ ಸಾಲ + ೩೦ ದಿನಗಳಲ್ಲಿ ಬ್ಯಾಂಕ್ ಸಾಲ ಮರುಪಾವತಿ ಗಡುವು',
    en: 'High informal debt + loan repayment due within 30 days'
  },

  // Actions for Farmers
  'Issue PMFBY localized crop loss claim form & initiate block-level survey within 72 hrs': {
    hi: 'PMFBY स्थानीय फसल नुकसान दावा फॉर्म भरें एवं ७२ घंटे में ब्लॉक सर्वे शुरू करवाएं',
    mr: 'स्थानिक पीक नुकसानीसाठी ७२ तासांत अर्ज दाखल करा व पंचनामा सुरू करा',
    or: 'PMFBY ସ୍ଥାନୀୟ ଫସଲ କ୍ଷତି ଦାବି ଫର୍ମ ପୂରଣ କରନ୍ତୁ ଓ ୭୨ ଘଣ୍ଟା ମଧ୍ୟରେ ସର୍ଭେ କରାନ୍ତୁ',
    as: 'PMFBY স্থানীয় শস্য ক্ষতিৰ দাবী প্ৰপত্ৰ জমা দিয়ক আৰু ৭২ ঘণ্টাত জৰীপ আৰম্ভ কৰাওক',
    kn: 'PMFBY ಸ್ಥಳೀಯ ಬೆಳೆ ನಷ್ಟ ಪರಿಹಾರ ನಮೂನೆ ಸಲ್ಲಿಸಿ ೭೨ ಗಂಟೆಗಳಲ್ಲಿ ಸಮೀಕ್ಷೆ ಆರಂಭಿಸಿ',
    en: 'Issue PMFBY localized crop loss claim form & initiate block-level survey within 72 hrs'
  },
  'Facilitate e-NAM APMC MSP procurement enrollment or WDRA warehouse pledge loan': {
    hi: 'ई-नाम एपीएमसी सरकारी खरीद में पंजीकरण कराएं या WDRA गोदाम रसीद पर ७०% ऋण लें',
    mr: 'ई-नाम हमीभाव केंद्रावर नोंदणी करा किंवा WDRA गोदामात माल ठेवून कर्ज मिळवा',
    or: 'ଇ-ନାମ୍ ଏପିଏମସି ସରକାରୀ କ୍ରୟ କେନ୍ଦ୍ରରେ ନାମ ଲେଖାନ୍ତୁ କିମ୍ବା WDRA ଗୋଦାମ ଋଣ ନିଅନ୍ତୁ',
    as: 'ই-নাম এপিএমচি চৰকাৰী ক্ৰয় কেন্দ্ৰত পঞ্জীয়ন কৰক নাইবা WDRA গুদাম ঋণ লওক',
    kn: 'ಇ-ನ್ಯಾಮ್ ಎಪಿಎಂಸಿ ಸರ್ಕಾರಿ ಖರೀದಿ ನೋಂದಣಿ ಮಾಡಿ ಅಥವಾ WDRA ಗೋದಾಮು ರಸೀದಿ ಸಾಲ ಪಡೆಯಿರಿ',
    en: 'Facilitate e-NAM APMC MSP procurement enrollment or WDRA warehouse pledge loan'
  },
  'Submit PMKSY-PDMC application for drip/sprinkler installation subsidy': {
    hi: 'ड्रिप एवं स्प्रिंकलर सिंचाई सब्सिडी के लिए PMKSY-PDMC पोर्टल पर आवेदन करें',
    mr: 'ठिबक व तुषार सिंचन अनुदानासाठी कृषी विभागाकडे PMKSY-PDMC अर्ज दाखल करा',
    or: 'ଡ୍ରିପ୍ / ସ୍ପ୍ରିଙ୍କଲର୍ ଜଳସେଚନ ରିହାତି ପାଇଁ PMKSY-PDMC ଆବେଦନ ପତ୍ର ଦାଖଲ କରନ୍ତୁ',
    as: 'টোপাল জলসিঞ্চন ৰাজসাহায্যৰ বাবে PMKSY-PDMC আবেদন দাখিল কৰক',
    kn: 'ಹನಿ ನೀರಾವರಿ ಸಬ್ಸಿಡಿಗಾಗಿ PMKSY-PDMC ಅಡಿಯಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    en: 'Submit PMKSY-PDMC application for drip/sprinkler installation subsidy'
  },
  'Enroll in State Special Drought Relief Package for input & electricity tariff subsidy': {
    hi: 'बीज, खाद एवं कृषि बिजली बिल सब्सिडी के लिए राज्य सूखा राहत पैकेज में पंजीकरण करें',
    mr: 'बियाणे, खते व वीज बिल सवलतीसाठी राज्य दुष्काळ साहाय्य पॅकेजमध्ये नाव नोंदवा',
    or: 'ବିହନ, ସାର ଓ କୃଷି ବିଦ୍ୟୁତ୍ ରିହାତି ପାଇଁ ରାଜ୍ୟ ମରୁଡ଼ି ପ୍ୟାକେଜରେ ପଞ୍ଜୀକରଣ କରନ୍ତୁ',
    as: 'সাৰ, বীজ আৰু কৃষি বিদ্যুৎ ৰেহাইৰ বাবে ৰাজ্যিক খৰাং সাহায্যত পঞ্জীয়ন কৰক',
    kn: 'ಬೀಜ, ಗೊಬ್ಬರ ಮತ್ತು ಕೃಷಿ ವಿದ್ಯುತ್ ಸಬ್ಸಿಡಿಗಾಗಿ ರಾಜ್ಯ ಬರ ಪರಿಹಾರದಲ್ಲಿ ನೋಂದಾಯಿಸಿ',
    en: 'Enroll in State Special Drought Relief Package for input & electricity tariff subsidy'
  },
  'Immediately enroll in PMFBY for ongoing Kharif season at nearest CSC / bank branch': {
    hi: 'निकटतम सीएससी केंद्र या बैंक शाखा में चालू खरीफ सीजन के लिए तुरंत फसल बीमा कराएं',
    mr: 'चालू खरीप हंगामासाठी जवळच्या सीएससी केंद्रात किंवा बँकेत त्वरित पीक विमा उतरवा',
    or: 'ଚାଲୁ ଖରିଫ୍ ଋତୁ ପାଇଁ ନିକଟସ୍ଥ CSC କେନ୍ଦ୍ର ବା ବ୍ୟାଙ୍କରେ ତୁରନ୍ତ ଫସଲ ବୀମା କରାନ୍ତୁ',
    as: 'বৰ্তমান খাৰিফ শস্যৰ বাবে নিকটৱৰ্তী CSC বা বেংকত তৎকালে শস্য বীমা কৰাওক',
    kn: 'ಪ್ರಸ್ತುತ ಮುಂಗಾರು ಹಂಗಾಮಿಗೆ ಹತ್ತಿರದ ಸಿಎಸ್‌ಸಿ ಅಥವಾ ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ ತಕ್ಷಣ ಬೆಳೆ ವಿಮೆ ಮಾಡಿಸಿ',
    en: 'Immediately enroll in PMFBY for ongoing Kharif season at nearest CSC / bank branch'
  },
  'Submit KCC rescheduling request; counsel farmer on Aadhaar-linked bank linkage to avoid penalty': {
    hi: 'केसीसी ऋण पुनर्गठन आवेदन जमा करें एवं ३% ब्याज छूट हेतु आधार बैंक लिंकिंग सुनिश्चित करें',
    mr: 'केसीसी कर्ज पुनर्रचनेचा अर्ज बँकेत द्या व ३% सवलतीसाठी आधार बँक खात्याशी लिंक ठेवा',
    or: 'କେସିସି ଋଣ ପୁନର୍ଗଠନ ଆବେଦନ କରନ୍ତୁ ଏବଂ ୩% ରିହାତି ପାଇଁ ଆଧାର ବ୍ୟାଙ୍କ ସଂଯୋଗ ଯାଞ୍ଚ କରନ୍ତୁ',
    as: 'KCC ঋণ পুনৰ্গঠনৰ আবেদন কৰক আৰু ৩% ৰেহাইৰ বাবে আধাৰ লিংক নিশ্চিত কৰক',
    kn: 'ಕೆಸಿಸಿ ಸಾಲ ಮರುಹೊಂದಾಣಿಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ ಮತ್ತು ೩% ಬಡ್ಡಿ ರಿಯಾಯಿತಿಗಾಗಿ ಆಧಾರ್ ಲಿಂಕ್ ಪರಿಶೀಲಿಸಿ',
    en: 'Submit KCC rescheduling request; counsel farmer on Aadhaar-linked bank linkage to avoid penalty'
  },
  'Verify Aadhaar-NPCI bank account seeding at Taluka agriculture office for DBT installment': {
    hi: 'पीएम-किसान की २००० रुपये किस्त प्राप्त करने हेतु बैंक खाते में आधार-एनपीसीआई सीडिंग कराएं',
    mr: 'पीएम-किसान हप्ता जमा होण्यासाठी बँक खात्याला आधार-NPCI मॅपिंग करून घ्या',
    or: 'ପିଏମ୍-କିଷାନ କିସ୍ତି ପାଇବା ପାଇଁ ବ୍ୟାଙ୍କ ଖାତାରେ ଆଧାର-NPCI ସଂଯୋଗ କରନ୍ତୁ',
    as: 'পিএম-কিষাণ কিস্তিৰ বাবে বেংক একাউণ্টত আধাৰ-NPCI সংযোগ পৰীক্ষা কৰক',
    kn: 'ಪಿಎಂ-ಕಿಸಾನ್ ಕಂತು ಪಡೆಯಲು ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಆಧಾರ್-NPCI ಜೋಡಣೆ ಪರಿಶೀಲಿಸಿ',
    en: 'Verify Aadhaar-NPCI bank account seeding at Taluka agriculture office for DBT installment'
  },

  // General & Severity
  'CRITICAL': { hi: 'अत्यंत गंभीर', mr: 'अति-तातडीचे', or: 'ଗମ୍ଭୀର', as: 'জৰুৰী', kn: 'ಅತ್ಯಂತ ತುರ್ತು', en: 'CRITICAL' },
  'HIGH': { hi: 'उच्च प्राथमिकता', mr: 'महत्त्वाचे', or: 'ଉଚ୍ଚ', as: 'গুৰুত্বপূৰ্ণ', kn: 'ಹೆಚ್ಚು ಆದ್ಯತೆ', en: 'HIGH' },
  'MEDIUM': { hi: 'मध्यम', mr: 'मध्यम', or: 'ମଧ୍ୟମ', as: 'মধ্যম', kn: 'ಮಧ್ಯಮ', en: 'MEDIUM' },
  'INFO': { hi: 'सूचना', mr: 'माहिती', or: 'ସୂଚନା', as: 'তথ্য', kn: 'ಮಾಹಿತಿ', en: 'INFO' },
  'LOW': { hi: 'सामान्य', mr: 'कमी', or: 'କମ୍', as: 'কম', kn: 'ಸಾಮಾನ್ಯ', en: 'LOW' }
};

/**
 * High-reliability translation helper.
 */
async function getTranslation(text, lang) {
  if (!text || typeof text !== 'string') return text;
  if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()₹]*$/.test(text)) return text;
  if (lang === 'en') return text;

  // 1. Direct dictionary match
  if (TRANSLATION_DICTIONARY[text] && TRANSLATION_DICTIONARY[text][lang]) {
    return TRANSLATION_DICTIONARY[text][lang];
  }

  // 2. Case-insensitive dictionary match
  const lower = text.trim().toLowerCase();
  for (const [key, map] of Object.entries(TRANSLATION_DICTIONARY)) {
    if (key.toLowerCase() === lower && map[lang]) {
      return map[lang];
    }
  }

  // 3. Check memory cache
  if (!state.translationCache) state.translationCache = {};
  if (!state.translationCache[lang]) state.translationCache[lang] = {};
  if (state.translationCache[lang][text]) {
    return state.translationCache[lang][text];
  }

  // 4. Fallback to API translation
  const translated = await translateText(text, lang);
  if (translated) {
    state.translationCache[lang][text] = translated;
    return translated;
  }
  return text;
}

/**
 * Translates text via backend / Google Translate endpoint.
 */
async function translateText(text, targetLang) {
  if (!text) return '';
  if (targetLang === 'en') return text;

  if (GOOGLE_TRANSLATE_API_KEY) {
    try {
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, target: targetLang, format: 'text' })
        }
      );
      const data = await res.json();
      if (data.data?.translations?.[0]?.translatedText) {
        return data.data.translations[0].translatedText;
      }
    } catch (err) {
      console.warn('GCP Translate API error, using fallback:', err);
    }
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[0]) {
      let translated = "";
      for (let i = 0; i < data[0].length; i++) {
        if (data[0][i][0]) {
          translated += data[0][i][0];
        }
      }
      if (translated) return translated;
    }
  } catch (err) {
    console.warn('Fallback translate failed:', err);
  }
  return text;
}

// ─── SPEECH SYNTHESIS LAYER ───

async function speakText(textToSpeak, langCode) {
  if (!textToSpeak) return;

  if (state.isSpeaking) {
    stopSpeech();
    return;
  }

  stopSpeech();

  const lang = langCode || state.selectedLanguage || 'hi';
  const t = i18n[lang] || i18n['en'];
  showTTSToast(t.playing || 'Playing audio…');

  try {
    const audioUrl = `${API_BASE}/tts?text=${encodeURIComponent(textToSpeak)}&lang=${encodeURIComponent(lang)}`;
    const audio = new Audio(audioUrl);
    state.currentAudio = audio;
    state.isSpeaking = true;
    updateVoiceButtonUI(true);

    audio.onended = () => {
      stopSpeech();
    };

    audio.onerror = (err) => {
      console.warn('Neural TTS segment error, falling back to Web Speech API:', err);
      fallbackToWebSpeech(textToSpeak, lang);
    };

    await audio.play();
  } catch (err) {
    console.warn('Primary audio playback error, falling back to Web Speech:', err);
    fallbackToWebSpeech(textToSpeak, lang);
  }
}

function fallbackToWebSpeech(textToSpeak, langCode) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported on this device.');
    stopSpeech();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  const langMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', or: 'or-IN', as: 'as-IN', kn: 'kn-IN' };
  utterance.lang  = langMap[langCode] || 'hi-IN';
  utterance.rate  = 0.92;
  utterance.pitch = 1.0;

  try {
    const voices = window.speechSynthesis.getVoices() || [];
    const targetTag = (langMap[langCode] || 'hi-IN').toLowerCase();
    const voice = voices.find(v => v.lang.toLowerCase().startsWith(targetTag)) ||
                  voices.find(v => v.lang.toLowerCase().includes('in')) ||
                  voices.find(v => v.lang.toLowerCase().startsWith('hi')) ||
                  null;
    if (voice) utterance.voice = voice;
  } catch (e) {
    console.warn('Voice picker fallback error:', e);
  }

  utterance.onstart = () => { state.isSpeaking = true; updateVoiceButtonUI(true); };
  utterance.onend   = () => { stopSpeech(); };
  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    stopSpeech();
  };

  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if (state.currentAudio) {
    state.currentAudio.pause();
    state.currentAudio.currentTime = 0;
    state.currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  state.isSpeaking = false;
  updateVoiceButtonUI(false);
  document.querySelectorAll('.tts-listen-btn').forEach(b => b.classList.remove('tts-playing'));
}

function updateVoiceButtonUI(playing) {
  const btn = document.getElementById('btn-play-voice');
  if (!btn) return;
  const lang = state.selectedLanguage || 'hi';
  const t = i18n[lang] || i18n['en'];

  if (playing) {
    btn.innerHTML = `<span>⏹️</span><span>${t.stopAudio || 'Stop Audio'}</span>`;
    btn.className = "px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold flex items-center justify-center space-x-2 shadow-lg shadow-red-600/30 active:scale-95 transition-all touch-target";
  } else {
    btn.innerHTML = `<span>🔊</span><span>${t.playAdvisory || 'Play Spoken Advisory (Voice)'}</span>`;
    btn.className = "px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700/20 active:scale-95 transition-all touch-target";
  }
}

function showTTSToast(msg) {
  const toast = document.getElementById('tts-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

async function playButtonAudio(buttonKey, event) {
  if (event) event.stopPropagation();

  const lang = state.selectedLanguage || 'hi';
  const t    = i18n[lang] || i18n['en'];

  const textMap = {
    cropAdvisory: `${t.cropAdvisory}. ${t.cropAdvisorySub}`,
    mandiPrice:   `${t.mandiPrice}. ${t.mandiPriceSub}`,
    myAlerts:     `${t.myAlerts}. ${t.myAlertsSub}`,
    govtSchemes:  `${t.govtSchemes}. ${t.govtSchemesSub}`,
  };
  const textToSpeak = textMap[buttonKey] || t[buttonKey] || buttonKey;

  if (event) {
    const btn = event.currentTarget || event.target.closest('.tts-listen-btn');
    if (btn) {
      document.querySelectorAll('.tts-listen-btn').forEach(b => b.classList.remove('tts-playing'));
      btn.classList.add('tts-playing');
    }
  }

  await speakText(textToSpeak, lang);
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
  select.value = state.selectedLanguage;
}

async function loadFarmersList() {
  try {
    const res = await fetch(`${API_BASE}/farmers`);
    state.farmers = await res.json();

    const farmerSelect = document.getElementById('farmer-select');
    if (farmerSelect) {
      farmerSelect.innerHTML = '';
      state.farmers.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = `${f.name} — ${f.crop} (${f.village || f.district_id})`;
        if (f.id === state.selectedFarmerId) opt.selected = true;
        farmerSelect.appendChild(opt);
      });
    }

    if (state.farmers.length > 0) {
      await selectFarmer(state.selectedFarmerId || state.farmers[0].id);
    }
  } catch (err) {
    console.error('Failed to load farmers list:', err);
  }
}

// ─── VIEW & TAB SWITCHING ───

function switchMainView(viewName) {
  state.activeView = viewName;
  stopSpeech();

  const views = ['farmer', 'officer', 'simulator'];
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
        btn.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all bg-emerald-600 text-white shadow";
      } else {
        btn.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all text-slate-300 hover:text-white hover:bg-slate-700";
      }
    }
  });

  if (viewName === 'officer') {
    fetchOfficerData();
  }
}

function setFarmerAccessMode(mode) {
  state.farmerAccessMode = mode;
  const btnAssisted = document.getElementById('btn-mode-assisted');
  const btnSelf = document.getElementById('btn-mode-self');

  if (mode === 'assisted') {
    if (btnAssisted) btnAssisted.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all bg-emerald-700 text-white shadow-sm";
    if (btnSelf) btnSelf.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all text-slate-600 hover:text-slate-900";
  } else {
    if (btnSelf) btnSelf.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all bg-emerald-700 text-white shadow-sm";
    if (btnAssisted) btnAssisted.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all text-slate-600 hover:text-slate-900";
  }
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
        btn.classList.add('ring-4', 'ring-emerald-500/30', 'border-emerald-600');
      } else {
        btn.classList.remove('ring-4', 'ring-emerald-500/30', 'border-emerald-600');
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
  state.selectedLanguage = lang;
  stopSpeech();
  applyI18n();

  const simIvrSelect = document.getElementById('sim-ivr-lang-select');
  if (simIvrSelect) simIvrSelect.value = lang;
  state.ivrLanguage = lang;

  await Promise.all([
    renderFarmerProfileCard(),
    renderFarmerAdvisory(),
    renderFarmerMandiPrice(),
    renderFarmerAlerts(),
    renderFarmerSchemes(),
    renderOfficerMetrics(),
    renderOfficerTable(),
    startIvrCall(null, lang)
  ]);
}

async function selectFarmer(farmerId) {
  state.selectedFarmerId = farmerId;
  const farmer = state.farmers.find(f => f.id === farmerId);
  if (!farmer) return;
  state.currentFarmer = farmer;

  if (farmer.default_ui_mode) {
    setFarmerAccessMode(farmer.default_ui_mode);
  }

  if (farmer.language) {
    state.selectedLanguage = farmer.language;
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = farmer.language;
  }
  applyI18n();

  const farmerSelect = document.getElementById('farmer-select');
  if (farmerSelect) farmerSelect.value = farmerId;

  try {
    const [advRes, disRes] = await Promise.all([
      fetch(`${API_BASE}/farmers/${farmerId}/advisory`),
      fetch(`${API_BASE}/farmers/${farmerId}/distress`, {
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
  const lang = state.selectedLanguage || 'hi';
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

async function renderFarmerProfileCard() {
  const f = state.currentFarmer;
  if (!f) return;

  const lang = state.selectedLanguage || 'hi';
  const cropEmojis = { onion: '🧅', cotton: '🌿', soybean: '🌱', rice: '🌾', maize: '🌽' };
  const cropEmoji = cropEmojis[f.crop.toLowerCase()] || '🌾';

  // Translate labels & dynamic fields
  const translatedCrop = await getTranslation(f.crop, lang);
  const translatedStage = await getTranslation(f.crop_stage, lang);
  const locationStr = `${f.village || ''}, ${f.district_name || f.district_id}`;
  const translatedLocation = await getTranslation(locationStr, lang);
  const HectaresLabel = await getTranslation('Hectares', lang);
  const loanDueLabel = await getTranslation('Loan Due', lang);
  const optimalChannelLabel = await getTranslation('Optimal Channel', lang);
  
  const isIvr = f.recommended_channel === 'ivr_or_sms';
  const channelTitle = isIvr ? 'IVR Call & Plain SMS' : 'Smartphone In-App & Voice';
  const deviceNote = `${(f.device_type || 'phone').replace('_', ' ')} (${f.network_quality || 'Standard'} Network)`;

  const translatedChannelTitle = await getTranslation(channelTitle, lang);
  const translatedDeviceNote = await getTranslation(deviceNote, lang);

  const fpName = document.getElementById('fp-name');
  if (fpName) fpName.textContent = f.name;

  const fpCropBadge = document.getElementById('fp-crop-badge');
  if (fpCropBadge) fpCropBadge.textContent = `${cropEmoji} ${translatedCrop.toUpperCase()} • ${translatedStage.toUpperCase()}`;

  const fpLocation = document.getElementById('fp-location');
  if (fpLocation) fpLocation.textContent = `📍 ${translatedLocation}`;

  const fpLandholding = document.getElementById('fp-landholding');
  if (fpLandholding) fpLandholding.textContent = `📐 ${f.landholding_hectares || f.landholding_ha || '1.0'} ${HectaresLabel}`;

  const fpLoan = document.getElementById('fp-loan');
  if (fpLoan) fpLoan.textContent = `💳 ${loanDueLabel}: ${f.loan_due_date || 'N/A'}`;

  const fpChannelIcon = document.getElementById('fp-channel-icon');
  if (fpChannelIcon) fpChannelIcon.textContent = isIvr ? '☎️' : '📱';

  const fpChannelTitle = document.getElementById('fp-channel-title');
  if (fpChannelTitle) fpChannelTitle.textContent = translatedChannelTitle;

  const fpDeviceNote = document.getElementById('fp-device-note');
  if (fpDeviceNote) fpDeviceNote.textContent = translatedDeviceNote;
}

async function renderFarmerAdvisory() {
  const adv = state.currentAdvisory;
  if (!adv) return;

  const lang = state.selectedLanguage || 'hi';
  
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

  const titleEl = document.getElementById('advisory-title');
  if (titleEl) titleEl.textContent = title;

  const spokenTextEl = document.getElementById('advisory-spoken-text');
  if (spokenTextEl) spokenTextEl.textContent = text;

  // Translate badge
  const badge = document.getElementById('advisory-badge');
  if (badge) {
    let badgeText = '';
    if (adv.action_type === 'market_intervention') {
      badge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 uppercase tracking-wider";
      badgeText = `MARKET INTERVENTION (${adv.rule_id || 'R-30'})`;
    } else if (adv.action_type === 'contingency_crop_switch') {
      badge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wider";
      badgeText = `CRIDA CONTINGENCY SWITCH (${adv.rule_id || 'R-10'})`;
    } else {
      badge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider";
      badgeText = `AGRONOMY ADVISORY (${adv.rule_id || 'R-20'})`;
    }
    badge.textContent = await getTranslation(badgeText, lang);
  }

  // Contingency crop list
  const contingencyBox = document.getElementById('contingency-box');
  const contingencyList = document.getElementById('contingency-crops-list');
  
  if (contingencyBox && contingencyList) {
    if (adv.contingency_crops && adv.contingency_crops.length > 0) {
      contingencyBox.classList.remove('hidden');
      
      const translatedCrops = await Promise.all(adv.contingency_crops.map(async c => {
        const cCrop = c.name || c.crop || c;
        const cName = await getTranslation(cCrop, lang);
        const cDur = c.duration_days ? await getTranslation(`Duration: ${c.duration_days} Days`, lang) : '';
        const cRat = (c.rationale || c.reason) ? await getTranslation(c.rationale || c.reason, lang) : '';
        return `
          <div class="bg-white p-3.5 rounded-xl border border-amber-200">
            <div class="font-extrabold text-slate-900 text-sm">${cName}</div>
            <div class="text-xs text-slate-600 mt-0.5">${cRat}</div>
            ${cDur ? `<div class="text-[11px] font-bold text-amber-800 mt-1">${cDur}</div>` : ''}
          </div>
        `;
      }));

      contingencyList.innerHTML = translatedCrops.join('');
    } else {
      contingencyBox.classList.add('hidden');
    }
  }

  // Weather & Soil Context Indicators
  if (adv.weather_data) {
    const wd = adv.weather_data;
    const f = state.currentFarmer;
    const soil = f ? (f.soil_type || 'Black Cotton') : 'Black Cotton';
    const rainDev = Math.abs(wd.rainfall_deviation_pct || 0).toFixed(1);
    const isDeficit = (wd.rainfall_deviation_pct || 0) < 0;
    const dryDays = wd.dry_spell_days || 0;
    const onset = wd.onset_status || 'normal';

    const rainText = `${isDeficit ? '-' : '+'}${rainDev}% ${isDeficit ? 'Deficit' : 'Surplus'}`;
    const dryText = `${dryDays} Days`;
    const onsetText = onset === 'delayed' ? `Delayed (${wd.onset_delay_days || 0}d)` : 'Normal';

    const tRainValue = await getTranslation(rainText, lang);
    const tDryValue = await getTranslation(dryText, lang);
    const tOnsetValue = await getTranslation(onsetText, lang);
    const tSoilValue = await getTranslation(soil, lang);

    const ctxRain = document.getElementById('ctx-rainfall');
    if (ctxRain) ctxRain.textContent = tRainValue;

    const ctxDry = document.getElementById('ctx-dryspell');
    if (ctxDry) ctxDry.textContent = tDryValue;

    const ctxOnset = document.getElementById('ctx-onset');
    if (ctxOnset) ctxOnset.textContent = tOnsetValue.toUpperCase();

    const ctxSoil = document.getElementById('ctx-soil');
    if (ctxSoil) ctxSoil.textContent = tSoilValue;
  }
}

// ─── MANDI PRICE RENDERING & VOICE ───

async function renderFarmerMandiPrice() {
  const adv = state.currentAdvisory;
  if (!adv || !adv.price_data) return;

  const pd = adv.price_data;
  const lang = state.selectedLanguage || 'hi';
  const t = i18n[lang] || i18n['en'];

  const cropName = await getTranslation(pd.crop, lang);
  const marketName = await getTranslation(pd.market_name, lang);
  
  const mandiNameEl = document.getElementById('mandi-name');
  if (mandiNameEl) mandiNameEl.textContent = `${marketName} • ${cropName.toUpperCase()}`;

  const currentPriceEl = document.getElementById('mandi-current-price');
  if (currentPriceEl) currentPriceEl.textContent = `₹${pd.current_price.toLocaleString('en-IN')}`;

  const mspPriceEl = document.getElementById('mandi-msp-price');
  if (mspPriceEl) mspPriceEl.textContent = `₹${pd.govt_msp.toLocaleString('en-IN')}`;

  const alertBox = document.getElementById('mandi-alert-box');
  const alertIcon = document.getElementById('mandi-alert-icon');
  const alertTitle = document.getElementById('mandi-alert-title');
  const alertText = document.getElementById('mandi-alert-text');
  const alertBadge = document.getElementById('mandi-alert-badge');

  if (pd.is_below_msp) {
    if (alertBox) alertBox.className = "bg-red-50 border-2 border-red-400 rounded-2xl p-5 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4";
    if (alertIcon) alertIcon.textContent = "⚠️";
    if (alertTitle) alertTitle.textContent = t.belowMspTitle || "Price is BELOW Government MSP!";
    
    const diff = pd.govt_msp - pd.current_price;
    const belowBodyText = lang === 'hi' ? `वर्तमान मंडी भाव सरकारी समर्थन मूल्य (MSP) से ₹${diff}/क्विंटल कम है। घबराकर कम भाव में न बेचें। ई-नाम या वेयरहाउस रसीद पर ऋण लें।`
      : lang === 'mr' ? `सध्याचा बाजार भाव हमीभावापेक्षा ₹${diff}/क्विंटल कमी आहे. घाबरून कमी भावात विकू नका. ई-नाम किंवा गोदामात साठवणूक करा.`
      : lang === 'or' ? `ବର୍ତ୍ତମାନ ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି ଠାରୁ ₹${diff}/କ୍ୱିଣ୍ଟାଲ କମ୍ ଅଛି। ବ୍ୟସ୍ତ ହୋଇ କମ୍ ଦରରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। ଇ-ନାମ୍ ବା ୱେରହାଉସ୍ ଋଣ ସୁବିଧା ନିଅନ୍ତୁ।`
      : lang === 'as' ? `বৰ্তমান বজাৰ মূল্য চৰকাৰী সমৰ্থন মূল্যতকৈ ₹${diff}/কুইন্টল কম। চিন্তিত হৈ কম দৰত বিক্ৰী নকৰিব। ই-নাম বা গুদাম ঋণ ব্যৱহাৰ কৰক।`
      : lang === 'kn' ? `ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ದರವು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ₹${diff}/ಕ್ವಿಂಟಾಲ್ ಕಡಿಮೆಯಿದೆ. ಆತಂಕದಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬೇಡಿ. ಇ-ನ್ಯಾಮ್ ಅಥವಾ ಗೋದಾಮು ರಸೀದಿ ಸಾಲ ಬಳಸಿ.`
      : `Current Mandi price is below MSP by ${pd.shortfall_pct}%. Do NOT sell in distress. Consider e-NAM APMC enrollment or WDRA pledge loan.`;
    
    if (alertText) alertText.textContent = belowBodyText;
    if (alertBadge) {
      alertBadge.textContent = t.distressWarning || "Distress Warning";
      alertBadge.className = "bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-lg whitespace-nowrap";
    }
  } else {
    if (alertBox) alertBox.className = "bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4";
    if (alertIcon) alertIcon.textContent = "✅";
    if (alertTitle) alertTitle.textContent = t.aboveMspTitle || "Price is ABOVE Government MSP";

    const aboveBodyText = lang === 'hi' ? `वर्तमान मंडी भाव ₹${pd.current_price}/क्विंटल है, जो सरकारी समर्थन मूल्य से ऊपर स्थिर है।`
      : lang === 'mr' ? `सध्याचा बाजार भाव ₹${pd.current_price}/क्विंटल असून तो हमीभावापेक्षा चांगला आहे.`
      : lang === 'or' ? `ବର୍ତ୍ତମାନ ବଜାର ଦର ₹${pd.current_price} ରହିଛି, ଯାହା ସରକାରୀ ଏମଏସପି ଠାରୁ ଅଧିକ ଓ ସନ୍ତୋଷଜନକ।`
      : lang === 'as' ? `বৰ্তমান বজাৰ দৰ ₹${pd.current_price}, যি চৰকাৰী সমৰ্থন মূল্যতকৈ ওপৰত স্থিৰ আছে।`
      : lang === 'kn' ? `ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ದರ ₹${pd.current_price} ಆಗಿದ್ದು, ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಉತ್ತಮ ಸ್ಥಿತಿಯಲ್ಲಿದೆ.`
      : `Current market price is ₹${pd.current_price}, maintaining stability above the Government MSP floor benchmark.`;

    if (alertText) alertText.textContent = aboveBodyText;
    if (alertBadge) {
      alertBadge.textContent = t.stablePrice || "Stable Price";
      alertBadge.className = "bg-emerald-600 text-white font-black text-xs px-3 py-1.5 rounded-lg whitespace-nowrap";
    }
  }

  // Render Recommended Actions
  const recListEl = document.getElementById('mandi-recommendations-list');
  if (recListEl) {
    const diffVal = pd.govt_msp - pd.current_price;
    const actions = pd.is_below_msp ? [
      `1. Avoid immediate Mandi distress sale: Current mandi realization causes an estimated ₹${diffVal}/quintal loss.`,
      `2. e-NAM & WDRA Warehouse Receipt: Store produce in nearby WDRA warehouse and avail 70% pledge loan at 7% interest.`,
      `3. PM-AASHA Enrollment: Register at the Taluka procurement center for government price deficit support.`
    ] : [
      `1. Favorable Market Realization: Current mandi prices are above the MSP floor benchmark.`,
      `2. Direct APMC e-NAM Auction: Sell through electronic auction for maximum competitive bids.`,
      `3. Quality Grading: Grade produce as FAQ (Fair Average Quality) to command premium price.`
    ];

    const translatedActions = await Promise.all(actions.map(act => getTranslation(act, lang)));
    recListEl.innerHTML = translatedActions.map(act => `<p>${act}</p>`).join('');
  }
}

async function playMandiAudio() {
  const adv = state.currentAdvisory;
  if (!adv || !adv.price_data) return;

  const pd = adv.price_data;
  const lang = state.selectedLanguage || 'hi';
  const t = i18n[lang] || i18n['en'];

  const cropName = await getTranslation(pd.crop, lang);
  const marketName = await getTranslation(pd.market_name, lang);

  let script = "";
  if (pd.is_below_msp) {
    const diff = pd.govt_msp - pd.current_price;
    script = lang === 'hi' ? `${marketName} में ${cropName} का आज का भाव ₹${pd.current_price} प्रति क्विंटल है। यह सरकारी समर्थन मूल्य ₹${pd.govt_msp} से ₹${diff} कम है। घाटे में न बेचें। ई-नाम केंद्र पर पंजीकरण कराएं अथवा वेयरहाउस रसीद पर ऋण प्राप्त करें।`
      : lang === 'mr' ? `${marketName} मध्ये ${cropName} चा आजचा भाव ₹${pd.current_price} प्रति क्विंटल आहे. हा सरकारी हमीभाव ₹${pd.govt_msp} पेक्षा ₹${diff} कमी आहे. घाईघाईत कमी भावात विकू नका. ई-नाम किंवा गोदामात साठवणूक करून कर्ज मिळवा.`
      : lang === 'or' ? `${marketName} ରେ ${cropName} ର ଆଜିର ମଣ୍ଡି ଦର କ୍ୱିଣ୍ଟାଲ ପିଛା ₹${pd.current_price} ଅଛି। ଏହା ସରକାରୀ ଏମଏସପି ₹${pd.govt_msp} ଠାରୁ ₹${diff} କମ୍। କ୍ଷତିରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ। ଇ-ନାମ୍ ସରକାରୀ କ୍ରୟ କେନ୍ଦ୍ର କିମ୍ବା ୱେରହାଉସ୍ ସୁବିଧା ନିଅନ୍ତୁ।`
      : lang === 'as' ? `${marketName}ত ${cropName}ৰ আজিৰ বজাৰ দৰ প্ৰতি কুইন্টলত ₹${pd.current_price}। ই চৰকাৰী সমৰ্থন মূল্য ₹${pd.govt_msp}তকৈ ₹${diff} কম। ক্ষতি স্বীকাৰ কৰি বিক্ৰী নকৰিব। ই-নাম বা গুদাম সাহায্য ব্যৱহাৰ কৰক।`
      : lang === 'kn' ? `${marketName} ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ${cropName} ಬೆಲೆ ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹${pd.current_price} ಇದೆ. ಇದು ಸರ್ಕಾರಿ ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ₹${diff} ಕಡಿಮೆಯಾಗಿದೆ. ಆತುರದಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬೇಡಿ. ಇ-ನ್ಯಾಮ್ ಅಥವಾ ಗೋದಾಮು ರಸೀದಿ ಸಾಲ ಸೌಲಭ್ಯ ಪಡೆಯಿರಿ.`
      : `Today's Mandi price for ${cropName} at ${marketName} is ₹${pd.current_price} per quintal, which is ₹${diff} below the Government MSP of ₹${pd.govt_msp}. Do not sell in distress. Consider e-NAM or WDRA warehouse storage.`;
  } else {
    script = lang === 'hi' ? `${marketName} में ${cropName} का आज का भाव ₹${pd.current_price} प्रति क्विंटल है। यह सरकारी समर्थन मूल्य ₹${pd.govt_msp} से ऊपर संतोषजनक है।`
      : lang === 'mr' ? `${marketName} मध्ये ${cropName} चा आजचा भाव ₹${pd.current_price} प्रति क्विंटल असून हमीभावापेक्षा जास्त आहे.`
      : lang === 'or' ? `${marketName} ରେ ${cropName} ର ଆଜିର ମଣ୍ଡି ଦର ₹${pd.current_price} ଅଛି, ଯାହା ସରକାରୀ ଏମଏସପି ଠାରୁ ଅଧିକ।`
      : lang === 'as' ? `${marketName}ত ${cropName}ৰ আজিৰ বজাৰ দৰ ₹${pd.current_price}, ଯি চৰকাৰী সমৰ্থন মূল্যতকৈ ওপৰত সন্তোষজনক।`
      : lang === 'kn' ? `${marketName} ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ${cropName} ದರ ₹${pd.current_price} ಆಗಿದ್ದು, ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ಉತ್ತಮವಾಗಿದೆ.`
      : `Today's Mandi price for ${cropName} at ${marketName} is ₹${pd.current_price} per quintal, maintaining healthy stability above Government MSP.`;
  }

  await speakText(script, lang);
}

// ─── ALERTS TAB RENDERING & VOICE ───

async function renderFarmerAlerts() {
  const dis = state.currentDistress;
  const adv = state.currentAdvisory;
  const container = document.getElementById('farmer-alerts-container');
  if (!container) return;

  const lang = state.selectedLanguage || 'hi';
  const alerts = [];

  // 1. Price distress alert
  if (adv && adv.price_data && adv.price_data.is_below_msp) {
    const diff = adv.price_data.govt_msp - adv.price_data.current_price;
    alerts.push({
      icon: '🚨',
      title: 'Market Distress Warning',
      body: `Mandi price (₹${adv.price_data.current_price}) is ₹${diff}/quintal below Government MSP. Avoid panic selling.`,
      severity: 'CRITICAL',
      color: 'border-red-400 bg-red-50 text-red-950',
      audioText: lang === 'hi' ? `मंडी संकट चेतावनी: मंडी भाव समर्थन मूल्य से ₹${diff} प्रति क्विंटल कम है। घबराकर कम भाव में न बेचें।`
        : lang === 'mr' ? `बाजार भाव संकट सूचना: बाजार भाव हमीभावापेक्षा ₹${diff} प्रति क्विंटल कमी आहे. घाईत विक्री करू नका.`
        : lang === 'or' ? `ମଣ୍ଡି ସଙ୍କଟ ଚେତାବନୀ: ମଣ୍ଡି ଦର ସରକାରୀ ଏମଏସପି ଠାରୁ ₹${diff} କମ୍। କ୍ଷତିରେ ବିକ୍ରି କରନ୍ତୁ ନାହିଁ।`
        : lang === 'as' ? `বজাৰ সংকটৰ সতৰ্কবাৰ্তা: বজাৰ দৰ সমৰ্থন মূল্যতকৈ ₹${diff} কম। কম দৰত বিক্ৰী নকৰিব।`
        : lang === 'kn' ? `ಮಾರುಕಟ್ಟೆ ಎಚ್ಚರಿಕೆ: ಮಾರುಕಟ್ಟೆ ದರವು ಬೆಂಬಲ ಬೆಲೆಗಿಂತ ₹${diff} ಕಡಿಮೆಯಿದೆ. ಆತಂಕದಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬೇಡಿ.`
        : `Market Distress Warning: Mandi price is ₹${diff} per quintal below Government MSP.`
    });
  }

  // 2. Rainfall deficit alert
  if (adv && adv.weather_data && Math.abs(adv.weather_data.rainfall_deviation_pct) > 20) {
    const dev = Math.abs(adv.weather_data.rainfall_deviation_pct).toFixed(1);
    const dryDays = adv.weather_data.dry_spell_days || 0;
    alerts.push({
      icon: '🌦️',
      title: 'Rainfall Deficit Notice',
      body: `Monsoon rainfall is currently ${dev}% below normal with ${dryDays} days dry spell. Apply soil mulch and prepare for PMFBY crop survey.`,
      severity: 'HIGH',
      color: 'border-amber-400 bg-amber-50 text-amber-950',
      audioText: lang === 'hi' ? `वर्षा कमी सूचना: वर्षा सामान्य से ${dev}% कम है और ${dryDays} दिनों का सूखा खंड है। खेतों में मल्चिंग करें और फसल सर्वे की तैयारी रखें।`
        : lang === 'mr' ? `पावसाची तूट सूचना: पाऊस सरासरीपेक्षा ${dev}% कमी असून ${dryDays} दिवसांचा खंड आहे. जमिनीवर आच्छादन करा व पीक पाहणीसाठी तयार राहा.`
        : lang === 'or' ? `ବର୍ଷା ଅଭାବ ସୂଚନା: ମୌସୁମୀ ବର୍ଷା ${dev}% କମ୍ ଏବଂ ${dryDays} ଦିନ ଧରି ଶୁଖିଲା ପାଗ ରହିଛି। ଜମିରେ ଆଚ୍ଛାଦନ ଦିଅନ୍ତୁ ଓ PMFBY ସର୍ଭେ ପାଇଁ ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ।`
        : lang === 'as' ? `বৰষুণ নাটনিৰ জাননী: বৰষুণ সাধাৰণ অৱস্থাতকৈ ${dev}% কম আৰু ${dryDays} দিন ধৰি খৰাং হৈছে। মাটিৰ আৰ্দ্ৰতা ৰক্ষা কৰক।`
        : lang === 'kn' ? `ಮಳೆ ಕೊರತೆ ಎಚ್ಚರಿಕೆ: ಮಳೆ ಸಾಮಾನ್ಯಕ್ಕಿಂತ ಶೇಕಡಾ ${dev} ಕಡಿಮೆಯಾಗಿದೆ ಮತ್ತು ${dryDays} ದಿನಗಳ ಮಳೆ ಕೊರತೆಯಿದೆ. ಹೊದಿಕೆ ಬಳಸಿ ಮತ್ತು ಬೆಳೆ ಸಮೀಕ್ಷೆಗೆ ಸಿದ್ಧರಾಗಿ.`
        : `Rainfall Deficit Notice: Monsoon rainfall is ${dev}% below normal with ${dryDays} dry spell days.`
    });
  }

  // 3. Loan reminder alert
  if (dis && dis.days_until_loan_due !== undefined && dis.days_until_loan_due <= 30) {
    alerts.push({
      icon: '💳',
      title: 'KCC Loan Due Reminder',
      body: `Loan repayment deadline is in ${dis.days_until_loan_due} days. Visit your primary cooperative bank for 3% interest subvention renewal or restructuring.`,
      severity: 'MEDIUM',
      color: 'border-purple-400 bg-purple-50 text-purple-950',
      audioText: lang === 'hi' ? `केसीसी ऋण अदायगी स्मरण: ऋण वापसी की अंतिम तिथि में ${dis.days_until_loan_due} दिन शेष हैं। ३% ब्याज छूट नवीनीकरण हेतु बैंक संपर्क करें।`
        : lang === 'mr' ? `केसीसी पीक कर्ज मुदत सूचना: कर्ज परतफेडीसाठी ${dis.days_until_loan_due} दिवस बाकी आहेत. ३% व्याज सवलत नूतनीकरणासाठी बँकेत जा.`
        : lang === 'or' ? `କେସିସି ଋଣ ସ୍ମାରକପତ୍ର: ଋଣ ପରିଶୋଧ ପାଇଁ ${dis.days_until_loan_due} ଦିନ ବାକି ଅଛି। ୩% ସୁଧ ରିହାତି ପାଇଁ ବ୍ୟାଙ୍କ ସହ ସମ୍ପର୍କ କରନ୍ତୁ।`
        : lang === 'as' ? `KCC ঋণৰ জাননী: ঋণ পৰিশোধৰ অন্তিম তাৰিখলৈ ${dis.days_until_loan_due} দিন বাকী। ৩% ৰেহাইৰ বাবে বেংকত যোগাযোগ কৰক।`
        : lang === 'kn' ? `ಕೆಸಿಸಿ ಸಾಲ ಮರುಪಾವತಿ ನೆನಪೋಲೆ: ಸಾಲ ಮರುಪಾವತಿಗೆ ${dis.days_until_loan_due} ದಿನಗಳು ಬಾಕಿ ಇವೆ. ೩% ಬಡ್ಡಿ ರಿಯಾಯಿತಿ ನವೀಕರಣಕ್ಕಾಗಿ ಬ್ಯಾಂಕ್ ಸಂಪರ್ಕಿಸಿ.`
        : `KCC Loan Due Reminder: Repayment deadline is in ${dis.days_until_loan_due} days.`
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      icon: '✅',
      title: 'All Farm Systems Normal',
      body: 'Weather conditions and market prices are currently stable for your crop.',
      severity: 'INFO',
      color: 'border-emerald-300 bg-emerald-50 text-emerald-950',
      audioText: lang === 'hi' ? 'आपके खेत के सभी संकेत सामान्य हैं। मौसम व बाजार भाव वर्तमान में स्थिर हैं।'
        : lang === 'mr' ? 'आपल्या शेतातील सर्व स्थिती समाधानकारक आहे. हवामान व बाजार भाव स्थिर आहेत.'
        : lang === 'or' ? 'ଆପଣଙ୍କ ଜମି ପାଇଁ ସମସ୍ତ ପାଣିପାଗ ଓ ବଜାର ଦର ବର୍ତ୍ତମାନ ସ୍ଥିର ଓ ସନ୍ତୋଷଜନକ ଅଛି।'
        : lang === 'as' ? 'আপোনাৰ খেতিৰ সকলো অৱস্থা স্বাভাৱিক আৰু বজাৰ দৰ স্থিৰ আছে।'
        : lang === 'kn' ? 'ನಿಮ್ಮ ಜಮೀನಿನ ಎಲ್ಲಾ ಪರಿಸ್ಥಿತಿಗಳು ಸಾಮಾನ್ಯವಾಗಿದ್ದು, ಹವಾಮಾನ ಮತ್ತು ದರಗಳು ಸ್ಥಿರವಾಗಿವೆ.'
        : 'All farm systems are currently normal and stable.'
    });
  }

  state.currentAlerts = alerts;

  const translatedAlerts = await Promise.all(alerts.map(async (a, idx) => {
    const tTitle = await getTranslation(a.title, lang);
    const tBody = await getTranslation(a.body, lang);
    const tSeverity = await getTranslation(a.severity, lang);
    const tListen = i18n[lang]?.tapToListen || 'Tap to listen 🔊';
    return `
      <div class="p-5 rounded-2xl border-2 ${a.color} flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-sm hover:shadow-md transition">
        <div class="flex items-start space-x-3.5">
          <div class="text-3xl">${a.icon}</div>
          <div>
            <div class="flex items-center space-x-2">
              <h4 class="font-extrabold text-base">${tTitle}</h4>
              <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/10">${tSeverity}</span>
            </div>
            <p class="text-sm font-medium mt-1 leading-relaxed">${tBody}</p>
          </div>
        </div>
        <button onclick="playAlertCardAudio(${idx})" class="self-start sm:self-center px-3 py-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-xs font-bold whitespace-nowrap transition cursor-pointer">
          ${tListen}
        </button>
      </div>
    `;
  }));

  container.innerHTML = translatedAlerts.join('');
}

async function playAllAlertsAudio() {
  const alerts = state.currentAlerts || [];
  if (alerts.length === 0) return;
  const lang = state.selectedLanguage || 'hi';
  const fullText = alerts.map(a => a.audioText || a.body).join('। ');
  await speakText(fullText, lang);
}

async function playAlertCardAudio(index) {
  const alert = state.currentAlerts?.[index];
  if (!alert) return;
  const lang = state.selectedLanguage || 'hi';
  await speakText(alert.audioText || alert.body, lang);
}

// ─── SCHEMES TAB RENDERING & VOICE ───

async function renderFarmerSchemes() {
  const dis = state.currentDistress;
  const container = document.getElementById('farmer-schemes-container');
  if (!container) return;

  const lang = state.selectedLanguage || 'hi';
  const t = i18n[lang] || i18n['en'];
  const interventions = (dis && dis.recommended_interventions && dis.recommended_interventions.length > 0)
    ? dis.recommended_interventions
    : [
        {
          scheme_id: 'S1',
          scheme_name: 'PMFBY (Pradhan Mantri Fasal Bima Yojana - Crop Insurance)',
          urgency: 'HIGH',
          trigger: 'Rainfall deficit > 25% during critical vegetative stage',
          action_item: 'Issue PMFBY localized crop loss claim form & initiate block-level survey within 72 hrs'
        },
        {
          scheme_id: 'S2',
          scheme_name: 'Kisan Credit Card (KCC) Restructuring / Interest Subvention Scheme',
          urgency: 'MEDIUM',
          trigger: 'High informal debt + loan repayment due within 30 days',
          action_item: 'Submit KCC rescheduling request; counsel farmer on Aadhaar-linked bank linkage to avoid penalty'
        }
      ];

  state.currentSchemes = interventions;

  const triggerLabel = t.triggerCauseLabel || 'Trigger Cause:';
  const actionLabel = t.farmerActionLabel || 'Action for Farmer:';
  const tapListen = t.tapToListen || 'Tap to listen 🔊';

  const translatedInterventions = await Promise.all(interventions.map(async (item, idx) => {
    const schemeName = await getTranslation(item.scheme_name, lang);
    const urgency = await getTranslation(item.urgency, lang);
    const trigger = await getTranslation(item.trigger, lang);
    const actionItem = await getTranslation(item.action_item, lang);

    return `
      <div class="bg-slate-50 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 space-y-3 transition shadow-sm hover:shadow-md flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">${item.scheme_id}</span>
              <h4 class="text-base font-extrabold text-slate-900 mt-1">${schemeName}</h4>
            </div>
            <span class="text-xs font-black uppercase px-2 py-1 rounded ${item.urgency === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} whitespace-nowrap">${urgency}</span>
          </div>

          <div class="bg-white p-3 rounded-xl border border-slate-100">
            <div class="text-[11px] font-bold text-slate-500 uppercase">${triggerLabel}</div>
            <div class="text-xs font-semibold text-slate-800 mt-0.5">${trigger}</div>
          </div>

          <div class="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
            <div class="text-[11px] font-bold text-emerald-800 uppercase">${actionLabel}</div>
            <div class="text-xs font-semibold text-emerald-950 mt-0.5">${actionItem}</div>
          </div>
        </div>

        <button onclick="playSchemeCardAudio(${idx})" class="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/60 hover:bg-emerald-100 px-3 py-1.5 rounded-lg self-start transition cursor-pointer">
          ${tapListen}
        </button>
      </div>
    `;
  }));

  container.innerHTML = translatedInterventions.join('');
}

async function playAllSchemesAudio() {
  const schemes = state.currentSchemes || [];
  if (schemes.length === 0) return;
  const lang = state.selectedLanguage || 'hi';

  const scriptParts = await Promise.all(schemes.map(async s => {
    const sName = await getTranslation(s.scheme_name, lang);
    const aItem = await getTranslation(s.action_item, lang);
    return `${sName}। ${aItem}`;
  }));

  await speakText(scriptParts.join('। '), lang);
}

async function playSchemeCardAudio(index) {
  const scheme = state.currentSchemes?.[index];
  if (!scheme) return;
  const lang = state.selectedLanguage || 'hi';

  const sName = await getTranslation(scheme.scheme_name, lang);
  const aItem = await getTranslation(scheme.action_item, lang);
  await speakText(`${sName}। ${aItem}`, lang);
}

// ─── SPOKEN ADVISORY & WEATHER METRIC AUDIO ───

async function playCurrentAdvisoryAudio() {
  const adv = state.currentAdvisory;
  if (!adv) return;

  const lang = state.selectedLanguage || 'hi';
  
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
  await speakText(fullSpokenScript, lang);
}

async function playWeatherMetricAudio(metricKey) {
  const adv = state.currentAdvisory;
  const f = state.currentFarmer;
  if (!adv || !adv.weather_data) return;

  const wd = adv.weather_data;
  const lang = state.selectedLanguage || 'hi';
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
    await speakText(script, lang);
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

  const lang = state.selectedLanguage || 'hi';
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
      : `<span class="inline-flex items-center space-x-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-xs"><span>📱</span><span>${channelText}</span></span>`;

    const cropKey = (f.crop || '').toLowerCase();
    const localizedCrop = (CROP_TRANSLATIONS[cropKey] && CROP_TRANSLATIONS[cropKey][lang]) || f.crop;
    const stageKey = (f.crop_stage || '').toLowerCase();
    const localizedStage = (STAGE_TRANSLATIONS[stageKey] && STAGE_TRANSLATIONS[stageKey][lang]) || f.crop_stage;

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-6 py-4">
          <div class="font-black text-slate-900">${f.farmer_name}</div>
          <div class="text-xs text-slate-500">📍 ${f.village}, ${f.district_name}</div>
        </td>
        <td class="px-4 py-4 font-bold text-slate-800">${f.district_name}</td>
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
        <td class="px-6 py-4 text-right">
          <button onclick="openOfficerModal('${f.farmer_id}')" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition">
            ${t.viewDetails || 'View Details 🔍'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
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
  const lang = state.selectedLanguage || 'hi';
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
  await speakText(script, lang);
}

// --- OFFICER DETAIL MODAL ---

function openOfficerModal(farmerId) {
  const farmer = state.officerFarmers.find(f => f.farmer_id === farmerId);
  if (!farmer) return;

  state.selectedOfficerFarmer = farmer;
  const lang = state.selectedLanguage || 'hi';
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
    <div class="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
      <div class="flex items-center justify-between">
        <span class="font-black text-sm text-emerald-950">${i.scheme_name}</span>
        <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">${i.urgency}</span>
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

  const lang = state.selectedLanguage || 'hi';
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
  await speakText(script, lang);
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
