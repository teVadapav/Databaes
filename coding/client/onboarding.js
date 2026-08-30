/**
 * Smart Krishi (PS-02) — Pre-Dashboard Onboarding Wizard & Auth Engine
 * Complete 4-Step Wizard with Regional Languages (en, hi, mr, or, as, kn),
 * Farm Profile Parameters, Crop Selection, and ICAR-CRIDA Growth Stages.
 */

// ─── 1. SUPPORTED LOCALES ───
const SUPPORTED_ONBOARDING_LOCALES = {
  en: { code: 'en', bcp47: 'en-IN', name: 'English', native: 'English', voice: 'en-IN-NeerjaExpressiveNeural', script: 'latin' },
  hi: { code: 'hi', bcp47: 'hi-IN', name: 'Hindi', native: 'हिंदी', voice: 'hi-IN-SwaraNeural', script: 'devanagari' },
  mr: { code: 'mr', bcp47: 'mr-IN', name: 'Marathi', native: 'मराठी', voice: 'mr-IN-AarohiNeural', script: 'devanagari' },
  or: { code: 'or', bcp47: 'or-IN', name: 'Odia', native: 'ଓଡ଼ିଆ', voice: 'hi-IN-SwaraNeural', script: 'odia' },
  as: { code: 'as', bcp47: 'as-IN', name: 'Assamese', native: 'অসমীয়া', voice: 'bn-IN-TanishaaNeural', script: 'assamese' },
  kn: { code: 'kn', bcp47: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', voice: 'kn-IN-SapnaNeural', script: 'kannada' }
};

// ─── 2. CROPS & GROWTH STAGES ───
const CROPS_LIST = [
  { id: 'onion', emoji: '🧅', name: { en: 'Onion', hi: 'प्याज', mr: 'कांदा', or: 'ପିଆଜ', as: 'পিয়াঁজ', kn: 'ಈರುಳ್ಳಿ' } },
  { id: 'cotton', emoji: '🌱', name: { en: 'Cotton', hi: 'कपास', mr: 'कापूस', or: 'କପା', as: 'কপাহ', kn: 'ಹತ್ತಿ' } },
  { id: 'soybean', emoji: '🫘', name: { en: 'Soybean', hi: 'सोयाबीन', mr: 'सोयाबीन', or: 'ସୋୟାବିନ୍', as: 'ছয়াবিন', kn: 'ಸೋಯಾಬೀನ್' } },
  { id: 'tomato', emoji: '🍅', name: { en: 'Tomato', hi: 'टमाटर', mr: 'टोमॅटो', or: 'ଟମାଟୋ', as: 'টমেটো', kn: 'ಟೊಮೆಟೊ' } },
  { id: 'paddy', emoji: '🌾', name: { en: 'Rice / Paddy', hi: 'धान (चावल)', mr: 'भात (धान)', or: 'ଧାନ', as: 'ধান', kn: 'ಭತ್ತ' } },
  { id: 'maize', emoji: '🌽', name: { en: 'Maize', hi: 'मक्का', mr: 'मका', or: 'ମକା', as: 'মাকৈ', kn: 'ಮೆಕ್ಕೆಜೋಳ' } },
  { id: 'bajra', emoji: '🌾', name: { en: 'Pearl Millet (Bajra)', hi: 'बाजरा', mr: 'बाजरी', or: 'ବାଜରା', as: 'বাজৰা', kn: 'ಸಜ್ಜೆ' } },
  { id: 'pigeonpea', emoji: '🥣', name: { en: 'Pigeonpea (Tur/Arhar)', hi: 'अरहर (तूर)', mr: 'तूर', or: 'ହରଡ଼', as: 'ৰহৰ দাইল', kn: 'ತೊಗರಿ' } },
  { id: 'wheat', emoji: '🌾', name: { en: 'Wheat', hi: 'गेहूं', mr: 'गहू', or: 'ଗହମ', as: 'ঘেঁহু', kn: 'ಗೋಧಿ' } },
  { id: 'sugarcane', emoji: '🎋', name: { en: 'Sugarcane', hi: 'गन्ना', mr: 'ऊस', or: 'ଆଖୁ', as: 'কুঁহিয়াৰ', kn: 'ಕಬ್ಬು' } },
  { id: 'groundnut', emoji: '🥜', name: { en: 'Groundnut', hi: 'मूंगफली', mr: 'भुईमूग', or: 'ଚିନାବାଦାମ', as: 'বাদাম', kn: 'ಕಡಲೆಕಾಯಿ' } },
  { id: 'chilli', emoji: '🌶️', name: { en: 'Green Chilli', hi: 'हरी मिर्च', mr: 'हिरवी मिरची', or: 'ଲଙ୍କା', as: 'কেঁচা জলকীয়া', kn: 'ಹಸಿಮೆಣಸಿನಕಾಯಿ' } }
];

const CROP_STAGES = [
  { id: 'sowing', duration: '0–20 Days', emoji: '🌱', name: { en: 'Sowing & Germination', hi: 'बुवाई एवं अंकुरण', mr: 'पेरणी आणि उगवण', or: 'ବୁଣିବା ଓ ଗଜା ହେବା', as: 'বীজ সিঁচা আৰু গজালি মেলা', kn: 'ಬಿತ್ತನೆ ಮತ್ತು ಮೊಳಕೆಯೊಡೆಯುವಿಕೆ' } },
  { id: 'vegetative', duration: '21–50 Days', emoji: '🌿', name: { en: 'Vegetative Growth', hi: 'वानस्पतिक वृद्धि', mr: 'शाकीय वाढ अवस्था', or: 'ବୃଦ୍ଧି ପର୍ଯ୍ୟାୟ', as: 'অঙ্গজ বৃদ্ধি পৰ্যায়', kn: 'ಸಸ್ಯಕ ಬೆಳವಣಿಗೆ ಹಂತ' } },
  { id: 'flowering', duration: '51–75 Days', emoji: '🌸', name: { en: 'Flowering & Podding', hi: 'फूल व फली लगना', mr: 'फुलधारणा आणि फळधारणा', or: 'ଫୁଲ ଓ ଛୁଇଁ ଧରିବା', as: 'ফুল আৰু শুঁটি ধৰা', kn: 'ಹೂವು ಮತ್ತು ಕಾಯಿ ಕಟ್ಟುವ ಹಂತ' } },
  { id: 'maturity', duration: '76–100 Days', emoji: '🌾', name: { en: 'Grain Filling & Maturity', hi: 'दाना भराव एवं परिपक्वता', mr: 'दाणे भरणे आणि पक्वता', or: 'ଦାନା ପରିପକ୍ଵତା', as: 'শস্য পূৰঠ হোৱা পৰ্যায়', kn: 'ಕಾಳು ತುಂಬುವ ಮತ್ತು ಪ್ರಬುದ್ಧತೆ' } },
  { id: 'harvest', duration: '100+ Days', emoji: '🚜', name: { en: 'Harvest Ready', hi: 'कटाई हेतु तैयार', mr: 'काढणीस तयार', or: 'ଅମଳ ଉପଯୋଗୀ', as: 'চপোৱাৰ বাবে সাজু', kn: 'ಕೊಯ್ಲಿಗೆ ಸಿದ್ಧ' } }
];

// ─── 3. STATE & DISTRICT MAPPINGS ───
const STATE_DISTRICT_MAP = {
  Maharashtra: [
    { id: 'D1', name: 'Nashik' },
    { id: 'D2', name: 'Akola' },
    { id: 'D3', name: 'Yavatmal' }
  ],
  Odisha: [
    { id: 'D_OD1', name: 'Kalahandi' },
    { id: 'D_OD2', name: 'Balangir' },
    { id: 'D_OD3', name: 'Bargarh' }
  ],
  Assam: [
    { id: 'D_AS1', name: 'Nagaon' },
    { id: 'D_AS2', name: 'Golaghat' },
    { id: 'D_AS3', name: 'Barpeta' }
  ],
  Karnataka: [
    { id: 'D_KN1', name: 'Raichur' },
    { id: 'D_KN2', name: 'Belagavi' },
    { id: 'D_KN3', name: 'Kalaburagi' }
  ],
  UttarPradesh: [
    { id: 'D_UP1', name: 'Varanasi' },
    { id: 'D_UP2', name: 'Prayagraj' },
    { id: 'D_UP3', name: 'Gorakhpur' }
  ]
};

// ─── 4. AUTH SERVICE ───
const AuthService = {
  getToken: () => localStorage.getItem('sk_auth_token'),
  setToken: (t) => localStorage.setItem('sk_auth_token', t),
  removeToken: () => localStorage.removeItem('sk_auth_token'),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('sk_auth_user') || 'null');
    } catch {
      return null;
    }
  },
  setUser: (u) => localStorage.setItem('sk_auth_user', JSON.stringify(u)),
  removeUser: () => localStorage.removeItem('sk_auth_user'),
  isAuthenticated: () => !!localStorage.getItem('sk_auth_token'),
  logout: () => {
    localStorage.removeItem('sk_auth_token');
    localStorage.removeItem('sk_auth_user');
    localStorage.removeItem('sk_onboarding_completed');
    sessionStorage.removeItem('sk_session_active');
    if (typeof Onboarding !== 'undefined') {
      Onboarding.openRegisterFlow();
    }
  }
};
window.AuthService = AuthService;

