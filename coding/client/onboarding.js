/**
 * Smart Krishi (PS-02) — Pre-Dashboard Onboarding Engine & Authentication
 * Supports all 6 regional languages: English, Hindi, Marathi, Odia, Assamese, Kannada
 * Integrates with our Neural TTS & Translation System
 */

const SUPPORTED_ONBOARDING_LOCALES = {
  en: { code: 'en', bcp47: 'en-IN', name: 'English', native: 'English', voice: 'en-IN-NeerjaExpressiveNeural', script: 'latin' },
  hi: { code: 'hi', bcp47: 'hi-IN', name: 'Hindi', native: 'हिंदी', voice: 'hi-IN-SwaraNeural', script: 'devanagari' },
  mr: { code: 'mr', bcp47: 'mr-IN', name: 'Marathi', native: 'मराठी', voice: 'mr-IN-AarohiNeural', script: 'devanagari' },
  or: { code: 'or', bcp47: 'or-IN', name: 'Odia', native: 'ଓଡ଼ିଆ', voice: 'or-IN-Standard-A', script: 'odia' },
  as: { code: 'as', bcp47: 'as-IN', name: 'Assamese', native: 'অসমীয়া', voice: 'bn-IN-TanishaaNeural', script: 'assamese' },
  kn: { code: 'kn', bcp47: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', voice: 'kn-IN-SapnaNeural', script: 'kannada' }
};

// ─── 1. AUDIO / TTS SERVICE MODULE (With Concurrency Control) ───
const AudioTTSController = {
  activeAudio: null,
  isPlaying: false,
  isLoading: false,
  currentLanguage: null,
  activeStep: null,
  debounceTimer: null,
  concurrencyLock: false,

  stop() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
        this.activeAudio.onplay = null;
        this.activeAudio.onended = null;
        this.activeAudio.onerror = null;
        this.activeAudio.removeAttribute('src');
        this.activeAudio.load();
      } catch (e) {
        console.warn('[AudioTTSController] Stop error:', e);
      }
      this.activeAudio = null;
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    this.isPlaying = false;
    this.isLoading = false;
    this.currentLanguage = null;
    this.activeStep = null;
    this.concurrencyLock = false;
    this.updateUI();
  },

  async stopCurrentAndPlayNext(languageCode, customText = null) {
    this.stop();

    this.concurrencyLock = true;
    this.isLoading = true;
    this.currentLanguage = languageCode;
    this.updateUI();

    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        try {
          const greetings = {
            en: 'Welcome to Smart Krishi Advisory.',
            hi: 'नमस्ते, स्मार्ट कृषि में आपका स्वागत है।',
            mr: 'नमस्कार, स्मार्ट कृषी सल्ला केंद्रात आपले स्वागत आहे.',
            or: 'ନମସ୍କାର, ସ୍ମାର୍ଟ କୃଷିକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ।',
            as: 'নমস্কাৰ, স্মাৰ্ট কৃষিলৈ আপোনাক স্বাগতম।',
            kn: 'ನಮಸ್ಕಾರ, ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಸಲಹಾ ಕೇಂದ್ರಕ್ಕೆ ಸ್ವಾಗತ.'
          };
          const text = customText || greetings[languageCode] || greetings.en;
          const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${languageCode}`;

          const audio = new Audio(audioUrl);
          this.activeAudio = audio;

          audio.onplay = () => {
            this.isLoading = false;
            this.isPlaying = true;
            this.updateUI();
          };

          audio.onended = () => {
            this.stop();
            resolve();
          };

          audio.onerror = (err) => {
            console.warn(`[AudioTTSController] TTS stream error (${languageCode}), falling back:`, err);
            if (typeof window.speakText === 'function') {
              window.speakText(text, languageCode);
            }
            this.stop();
            resolve();
          };

          await audio.play();
        } catch (err) {
          console.warn('[AudioTTSController] Playback prevented or cancelled:', err);
          this.stop();
          resolve();
        }
      }, 120);
    });
  },

  updateUI() {
    // 1. Update Screen 1 language card preview pills
    document.querySelectorAll('.lang-select-card').forEach(card => {
      const lang = card.id.replace('lang-card-', '');
      const pill = card.querySelector('.lang-voice-pill');
      if (!pill) return;

      if (this.currentLanguage === lang && !this.activeStep) {
        if (this.isLoading) {
          pill.innerHTML = `<span>⏳</span><span>Loading...</span>`;
          pill.className = 'lang-voice-pill loading';
        } else if (this.isPlaying) {
          pill.innerHTML = `<span>⏹️</span><span>Stop Audio</span>`;
          pill.className = 'lang-voice-pill playing';
        }
      } else {
        pill.innerHTML = `<span>🔊</span><span>Listen</span>`;
        pill.className = 'lang-voice-pill';
      }

      if (this.concurrencyLock && this.currentLanguage !== lang) {
        card.classList.add('locked');
      } else {
        card.classList.remove('locked');
      }
    });

    // 2. Update Screen 2, 3, 4 Info Listen Buttons
    [2, 3, 4].forEach(step => {
      const btn = document.getElementById(`ob-step-tts-btn-${step}`);
      if (!btn) return;
      const lang = OnboardingState.selectedLanguage || 'en';
      if (this.isPlaying && this.activeStep === step) {
        btn.classList.add('playing');
        btn.innerHTML = `<span class="tts-icon">⏹️</span><span class="tts-label">${Onboarding.t('stopScreenAudio', lang)}</span>`;
      } else if (this.isLoading && this.activeStep === step) {
        btn.classList.remove('playing');
        btn.innerHTML = `<span class="tts-icon">⏳</span><span class="tts-label">${Onboarding.t('loadingAudio', lang)}</span>`;
      } else {
        btn.classList.remove('playing');
        btn.innerHTML = `<span class="tts-icon">🔊</span><span class="tts-label">${Onboarding.t('listenScreenInfo', lang)}</span>`;
      }
    });
  }
};

// ─── 2. USER AUTHENTICATION & DATA ISOLATION CONTEXT ───
const AuthService = {
  getToken() {
    return localStorage.getItem('sk_auth_token') || 'token_farmer_F1';
  },

  setToken(token) {
    localStorage.setItem('sk_auth_token', token);
  },

  getUser() {
    const raw = localStorage.getItem('sk_auth_user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    localStorage.setItem('sk_auth_user', JSON.stringify(user));
  },

  isAuthenticated() {
    return !!localStorage.getItem('sk_auth_token');
  },

  async login(phoneOrId) {
    try {
      const res = await fetch('/api/v1/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_or_id: phoneOrId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Farmer login failed');
      }
      const data = await res.json();
      this.setToken(data.access_token);
      this.setUser(data.user);
      localStorage.setItem('sk_onboarding_completed', 'true');
      localStorage.setItem('sk_locale', data.user.preferred_language || 'hi');
      return data;
    } catch (e) {
      throw e;
    }
  },

  logout() {
    localStorage.removeItem('sk_auth_token');
    localStorage.removeItem('sk_auth_user');
    localStorage.removeItem('sk_onboarding_completed');
    localStorage.removeItem('sk_onboarding_profile');
    location.reload();
  },

  async fetchAuthenticatedProfile() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const res = await fetch('/api/v1/farmer/profile', { headers });
    if (!res.ok) {
      if (res.status === 401) {
        console.warn('Session expired or unauthenticated.');
        return null;
      }
      throw new Error(`Profile fetch failed: ${res.status}`);
    }
    return await res.json();
  }
};

// ─── 3. GLOBAL ONBOARDING & FORM STATE ───
const STATE_DISTRICT_MAP = {
  "Maharashtra": [
    { id: "D1", name: "Nashik" },
    { id: "D2", name: "Akola" },
    { id: "D3", name: "Yavatmal" }
  ],
  "Odisha": [
    { id: "D_OD1", name: "Kalahandi" },
    { id: "D_OD2", name: "Balangir" },
    { id: "D_OD3", name: "Bargarh" }
  ],
  "Assam": [
    { id: "D_AS1", name: "Nagaon" },
    { id: "D_AS2", name: "Golaghat" },
    { id: "D_AS3", name: "Barpeta" }
  ],
  "Karnataka": [
    { id: "D_KN1", name: "Raichur" },
    { id: "D_KN2", name: "Belagavi" },
    { id: "D_KN3", name: "Dharwad" }
  ],
  "Uttar Pradesh": [
    { id: "D_UP1", name: "Varanasi" },
    { id: "D_UP2", name: "Prayagraj" },
    { id: "D_UP3", name: "Gorakhpur" }
  ]
};

const CROP_STAGES = [
  { id: 'sowing', duration: '0–20 Days', emoji: '🌱', name: { en: 'Sowing & Germination', hi: 'बुवाई एवं अंकुरण', mr: 'पेरणी आणि उगवण', or: 'ବୁଣିବା ଓ ଗଜା ହେବା', as: 'বীজ সিঁচা আৰু গজালি মেলা', kn: 'ಬಿತ್ತನೆ ಮತ್ತು ಮೊಳಕೆಯೊಡೆಯುವಿಕೆ' } },
  { id: 'vegetative', duration: '21–50 Days', emoji: '🌿', name: { en: 'Vegetative Growth', hi: 'वानस्पतिक वृद्धि अवस्था', mr: 'शाकीय वाढ अवस्था', or: 'ବୃଦ୍ଧି ପର୍ଯ୍ୟାୟ', as: 'অঙ্গজ বৃদ্ধি পৰ্যায়', kn: 'ಸಸ್ಯಕ ಬೆಳವಣಿಗೆ ಹಂತ' } },
  { id: 'flowering', duration: '51–75 Days', emoji: '🌸', name: { en: 'Flowering & Podding', hi: 'फूल व फली लगने की अवस्था', mr: 'फुलधारणा आणि फळधारणा', or: 'ଫୁଲ ଓ ଛୁଇଁ ଧରିବା', as: 'ফুল আৰু শুঁটি ধৰা', kn: 'ಹೂವು ಮತ್ತು ಕಾಯಿ ಕಟ್ಟುವ ಹಂತ' } },
  { id: 'maturity', duration: '76–100 Days', emoji: '🌾', name: { en: 'Grain Filling & Maturity', hi: 'दाना भराव एवं परिपक्वता', mr: 'दाणे भरणे आणि पक्वता', or: 'ଦାନା ପରିପକ୍ଵତା', as: 'শস্য পূৰঠ হোৱা পৰ্যায়', kn: 'ಕಾಳು ತುಂಬುವ ಮತ್ತು ಪ್ರಬುದ್ಧತೆ' } },
  { id: 'harvest', duration: '100+ Days', emoji: '🚜', name: { en: 'Harvest Ready', hi: 'कटाई हेतु तैयार', mr: 'काढणीस तयार', or: 'ଅମଳ ଉପଯୋଗୀ', as: 'চপোৱাৰ বাবে সাজু', kn: 'ಕೊಯ್ಲಿಗೆ ಸಿದ್ಧ' } }
];

const OnboardingState = {
  currentStep: 1,
  selectedLanguage: localStorage.getItem('sk_locale') || 'en',
  isEditMode: false,
  isLoginMode: false,

  formData: {
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
    selectedCrops: ['onion'],
    cropStage: 'vegetative'
  },

  isComplete: function() {
    return !!localStorage.getItem('sk_onboarding_completed');
  },

  getBcp47Locale: function(langKey) {
    const key = langKey || this.selectedLanguage;
    return SUPPORTED_ONBOARDING_LOCALES[key] ? SUPPORTED_ONBOARDING_LOCALES[key].bcp47 : 'hi-IN';
  },

  getVoiceProfile: function(langKey) {
    const key = langKey || this.selectedLanguage;
    return SUPPORTED_ONBOARDING_LOCALES[key] ? SUPPORTED_ONBOARDING_LOCALES[key].voice : 'hi-IN-SwaraNeural';
  }
};

// ─── 4. ONBOARDING & PROFILE CONTROLLER ───
const Onboarding = {
  async init() {
    console.log('🌱 Initializing Onboarding & Auth System...');

    const initialLang = localStorage.getItem('sk_locale') || OnboardingState.selectedLanguage || 'en';
    OnboardingState.selectedLanguage = initialLang;
    if (typeof window.switchGlobalLanguage === 'function') {
      window.switchGlobalLanguage(initialLang);
    }

    console.log('🚀 Showing mandatory pre-dashboard onboarding flow...');
    this.renderOnboardingUI(false);
    this.showModal();
    this.goToStep(1);
  },

  openSetupFlow() {
    console.log('⚙️ Opening Setup Flow with pre-populated farmer data...');
    const current = (window.state && window.state.currentFarmer) || AuthService.getUser();
    const saved = JSON.parse(localStorage.getItem('sk_onboarding_profile') || 'null');

    OnboardingState.formData = {
      farmerName: (current && current.name) || (saved && saved.farmer_name) || 'Ramesh Patil',
      phone: (current && current.phone ? current.phone.replace('+91-', '').replace('+91', '').trim() : '') || (saved && saved.phone_number) || '9823110293',
      state: (current && current.state) || (saved && saved.state) || 'Maharashtra',
      district: (current && current.district_id) || (saved && saved.district) || 'D1',
      landArea: (current && (current.landholding_hectares || current.landholding_ha)) || (saved && saved.land_details && saved.land_details.total_area) || 1.2,
      landUnit: (saved && saved.land_details && saved.land_details.unit) || 'hectares',
      soilType: (current && current.soil_type) || (saved && saved.land_details && saved.land_details.soil_type) || 'black',
      deviceType: (current && current.device_type) || (saved && saved.device_type) || 'android_smartphone',
      irrigationType: (current && current.irrigation_type) || (saved && saved.irrigation_type) || 'rainfed',
      borewellFailed: current ? !!current.borewell_failed : (saved ? !!saved.borewell_failed : false),
      hasPmfby: current ? !!current.has_pmfby_insurance : (saved ? !!saved.has_pmfby : true),
      hasKcc: current ? !!current.has_kcc : (saved ? !!saved.has_kcc : true),
      informalDebt: current ? !!current.informal_debt : (saved ? !!saved.informal_debt : false),
      loanDueDate: (current && current.loan_due_date) || (saved && saved.loan_due_date) || '2026-11-15',
      loanAmount: (current && current.loan_amount_inr) || (saved && saved.loan_amount) || 50000,
      selectedCrops: (saved && saved.primary_crops) || (current && current.crop ? [current.crop.toLowerCase()] : ['onion']),
      cropStage: (saved && saved.crop_stage) || (current && current.crop_stage ? current.crop_stage.toLowerCase() : 'vegetative')
    };

    OnboardingState.isEditMode = true;
    OnboardingState.isLoginMode = false;
    this.renderOnboardingUI(true);
    this.showModal();
    this.goToStep(1);
  },

  openLoginModal() {
    OnboardingState.isLoginMode = true;
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
        step3Title: 'Select Primary Crops',
        step3Sub: 'Select the crops currently cultivated in your farm',
        step4Title: 'Crop Growth Stage & Confirmation',
        step4Sub: 'Select the current development stage of your crop for accurate ICAR-CRIDA advisories',
        loginTitle: 'Farmer Sign-In',
        loginSub: 'Enter registered mobile number or Farmer ID (e        btnFinish: 'Go to Farmer Dashboard 🌾',
        btnLogin: 'Log In & Load Profile →',
        switchToLogin: 'Already registered? Login with Phone / ID',
        switchToRegister: 'New Farmer? Register New Profile',
        listenScreenInfo: 'Listen to this Screen 🔊',
        stopScreenAudio: 'Stop Audio ⏹️',
        loadingAudio: 'Loading Audio...'
      },
      hi: {
        step1Title: 'अपनी पसंदीदा भाषा चुनें',
        step1Sub: 'ध्वनि सलाह और पाठ के लिए अपनी क्षेत्रीय भाषा चुनें',
        step2Title: 'किसान प्रोफ़ाइल एवं खेत विवरण',
        step2Sub: 'मौसम, फसल और संकट संकेतकों को अनुकूलित करें',
        step3Title: 'प्रमुख फसलें चुनें',
        step3Sub: 'अपने खेत में बोई गई फसलों का चयन करें',
        step4Title: 'फसल विकास अवस्था एवं पुष्टि',
        step4Sub: 'सटीक ICAR-CRIDA सलाह हेतु वर्तमान वृद्धि अवस्था चुनें',
        loginTitle: 'किसान लॉगिन',
        loginSub: 'पंजीकृत मोबाइल नंबर या किसान आईडी (जैसे F1, F2) दर्ज करें',
        fullName: 'किसान का पूरा नाम',
        mobileNumber: 'मोबाइल नंबर',
        mobilePlaceholder: '10 अंकों का मोबाइल नंबर',
        stateLabel: 'राज्य',
        districtLabel: 'जिला / तालुका',
        landAreaLabel: 'कुल कृषि भूमि',
        soilTypeLabel: 'मिट्टी का प्रकार',
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
        deviceTypeLabel: 'मुख्य फोन / उपकरण का प्रकार',
        smartphone: '📱 एंड्रॉइड स्मार्टफोन (4G/5G)',
        featurephone: '📟 साधारण कीपैड फोन (2G / केवल कॉल व SMS)',
        btnSaveContinue: 'सहेजें और आगे बढ़ें →',
        btnUpdateProfile: 'प्रोफ़ाइल अपडेट करें ✓',
        btnBack: '← वापस',
        btnNext: 'अगला चरण →',
        btnNextStage: 'फसल अवस्था चुनें →',
        btnFinish: 'किसान डैशबोर्ड खोलें 🌾',
        btnLogin: 'लॉगिन करें →',
        switchToLogin: 'पहले से पंजीकृत हैं? फोन / आईडी से लॉगिन करें',
        switchToRegister: 'नए किसान? नया प्रोफ़ाइल बनाएं',
        listenScreenInfo: 'यह पृष्ठ सुनें 🔊',
        stopScreenAudio: 'ऑडियो रोकें ⏹️',
        loadingAudio: 'लोड हो रहा है...'
      },
      mr: {
        step1Title: 'आपली पसंतीची भाषा निवडा',
        step1Sub: 'ध्वनी सल्ला आणि मजकुरासाठी आपली प्रादेशिक भाषा निवडा',
        step2Title: 'शेतकरी माहिती व शेताचा तपशील',
        step2Sub: 'हवामान, पीक व संकट निर्देशांक वैयक्तिकृत करा',
        step3Title: 'मुख्य पिके निवडा',
        step3Sub: 'आपल्या शेतातील चालू पिकांची निवड करा',
        step4Title: 'पीक वाढीची अवस्था आणि पुष्टी',
        step4Sub: 'अचूक ICAR-CRIDA सल्ल्यासाठी पिकाची चालू अवस्था निवडा',
        loginTitle: 'शेतकरी लॉगिन',
        loginSub: 'नोंदणीकृत मोबाईल नंबर किंवा शेतकरी आयडी (उदा. F1, F2) टाका',
        fullName: 'शेतकऱ्याचे पूर्ण नाव',
        mobileNumber: 'मोबाईल नंबर',
        mobilePlaceholder: '१० अंकी मोबाईल नंबर',
        stateLabel: 'राज्य',
        districtLabel: 'जिल्हा / तालुका',
        landAreaLabel: 'एकूण जमीन',
        soilTypeLabel: 'मातीचा प्रकार',
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
        deviceTypeLabel: 'वापरात असलेला फोन प्रकार',
        smartphone: '📱 स्मार्टफोन (4G/5G)',
        featurephone: '📟 साधा बटणाचा फोन (2G / फक्त कॉल व SMS)',
        btnSaveContinue: 'जतन करा आणि पुढे जा →',
        btnUpdateProfile: 'प्रोफाइल अपडेट करा ✓',
        btnBack: '← मागे',
        btnNext: 'पुढील टप्पा →',
        btnNextStage: 'वाढ अवस्था निवडा →',
        btnFinish: 'शेतकरी डॅशबोर्ड सुरू करा 🌾',
        btnLogin: 'लॉगिन करा →',
        switchToLogin: 'आधीच नोंदणीकृत आहात? फोन / आयडीने लॉगिन करा',
        switchToRegister: 'नवीन शेतकरी? नवीन नोंदणी करा',
        listenScreenInfo: 'ही माहिती ऐका 🔊',
        stopScreenAudio: 'ऑडिओ थांबवा ⏹️',
        loadingAudio: 'लोड होत आहे...'
      },
      or: {
        step1Title: 'ଆପଣଙ୍କ ପସନ୍ଦର ଭାଷା ବାଛନ୍ତୁ',
        step1Sub: 'ଭଏସ୍ ପରାମର୍ଶ ଏବଂ ଟେକ୍ସଟ୍ ପାଇଁ ନିଜର ଭାଷା ବାଛନ୍ତୁ',
        step2Title: 'କୃଷକ ପ୍ରୋଫାଇଲ୍ ଏବଂ ଜମି ବିବରଣୀ',
        step2Sub: 'ପାଣିପାଗ ଏବଂ ଫସଲ ସୂଚକାଙ୍କ ବ୍ୟକ୍ତିଗତ କରନ୍ତୁ',
        step3Title: 'ମୁଖ୍ୟ ଫସଲ ଚୟନ କରନ୍ତୁ',
        step3Sub: 'ଆପଣଙ୍କ ଜମିରେ ଥିବା ଫସଲଗୁଡ଼ିକୁ ଚୟନ କରନ୍ତୁ',
        step4Title: 'ଫସଲ ବୃଦ୍ଧି ପର୍ଯ୍ୟାୟ ଏବଂ ସାରାଂଶ',
        step4Sub: 'ସଠିକ୍ ICAR-CRIDA ପରାମର୍ଶ ପାଇଁ ବର୍ତ୍ତମାନର ପର୍ଯ୍ୟାୟ ବାଛନ୍ତୁ',
        loginTitle: 'କୃଷକ ଲଗଇନ୍',
        loginSub: 'ପଞ୍ଜୀକୃତ ମୋବାଇଲ୍ ନମ୍ବର ବା କୃଷକ ଆଇଡି (ଯଥା F1, F2) ଦିଅନ୍ତୁ',
        fullName: 'କୃଷକଙ୍କ ପୂରା ନାମ',
        mobileNumber: 'ମୋବାଇଲ୍ ନମ୍ବର',
        mobilePlaceholder: '୧୦ ଅଙ୍କର ମୋବାଇଲ୍ ନମ୍ବର',
        stateLabel: 'ରାଜ୍ୟ',
        districtLabel: 'ଜିଲ୍ଲା / ବ୍ଲକ୍',
        landAreaLabel: 'ମୋଟ ଜମି ପରିମାଣ',
        soilTypeLabel: 'ମାଟିର ପ୍ରକାର',
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
        deviceTypeLabel: 'ବ୍ୟବହୃତ ଫୋନ୍ ପ୍ରକାର',
        smartphone: '📱 ଆଣ୍ଡ୍ରଏଡ୍ ସ୍ମାର୍ଟଫୋନ୍ (4G/5G)',
        featurephone: '📟 ସାଧାରଣ ବଟନ୍ ଫୋନ୍ (2G / କେବଳ କଲ୍ ଓ SMS)',
        btnSaveContinue: 'ସଂରକ୍ଷଣ କରନ୍ତୁ ଏବଂ ଆଗକୁ ଯାଆନ୍ତୁ →',
        btnUpdateProfile: 'ପ୍ରୋଫାଇଲ୍ ଅପଡେଟ୍ କରନ୍ତୁ ✓',
        btnBack: '← ପଛକୁ',
        btnNext: 'ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ →',
        btnNextStage: 'ଫସଲ ପର୍ଯ୍ୟାୟ ବାଛନ୍ତୁ →',
        btnFinish: 'କୃଷକ ଡ୍ୟାସବୋର୍ଡ୍ ଖୋଲନ୍ତୁ 🌾',
        btnLogin: 'ଲଗଇନ୍ କରନ୍ତୁ →',
        switchToLogin: 'ପୂର୍ବରୁ ପଞ୍ଜୀକୃତ କି? ଲଗଇନ୍ କରନ୍ତୁ',
        switchToRegister: 'ନୂତନ କୃଷକ? ନୂଆ ପ୍ରୋଫାଇଲ୍ ତିଆରି କରନ୍ତୁ',
        listenScreenInfo: 'ଏହି ସୂଚନା ଶୁଣନ୍ତୁ 🔊',
        stopScreenAudio: 'ଅଡିଓ ବନ୍ଦ କରନ୍ତୁ ⏹️',
        loadingAudio: 'ଅଡିଓ ଲୋଡ୍ ହେଉଛି...'
      },
      as: {
        step1Title: 'আপোনাৰ পছন্দৰ ভাষা বাছক',
        step1Sub: 'ভইচ দিহা আৰু বাৰ্তাৰ বাবে নিজৰ ভাষা নিৰ্বাচন কৰক',
        step2Title: 'কৃষক প্ৰোফাইল আৰু কৃষিভূমিৰ বিৱৰণ',
        step2Sub: 'বতৰ আৰু শস্যৰ নিৰ্দেশনা নিজৰ মতে নিৰ্ধাৰণ কৰক',
        step3Title: 'প্ৰধান শস্য নিৰ্বাচন কৰক',
        step3Sub: 'আপোনাৰ পথাৰত খেতি কৰা শস্য নিৰ্বাচন কৰক',
        step4Title: 'শস্যৰ বৃদ্ধি পৰ্যায় আৰু নিশ্চিতকৰণ',
        step4Sub: 'সঠিক পৰামৰ্শৰ বাবে শস্যৰ वर्तमान বৃদ্ধি পৰ্যায় বাছক',
        loginTitle: 'কৃষক লগইন',
        loginSub: 'পঞ্জীভুক্ত মবাইল নম্বৰ বা কৃষক আইডি (যেনে F1, F2) দিয়ক',
        fullName: 'কৃষকৰ সম্পূৰ্ণ নাম',
        mobileNumber: 'মবাইল নম্বৰ',
        mobilePlaceholder: '১০ টা সংখ্যাৰ মবাইল নম্বৰ',
        stateLabel: 'ৰাজ্য',
        districtLabel: 'জিলা / মহকুমা',
        landAreaLabel: 'মুঠ কৃষিভূমিৰ পৰিমাণ',
        soilTypeLabel: 'মাটিৰ প্ৰকাৰ',
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
        smartphone: '📱 এণ্ড্ৰইড স্মাৰ্টফোন (4G/5G)',
        featurephone: '📟 সাধাৰণ বুটামৰ ফোন (2G / কেৱল ভইচ আৰু SMS)',
        btnSaveContinue: 'সংৰক্ষণ কৰক আৰু আগবাঢ়ক →',
        btnUpdateProfile: 'প্ৰোফাইল আপডেট কৰক ✓',
        btnBack: '← উভতি যাওক',
        btnNext: 'পৰৱৰ্তী স্তৰ →',
        btnNextStage: 'বৃদ্ধি পৰ্যায় বাছক →',
        btnFinish: 'কৃষক ডেশ্বব’ৰ্ড খোলক 🌾',
        btnLogin: 'লগইন কৰক →',
        switchToLogin: 'পূৰ্বতে পঞ্জীয়ন কৰিছে নেকি? লগইন কৰক',
        switchToRegister: 'নতুন কৃষক? নতুন পঞ্জীয়ন কৰক',
        listenScreenInfo: 'এই পৃষ্ঠাৰ তথ্য শুনক 🔊',
        stopScreenAudio: 'অডিঅ\' বন্ধ কৰক ⏹️',
        loadingAudio: 'অডিঅ\' লোড হৈ আছে...'
      },
      kn: {
        step1Title: 'ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step1Sub: 'ಧ್ವನಿ ಸಲಹೆ ಮತ್ತು ಪಠ್ಯಕ್ಕಾಗಿ ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step2Title: 'ರೈತರ ವಿವರ ಮತ್ತು ಜಮೀನಿನ ಮಾಹಿತಿ',
        step2Sub: 'ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ರಕ್ಷಣೆಯನ್ನು ಕಸ್ಟಮೈಸ್ ಮಾಡಿ',
        step3Title: 'ಮುಖ್ಯ ಬೆಳೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step3Sub: 'ನಿಮ್ಮ ಜಮೀನಿನಲ್ಲಿ ಬೆಳೆಯಲಾಗುವ ಬೆಳೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step4Title: 'ಬೆಳೆ ಬೆಳವಣಿಗೆಯ ಹಂತ ಮತ್ತು ದೃಢೀಕರಣ',
        step4Sub: 'ನಿಖರವಾದ ICAR-CRIDA ಸಲಹೆಗಾಗಿ ಪ್ರಸ್ತುತ ಬೆಳವಣಿಗೆ ಹಂತವನ್ನು ಆರಿಸಿ',
        loginTitle: 'ರೈತರ ಲಾಗಿನ್',
        loginSub: 'ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಥವಾ ರೈತರ ಐಡಿ (ಉದಾ: F1, F2) ನಮೂದಿಸಿ',
        fullName: 'ರೈತರ ಪೂರ್ಣ ಹೆಸರು',
        mobileNumber: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
        mobilePlaceholder: '೧೦ ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
        stateLabel: 'ರಾಜ್ಯ',
        districtLabel: 'ಜಿಲ್ಲೆ / ತಾಲೂಕು',
        landAreaLabel: 'ಒಟ್ಟು ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ',
        soilTypeLabel: 'ಮಣ್ಣಿನ ವಿಧ',
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
        deviceTypeLabel: 'ಬಳಸುವ ಫೋನ್ ಪ್ರಕಾರ',
        smartphone: '📱 ಆಂಡ್ರಾಯ್ಡ್ ಸ್ಮಾರ್ಟ್‌ಫೋನ್ (4G/5G)',
        featurephone: '📟 ಸಾಮಾನ್ಯ ಕೀಪ್ಯಾಡ್ ಫೋನ್ (2G / ಕರೆ ಮತ್ತು SMS ಮಾತ್ರ)',
        btnSaveContinue: 'ಉಳಿಸಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ →',
        btnUpdateProfile: 'ವಿವರ ನವೀಕರಿಸಿ ✓',
        btnBack: '← ಹಿಂದಕ್ಕೆ',
        btnNext: 'ಮುಂದಿನ ಹಂತ →',
        btnNextStage: 'ಬೆಳವಣಿಗೆ ಹಂತ ಆರಿಸಿ →',
        btnFinish: 'ರೈತರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ 🌾',
        btnLogin: 'ಲಾಗಿನ್ ಮಾಡಿ →',
        switchToLogin: 'ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಿದ್ದೀರಾ? ಲಾಗಿನ್ ಮಾಡಿ',
        switchToRegister: 'ಹೊಸ ರೈತರೇ? ಹೊಸ ನೋಂದಣಿ ಮಾಡಿ',
        listenScreenInfo: 'ಈ ಪುಟವನ್ನು ಕೇಳಿ 🔊',
        stopScreenAudio: 'ಆಡಿಯೋ ನಿಲ್ಲಿಸಿ ⏹️',
        loadingAudio: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...'
      }�ର୍ଭର)',
        irrWell: 'କୁଅ / ନଳକୂପ / ବୋରୱେଲ୍',
        irrCanal: 'କେନାଲ୍ ଜଳସେଚନ',
        borewellFailedLabel: 'ଏହି ଋତୁରେ ବୋରୱେଲ୍ ପାଣି ଶୁଖିଗଲା',
        safetyNetsLabel: 'ଆର୍ଥିକ ସୁରକ୍ଷା ଓ ଋଣ',
        pmfbyLabel: 'PMFBY ଫସଲ ବୀମା ଭୁକ୍ତ',
        kccLabel: 'କିଷାନ କ୍ରେଡିଟ୍ କାର୍ଡ (KCC) ସକ୍ରିୟ',
        informalDebtLabel: 'ମହାଜନୀ ଋଣ (>୨୪% ସୁଧ)',
        loanDueDateLabel: 'ପରବର୍ତ୍ତୀ ବ୍ୟାଙ୍କ ଋଣ ଶେଷ ତାରିଖ',
        loanAmountLabel: 'ମୋଟ ବାକି ଋଣ ରାଶି (₹)',
        deviceTypeLabel: 'ବ୍ୟବହୃତ ଫୋନ୍ ପ୍ରକାର',
        smartphone: '📱 ଆଣ୍ଡ୍ରଏଡ୍ ସ୍ମାର୍ଟଫୋନ୍ (4G/5G)',
        featurephone: '📟 ସାଧାରଣ ବଟନ୍ ଫୋନ୍ (2G / କେବଳ କଲ୍ ଓ SMS)',
        btnSaveContinue: 'ସଂରକ୍ଷଣ କରନ୍ତୁ ଏବଂ ଆଗକୁ ଯାଆନ୍ତୁ →',
        btnUpdateProfile: 'ପ୍ରୋଫାଇଲ୍ ଅପଡେଟ୍ କରନ୍ତୁ ✓',
        btnBack: '← ପଛକୁ',
        btnNext: 'ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ →',
        btnNextStage: 'ଫସଲ ପର୍ଯ୍ୟାୟ ବାଛନ୍ତୁ →',
        btnFinish: 'କୃଷକ ଡ୍ୟାସବୋର୍ଡ୍ ଖୋଲନ୍ତୁ 🌾',
        btnLogin: 'ଲଗଇନ୍ କରନ୍ତୁ →',
        switchToLogin: 'ପୂର୍ବରୁ ପଞ୍ଜୀକୃତ କି? ଲଗଇନ୍ କରନ୍ତୁ',
        switchToRegister: 'ନୂତନ କୃଷକ? ନୂଆ ପ୍ରୋଫାଇଲ୍ ତିଆରି କରନ୍ତୁ'
      },
      as: {
        step1Title: 'আপোনাৰ পছন্দৰ ভাষা বাছক',
        step1Sub: 'ভইচ দিহা আৰু বাৰ্তাৰ বাবে নিজৰ ভাষা নিৰ্বাচন কৰক',
        step2Title: 'কৃষক প্ৰোফাইল আৰু কৃষিভূমিৰ বিৱৰণ',
        step2Sub: 'বতৰ আৰু শস্যৰ নিৰ্দেশনা নিজৰ মতে নিৰ্ধাৰণ কৰক',
        step3Title: 'প্ৰধান শস্য নিৰ্বাচন কৰক',
        step3Sub: 'আপোনাৰ পথাৰত খেতি কৰা শস্য নিৰ্বাচন কৰক',
        step4Title: 'শস্যৰ বৃদ্ধি পৰ্যায় আৰু নিশ্চিতকৰণ',
        step4Sub: 'সঠিক পৰামৰ্শৰ বাবে শস্যৰ বর্তমান বৃদ্ধি পৰ্যায় বাছক',
        loginTitle: 'কৃষক লগইন',
        loginSub: 'পঞ্জীভুক্ত মবাইল নম্বৰ বা কৃষক আইডি (যেনে F1, F2) দিয়ক',
        fullName: 'কৃষকৰ সম্পূৰ্ণ নাম',
        mobileNumber: 'মবাইল নম্বৰ',
        mobilePlaceholder: '১০ টা সংখ্যাৰ মবাইল নম্বৰ',
        stateLabel: 'ৰাজ্য',
        districtLabel: 'জিলা / মহকুমা',
        landAreaLabel: 'মুঠ কৃষিভূমিৰ পৰিমাণ',
        soilTypeLabel: 'মাটিৰ প্ৰকাৰ',
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
        smartphone: '📱 এণ্ড্ৰইড স্মাৰ্টফোন (4G/5G)',
        featurephone: '📟 সাধাৰণ বুটামৰ ফোন (2G / কেৱল ভইচ আৰু SMS)',
        btnSaveContinue: 'সংৰক্ষণ কৰক আৰু আগবাঢ়ক →',
        btnUpdateProfile: 'প্ৰোফাইল আপডেট কৰক ✓',
        btnBack: '← উভতি যাওক',
        btnNext: 'পৰৱৰ্তী স্তৰ →',
        btnNextStage: 'বৃদ্ধি পৰ্যায় বাছক →',
        btnFinish: 'কৃষক ডেশ্বব’ৰ্ড খোলক 🌾',
        btnLogin: 'লগইন কৰক →',
        switchToLogin: 'পূৰ্বতে পঞ্জীয়ন কৰিছে নেকি? লগইন কৰক',
        switchToRegister: 'নতুন কৃষক? নতুন পঞ্জীয়ন কৰক'
      },
      kn: {
        step1Title: 'ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step1Sub: 'ಧ್ವನಿ ಸಲಹೆ ಮತ್ತು ಪಠ್ಯಕ್ಕಾಗಿ ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step2Title: 'ರೈತರ ವಿವರ ಮತ್ತು ಜಮೀನಿನ ಮಾಹಿತಿ',
        step2Sub: 'ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ರಕ್ಷಣೆಯನ್ನು ಕಸ್ಟಮೈಸ್ ಮಾಡಿ',
        step3Title: 'ಮುಖ್ಯ ಬೆಳೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step3Sub: 'ನಿಮ್ಮ ಜಮೀನಿನಲ್ಲಿ ಬೆಳೆಯಲಾಗುವ ಬೆಳೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        step4Title: 'ಬೆಳೆ ಬೆಳವಣಿಗೆಯ ಹಂತ ಮತ್ತು ದೃಢೀಕರಣ',
        step4Sub: 'ನಿಖರವಾದ ICAR-CRIDA ಸಲಹೆಗಾಗಿ ಪ್ರಸ್ತುತ ಬೆಳವಣಿಗೆ ಹಂತವನ್ನು ಆರಿಸಿ',
        loginTitle: 'ರೈತರ ಲಾಗಿನ್',
        loginSub: 'ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಥವಾ ರೈತರ ಐಡಿ (ಉದಾ: F1, F2) ನಮೂದಿಸಿ',
        fullName: 'ರೈತರ ಪೂರ್ಣ ಹೆಸರು',
        mobileNumber: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
        mobilePlaceholder: '೧೦ ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
        stateLabel: 'ರಾಜ್ಯ',
        districtLabel: 'ಜಿಲ್ಲೆ / ತಾಲೂಕು',
        landAreaLabel: 'ಒಟ್ಟು ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ',
        soilTypeLabel: 'ಮಣ್ಣಿನ ವಿಧ',
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
        deviceTypeLabel: 'ಬಳಸುವ ಫೋನ್ ಪ್ರಕಾರ',
        smartphone: '📱 ಆಂಡ್ರಾಯ್ಡ್ ಸ್ಮಾರ್ಟ್‌ಫೋನ್ (4G/5G)',
        featurephone: '📟 ಸಾಮಾನ್ಯ ಕೀಪ್ಯಾಡ್ ಫೋನ್ (2G / ಕರೆ ಮತ್ತು SMS ಮಾತ್ರ)',
        btnSaveContinue: 'ಉಳಿಸಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ →',
        btnUpdateProfile: 'ವಿವರ ನವೀಕರಿಸಿ ✓',
        btnBack: '← ಹಿಂದಕ್ಕೆ',
        btnNext: 'ಮುಂದಿನ ಹಂತ →',
        btnNextStage: 'ಬೆಳವಣಿಗೆ ಹಂತ ಆರಿಸಿ →',
        btnFinish: 'ರೈತರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ 🌾',
        btnLogin: 'ಲಾಗಿನ್ ಮಾಡಿ →',
        switchToLogin: 'ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಿದ್ದೀರಾ? ಲಾಗಿನ್ ಮಾಡಿ',
        switchToRegister: 'ಹೊಸ ರೈತರೇ? ಹೊಸ ನೋಂದಣಿ ಮಾಡಿ'
      }
    };

    const d = obDict[lang] || obDict['hi'] || obDict['en'];
    return d[key] || obDict['en'][key] || key;
  },

  showModal() {
    const modal = document.getElementById('onboarding-modal-overlay');
    if (modal) modal.classList.remove('hidden');
  },

  hideModal() {
    const modal = document.getElementById('onboarding-modal-overlay');
    if (modal) modal.classList.add('hidden');
  },

  getSelectedCropDisplay(lang = OnboardingState.selectedLanguage) {
    const crops = OnboardingState.formData.selectedCrops;
    if (!crops || crops.length === 0) return 'Onion';
    const cropNames = {
      onion: { en: 'Onion', hi: 'प्याज', mr: 'कांदा', or: 'ପିଆଜ', as: 'পিয়াঁজ', kn: 'ಈರುಳ್ಳಿ' },
      cotton: { en: 'Cotton', hi: 'कपास', mr: 'कापूस', or: 'କପା', as: 'কপাহ', kn: 'ಹತ್ತಿ' },
      soybean: { en: 'Soybean', hi: 'सोयाबीन', mr: 'सोयाबीन', or: 'ସୋୟାବିନ୍', as: 'চয়াবিন', kn: 'ಸೋಯಾಬೀನ್' },
      paddy: { en: 'Paddy / Rice', hi: 'धान (चावल)', mr: 'भात (धान)', or: 'ଧାନ', as: 'ধান', kn: 'ಭತ್ತ' },
      wheat: { en: 'Wheat', hi: 'गेहूं', mr: 'गहू', or: 'ଗହମ', as: 'গম', kn: 'ಗೋಧಿ' },
      maize: { en: 'Maize', hi: 'मक्का', mr: 'मका', or: 'ମକା', as: 'মাকৈ', kn: 'ಮೆಕ್ಕೆಜೋಳ' },
      bajra: { en: 'Bajra', hi: 'बाजरा', mr: 'बाजरी', or: 'ବାଜରା', as: 'বজৰা', kn: 'ಸಜ್ಜೆ' },
      groundnut: { en: 'Groundnut', hi: 'मूंगफली', mr: 'भुईमूग', or: 'ଚିନାବାଦାମ', as: 'বাদাম', kn: 'ಕಡಲೆಕಾಯಿ' },
      pigeonpea: { en: 'Pigeonpea (Arhar)', hi: 'अरहर (तुअर)', mr: 'तूर', or: 'ହରଡ଼', as: 'অৰহৰ', kn: 'ತೊಗರಿ' },
      pulses: { en: 'Pulses', hi: 'दलहन', mr: 'कडधान्ये', or: 'ଡାଲି', as: 'মাহজাতীয়', kn: 'ದ್ವಿದಳ ಧಾನ್ಯ' },
      sugarcane: { en: 'Sugarcane', hi: 'गन्ना', mr: 'ऊस', or: 'ଆଖୁ', as: 'কুঁহিয়াৰ', kn: 'ಕಬ್ಬು' }
    };
    return crops.map(c => (cropNames[c] && cropNames[c][lang]) || (cropNames[c] && cropNames[c]['en']) || c).join(', ');
  },

  getSelectedStageDisplay(lang = OnboardingState.selectedLanguage) {
    const stageObj = CROP_STAGES.find(s => s.id === OnboardingState.formData.cropStage) || CROP_STAGES[1];
    return `${stageObj.emoji} ${(stageObj.name && stageObj.name[lang]) || stageObj.name['en']}`;
  },

  renderOnboardingUI(isEdit = false) {
    let overlay = document.getElementById('onboarding-modal-overlay');
    const mobileScreen = document.querySelector('.mobile-device-screen') || document.body;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'onboarding-modal-overlay';
      mobileScreen.appendChild(overlay);
    } else if (overlay.parentElement !== mobileScreen) {
      mobileScreen.appendChild(overlay);
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
              <span class="text-2xl">🌱</span>
              <div>
                <h2 class="text-lg font-black tracking-tight leading-tight">Smart Krishi • ${isEdit ? 'Farm Settings' : (OnboardingState.isLoginMode ? 'Farmer Login' : 'Setup Wizard')}</h2>
                <p id="ob-step-subtitle" class="text-xs text-emerald-100 font-medium">PS-02 Smart Crop Advisory & Distress Early-Warning</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span id="ob-step-badge" class="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm border border-white/20">Step 1 of 4</span>
              ${isEdit || OnboardingState.isComplete() ? `
                <button onclick="Onboarding.hideModal()" class="text-white/80 hover:text-white text-xl font-bold px-2 py-0.5 rounded-lg hover:bg-white/10 transition">✕</button>
              ` : ''}
            </div>
          </div>

          <div class="onboarding-progress-bar">
            <div id="ob-progress-fill" class="onboarding-progress-fill" style="width: 25%;"></div>
          </div>
        </div>

        <!-- SCREEN 1: Language Selection -->
        <div id="ob-screen-1" class="onboarding-screen active">
          <div class="p-6 pb-2 text-center">
            <h3 id="ob-title-1" class="text-xl font-extrabold text-slate-900">${this.t('step1Title', currentLang)}</h3>
            <p id="ob-sub-1" class="text-xs text-slate-500 mt-1">${this.t('step1Sub', currentLang)}</p>
          </div>

          <div class="lang-card-grid">
            ${Object.values(SUPPORTED_ONBOARDING_LOCALES).map(loc => `
              <div id="lang-card-${loc.code}" 
                   class="lang-select-card ${currentLang === loc.code ? 'active' : ''}" 
                   onclick="Onboarding.selectLanguage('${loc.code}')">
                <div class="lang-card-native">${loc.native}</div>
                <div class="lang-card-english">${loc.name}</div>
                <button type="button" 
                        class="lang-voice-pill" 
                        onclick="event.stopPropagation(); AudioTTSController.stopCurrentAndPlayNext('${loc.code}')">
                  <span>🔊</span>
                  <span>Listen</span>
                </button>
                <div class="lang-card-check">✓</div>
              </div>
            `).join('')}
          </div>

          <div class="onboarding-footer justify-end">
            <button type="button" class="btn-primary-action" onclick="Onboarding.goToStep(2)">
              <span>${this.t('btnNext', currentLang)}</span>
            </button>
          </div>
        </div>

        <!-- SCREEN 2: Farmer Profile Form OR Login Mode -->
        <div id="ob-screen-2" class="onboarding-screen">
          <div class="p-6 pb-2 text-center">
            <h3 id="ob-title-2" class="text-xl font-extrabold text-slate-900">
              ${OnboardingState.isLoginMode ? this.t('loginTitle', currentLang) : this.t('step2Title', currentLang)}
            </h3>
            <p id="ob-sub-2" class="text-xs text-slate-500 mt-1">
              ${OnboardingState.isLoginMode ? this.t('loginSub', currentLang) : this.t('step2Sub', currentLang)}
            </p>
          </div>

          <div class="onboarding-form-body">
            ${OnboardingState.isLoginMode ? `
              <!-- LOGIN FORM -->
              <form id="ob-login-form" onsubmit="event.preventDefault(); Onboarding.handleLogin();">
                <div class="form-group">
                  <label class="form-label">${this.t('mobileNumber', currentLang)} / Farmer ID</label>
                  <input type="text" id="ob-login-input" class="form-input" placeholder="e.g. 9823110293 or F1" required autofocus value="F1">
                </div>
                <div class="text-right">
                  <button type="button" onclick="Onboarding.toggleLoginMode(false)" class="text-xs text-emerald-700 font-bold hover:underline">
                    ${this.t('switchToRegister', currentLang)}
                  </button>
                </div>
              </form>
            ` : `
              <!-- REGISTRATION / PROFILE FORM (Mobile Clean Layout) -->
              <form id="ob-farmer-form" class="space-y-3" onsubmit="event.preventDefault(); Onboarding.validateAndGoToStep3();">
                
                <!-- Farmer Full Name -->
                <div class="form-group">
                  <label class="form-label">${this.t('fullName', currentLang)} *</label>
                  <input type="text" id="ob-farmer-name" class="form-input" placeholder="e.g. Ramesh Patil" value="${form.farmerName}" required>
                  <div id="err-farmer-name" class="form-err-msg">Please enter your name</div>
                </div>

                <!-- Mobile Phone Number -->
                <div class="form-group">
                  <label class="form-label">${this.t('mobileNumber', currentLang)} *</label>
                  <div class="flex items-center space-x-2">
                    <span class="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 shrink-0">+91</span>
                    <input type="tel" id="ob-farmer-phone" class="form-input flex-1" placeholder="9823110293" maxlength="10" value="${form.phone}" required>
                  </div>
                  <div id="err-farmer-phone" class="form-err-msg">Enter valid 10-digit mobile number</div>
                </div>

                <!-- State & District / Taluka (Paired 2-col) -->
                <div class="grid grid-cols-2 gap-2.5">
                  <div class="form-group">
                    <label class="form-label">${this.t('stateLabel', currentLang)}</label>
                    <select id="ob-farmer-state" class="form-select" onchange="Onboarding.onStateChange(this.value)">
                      <option value="Maharashtra" ${form.state === 'Maharashtra' ? 'selected' : ''}>Maharashtra</option>
                      <option value="Odisha" ${form.state === 'Odisha' ? 'selected' : ''}>Odisha</option>
                      <option value="Assam" ${form.state === 'Assam' ? 'selected' : ''}>Assam</option>
                      <option value="Karnataka" ${form.state === 'Karnataka' ? 'selected' : ''}>Karnataka</option>
                      <option value="Uttar Pradesh" ${form.state === 'Uttar Pradesh' ? 'selected' : ''}>Uttar Pradesh</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">${this.t('districtLabel', currentLang)}</label>
                    <select id="ob-farmer-district" class="form-select">
                      ${(STATE_DISTRICT_MAP[form.state || 'Maharashtra'] || STATE_DISTRICT_MAP['Maharashtra']).map(d => `
                        <option value="${d.id}" ${(form.district === d.id) ? 'selected' : ''}>${d.name}</option>
                      `).join('')}
                    </select>
                  </div>
                </div>

                <!-- Total Land Area with Unit Toggle (Full Width Row) -->
                <div class="form-group">
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="form-label mb-0">${this.t('landAreaLabel', currentLang)} *</label>
                    <div class="unit-toggle-group">
                      <button type="button" id="unit-btn-ha" class="unit-toggle-btn ${form.landUnit === 'hectares' ? 'active' : ''}" onclick="Onboarding.setLandUnit('hectares')">Hectares</button>
                      <button type="button" id="unit-btn-acres" class="unit-toggle-btn ${form.landUnit === 'acres' ? 'active' : ''}" onclick="Onboarding.setLandUnit('acres')">Acres</button>
                    </div>
                  </div>
                  <input type="number" step="0.1" min="0.1" id="ob-land-area" class="form-input" value="${form.landArea}" required>
                </div>

                <!-- Soil Type Dropdown (Full Width Row) -->
                <div class="form-group">
                  <label class="form-label">${this.t('soilTypeLabel', currentLang)}</label>
                  <select id="ob-soil-type" class="form-select">
                    <option value="black" ${form.soilType === 'black' ? 'selected' : ''}>${currentLang === 'hi' ? 'काली कपास मिट्टी (रेगुर)' : currentLang === 'mr' ? 'काळी कसदार जमीन (रेगूर)' : currentLang === 'or' ? 'କଳା କପା ମାଟି' : currentLang === 'as' ? 'কলা কপাহী মাটি' : currentLang === 'kn' ? 'ಕಪ್ಪು ಹತ್ತಿ ಮಣ್ಣು' : 'Black Cotton Soil (Regur)'}</option>
                    <option value="alluvial" ${form.soilType === 'alluvial' ? 'selected' : ''}>${currentLang === 'hi' ? 'जलोढ़ दोमट मिट्टी' : currentLang === 'mr' ? 'गाळाची सुपीक जमीन' : currentLang === 'or' ? 'ପଟୁ ମାଟି' : currentLang === 'as' ? 'পলি মাটি' : currentLang === 'kn' ? 'ಮೆಕ್ಕಲು ಮಣ್ಣು' : 'Alluvial Loam Soil'}</option>
                    <option value="red" ${form.soilType === 'red' ? 'selected' : ''}>${currentLang === 'hi' ? 'लाल रेतीली मिट्टी' : currentLang === 'mr' ? 'तांबडी वालुकामय जमीन' : currentLang === 'or' ? 'ନାଲି ବାଲିଆ ମାଟି' : currentLang === 'as' ? 'ৰঙা বালিয়া মাটি' : currentLang === 'kn' ? 'ಕೆಂಪು ಮರಳು ಮಿಶ್ರಿತ ಮಣ್ಣು' : 'Red Sandy Loam Soil'}</option>
                    <option value="laterite" ${form.soilType === 'laterite' ? 'selected' : ''}>${currentLang === 'hi' ? 'लैटेराइट चिकनी मिट्टी' : currentLang === 'mr' ? 'जांभी चिकणमाती' : currentLang === 'or' ? 'ଲେଟେରାଇଟ୍ ମାଟି' : currentLang === 'as' ? 'লেটেৰাইট মাটি' : currentLang === 'kn' ? 'ಲ್ಯಾಟರೈಟ್ ಜೇಡಿ ಮಣ್ಣು' : 'Laterite Clay Soil'}</option>
                    <option value="sandy" ${form.soilType === 'sandy' ? 'selected' : ''}>${currentLang === 'hi' ? 'बलुई / मरुस्थलीय मिट्टी' : currentLang === 'mr' ? 'वाळवंटी / रेताड जमीन' : currentLang === 'or' ? 'ବାଲିଆ ମାଟି' : currentLang === 'as' ? 'বালিಚಹীয়া মাটি' : currentLang === 'kn' ? 'ಮರಳು ಭೂಮಿ' : 'Arid Desert / Sandy Soil'}</option>
                    <option value="saline" ${form.soilType === 'saline' ? 'selected' : ''}>${currentLang === 'hi' ? 'लवणीय एवं क्षारीय मिट्टी' : currentLang === 'mr' ? 'खारवट व चोपण जमीन' : currentLang === 'or' ? 'ଲୁଣି ମାଟି' : currentLang === 'as' ? 'লৱণাক্ত মাটি' : currentLang === 'kn' ? 'ಉಪ್ಪು ಮಿಶ್ರಿತ ಮಣ್ಣು' : 'Saline & Alkaline Soil'}</option>
                    <option value="peaty" ${form.soilType === 'peaty' ? 'selected' : ''}>${currentLang === 'hi' ? 'दलदली / जैविक मिट्टी' : currentLang === 'mr' ? 'दलदलीची सेंद्रिय जमीन' : currentLang === 'or' ? 'ଜୈବିକ ମାଟି' : currentLang === 'as' ? 'ଜୈৱিক মাটি' : currentLang === 'kn' ? 'ಜೌಗು ಸಾವಯವ ಮಣ್ಣು' : 'Peaty / Marshy Organic Soil'}</option>
                    <option value="loamy" ${form.soilType === 'loamy' ? 'selected' : ''}>${currentLang === 'hi' ? 'उर्वर मध्यम दोमट मिट्टी' : currentLang === 'mr' ? 'सुपीक मध्यम पोयटा जमीन' : currentLang === 'or' ? 'ଉର୍ବର ଦୋରସା ମାଟି' : currentLang === 'as' ? 'উৰ্বৰ পলসুৱಾ মাটি' : currentLang === 'kn' ? 'ಫಲವತ್ತಾದ ಗೋಡು ಮಣ್ಣು' : 'Fertile Medium Loam Soil'}</option>
                  </select>
                </div>

                <!-- Primary Irrigation Type (Full Width Row) -->
                <div class="form-group">
                  <label class="form-label">${this.t('irrigationLabel', currentLang)}</label>
                  <select id="ob-farmer-irrigation" class="form-select">
                    <option value="rainfed" ${form.irrigationType === 'rainfed' ? 'selected' : ''}>${this.t('irrRainfed', currentLang)}</option>
                    <option value="protective_well" ${form.irrigationType === 'protective_well' ? 'selected' : ''}>${this.t('irrWell', currentLang)}</option>
                    <option value="canal" ${form.irrigationType === 'canal' ? 'selected' : ''}>${this.t('irrCanal', currentLang)}</option>
                  </select>
                  <label class="flex items-center space-x-2.5 text-xs font-semibold text-slate-700 cursor-pointer mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
                    <input type="checkbox" id="ob-borewell-failed" ${form.borewellFailed ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded">
                    <span>${this.t('borewellFailedLabel', currentLang)}</span>
                  </label>
                </div>

                <!-- Financial Safety Nets & Loans (Clean Card) -->
                <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>🛡️</span>
                    <span>${this.t('safetyNetsLabel', currentLang)}</span>
                  </div>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                    <label class="flex items-center space-x-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input type="checkbox" id="ob-pmfby" ${form.hasPmfby ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded">
                      <span class="text-[11px] leading-tight">${this.t('pmfbyLabel', currentLang)}</span>
                    </label>
                    <label class="flex items-center space-x-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input type="checkbox" id="ob-kcc" ${form.hasKcc ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded">
                      <span class="text-[11px] leading-tight">${this.t('kccLabel', currentLang)}</span>
                    </label>
                  </div>

                  <label class="flex items-center space-x-2 p-2 bg-rose-50/80 rounded-xl border border-rose-200 text-xs font-bold text-rose-800 cursor-pointer hover:bg-rose-100/70 transition">
                    <input type="checkbox" id="ob-informal-debt" ${form.informalDebt ? 'checked' : ''} class="w-4 h-4 text-rose-600 rounded">
                    <span class="text-[11px] leading-tight">${this.t('informalDebtLabel', currentLang)}</span>
                  </label>

                  <div class="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label class="form-label text-[11px] mb-1">${this.t('loanDueDateLabel', currentLang)}</label>
                      <input type="date" id="ob-loan-due-date" class="form-input text-xs py-1.5 px-2" value="${form.loanDueDate || '2026-11-15'}">
                    </div>
                    <div>
                      <label class="form-label text-[11px] mb-1">${this.t('loanAmountLabel', currentLang)}</label>
                      <input type="number" id="ob-loan-amount" class="form-input text-xs py-1.5 px-2" value="${form.loanAmount || 50000}">
                    </div>
                  </div>
                </div>

                <!-- Device Type -->
                <div class="form-group">
                  <label class="form-label">${this.t('deviceTypeLabel', currentLang)}</label>
                  <select id="ob-device-type" class="form-select">
                    <option value="android_smartphone" ${form.deviceType === 'android_smartphone' ? 'selected' : ''}>${this.t('smartphone', currentLang)}</option>
                    <option value="basic_feature_phone" ${form.deviceType === 'basic_feature_phone' ? 'selected' : ''}>${this.t('featurephone', currentLang)}</option>
                  </select>
                </div>

                <div class="text-right pt-1">
                  <button type="button" onclick="Onboarding.toggleLoginMode(true)" class="text-xs text-emerald-700 font-bold hover:underline">
                    ${this.t('switchToLogin', currentLang)}
                  </button>
                </div>
              </form>
            `}
          </div>

          <div class="onboarding-footer">
            <button type="button" class="btn-secondary-action" onclick="Onboarding.goToStep(1)">
              <span>${this.t('btnBack', currentLang)}</span>
            </button>
            ${OnboardingState.isLoginMode ? `
              <button type="button" class="btn-primary-action" onclick="Onboarding.handleLogin()">
                <span>${this.t('btnLogin', currentLang)}</span>
              </button>
            ` : `
              <button type="button" class="btn-primary-action" onclick="Onboarding.validateAndGoToStep3()">
                <span>${this.t('btnNext', currentLang)}</span>
              </button>
            `}
          </div>
        </div>

        <!-- SCREEN 3: Primary Crop Selection -->
        <div id="ob-screen-3" class="onboarding-screen">
          <div class="p-6 pb-2 text-center">
            <h3 id="ob-title-3" class="text-xl font-extrabold text-slate-900">${this.t('step3Title', currentLang)}</h3>
            <p id="ob-sub-3" class="text-xs text-slate-500 mt-1">${this.t('step3Sub', currentLang)}</p>
          </div>

          <div class="onboarding-form-body space-y-5">
            <div>
              <label class="form-label">${currentLang === 'hi' ? 'अपनी मुख्य फसल चुनें (केवल एक):' : currentLang === 'mr' ? 'आपले मुख्य पीक निवडा (फक्त एक):' : currentLang === 'or' ? 'ଆପଣଙ୍କ ମୁଖ୍ୟ ଫସଲ ବାଛନ୍ତୁ:' : currentLang === 'as' ? 'আপোনাৰ প্ৰধান শস্য বাছক:' : currentLang === 'kn' ? 'ನಿಮ್ಮ ಮುಖ್ಯ ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:' : 'Select primary cultivated crop (Select 1):'}</label>
              <div class="grid grid-cols-2 gap-3 text-left">
                ${[
                  { id: 'onion', en: 'Onion', hi: 'प्याज', mr: 'कांदा', or: 'ପିଆଜ', as: 'পিয়াঁজ', kn: 'ಈರುಳ್ಳಿ' },
                  { id: 'cotton', en: 'Cotton', hi: 'कपास', mr: 'कापूस', or: 'କପା', as: 'কপাহ', kn: 'ಹತ್ತಿ' },
                  { id: 'soybean', en: 'Soybean', hi: 'सोयाबीन', mr: 'सोयाबीन', or: 'ସୋୟାବିନ୍', as: 'চয়াবিন', kn: 'ಸೋಯಾಬೀನ್' },
                  { id: 'paddy', en: 'Paddy (Rice)', hi: 'धान (चावल)', mr: 'भात (धान)', or: 'ଧାନ', as: 'ধান', kn: 'ಭತ್ತ (ಅಕ್ಕಿ)' },
                  { id: 'wheat', en: 'Wheat', hi: 'गेहूं', mr: 'गहू', or: 'ଗହମ', as: 'গম', kn: 'ಗೋಧಿ' },
                  { id: 'maize', en: 'Maize (Corn)', hi: 'मक्का', mr: 'मका', or: 'ମକା', as: 'মাকৈ', kn: 'ಮೆಕ್ಕೆಜೋಳ' },
                  { id: 'bajra', en: 'Bajra (Pearl Millet)', hi: 'बाजरा', mr: 'बाजरी', or: 'ବାଜରା', as: 'বজৰা', kn: 'ಸಜ್ಜೆ' },
                  { id: 'groundnut', en: 'Groundnut (Peanut)', hi: 'मूंगफली', mr: 'भुईमूग', or: 'ଚିନାବାଦାମ', as: 'বাদাম', kn: 'ಕಡಲೆಕಾಯಿ' },
                  { id: 'pigeonpea', en: 'Pigeonpea (Arhar/Tur)', hi: 'अरहर (तुअर)', mr: 'तूर', or: 'ହରଡ଼', as: 'অৰহৰ', kn: 'ತೊಗರಿ' },
                  { id: 'pulses', en: 'Pulses (Early-Maturing)', hi: 'दलहन फसलें', mr: 'कडधान्ये', or: 'ଡାଲି ଜାତୀୟ', as: 'মাহজাতীয়', kn: 'ದ್ವಿದಳ ಧಾನ್ಯ' },
                  { id: 'sugarcane', en: 'Sugarcane', hi: 'गन्ना', mr: 'ऊस', or: 'ଆଖୁ', as: 'কুঁহियाৰ', kn: 'ಕಬ್ಬು' }
                ].map(c => `
                  <button type="button" id="crop-chip-${c.id}" 
                       class="crop-chip text-left flex items-center justify-between p-3 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm ${(form.selectedCrops && form.selectedCrops[0] === c.id) ? 'selected' : ''}"
                       onclick="Onboarding.toggleCrop('${c.id}')">
                    <span class="text-left font-bold">${c[currentLang] || c['en']}</span>
                    <span class="text-xs font-black">✓</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="onboarding-footer">
            <button type="button" class="btn-secondary-action" onclick="Onboarding.goToStep(2)">
              <span>${this.t('btnBack', currentLang)}</span>
            </button>
            <button type="button" class="btn-primary-action" onclick="Onboarding.goToStep(4)">
              <span>${this.t('btnNextStage', currentLang)}</span>
            </button>
          </div>
        </div>

        <!-- SCREEN 4: Crop Growth Stage & Final Summary -->
        <div id="ob-screen-4" class="onboarding-screen">
          <div class="p-6 pb-2 text-center">
            <h3 id="ob-title-4" class="text-xl font-extrabold text-slate-900">${this.t('step4Title', currentLang)}</h3>
            <p id="ob-sub-4" class="text-xs text-slate-500 mt-1">${this.t('step4Sub', currentLang)}</p>
          </div>

          <div class="onboarding-form-body space-y-4">
            
            <!-- 5 Growth Stages Cards -->
            <div class="stage-card-grid">
              ${CROP_STAGES.map(stage => {
                const isSelected = stage.id === form.cropStage;
                const localizedName = (stage.name && stage.name[currentLang]) || stage.name['en'];
                return `
                  <div class="stage-select-card ${isSelected ? 'active' : ''}" onclick="Onboarding.selectCropStage('${stage.id}')">
                    <div class="flex items-center space-x-3">
                      <span class="text-2xl">${stage.emoji}</span>
                      <div class="text-left">
                        <div class="font-extrabold text-sm text-slate-900">${localizedName}</div>
                        <div class="text-[11px] font-semibold text-slate-500">${stage.duration}</div>
                      </div>
                    </div>
                    <div class="stage-card-check">${isSelected ? '✓' : ''}</div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Profile Summary Card -->
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Registration Summary</div>
              <div class="grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div><strong>Farmer:</strong> <span id="summary-farmer-name">-</span></div>
                <div><strong>Language:</strong> <span id="summary-farmer-lang">-</span></div>
                <div><strong>Location:</strong> <span id="summary-farmer-loc">-</span></div>
                <div><strong>Landholding:</strong> <span id="summary-farmer-land">-</span></div>
                <div><strong>Crops:</strong> <span id="summary-farmer-crop">-</span></div>
                <div><strong>Growth Stage:</strong> <span id="summary-farmer-stage">-</span></div>
              </div>
            </div>

          </div>

          <div class="onboarding-footer">
            <button type="button" class="btn-secondary-action" onclick="Onboarding.goToStep(3)">
              <span>${this.t('btnBack', currentLang)}</span>
            </button>
            <button type="button" id="btn-save-onboarding" class="btn-primary-action" onclick="Onboarding.submitProfile()">
              <span>${submitBtnLabel}</span>
            </button>
          </div>
        </div>

      </div>
    `;
  },

  goToStep(stepNumber) {
    OnboardingState.currentStep = stepNumber;
    
    document.querySelectorAll('.onboarding-screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`ob-screen-${stepNumber}`);
    if (target) target.classList.add('active');

    const badge = document.getElementById('ob-step-badge');
    const fill = document.getElementById('ob-progress-fill');
    if (badge) badge.textContent = `Step ${stepNumber} of 4`;
    if (fill) fill.style.width = `${(stepNumber / 4) * 100}%`;

    const lang = OnboardingState.selectedLanguage;

    if (stepNumber === 4) {
      const nameEl = document.getElementById('summary-farmer-name');
      const langEl = document.getElementById('summary-farmer-lang');
      const locEl = document.getElementById('summary-farmer-loc');
      const landEl = document.getElementById('summary-farmer-land');
      const cropEl = document.getElementById('summary-farmer-crop');
      const stageEl = document.getElementById('summary-farmer-stage');
      const locObj = SUPPORTED_ONBOARDING_LOCALES[lang] || SUPPORTED_ONBOARDING_LOCALES.en;

      if (nameEl) nameEl.textContent = OnboardingState.formData.farmerName || 'Farmer';
      if (langEl) langEl.textContent = `${locObj.native} (${locObj.name})`;
      if (locEl) locEl.textContent = `${OnboardingState.formData.district}, ${OnboardingState.formData.state}`;
      if (landEl) landEl.textContent = `${OnboardingState.formData.landArea} ${OnboardingState.formData.landUnit}`;
      if (cropEl) cropEl.textContent = this.getSelectedCropDisplay(lang);
      if (stageEl) stageEl.textContent = this.getSelectedStageDisplay(lang);
    }
  },

  selectLanguage(langCode) {
    const cleanLang = (langCode || 'en').split('-')[0].toLowerCase();
    OnboardingState.selectedLanguage = cleanLang;
    localStorage.setItem('sk_locale', cleanLang);

    document.querySelectorAll('.lang-select-card').forEach(card => card.classList.remove('active'));
    const activeCard = document.getElementById(`lang-card-${cleanLang}`);
    if (activeCard) activeCard.classList.add('active');

    this.renderOnboardingUI(OnboardingState.isEditMode);
    this.goToStep(1);

    if (typeof window.switchGlobalLanguage === 'function') {
      window.switchGlobalLanguage(cleanLang);
    } else if (window.state) {
      window.state.selectedLanguage = cleanLang;
      if (typeof window.applyI18n === 'function') window.applyI18n();
    }
  },

  selectCropStage(stageId) {
    OnboardingState.formData.cropStage = stageId;
    document.querySelectorAll('.stage-select-card').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const stageEl = document.getElementById('summary-farmer-stage');
    if (stageEl) {
      stageEl.textContent = this.getSelectedStageDisplay(OnboardingState.selectedLanguage);
    }
  },

  onStateChange(stateName) {
    OnboardingState.formData.state = stateName;
    const distSelect = document.getElementById('ob-farmer-district');
    if (distSelect) {
      const districts = STATE_DISTRICT_MAP[stateName] || STATE_DISTRICT_MAP['Maharashtra'];
      distSelect.innerHTML = districts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      if (districts.length > 0) {
        OnboardingState.formData.district = districts[0].id;
      }
    }
  },

  setLandUnit(unit) {
    OnboardingState.formData.landUnit = unit;
    document.getElementById('unit-btn-ha')?.classList.toggle('active', unit === 'hectares');
    document.getElementById('unit-btn-acres')?.classList.toggle('active', unit === 'acres');
  },

  toggleCrop(cropId) {
    OnboardingState.formData.selectedCrops = [cropId];
    document.querySelectorAll('.crop-chip').forEach(chip => {
      chip.classList.remove('selected');
    });
    const chip = document.getElementById(`crop-chip-${cropId}`);
    if (chip) chip.classList.add('selected');
  },

  toggleLoginMode(isLogin) {
    OnboardingState.isLoginMode = isLogin;
    this.renderOnboardingUI(OnboardingState.isEditMode);
    this.goToStep(2);
  },

  validateAndGoToStep3() {
    const nameInput = document.getElementById('ob-farmer-name');
    const phoneInput = document.getElementById('ob-farmer-phone');
    const stateInput = document.getElementById('ob-farmer-state');
    const districtInput = document.getElementById('ob-farmer-district');
    const landInput = document.getElementById('ob-land-area');
    const soilInput = document.getElementById('ob-soil-type');
    const irrInput = document.getElementById('ob-farmer-irrigation');
    const borewellInput = document.getElementById('ob-borewell-failed');
    const pmfbyInput = document.getElementById('ob-pmfby');
    const kccInput = document.getElementById('ob-kcc');
    const debtInput = document.getElementById('ob-informal-debt');
    const loanDateInput = document.getElementById('ob-loan-due-date');
    const loanAmtInput = document.getElementById('ob-loan-amount');
    const deviceInput = document.getElementById('ob-device-type');

    let valid = true;

    if (!nameInput || !nameInput.value.trim()) {
      document.getElementById('err-farmer-name')?.classList.add('visible');
      valid = false;
    } else {
      document.getElementById('err-farmer-name')?.classList.remove('visible');
    }

    const cleanPhone = (phoneInput?.value || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      document.getElementById('err-farmer-phone')?.classList.add('visible');
      valid = false;
    } else {
      document.getElementById('err-farmer-phone')?.classList.remove('visible');
    }

    if (!valid) return;

    OnboardingState.formData.farmerName = nameInput.value.trim();
    OnboardingState.formData.phone = cleanPhone;
    OnboardingState.formData.state = stateInput?.value || 'Maharashtra';
    OnboardingState.formData.district = districtInput?.value || 'D1';
    OnboardingState.formData.landArea = parseFloat(landInput?.value || '1.2');
    OnboardingState.formData.soilType = soilInput?.value || 'black';
    OnboardingState.formData.irrigationType = irrInput?.value || 'rainfed';
    OnboardingState.formData.borewellFailed = borewellInput ? borewellInput.checked : false;
    OnboardingState.formData.hasPmfby = pmfbyInput ? pmfbyInput.checked : true;
    OnboardingState.formData.hasKcc = kccInput ? kccInput.checked : true;
    OnboardingState.formData.informalDebt = debtInput ? debtInput.checked : false;
    OnboardingState.formData.loanDueDate = loanDateInput?.value || '2026-11-15';
    OnboardingState.formData.loanAmount = parseFloat(loanAmtInput?.value || '50000');
    OnboardingState.formData.deviceType = deviceInput?.value || 'android_smartphone';

    this.goToStep(3);
  },

  async handleLogin() {
    const input = document.getElementById('ob-login-input');
    const val = input?.value.trim();
    if (!val) return;

    try {
      const data = await AuthService.login(val);
      this.hideModal();
      
      const chosenLang = (OnboardingState.selectedLanguage || localStorage.getItem('sk_locale') || 'en').split('-')[0].toLowerCase();
      localStorage.setItem('sk_locale', chosenLang);

      if (typeof window.loadFarmersList === 'function') {
        await window.loadFarmersList();
      }
      if (typeof window.selectFarmer === 'function') {
        await window.selectFarmer(data.user.id);
      }
      if (typeof window.switchGlobalLanguage === 'function') {
        await window.switchGlobalLanguage(chosenLang);
      }
      if (typeof window.showTTSToast === 'function') {
        window.showTTSToast(`Welcome back, ${data.user.name}! 🌾`);
      }
    } catch (e) {
      alert(e.message || 'Login failed. Please check phone number or ID.');
    }
  },

  async submitProfile() {
    const saveBtn = document.getElementById('btn-save-onboarding');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span>⏳ Saving Profile...</span>`;
    }

    const langKey = OnboardingState.selectedLanguage;
    const bcp47 = OnboardingState.getBcp47Locale(langKey);
    const voice = OnboardingState.getVoiceProfile(langKey);
    const f = OnboardingState.formData;

    const payload = {
      farmer_name: f.farmerName,
      phone_number: f.phone,
      state: f.state,
      district: f.district,
      land_details: {
        total_area: f.landArea,
        unit: f.landUnit,
        soil_type: f.soilType
      },
      primary_crops: f.selectedCrops,
      crop_stage: f.cropStage,
      irrigation_type: f.irrigationType,
      borewell_failed: f.borewellFailed,
      has_pmfby: f.hasPmfby,
      has_kcc: f.hasKcc,
      informal_debt: f.informalDebt,
      loan_due_date: f.loanDueDate,
      loan_amount: f.loanAmount,
      device_type: f.deviceType,
      preferred_language: bcp47,
      tts_locale: bcp47,
      voice_profile: voice
    };

    try {
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      console.log('✅ Farmer profile saved successfully:', data);

      localStorage.setItem('sk_onboarding_completed', 'true');
      localStorage.setItem('sk_onboarding_profile', JSON.stringify(payload));
      localStorage.setItem('sk_locale', langKey);
      AuthService.setToken(data.access_token);
      AuthService.setUser(data.user || { id: data.farmer_id, name: payload.farmer_name });

      this.hideModal();

      const targetLang = (langKey || 'en').split('-')[0].toLowerCase();
      localStorage.setItem('sk_locale', targetLang);

      if (typeof window.loadFarmersList === 'function') {
        await window.loadFarmersList();
      } else if (typeof window.fetchFarmers === 'function') {
        await window.fetchFarmers();
      }

      const savedId = data.farmer_id || (data.user && data.user.id) || OnboardingState.formData.farmerId;
      if (savedId && typeof window.selectFarmer === 'function') {
        await window.selectFarmer(savedId);
      }

      if (typeof window.switchGlobalLanguage === 'function') {
        await window.switchGlobalLanguage(targetLang);
      }

      // Welcome voice greeting in user's preferred language using our voice system
      AudioTTSController.stopCurrentAndPlayNext(langKey);

    } catch (err) {
      console.error('Failed to submit onboarding profile:', err);
      alert('Could not save profile to server. Please try again.');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span>Try Again</span>`;
      }
    }
  }
};

// Global expose
window.Onboarding = Onboarding;
window.AuthService = AuthService;
window.AudioTTSController = AudioTTSController;

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    Onboarding.init();
  }, 100);
});