// ─── 5. NEURAL TTS Fallback Helper ───
const AudioTTSController = {
  activeAudio: null,
  async playLocaleSample(langKey) {
    this.stop();
    const loc = SUPPORTED_ONBOARDING_LOCALES[langKey];
    if (!loc) return;

    const sampleTexts = {
      en: 'Welcome to Smart Krishi. Personalizing your crop advisory and distress early warning system.',
      hi: 'स्मार्ट कृषि में आपका स्वागत है। आपकी फसल सलाह और मौसम संकट चेतावनी तैयार की जा रही है।',
      mr: 'स्मार्ट कृषी मध्ये आपले स्वागत आहे. आपला पीक सल्ला आणि हवामान संकट इशारा प्रणाली सज्ज होत आहे.',
      or: 'ସ୍ମାର୍ଟ କୃଷିରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ଆପଣଙ୍କ ଫସଲ ପରାମର୍ଶ ଏବଂ ପାଣିପାଗ ସତର୍କତା ପ୍ରସ୍ତୁତ କରାଯାଉଛି।',
      as: 'স্মাৰ্ট কৃষিলৈ আপোনাক স্বাগতম। আপোনাৰ শস্য পৰামৰ্শ আৰু বতৰৰ সতৰ্কবাৰ্তা প্ৰস্তুত কৰা হৈছে।',
      kn: 'ಸ್ಮಾರ್ಟ್ ಕೃಷಿಗೆ ಸುಸ್ವಾಗತ. ನಿಮ್ಮ ಬೆಳೆ ಸಲಹೆ ಮತ್ತು ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ ವ್ಯವಸ್ಥೆಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ.'
    };

    const text = sampleTexts[langKey] || sampleTexts['en'];

    try {
      const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(langKey)}`;
      const audio = new Audio(url);
      this.activeAudio = audio;
      await audio.play();
    } catch (e) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = loc.bcp47;
        window.speechSynthesis.speak(u);
      }
    }
  },
  stop() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
};

// ─── 6. ONBOARDING STATE ───
const OnboardingState = {
  currentStep: 1,
  selectedLanguage: localStorage.getItem('sk_locale') || 'en',
  isEditMode: false,
  isLoginMode: false,

  formData: {
    farmerId: null,
    farmerName: '',
    phone: '',
    state: 'Maharashtra',
    district: 'D1',
    landArea: 1.2,
    landUnit: 'hectares',
    soilType: 'black',
    deviceType: 'android_smartphone',
    irrigationType: 'rainfed',
    borewellFailed: false,
    hasPmfby: true,
    hasKcc: true,
    informalDebt: false,
    loanDueDate: '2026-11-15',
    loanAmount: 50000,
    selectedCrop: 'onion',
    cropStage: 'vegetative'
  }
};

// ─── 7. ONBOARDING CONTROLLER ───
const Onboarding = {
  async init() {
    console.log('🌱 Initializing Onboarding & Auth System...');

    const initialLang = localStorage.getItem('sk_locale') || OnboardingState.selectedLanguage || 'en';
    OnboardingState.selectedLanguage = initialLang;
    if (typeof window.switchGlobalLanguage === 'function') {
      window.switchGlobalLanguage(initialLang);
    }

    if (!window.state?.farmers || window.state.farmers.length === 0) {
      try {
        const res = await fetch('/api/farmers');
        if (res.ok) {
          if (!window.state) window.state = {};
          window.state.farmers = await res.json();
        }
      } catch (e) {}
    }

    console.log('🚀 Showing pre-dashboard onboarding flow...');
    OnboardingState.isLoginMode = false;
    OnboardingState.isEditMode = false;
    this.renderOnboardingUI(false);
    this.showModal();
    this.goToStep(1);
  },

  openSetupFlow() {
    console.log('⚙️ Opening Setup Flow with pre-populated farmer data...');
    const current = (window.state && window.state.currentFarmer) || (window.AuthService && AuthService.getUser());
    const saved = JSON.parse(localStorage.getItem('sk_onboarding_profile') || 'null');

    const primaryCrop = (saved && saved.primary_crops && saved.primary_crops[0]) || (current && current.crop ? current.crop.toLowerCase() : 'onion');
    const stage = (saved && saved.crop_stage) || (current && current.crop_stage ? current.crop_stage.toLowerCase() : 'vegetative');

    const distId = (current && current.district_id) || (saved && saved.district) || 'D1';
    let stateName = (current && current.state) || (saved && saved.state) || 'Maharashtra';

    OnboardingState.formData = {
      farmerId: (current && current.id) || null,
      farmerName: (current && current.name) || (saved && saved.farmer_name) || 'Ramesh Patil',
      phone: (current && current.phone ? current.phone.replace('+91-', '').replace('+91', '').trim() : '') || (saved && saved.phone_number) || '9823110293',
      state: stateName,
      district: distId,
      landArea: (current && (current.landholding_hectares || current.landholding_ha)) || (saved && saved.land_details && saved.land_details.total_area) || 1.2,
      landUnit: (saved && saved.land_details && saved.land_details.unit) || 'hectares',
      soilType: (current && current.soil_type) || (saved && saved.land_details && saved.land_details.soil_type) || 'black',
      deviceType: (current && current.device_type) || (saved && saved.device_type) || 'android_smartphone',
      irrigationType: (current && current.irrigation_type) || (saved && saved.irrigation_type) || 'rainfed',
      borewellFailed: !!(current && current.borewell_failed) || !!(saved && saved.borewell_failed),
      hasPmfby: current ? !!current.has_pmfby_insurance : (saved ? !!saved.has_pmfby : true),
      hasKcc: current ? !!current.has_kcc : (saved ? !!saved.has_kcc : true),
      informalDebt: current ? !!current.informal_debt : (saved ? !!saved.informal_debt : false),
      loanDueDate: (current && current.loan_due_date) || (saved && saved.loan_due_date) || '2026-11-15',
      loanAmount: (current && current.loan_amount_inr) || (saved && saved.loan_amount) || 50000,
      selectedCrop: primaryCrop,
      cropStage: stage
    };

    OnboardingState.isEditMode = true;
    OnboardingState.isLoginMode = false;
    this.renderOnboardingUI(true);
    this.showModal();
    this.goToStep(1);
  },

  openRegisterFlow() {
    console.log('🌱 Opening New Farmer Registration Wizard...');
    OnboardingState.formData = {
      farmerId: null,
      farmerName: '',
      phone: '',
      state: 'Maharashtra',
      district: 'D1',
      landArea: 1.2,
      landUnit: 'hectares',
      soilType: 'black',
      deviceType: 'android_smartphone',
      irrigationType: 'rainfed',
      borewellFailed: false,
      hasPmfby: true,
      hasKcc: true,
      informalDebt: false,
      loanDueDate: '2026-11-15',
      loanAmount: 50000,
      selectedCrop: 'onion',
      cropStage: 'vegetative'
    };
    OnboardingState.isEditMode = false;
    OnboardingState.isLoginMode = false;
    this.renderOnboardingUI(false);
    this.showModal();
    this.goToStep(1);
  },

  async openLoginModal() {
    console.log('🔑 Opening Switch Farmer / Login modal...');
    OnboardingState.isLoginMode = true;
    OnboardingState.isEditMode = false;

    if (!window.state?.farmers || window.state.farmers.length === 0) {
      try {
        const res = await fetch('/api/farmers');
        if (res.ok) {
          if (!window.state) window.state = {};
          window.state.farmers = await res.json();
        }
      } catch (e) {}
    }

    this.renderOnboardingUI(false);
    this.showModal();
    this.goToStep(2);
  },

  t(key, lang = OnboardingState.selectedLanguage) {
    const obDict = {
      en: {
        step1Title: 'Select Your Preferred Language',
        step1Sub: 'Choose your language for voice advisories & text',
        step2Title: 'Farmer Profile & Farm Details',
        step2Sub: 'Personalize weather, crop and distress indicators',
        step3Title: 'Select Cultivated Crop',
        step3Sub: 'Choose your primary crop to receive tailored crop management advisories',
        step4Title: 'Crop Growth Stage & Summary',
        step4Sub: 'Select the current development stage for accurate ICAR-CRIDA advisories',
        loginTitle: 'Farmer Sign-In & Switch',
        loginSub: 'Select any profile or enter registered mobile number / ID',
        fullName: 'Farmer Full Name',
        mobileNumber: 'Mobile Phone Number',
        mobilePlaceholder: '10-digit mobile number',
        stateLabel: 'State',
        districtLabel: 'District / Taluka',
        landAreaLabel: 'Total Land Area',
        unitAcres: 'Acres',
        unitHa: 'Hectares',
        soilTypeLabel: 'Dominant Soil Type',
        soilBlack: 'Black Cotton Soil',
        soilRed: 'Red Loamy Soil',
        soilSandy: 'Sandy Loam',
        soilClay: 'Clay Loam',
        irrigationLabel: 'Primary Irrigation Type',
        irrRainfed: 'Rainfed (100% Monsoon Dependent)',
        irrWell: 'Protective Well / Borewell',
        irrCanal: 'Canal Assured Irrigation',
        borewellFailedLabel: 'Borewell / Open Well Yield Failed this Season',
        safetyNetsLabel: 'Financial Safety Nets & Credit',
        pmfbyLabel: 'PMFBY Crop Insurance Enrolled',
        kccLabel: 'Kisan Credit Card (KCC) Active',
        informalDebtLabel: 'High-Interest Informal Private Debt (>24% p.a.)',
        loanDueDateLabel: 'Next Bank / KCC Loan Due Date',
        loanAmountLabel: 'Outstanding Loan Amount (₹)',
        deviceTypeLabel: 'Primary Access Device',
        deviceSmart: 'Android Smartphone (Voice + Visual App)',
        deviceFeature: 'Feature Phone (Auto IVR Voice Calls & SMS)',
        tabProfile: '📝 Farmer & Farm Profile',
        tabLogin: '🔑 Quick Switch / Login',
        btnNext: 'Next Step →',
        btnNextCrop: 'Next Step: Select Crop →',
        btnNextStage: 'Next Step: Crop Stage →',
        btnBack: '← Back',
        btnFinish: 'Go to Farmer Dashboard 🌾',
        btnUpdateProfile: 'Update Profile ✓',
        loginQuickTitle: '⚡ 1-Click Switch Farmer:',
        loginSearchTitle: 'Or Enter Mobile / ID / Name:',
        loginBtn: 'Sign In / Switch →'
      },
      hi: {
        step1Title: 'अपनी पसंदीदा भाषा चुनें',
        step1Sub: 'ध्वनि सलाह और पाठ के लिए अपनी भाषा चुनें',
        step2Title: 'किसान और खेत का विवरण',
        step2Sub: 'मौसम, फसल और संकट संकेतकों को व्यक्तिगत बनाएं',
        step3Title: 'अपनी मुख्य फसल चुनें',
        step3Sub: 'सटीक सलाह के लिए अपनी फसल चुनें',
        step4Title: 'फसल विकास अवस्था एवं सारांश',
        step4Sub: 'सही ICAR-CRIDA सलाह हेतु वर्तमान वृद्धि अवस्था चुनें',
        loginTitle: 'किसान लॉगिन एवं खाता बदलें',
        loginSub: 'किसी भी प्रोफाइल को चुनें या मोबाइल नंबर / ID दर्ज करें',
        fullName: 'किसान का पूरा नाम',
        mobileNumber: 'मोबाइल फोन नंबर',
        mobilePlaceholder: '10 अंकों का मोबाइल नंबर',
        stateLabel: 'राज्य',
        districtLabel: 'जिला / तालुका',
        landAreaLabel: 'कुल कृषि भूमि',
        unitAcres: 'एकड़',
        unitHa: 'हेक्टेयर',
        soilTypeLabel: 'खेत की मुख्य मिट्टी',
        soilBlack: 'काली कपास मिट्टी',
        soilRed: 'लाल दोमट मिट्टी',
        soilSandy: 'बलुई दोमट मिट्टी',
        soilClay: 'चिकनी मिट्टी',
        irrigationLabel: 'सिंचाई का मुख्य स्रोत',
        irrRainfed: 'बारानी (100% वर्षा पर निर्भर)',
        irrWell: 'कुआं / नलकूप / बोरवेल',
        irrCanal: 'नहर संचित सिंचाई',
        borewellFailedLabel: 'इस मौसम में बोरवेल / कुआं सूख गया',
        safetyNetsLabel: 'वित्तीय सुरक्षा कवच और ऋण',
        pmfbyLabel: 'PMFBY फसल बीमा नामांकित',
        kccLabel: 'किसान क्रेडिट कार्ड (KCC) सक्रिय',
        informalDebtLabel: 'निजी साहूकार का उच्च ब्याज ऋण (>24%)',
        loanDueDateLabel: 'अगली बैंक / KCC ऋण देय तिथि',
        loanAmountLabel: 'बकाया ऋण राशि (₹)',
        deviceTypeLabel: 'उपयोग किया जाने वाला फोन',
        deviceSmart: 'स्मार्टफोन (वॉयस + विजुअल ऐप)',
        deviceFeature: 'साधारण फीचर फोन (IVR कॉल + SMS)',
        tabProfile: '📝 किसान प्रोफाइल',
        tabLogin: '🔑 त्वरित स्विच / लॉगिन',
        btnNext: 'आगे बढ़ें →',
        btnNextCrop: 'फसल चुनें →',
        btnNextStage: 'फसल अवस्था चुनें →',
        btnBack: '← पीछे',
        btnFinish: 'किसान डैशबोर्ड पर जाएं 🌾',
        btnUpdateProfile: 'प्रोफाइल अपडेट करें ✓',
        loginQuickTitle: '⚡ 1-क्लिक किसान बदलें:',
        loginSearchTitle: 'या मोबाइल / ID / नाम दर्ज करें:',
        loginBtn: 'लॉगिन करें →'
      },
      mr: {
        step1Title: 'आपली पसंतीची भाषा निवडा',
        step1Sub: 'आवाज आणि मजकूरासाठी आपली भाषा निवडा',
        step2Title: 'शेतकरी आणि शेती तपशील',
        step2Sub: 'हवामान, पीक आणि संकट निर्देशांक सानुकूल करा',
        step3Title: 'आपले मुख्य पीक निवडा',
        step3Sub: 'योग्य सल्ल्यासाठी मुख्य पीक निवडा',
        step4Title: 'पीक वाढीची अवस्था आणि सारांश',
        step4Sub: 'अचूक ICAR-CRIDA सल्ल्यासाठी पिकाची चालू अवस्था निवडा',
        loginTitle: 'शेतकरी लॉगिन आणि खाते बदला',
        loginSub: 'कोणतेही प्रोफाइल निवडा किंवा मोबाईल नंबर / ID टाका',
        fullName: 'शेतकऱ्याचे संपूर्ण नाव',
        mobileNumber: 'मोबाईल फोन नंबर',
        mobilePlaceholder: '10 अंकी मोबाईल नंबर',
        stateLabel: 'राज्य',
        districtLabel: 'जिल्हा / तालुका',
        landAreaLabel: 'एकूण शेतजमीन',
        unitAcres: 'एकर',
        unitHa: 'हेक्टर',
        soilTypeLabel: 'जमिनीचा प्रकार',
        soilBlack: 'काळी कसदार जमीन',
        soilRed: 'तांबडी पोयट्याची जमीन',
        soilSandy: 'रेतीयुक्त जमीन',
        soilClay: 'चिकणमाती जमीन',
        irrigationLabel: 'सिंचनाचा मुख्य प्रकार',
        irrRainfed: 'कोरडवाहू (100% पावसावर अवलंबून)',
        irrWell: 'संरक्षित विहीर / बोअरवेल',
        irrCanal: 'कालवा बागायत पाणी',
        borewellFailedLabel: 'हंगाम दरम्यान विहीर / बोअरवेल आटली',
        safetyNetsLabel: 'आर्थिक सुरक्षा कवच आणि कर्ज',
        pmfbyLabel: 'PMFBY पीक विमा काढला आहे',
        kccLabel: 'किसान क्रेडिट कार्ड (KCC) सक्रिय',
        informalDebtLabel: 'खाजगी सावकारी कर्ज (>24% व्याज)',
        loanDueDateLabel: 'पुढील बँक / KCC कर्ज परतफेड तारीख',
        loanAmountLabel: 'एकूण थकीत कर्ज रक्कम (₹)',
        deviceTypeLabel: 'वापरला जाणारा फोन',
        deviceSmart: 'स्मार्टफोन (व्हॉईस + अ‍ॅप)',
        deviceFeature: 'साधा फोन (IVR कॉल + SMS)',
        tabProfile: '📝 शेतकरी तपशील',
        tabLogin: '🔑 शेतकरी बदला / लॉगिन',
        btnNext: 'पुढे जा →',
        btnNextCrop: 'पीक निवडा →',
        btnNextStage: 'वाढ अवस्था निवडा →',
        btnBack: '← मागे',
        btnFinish: 'शेतकरी डॅशबोर्ड उघडा 🌾',
        btnUpdateProfile: 'माहिती अद्यतनित करा ✓',
        loginQuickTitle: '⚡ 1-क्लिक शेतकरी बदला:',
        loginSearchTitle: 'किंवा मोबाईल / ID / नाव टाका:',
        loginBtn: 'लॉगिन करा →'
      },
      or: {
        step1Title: 'ଆପଣଙ୍କ ପସନ୍ଦର ଭାଷା ବାଛନ୍ତୁ',
        step1Sub: 'ସ୍ୱର ଏବଂ ଲେଖା ପାଇଁ ଭାଷା ବାଛନ୍ତୁ',
        step2Title: 'ଚାଷୀ ଏବଂ ଜମିର ବିବରଣୀ',
        step2Sub: 'ପାଣିପାଗ ଏବଂ ଫସଲ ସୂଚକାଙ୍କ ବ୍ୟକ୍ତିଗତ କରନ୍ତୁ',
        step3Title: 'ଆପଣଙ୍କ ମୁଖ୍ୟ ଫସଲ ଚୟନ କରନ୍ତୁ',
        step3Sub: 'ସଠିକ୍ ପରାମର୍ଶ ପାଇଁ ଫସଲ ବାଛନ୍ତୁ',
        step4Title: 'ଫସଲ ବୃଦ୍ଧି ପର୍ଯ୍ୟାୟ ଏବଂ ସାରାଂଶ',
        step4Sub: 'ସଠିକ୍ ICAR-CRIDA ପରାମର୍ଶ ପାଇଁ ବର୍ତ୍ତମାନର ପର୍ଯ୍ୟାୟ ବାଛନ୍ତୁ',
        loginTitle: 'ଚାଷୀ ଲଗଇନ୍ ଓ ପରିବର୍ତ୍ତନ',
        loginSub: 'ପ୍ରୋଫାଇଲ୍ ବାଛନ୍ତୁ କିମ୍ବା ମୋବାଇଲ୍ ନମ୍ବର / ID ଦିଅନ୍ତୁ',
        fullName: 'ଚାଷୀଙ୍କ ପୂରା ନାମ',
        mobileNumber: 'ମୋବାଇଲ୍ ଫୋନ୍ ନମ୍ବର',
        mobilePlaceholder: '୧୦ ଅଙ୍କ ବିଶିଷ୍ଟ ମୋବାଇଲ୍ ନମ୍ବର',
        stateLabel: 'ରାଜ୍ୟ',
        districtLabel: 'ଜିଲ୍ଲା / ବ୍ଲକ୍',
        landAreaLabel: 'ମୋଟ ଚାଷ ଜମି',
        unitAcres: 'ଏକର',
        unitHa: 'ହେକ୍ଟର',
        soilTypeLabel: 'ମାଟିର ପ୍ରକାର',
        soilBlack: 'କଳା କପା ମାଟି',
        soilRed: 'ଲାଲ୍ ମଟାଳ ମାଟି',
        soilSandy: 'ବାଲିଆ ଦୋରସା ମାଟି',
        soilClay: 'ଚିକିଟା ମାଟି',
        irrigationLabel: 'ମୁଖ୍ୟ ଜଳସେଚନ ଉତ୍ସ',
        irrRainfed: 'ବର୍ଷାଧାରିତ (୧୦୦% ବର୍ଷା ଉପରେ ନିର୍ଭର)',
        irrWell: 'କୁଅ / ନଳକୂପ / ବୋରୱେଲ୍',
        irrCanal: 'କେନାଲ୍ ଜଳସେଚନ',
        borewellFailedLabel: 'ଏହି ଋତୁରେ ବୋରୱେଲ୍ ପାଣି ଶୁଖିଗଲା',
        safetyNetsLabel: 'ଆର୍ଥିକ ସୁରକ୍ଷା ଓ ଋଣ',
        pmfbyLabel: 'PMFBY ଫସଲ ବୀମା ଭୁକ୍ତ',
        kccLabel: 'କିଷାନ କ୍ରେଡିଟ୍ କାର୍ଡ (KCC) ସକ୍ରିୟ',
        informalDebtLabel: 'ମହାଜନୀ ଋଣ (>୨୪% ସୁଧ)',
        loanDueDateLabel: 'ପରବର୍ତ୍ତୀ ବ୍ୟାଙ୍କ ଋଣ ଶେଷ ତାରିଖ',
        loanAmountLabel: 'ମୋଟ ବାକି ଋଣ ରାଶି (₹)',
        deviceTypeLabel: 'ବ୍ୟବହାର ହେଉଥିବା ଫୋନ୍',
        deviceSmart: 'ସ୍ମାର୍ଟଫୋନ୍ (ସ୍ୱର + ଆପ୍)',
        deviceFeature: 'ସାଧାରଣ ଫୋନ୍ (IVR କଲ୍ + SMS)',
        tabProfile: '📝 ଚାଷୀ ବିବରଣୀ',
        tabLogin: '🔑 ଚାଷୀ ପରିବର୍ତ୍ତନ / ଲଗଇନ୍',
        btnNext: 'ଆଗକୁ ବଢ଼ନ୍ତୁ →',
        btnNextCrop: 'ଫସଲ ବାଛନ୍ତୁ →',
        btnNextStage: 'ଫସଲ ପର୍ଯ୍ୟାୟ ବାଛନ୍ତୁ →',
        btnBack: '← ପଛକୁ',
        btnFinish: 'ଚାଷୀ ଡ୍ୟାସବୋର୍ଡ ଖୋଲନ୍ତୁ 🌾',
        btnUpdateProfile: 'ପ୍ରୋଫାଇଲ୍ ଅଦ୍ୟତନ କରନ୍ତୁ ✓',
        loginQuickTitle: '⚡ ୧-କ୍ଲିକ୍ ଚାଷୀ ବଦଳାନ୍ତୁ:',
        loginSearchTitle: 'କିମ୍ବା ମୋବାଇଲ୍ / ID ଦିଅନ୍ତୁ:',
        loginBtn: 'ଲଗଇନ୍ କରନ୍ତୁ →'
      },
      as: {
        step1Title: 'আপোনাৰ পছন্দৰ ভাষা বাছক',
        step1Sub: 'ধ্বনি পৰামৰ্শ আৰু পাঠৰ বাবে ভাষা বাছক',
        step2Title: 'কৃষক আৰু কৃষি ভূমিৰ বিৱৰণ',
        step2Sub: 'বতৰ আৰু শস্যৰ নিৰ্দেশনা ব্যক্তিগত কৰক',
        step3Title: 'প্ৰাথমিক শস্য বাছক',
        step3Sub: 'শস্য নিৰ্দেশনা পাবলৈ শস্য বাছক',
        step4Title: 'শস্যৰ বৃদ্ধি পৰ্যায় আৰু সাৰাংশ',
        step4Sub: 'সঠিক পৰামৰ্শৰ বাবে শস্যৰ বর্তমান পৰ্যায় বাছক',
        loginTitle: 'কৃষক ছাইন-ইন আৰু সলনি',
        loginSub: 'প্ৰফাইল বাছক বা পঞ্জীভুক্ত মোবাইল নম্বৰ দিয়ক',
        fullName: 'কৃষকৰ সম্পূৰ্ণ নাম',
        mobileNumber: 'মোবাইল ফোন নম্বৰ',
        mobilePlaceholder: '১০ টা অংকৰ মোবাইল নম্বৰ',
        stateLabel: 'ৰাজ্য',
        districtLabel: 'জিলা / মহকুমা',
        landAreaLabel: 'মুঠ কৃষি ভূমি',
        unitAcres: 'একর',
        unitHa: 'হেক্টৰ',
        soilTypeLabel: 'মাটিৰ প্ৰকাৰ',
        soilBlack: 'কলা কপাহী মাটি',
        soilRed: 'ৰঙা মাটি',
        soilSandy: 'বালিমহীয়া মাটি',
        soilClay: 'বোকা মাটি',
        irrigationLabel: 'প্ৰধান জলসিঞ্চন',
        irrRainfed: 'বৰষুণ-নিৰ্ভৰশীল (১০০% বৰষুণৰ ওপৰত)',
        irrWell: 'কুঁৱা / নলকূপ',
        irrCanal: 'খালৰ পানী যোগান',
        borewellFailedLabel: 'এই বতৰত কুঁৱাৰ পানী শুকাই গৈছে',
        safetyNetsLabel: 'আৰ্থিক সুৰক্ষা আৰু ঋণ',
        pmfbyLabel: 'PMFBY শস্য বীমা অন্তৰ্ভুক্ত',
        kccLabel: 'কিষাণ ক্ৰেডিট কাৰ্ড (KCC) সক্ৰিয়',
        informalDebtLabel: 'মহাজনৰ উচ্চ সুতৰ ঋণ (>২৪%)',
        loanDueDateLabel: 'বেংক ঋণ পৰিশোধৰ তাৰিখ',
        loanAmountLabel: 'মুঠ ঋণৰ পৰিমাণ (₹)',
        deviceTypeLabel: 'ব্যৱহৃত ফোনৰ প্ৰকাৰ',
        deviceSmart: 'স্মাৰ্টফোন (ভইচ + ভিজুৱেল)',
        deviceFeature: 'সাধাৰণ ফোন (IVR কল + SMS)',
        tabProfile: '📝 কৃষক প্ৰফাইল',
        tabLogin: '🔑 সলনি / প্ৰৱেশ',
        btnNext: 'আগবাঢ়ক →',
        btnNextCrop: 'শস্য বাছক →',
        btnNextStage: 'বৃদ্ধি পৰ্যায় বাছক →',
        btnBack: '← পিছলৈ',
        btnFinish: 'কৃষক ডেচবৰ্ড খোলক 🌾',
        btnUpdateProfile: 'আপডেট কৰক ✓',
        loginQuickTitle: '⚡ ১-ক্লিক কৃষক সলনি:',
        loginSearchTitle: 'বা মোবাইল / ID দিয়ক:',
        loginBtn: 'লগইন কৰক →'
      },
      kn: {
        step1Title: 'ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step1Sub: 'ಧ್ವನಿ ಸಲಹೆ ಮತ್ತು ಪಠ್ಯಕ್ಕಾಗಿ ಭಾಷೆಯನ್ನು ಆರಿಸಿ',
        step2Title: 'ರೈತ ಮತ್ತು ಜಮೀನಿನ ವಿವರಗಳು',
        step2Sub: 'ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ಸೂಚಕಗಳನ್ನು ವೈಯಕ್ತೀಕರಿಸಿ',
        step3Title: 'ನಿಮ್ಮ ಪ್ರಮುಖ ಬೆಳೆಯನ್ನು ಆರಿಸಿ',
        step3Sub: 'ನಿಖರವಾದ ಕೃಷಿ ಸಲಹೆಗಾಗಿ ಬೆಳೆ ಆಯ್ಕೆಮಾಡಿ',
        step4Title: 'ಬೆಳೆ ಬೆಳವಣಿಗೆಯ ಹಂತ ಮತ್ತು ಸಾರಾಂಶ',
        step4Sub: 'ನಿಖರವಾದ ICAR-CRIDA ಸಲಹೆಗಾಗಿ ಪ್ರಸ್ತುತ ಬೆಳವಣಿಗೆ ಹಂತವನ್ನು ಆರಿಸಿ',
        loginTitle: 'ರೈತ ಲಾಗಿನ್ ಮತ್ತು ಬದಲಾವಣೆ',
        loginSub: 'ಪ್ರೊಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ / ID ನಮೂದಿಸಿ',
        fullName: 'ರೈತರ ಪೂರ್ಣ ಹೆಸರು',
        mobileNumber: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
        mobilePlaceholder: '10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
        stateLabel: 'ರಾಜ್ಯ',
        districtLabel: 'ಜಿಲ್ಲೆ / ತಾಲೂಕು',
        landAreaLabel: 'ಒಟ್ಟು ಕೃಷಿ ಭೂಮಿ',
        unitAcres: 'ಎಕರೆ',
        unitHa: 'ಹೆಕ್ಟೇರ್',
        soilTypeLabel: 'ಮಣ್ಣಿನ ವಿಧ',
        soilBlack: 'ಕಪ್ಪು ಹತ್ತಿ ಮಣ್ಣು',
        soilRed: 'ಕೆಂಪು ಮಣ್ಣು',
        soilSandy: 'ಮರಳು ಮಿಶ್ರಿತ ಗೋಡು ಮಣ್ಣು',
        soilClay: 'ಜಿಡ್ಡಿನ ಮಣ್ಣು',
        irrigationLabel: 'ಪ್ರಮುಖ ನೀರಾವರಿ ವಿಧಾನ',
        irrRainfed: 'ಮಳೆಯಾಶ್ರಿತ (100% ಮಳೆ ಆಧಾರಿತ)',
        irrWell: 'ಭಾವಿ / ಬೋರ್‌ವೆಲ್ ನೀರಾವರಿ',
        irrCanal: 'ಕಾಲುವೆ ನೀರಾವರಿ',
        borewellFailedLabel: 'ಈ ಋತುವಿನಲ್ಲಿ ಬೋರ್‌ವೆಲ್ ಬತ್ತಿಹೋಗಿದೆ',
        safetyNetsLabel: 'ಆರ್ಥಿಕ ಭದ್ರತೆ ಮತ್ತು ಸಾಲ',
        pmfbyLabel: 'PMFBY ಬೆಳೆ ವಿಮೆ ಸಕ್ರಿಯವಾಗಿದೆ',
        kccLabel: 'ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC) ಚಾಲ್ತಿಯಲ್ಲಿದೆ',
        informalDebtLabel: 'ಹೆಚ್ಚಿನ ಬಡ್ಡಿಯ ಖಾಸಗಿ ಸಾಲ (>24%)',
        loanDueDateLabel: 'ಮುಂದಿನ ಬ್ಯಾಂಕ್ ಸಾಲ ಮರುಪಾವತಿ ದಿನಾಂಕ',
        loanAmountLabel: 'ಒಟ್ಟು ಬಾಕಿ ಸಾಲದ ಮೊತ್ತ (₹)',
        deviceTypeLabel: 'ಬಳಸುವ ಫೋನ್',
        deviceSmart: 'ಸ್ಮಾರ್ಟ್‌ಫೋನ್ (ಧ್ವನಿ + ಆ್ಯಪ್)',
        deviceFeature: 'ಸಾಮಾನ್ಯ ಫೋನ್ (IVR ಕರೆ + SMS)',
        tabProfile: '📝 ರೈತರ ವಿವರ',
        tabLogin: '🔑 ಬದಲಾವಣೆ / ಲಾಗಿನ್',
        btnNext: 'ಮುಂದೆ →',
        btnNextCrop: 'ಬೆಳೆ ಆಯ್ಕೆಮಾಡಿ →',
        btnNextStage: 'ಬೆಳವಣಿಗೆ ಹಂತ ಆರಿಸಿ →',
        btnBack: '← ಹಿಂದೆ',
        btnFinish: 'ರೈತರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ 🌾',
        btnUpdateProfile: 'ನವೀಕರಿಸಿ ✓',
        loginQuickTitle: '⚡ 1-ಕ್ಲಿಕ್ ರೈತ ಬದಲಾಯಿಸಿ:',
        loginSearchTitle: 'ಅಥವಾ ಮೊಬೈಲ್ / ID ನಮೂದಿಸಿ:',
        loginBtn: 'ಲಾಗಿನ್ ಮಾಡಿ →'
      }
    };
    return (obDict[lang] && obDict[lang][key]) || (obDict.en && obDict.en[key]) || key;
  },

  showModal() {
    let modal = document.getElementById('onboarding-modal-overlay');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'onboarding-modal-overlay';
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
  },

  hideModal() {
    const modal = document.getElementById('onboarding-modal-overlay');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
    }
    AudioTTSController.stop();
  },

  getSelectedCropName(lang = OnboardingState.selectedLanguage) {
    const cropObj = CROPS_LIST.find(c => c.id === OnboardingState.formData.selectedCrop);
    if (!cropObj) return 'Crop';
    return (cropObj.name && cropObj.name[lang]) || (cropObj.name && cropObj.name['en']) || cropObj.id;
  },

  getSelectedStageName(lang = OnboardingState.selectedLanguage) {
    const stageObj = CROP_STAGES.find(s => s.id === OnboardingState.formData.cropStage);
    if (!stageObj) return 'Growth Stage';
    return `${stageObj.emoji} ${(stageObj.name && stageObj.name[lang]) || stageObj.name['en']}`;
  },

  renderOnboardingUI(isEdit = false) {
    let overlay = document.getElementById('onboarding-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'onboarding-modal-overlay';
      document.body.appendChild(overlay);
    }

    const currentLang = OnboardingState.selectedLanguage;
    const form = OnboardingState.formData;
    const submitBtnLabel = isEdit ? this.t('btnUpdateProfile', currentLang) : this.t('btnFinish', currentLang);

    overlay.innerHTML = `
      <div class="onboarding-card-wrapper" role="dialog" aria-modal="true" aria-labelledby="ob-step-title">
        
        <!-- Header -->
        <div class="onboarding-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <span class="text-2xl select-none">🌱</span>
              <div>
                <h2 id="ob-step-title" class="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-tight">
                  Smart Krishi (PS-02)
                </h2>
                <p class="text-xs text-slate-500 font-medium">Personalized Crop Advisory & Distress Early Warning</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span id="ob-step-badge" class="px-2.5 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
                Step 1 of 4
              </span>
              ${isEdit ? `
                <button type="button" onclick="Onboarding.hideModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 py-0.5 rounded-lg hover:bg-slate-100 transition" title="Close">✕</button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Progress Indicator -->
        <div class="onboarding-progress-bar">
          <div id="ob-progress-fill" class="onboarding-progress-fill" style="width: 25%;"></div>
        </div>

        <!-- STEP 1: LANGUAGE SELECTION -->
        <div id="ob-step-1" class="onboarding-screen active">
          <div class="space-y-4">
            <div>
              <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">${this.t('step1Title')}</h3>
              <p class="text-xs sm:text-sm text-slate-500">${this.t('step1Sub')}</p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${Object.entries(SUPPORTED_ONBOARDING_LOCALES).map(([code, loc]) => {
                const isSelected = code === currentLang;
                return `
                  <button type="button" 
                          onclick="Onboarding.selectLanguage('${code}')"
                          class="language-card ${isSelected ? 'selected' : ''}">
                    <div class="flex items-start justify-between w-full">
                      <div class="text-left">
                        <div class="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">${loc.native}</div>
                        <div class="text-xs text-slate-500 font-semibold">${loc.name}</div>
                      </div>
                      <span class="text-base select-none">🔊</span>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="onboarding-nav-bar mt-6">
            <div></div>
            <button type="button" onclick="Onboarding.goToStep(2)" class="onboarding-btn-primary">
              <span>${this.t('btnNext')}</span>
            </button>
          </div>
        </div>

        <!-- STEP 2: FARMER DETAILS & FARM PROFILE -->
        <div id="ob-step-2" class="onboarding-screen">
          <div class="space-y-4">
            
            <!-- Mode Toggle: Profile vs 1-Click Login -->
            <div class="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <button type="button" 
                      onclick="Onboarding.setMode(false)" 
                      class="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition ${!OnboardingState.isLoginMode ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                ${this.t('tabProfile')}
              </button>
              <button type="button" 
                      onclick="Onboarding.setMode(true)" 
                      class="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition ${OnboardingState.isLoginMode ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                ${this.t('tabLogin')}
              </button>
            </div>

            ${!OnboardingState.isLoginMode ? `
              <!-- Farmer & Land Form Inputs -->
              <div class="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="ob-name" class="block text-xs font-bold text-slate-700 mb-1">${this.t('fullName')} *</label>
                    <input type="text" id="ob-name" value="${form.farmerName || ''}" placeholder="e.g. Ramesh Patil" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" required />
                  </div>
                  <div>
                    <label for="ob-phone" class="block text-xs font-bold text-slate-700 mb-1">${this.t('mobileNumber')} *</label>
                    <input type="tel" id="ob-phone" value="${form.phone || ''}" placeholder="${this.t('mobilePlaceholder')}" maxlength="10" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none font-mono" required />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="ob-state" class="block text-xs font-bold text-slate-700 mb-1">${this.t('stateLabel')}</label>
                    <select id="ob-state" onchange="Onboarding.onStateChange(this.value)" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold bg-white">
                      ${Object.keys(STATE_DISTRICT_MAP).map(st => `<option value="${st}" ${form.state === st ? 'selected' : ''}>${st}</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <label for="ob-district" class="block text-xs font-bold text-slate-700 mb-1">${this.t('districtLabel')}</label>
                    <select id="ob-district" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold bg-white">
                      ${(STATE_DISTRICT_MAP[form.state] || STATE_DISTRICT_MAP.Maharashtra).map(d => `<option value="${d.id}" ${form.district === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="ob-land-area" class="block text-xs font-bold text-slate-700 mb-1">${this.t('landAreaLabel')}</label>
                    <div class="flex items-center space-x-2">
                      <input type="number" step="0.1" id="ob-land-area" value="${form.landArea || 1.2}" class="w-2/3 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold" />
                      <select id="ob-land-unit" class="w-1/3 px-2 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold bg-slate-50">
                        <option value="hectares" ${form.landUnit === 'hectares' ? 'selected' : ''}>${this.t('unitHa')}</option>
                        <option value="acres" ${form.landUnit === 'acres' ? 'selected' : ''}>${this.t('unitAcres')}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label for="ob-soil" class="block text-xs font-bold text-slate-700 mb-1">${this.t('soilTypeLabel')}</label>
                    <select id="ob-soil" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold bg-white">
                      <option value="black" ${form.soilType === 'black' ? 'selected' : ''}>${this.t('soilBlack')}</option>
                      <option value="red_loamy" ${form.soilType === 'red_loamy' ? 'selected' : ''}>${this.t('soilRed')}</option>
                      <option value="sandy_loam" ${form.soilType === 'sandy_loam' ? 'selected' : ''}>${this.t('soilSandy')}</option>
                      <option value="clay_loam" ${form.soilType === 'clay_loam' ? 'selected' : ''}>${this.t('soilClay')}</option>
                    </select>
                  </div>
                </div>

                <div class="space-y-2">
                  <label for="ob-irrigation" class="block text-xs font-bold text-slate-700">${this.t('irrigationLabel')}</label>
                  <select id="ob-irrigation" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold bg-white">
                    <option value="rainfed" ${form.irrigationType === 'rainfed' ? 'selected' : ''}>${this.t('irrRainfed')}</option>
                    <option value="protective_well" ${form.irrigationType === 'protective_well' ? 'selected' : ''}>${this.t('irrWell')}</option>
                    <option value="canal" ${form.irrigationType === 'canal' ? 'selected' : ''}>${this.t('irrCanal')}</option>
                  </select>
                  <label class="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                    <input type="checkbox" id="ob-borewell-failed" ${form.borewellFailed ? 'checked' : ''} class="w-4 h-4 text-sky-600 rounded" />
                    <span>${this.t('borewellFailedLabel')}</span>
                  </label>
                </div>

                <!-- Financial Safety Nets & Loans -->
                <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div class="text-xs font-black uppercase text-slate-700 tracking-wider">${this.t('safetyNetsLabel')}</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-800">
                    <label class="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" id="ob-pmfby" ${form.hasPmfby ? 'checked' : ''} class="w-4 h-4 text-sky-600 rounded" />
                      <span>${this.t('pmfbyLabel')}</span>
                    </label>
                    <label class="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" id="ob-kcc" ${form.hasKcc ? 'checked' : ''} class="w-4 h-4 text-sky-600 rounded" />
                      <span>${this.t('kccLabel')}</span>
                    </label>
                  </div>
                  <label class="flex items-center space-x-2 text-xs font-bold text-red-700 cursor-pointer pt-1">
                    <input type="checkbox" id="ob-informal-debt" ${form.informalDebt ? 'checked' : ''} class="w-4 h-4 text-red-600 rounded" />
                    <span>${this.t('informalDebtLabel')}</span>
                  </label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label for="ob-loan-due-date" class="block text-xs font-bold text-slate-700 mb-1">${this.t('loanDueDateLabel')}</label>
                      <input type="date" id="ob-loan-due-date" value="${form.loanDueDate || '2026-11-15'}" class="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-bold" />
                    </div>
                    <div>
                      <label for="ob-loan-amount" class="block text-xs font-bold text-slate-700 mb-1">${this.t('loanAmountLabel')}</label>
                      <input type="number" id="ob-loan-amount" value="${form.loanAmount || 50000}" class="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-bold" />
                    </div>
                  </div>
                </div>

                <div>
                  <label for="ob-device" class="block text-xs font-bold text-slate-700 mb-1">${this.t('deviceTypeLabel')}</label>
                  <select id="ob-device" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold bg-white">
                    <option value="android_smartphone" ${form.deviceType === 'android_smartphone' ? 'selected' : ''}>${this.t('deviceSmart')}</option>
                    <option value="feature_phone" ${form.deviceType === 'feature_phone' ? 'selected' : ''}>${this.t('deviceFeature')}</option>
                  </select>
                </div>

              </div>

              <div class="onboarding-nav-bar mt-4">
                <button type="button" onclick="Onboarding.goToStep(1)" class="onboarding-btn-secondary">
                  <span>${this.t('btnBack')}</span>
                </button>
                <button type="button" onclick="Onboarding.validateAndGoToStep3()" class="onboarding-btn-primary">
                  <span>${this.t('btnNextCrop')}</span>
                </button>
              </div>
            ` : `
              <!-- Quick Switch & Search Mode -->
              <div class="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                <div>
                  <h4 class="text-xs font-black uppercase text-slate-700 mb-2">${this.t('loginQuickTitle')}</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    ${(window.state?.farmers || []).map(f => {
                      const cropEmoji = (CROPS_LIST.find(c => c.id === (f.crop||'').toLowerCase()) || {}).emoji || '🌱';
                      const isCurrent = f.id === (window.state?.selectedFarmerId || AuthService.getUser()?.id);
                      return `
                        <button type="button" 
                                onclick="Onboarding.quickSwitchFarmer('${f.id}')" 
                                class="quick-farmer-card ${isCurrent ? 'active' : ''}">
                          <div class="flex items-center space-x-2.5 overflow-hidden">
                            <span class="text-xl flex-shrink-0">${cropEmoji}</span>
                            <div class="overflow-hidden">
                              <div class="font-extrabold text-xs sm:text-sm text-slate-900 truncate">${f.name}</div>
                              <div class="text-[11px] font-semibold text-slate-500 truncate">${(f.crop||'').toUpperCase()} • ${f.village || f.district_name || f.district_id}</div>
                            </div>
                          </div>
                          ${isCurrent ? '<span class="text-xs font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full flex-shrink-0">Active</span>' : '<span class="text-xs text-slate-400 font-bold flex-shrink-0">Switch →</span>'}
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>

                <!-- Search / Login Input -->
                <form id="ob-login-form" onsubmit="event.preventDefault(); Onboarding.handleLogin();" class="pt-2 border-t border-slate-200">
                  <label for="ob-login-input" class="block text-xs font-bold text-slate-700 mb-1">${this.t('loginSearchTitle')}</label>
                  <div class="flex items-center space-x-2">
                    <input type="text" id="ob-login-input" placeholder="e.g. 9823110293 or F1 or Sunita" class="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold" />
                    <button type="submit" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm">
                      ${this.t('loginBtn')}
                    </button>
                  </div>
                </form>
              </div>

              <div class="onboarding-nav-bar mt-4">
                <button type="button" onclick="Onboarding.goToStep(1)" class="onboarding-btn-secondary">
                  <span>${this.t('btnBack')}</span>
                </button>
                <div></div>
              </div>
            `}
          </div>
        </div>

        <!-- STEP 3: CROP SELECTION -->
        <div id="ob-step-3" class="onboarding-screen">
          <div class="space-y-4">
            <div>
              <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">${this.t('step3Title')}</h3>
              <p class="text-xs sm:text-sm text-slate-500">${this.t('step3Sub')}</p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              ${CROPS_LIST.map(crop => {
                const isSelected = crop.id === form.selectedCrop;
                const localizedName = (crop.name && crop.name[currentLang]) || (crop.name && crop.name['en']) || crop.id;
                return `
                  <button type="button" 
                          onclick="Onboarding.selectCrop('${crop.id}')" 
                          class="crop-single-card ${isSelected ? 'selected' : ''}">
                    <span class="text-3xl mb-1">${crop.emoji}</span>
                    <span class="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">${localizedName}</span>
                    <span class="text-[10px] text-slate-500 uppercase font-semibold">${crop.id}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="onboarding-nav-bar mt-4">
            <button type="button" onclick="Onboarding.goToStep(2)" class="onboarding-btn-secondary">
              <span>${this.t('btnBack')}</span>
            </button>
            <button type="button" onclick="Onboarding.goToStep(4)" class="onboarding-btn-primary">
              <span>${this.t('btnNextStage')}</span>
            </button>
          </div>
        </div>

        <!-- STEP 4: CROP GROWTH STAGE & SUMMARY -->
        <div id="ob-step-4" class="onboarding-screen">
          <div class="space-y-4">
            <div>
              <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">${this.t('step4Title')}</h3>
              <p class="text-xs sm:text-sm text-slate-500">${this.t('step4Sub')}</p>
            </div>

            <!-- Active Selected Crop Banner -->
            <div class="selected-crop-banner">
              <div class="flex items-center space-x-2">
                <span class="text-2xl">${(CROPS_LIST.find(c => c.id === form.selectedCrop) || {}).emoji || '🌱'}</span>
                <div>
                  <div class="text-[10px] uppercase font-black text-sky-800 tracking-wider">Cultivated Crop:</div>
                  <div id="banner-crop-name" class="text-sm font-extrabold text-slate-900">${this.getSelectedCropName(currentLang)}</div>
                </div>
              </div>
              <button type="button" onclick="Onboarding.goToStep(3)" class="text-xs font-bold text-sky-700 hover:underline">Change Crop →</button>
            </div>

            <!-- 5 Growth Stages Single Select Cards -->
            <div class="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              ${CROP_STAGES.map(stage => {
                const isSelected = stage.id === form.cropStage;
                const localizedName = (stage.name && stage.name[currentLang]) || stage.name['en'];
                return `
                  <button type="button" 
                          onclick="Onboarding.selectCropStage('${stage.id}')"
                          class="stage-card ${isSelected ? 'selected' : ''}">
                    <div class="flex items-center space-x-3">
                      <span class="text-2xl">${stage.emoji}</span>
                      <div class="text-left">
                        <div class="font-extrabold text-xs sm:text-sm text-slate-900">${localizedName}</div>
                        <div class="text-[11px] font-semibold text-slate-500">${stage.duration}</div>
                      </div>
                    </div>
                    <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'}">
                      ${isSelected ? '✓' : ''}
                    </div>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Live Summary Review Card -->
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div class="font-black text-slate-800 uppercase tracking-wider text-[11px]">📋 Profile Summary:</div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700 font-medium">
                <div>Farmer: <b id="summary-farmer-name" class="text-slate-900">${form.farmerName || 'Ramesh Patil'}</b></div>
                <div>Language: <b id="summary-farmer-lang" class="text-slate-900">${SUPPORTED_ONBOARDING_LOCALES[currentLang].name}</b></div>
                <div>Location: <b id="summary-farmer-loc" class="text-slate-900">${form.district}, ${form.state}</b></div>
                <div>Landholding: <b id="summary-farmer-land" class="text-slate-900">${form.landArea} ${form.landUnit}</b></div>
                <div>Crop: <b id="summary-farmer-crop" class="text-slate-900">${this.getSelectedCropName(currentLang)}</b></div>
                <div>Stage: <b id="summary-farmer-stage" class="text-slate-900">${this.getSelectedStageName(currentLang)}</b></div>
              </div>
            </div>
          </div>

          <div class="onboarding-nav-bar mt-4">
            <button type="button" onclick="Onboarding.goToStep(3)" class="onboarding-btn-secondary">
              <span>${this.t('btnBack')}</span>
            </button>
            <button type="button" onclick="Onboarding.submitProfile()" class="onboarding-btn-finish">
              <span>${submitBtnLabel}</span>
            </button>
          </div>
        </div>

      </div>
    `;
  },

  goToStep(stepNumber) {
    OnboardingState.currentStep = stepNumber;
    
    document.querySelectorAll('.onboarding-screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
    });
    const target = document.getElementById(`ob-step-${stepNumber}`);
    if (target) {
      target.classList.add('active');
      target.style.display = 'block';
    }

    const badge = document.getElementById('ob-step-badge');
    const fill = document.getElementById('ob-progress-fill');
    if (badge) badge.textContent = `Step ${stepNumber} of 4`;
    if (fill) fill.style.width = `${(stepNumber / 4) * 100}%`;

    const lang = OnboardingState.selectedLanguage;

    if (stepNumber === 4) {
      const bannerCrop = document.getElementById('banner-crop-name');
      if (bannerCrop) bannerCrop.textContent = this.getSelectedCropName(lang);

      const nameEl = document.getElementById('summary-farmer-name');
      const langEl = document.getElementById('summary-farmer-lang');
      const locEl = document.getElementById('summary-farmer-loc');
      const landEl = document.getElementById('summary-farmer-land');
      const cropEl = document.getElementById('summary-farmer-crop');
      const stageEl = document.getElementById('summary-farmer-stage');

      const f = OnboardingState.formData;
      if (nameEl) nameEl.textContent = f.farmerName || 'Farmer';
      if (langEl) langEl.textContent = SUPPORTED_ONBOARDING_LOCALES[lang]?.name || lang;
      if (locEl) locEl.textContent = `${f.district}, ${f.state}`;
      if (landEl) landEl.textContent = `${f.landArea} ${f.landUnit}`;
      if (cropEl) cropEl.textContent = this.getSelectedCropName(lang);
      if (stageEl) stageEl.textContent = this.getSelectedStageName(lang);
    }
  },

  selectLanguage(langKey) {
    const cleanLang = langKey.split('-')[0].toLowerCase();
    OnboardingState.selectedLanguage = cleanLang;
    localStorage.setItem('sk_locale', cleanLang);

    AudioTTSController.playLocaleSample(cleanLang);

    this.renderOnboardingUI(OnboardingState.isEditMode);
    this.goToStep(1);

    if (typeof window.switchGlobalLanguage === 'function') {
      window.switchGlobalLanguage(cleanLang);
    } else if (typeof window.onLanguageChanged === 'function') {
      window.onLanguageChanged(cleanLang);
    }
  },

  onStateChange(selectedState) {
    OnboardingState.formData.state = selectedState;
    const distSelect = document.getElementById('ob-district');
    if (distSelect) {
      const dists = STATE_DISTRICT_MAP[selectedState] || STATE_DISTRICT_MAP.Maharashtra;
      distSelect.innerHTML = dists.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      OnboardingState.formData.district = dists[0].id;
    }
  },

  setMode(isLogin) {
    OnboardingState.isLoginMode = isLogin;
    this.renderOnboardingUI(OnboardingState.isEditMode);
    this.goToStep(2);
  },

  validateAndGoToStep3() {
    const nameInput = document.getElementById('ob-name');
    const phoneInput = document.getElementById('ob-phone');
    const stateSelect = document.getElementById('ob-state');
    const distSelect = document.getElementById('ob-district');
    const landInput = document.getElementById('ob-land-area');
    const unitSelect = document.getElementById('ob-land-unit');
    const soilSelect = document.getElementById('ob-soil');
    const irrSelect = document.getElementById('ob-irrigation');
    const borewellChk = document.getElementById('ob-borewell-failed');
    const pmfbyChk = document.getElementById('ob-pmfby');
    const kccChk = document.getElementById('ob-kcc');
    const debtChk = document.getElementById('ob-informal-debt');
    const loanDateInput = document.getElementById('ob-loan-due-date');
    const loanAmtInput = document.getElementById('ob-loan-amount');
    const deviceSelect = document.getElementById('ob-device');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!name) {
      alert('Please enter your full name.');
      if (nameInput) nameInput.focus();
      return;
    }

    if (!phone || phone.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      if (phoneInput) phoneInput.focus();
      return;
    }

    OnboardingState.formData.farmerName = name;
    OnboardingState.formData.phone = phone;
    OnboardingState.formData.state = stateSelect ? stateSelect.value : 'Maharashtra';
    OnboardingState.formData.district = distSelect ? distSelect.value : 'D1';
    OnboardingState.formData.landArea = landInput ? parseFloat(landInput.value || 1.2) : 1.2;
    OnboardingState.formData.landUnit = unitSelect ? unitSelect.value : 'hectares';
    OnboardingState.formData.soilType = soilSelect ? soilSelect.value : 'black';
    OnboardingState.formData.irrigationType = irrSelect ? irrSelect.value : 'rainfed';
    OnboardingState.formData.borewellFailed = borewellChk ? borewellChk.checked : false;
    OnboardingState.formData.hasPmfby = pmfbyChk ? pmfbyChk.checked : true;
    OnboardingState.formData.hasKcc = kccChk ? kccChk.checked : true;
    OnboardingState.formData.informalDebt = debtChk ? debtChk.checked : false;
    OnboardingState.formData.loanDueDate = loanDateInput ? loanDateInput.value : '2026-11-15';
    OnboardingState.formData.loanAmount = loanAmtInput ? parseFloat(loanAmtInput.value || 50000) : 50000;
    OnboardingState.formData.deviceType = deviceSelect ? deviceSelect.value : 'android_smartphone';

    this.goToStep(3);
  },

  selectCrop(cropId) {
    OnboardingState.formData.selectedCrop = cropId;
    document.querySelectorAll('.crop-single-card').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
  },

  selectCropStage(stageId) {
    OnboardingState.formData.cropStage = stageId;
    document.querySelectorAll('.stage-card').forEach(s => s.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    this.goToStep(4);
  },

  async quickSwitchFarmer(farmerId) {
    console.log('⚡ Quick switching to farmer:', farmerId);
    try {
      let farmer = (window.state?.farmers || []).find(f => f.id === farmerId);
      
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_or_id: farmerId })
        });
        if (res.ok) {
          const authData = await res.json();
          if (authData.access_token) AuthService.setToken(authData.access_token);
          if (authData.user) {
            AuthService.setUser(authData.user);
            farmer = authData.user;
          }
        }
      } catch (authErr) {
        console.warn('Auth endpoint call warning during quick switch:', authErr);
      }

      if (farmer) {
        AuthService.setUser(farmer);
      }

      localStorage.setItem('sk_onboarding_completed', 'true');
      sessionStorage.setItem('sk_session_active', 'true');
      this.hideModal();

      if (window.selectFarmer) {
        await window.selectFarmer(farmerId);
      }

      if (window.switchMainView) {
        window.switchMainView('farmer');
      }

      console.log('✅ Successfully switched to farmer:', farmerId);
    } catch (err) {
      console.error('Quick switch error:', err);
      localStorage.setItem('sk_onboarding_completed', 'true');
      sessionStorage.setItem('sk_session_active', 'true');
      this.hideModal();
      if (window.selectFarmer) {
        await window.selectFarmer(farmerId);
      }
    }
  },

  async handleLogin() {
    const input = document.getElementById('ob-login-input');
    const target = input ? input.value.trim() : '';
    if (!target) return;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_or_id: target })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.access_token) AuthService.setToken(data.access_token);
      if (data.user) {
        AuthService.setUser(data.user);
        if (data.user.preferred_language) {
          localStorage.setItem('sk_locale', data.user.preferred_language);
          if (window.switchGlobalLanguage) {
            window.switchGlobalLanguage(data.user.preferred_language);
          }
        }
      }

      localStorage.setItem('sk_onboarding_completed', 'true');
      sessionStorage.setItem('sk_session_active', 'true');
      this.hideModal();

      if (window.loadFarmersList) {
        await window.loadFarmersList();
      }
      if (window.selectFarmer && data.user?.id) {
        await window.selectFarmer(data.user.id);
      }
    } catch (err) {
      console.error('Farmer login error:', err);
      alert('Login failed. Please check phone number or Farmer ID.');
    }
  },

  async submitProfile() {
    const f = OnboardingState.formData;
    const langKey = OnboardingState.selectedLanguage;

    const payload = {
      farmer_id: f.farmerId,
      farmer_name: f.farmerName,
      phone_number: f.phone,
      state: f.state,
      district: f.district,
      land_details: {
        total_area: f.landArea,
        unit: f.landUnit,
        soil_type: f.soilType
      },
      primary_crops: [f.selectedCrop],
      crop_stage: f.cropStage,
      irrigation_type: f.irrigationType,
      borewell_failed: f.borewellFailed,
      has_pmfby: f.hasPmfby,
      has_kcc: f.hasKcc,
      informal_debt: f.informalDebt,
      loan_due_date: f.loanDueDate,
      loan_amount: f.loanAmount,
      device_type: f.deviceType,
      preferred_language: langKey
    };

    try {
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.access_token) AuthService.setToken(data.access_token);
      if (data.user) AuthService.setUser(data.user);

      localStorage.setItem('sk_onboarding_completed', 'true');
      sessionStorage.setItem('sk_session_active', 'true');
      localStorage.setItem('sk_onboarding_profile', JSON.stringify(payload));
      localStorage.setItem('sk_locale', langKey);

      this.hideModal();

      if (window.loadFarmersList) {
        await window.loadFarmersList();
      }

      const savedId = data.farmer_id || (data.user && data.user.id) || OnboardingState.formData.farmerId;
      if (savedId && window.selectFarmer) {
        await window.selectFarmer(savedId);
      }

      if (window.switchMainView) {
        window.switchMainView('farmer');
      }
    } catch (err) {
      console.error('Failed to submit onboarding profile:', err);
      alert('Could not save profile. Please check server connection.');
    }
  }
};

window.Onboarding = Onboarding;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    Onboarding.init();
  });
} else {
  setTimeout(() => {
    Onboarding.init();
  }, 100);
}
