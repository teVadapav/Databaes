/**
 * Smart Krishi (PS-02) — Officer Onboarding & Quick Login System
 * Complete Multi-Step Flow with Identity Verification, Role Selection, and Session Persistence
 */

const OFFICER_LOCALES = {
  en: { code: 'en', name: 'English', native: 'English', bcp47: 'en-IN', voice: 'en-IN-NeerjaNeural', greeting: 'Welcome to the KhetSeva Officer Command Center.' },
  hi: { code: 'hi', name: 'Hindi', native: 'हिन्दी', bcp47: 'hi-IN', voice: 'hi-IN-MadhurNeural', greeting: 'खेतसेवा अधिकारी नियंत्रण केंद्र में आपका स्वागत है।' },
  or: { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', bcp47: 'or-IN', voice: 'or-IN-SubhasiniNeural', greeting: 'ଖେତସେବା ଅଧିକାରୀ କଣ୍ଟ୍ରୋଲ୍ ରୁମ୍ କୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ।' },
  mr: { code: 'mr', name: 'Marathi', native: 'मराठी', bcp47: 'mr-IN', voice: 'mr-IN-AarohiNeural', greeting: 'खेतसेवा अधिकारी नियंत्रण कक्षात आपले स्वागत आहे.' },
  as: { code: 'as', name: 'Assamese', native: 'অসমীয়া', bcp47: 'as-IN', voice: 'as-IN-YashNeural', greeting: 'খেতসেৱা বিষয়া নিয়ন্ত্ৰণ কক্ষলৈ আপোনাক স্বাগতম।' },
  kn: { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', bcp47: 'kn-IN', voice: 'kn-IN-GaganNeural', greeting: 'ಖೇತ್‌ಸೇವಾ ಅಧಿಕಾರಿ ನಿಯಂತ್ರಣ ಕೇಂದ್ರಕ್ಕೆ ತಮಗೆ ಸುಸ್ವಾಗತ.' }
};

const MOCK_OFFICER_REGISTRY = [
  {
    id: 'OFI-00',
    name: 'Dr. Manoj Ahuja, IAS',
    phone: '9810000001',
    state: 'National (All States)',
    district: 'All Districts (All India)',
    district_id: 'ALL_INDIA',
    designation: 'Union Agriculture Secretary (GoI)',
    language: 'en',
    scope: 'national'
  },
  {
    id: 'OFI-01',
    name: 'Shri Manas Ranjan Jena',
    phone: '9437019284',
    state: 'Odisha',
    district: 'Sundargarh',
    district_id: 'D_OD_SUN',
    designation: 'District Agricultural Officer (DAO)',
    language: 'or',
    scope: 'district'
  },
  {
    id: 'OFI-05',
    name: 'Shri Biswajit Rout',
    phone: '9437133445',
    state: 'Odisha',
    district: 'Kalahandi',
    district_id: 'D_OD1',
    designation: 'District Agricultural Officer (DAO)',
    language: 'or',
    scope: 'district'
  },
  {
    id: 'OFI-06',
    name: 'Smt. Jayashree Panda',
    phone: '9437266778',
    state: 'Odisha',
    district: 'Balangir',
    district_id: 'D_OD2',
    designation: 'District Agricultural Officer (DAO)',
    language: 'or',
    scope: 'district'
  },
  {
    id: 'OFI-07',
    name: 'Shri Ashok Pradhan',
    phone: '9437399881',
    state: 'Odisha',
    district: 'Bargarh',
    district_id: 'D_OD3',
    designation: 'District Agricultural Officer (DAO)',
    language: 'or',
    scope: 'district'
  },
  {
    id: 'OFI-02',
    name: 'Dr. Vijay Kulkarni',
    phone: '9421188320',
    state: 'Maharashtra',
    district: 'Nashik',
    district_id: 'D1',
    designation: 'District Agricultural Officer (DAO)',
    language: 'mr',
    scope: 'district'
  },
  {
    id: 'OFI-08',
    name: 'Shri Anand Waghmare',
    phone: '9422244556',
    state: 'Maharashtra',
    district: 'Akola',
    district_id: 'D2',
    designation: 'District Agricultural Officer (DAO)',
    language: 'mr',
    scope: 'district'
  },
  {
    id: 'OFI-03',
    name: 'Smt. Shradha Sawant',
    phone: '9423311209',
    state: 'Maharashtra',
    district: 'Yavatmal',
    district_id: 'D3',
    designation: 'District Agricultural Officer (DAO)',
    language: 'mr',
    scope: 'district'
  },
  {
    id: 'OFI-10',
    name: 'Dr. Arabinda Kumar Padhee, IAS',
    phone: '9437000100',
    state: 'Odisha',
    district: 'Statewide (All Odisha Districts)',
    district_id: 'ALL_ODISHA',
    designation: 'State Agriculture Director & Principal Secretary',
    language: 'or',
    scope: 'statewide'
  },
  {
    id: 'OFI-11',
    name: 'Dr. Vikas Rastogi, IAS',
    phone: '9422000200',
    state: 'Maharashtra',
    district: 'Statewide (All Maharashtra Districts)',
    district_id: 'ALL_MAHARASHTRA',
    designation: 'State Agriculture Commissioner & Principal Secretary',
    language: 'mr',
    scope: 'statewide'
  },
  {
    id: 'OFI-12',
    name: 'Dr. K. G. Jagadeesha, IAS',
    phone: '9448000300',
    state: 'Karnataka',
    district: 'Statewide (All Karnataka Districts)',
    district_id: 'ALL_KARNATAKA',
    designation: 'State Agriculture Commissioner & Secretary',
    language: 'kn',
    scope: 'statewide'
  },
  {
    id: 'OFI-13',
    name: 'Dr. Om Prakash, IAS',
    phone: '9435000400',
    state: 'Assam',
    district: 'Statewide (All Assam Districts)',
    district_id: 'ALL_ASSAM',
    designation: 'State Agriculture Commissioner & Secretary',
    language: 'as',
    scope: 'statewide'
  },
  {
    id: 'OFI-14',
    name: 'Dr. Devesh Chaturvedi, IAS',
    phone: '9450000500',
    state: 'Uttar Pradesh',
    district: 'Statewide (All Uttar Pradesh Districts)',
    district_id: 'ALL_UP',
    designation: 'Agriculture Production Commissioner & ACS',
    language: 'hi',
    scope: 'statewide'
  }
];

const OfficerOnboardingState = {
  currentStep: 1,
  selectedLanguage: 'en',
  isLoginMode: false,
  officerData: {
    name: '',
    phone: '',
    state: 'Odisha',
    district: 'Sundargarh',
    district_id: 'D_OD_SUN',
    designation: 'District Agricultural Officer (DAO)',
    officerIdNumber: '01'
  }
};

const OfficerOnboarding = {
  init() {
    let session = this.getSession();
    if (!session) {
      session = MOCK_OFFICER_REGISTRY[0];
      this.saveSession(session);
    }
    this.applyOfficerSession(session);
  },

  getSession() {
    try {
      const raw = localStorage.getItem('sk_officer_session');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  hasActiveSession() {
    return !!this.getSession();
  },

  saveSession(sessionData) {
    try {
      localStorage.setItem('sk_officer_session', JSON.stringify(sessionData));
    } catch (e) {
      console.warn('Failed to save officer session:', e);
    }
  },

  openSwitchModal() {
    const overlay = document.getElementById('officer-onboarding-modal-overlay');
    if (!overlay) return;

    OfficerOnboardingState.isLoginMode = true;
    this.renderUI();
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
  },

  openEditModal() {
    this.openModal(true);
  },

  openModal(forceEdit = false) {
    const overlay = document.getElementById('officer-onboarding-modal-overlay');
    if (!overlay) return;

    if (forceEdit) {
      OfficerOnboardingState.isLoginMode = false;
      OfficerOnboardingState.currentStep = 2;
      const session = this.getSession() || MOCK_OFFICER_REGISTRY[0];
      if (session) {
        const cleanDigits = (session.id || '').replace(/\D/g, '').slice(-2);
        OfficerOnboardingState.officerData = {
          name: session.name || '',
          phone: (session.phone || '').replace('+91-', '').replace('+91', '').replace(/\D/g, '').slice(-10),
          state: session.state || 'Odisha',
          district: session.district || 'Sundargarh',
          district_id: session.district_id || 'D_OD_SUN',
          designation: session.designation || 'District Agricultural Officer (DAO)',
          officerIdNumber: cleanDigits || '01'
        };
        if (session.language) {
          OfficerOnboardingState.selectedLanguage = session.language;
        }
      }
    } else {
      OfficerOnboardingState.isLoginMode = false;
      OfficerOnboardingState.currentStep = 1;
    }

    this.renderUI();
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
  },

  hideModal() {
    const overlay = document.getElementById('officer-onboarding-modal-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
  },

  selectLanguage(langCode) {
    OfficerOnboardingState.selectedLanguage = langCode;
    this.renderUI();
  },

  toggleLoginMode(isLogin) {
    OfficerOnboardingState.isLoginMode = isLogin;
    this.renderUI();
  },

  setStep(step) {
    OfficerOnboardingState.currentStep = step;
    this.renderUI();
  },

  formatOfficerId(val) {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    if (!digits) return '';
    return digits.length === 1 ? `0${digits}` : digits;
  },

  renderUI() {
    const overlay = document.getElementById('officer-onboarding-modal-overlay');
    if (!overlay) return;

    const { currentStep, selectedLanguage, isLoginMode } = OfficerOnboardingState;

    overlay.innerHTML = `
      <div class="officer-onboarding-backdrop" onclick="OfficerOnboarding.hideModal()"></div>
      <div class="officer-onboarding-modal" role="dialog" aria-modal="true">
        
        <!-- Header -->
        <div class="onboarding-header rounded-t-3xl" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%) !important;">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2 shrink-0">
              <span class="text-2xl">🏛️</span>
              <div>
                <h2 class="text-sm sm:text-base font-black tracking-tight leading-tight text-white whitespace-nowrap">Officer Command Center</h2>
                <p class="text-[10px] text-sky-300 font-semibold">Government of India • Ministry of Agriculture</p>
              </div>
            </div>

            <div class="flex items-center space-x-2 shrink-0">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                ${isLoginMode ? 'Quick Login' : `Step ${currentStep} of 2`}
              </span>
              ${this.hasActiveSession() ? `
                <button onclick="OfficerOnboarding.hideModal()" class="text-white/80 hover:text-white text-base font-bold w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 transition shrink-0" title="Close">✕</button>
              ` : ''}
            </div>
          </div>
          <div class="onboarding-progress-bar">
            <div class="onboarding-progress-fill" style="width: ${isLoginMode ? 100 : (currentStep === 1 ? 50 : 100)}%; background: linear-gradient(90deg, #38bdf8, #818cf8);"></div>
          </div>
        </div>

        <!-- Body Content -->
        <div class="p-5 sm:p-6 bg-white overflow-y-auto max-h-[75vh]">
          ${isLoginMode ? this.renderLoginScreen() : (currentStep === 1 ? this.renderStep1Language() : this.renderStep2Profile())}
        </div>

      </div>
    `;
  },

  renderStep1Language() {
    const curLang = OfficerOnboardingState.selectedLanguage;
    return `
      <div class="text-center mb-5">
        <h3 class="text-lg font-black text-slate-900">Select Administrative Language</h3>
        <p class="text-xs text-slate-500 mt-0.5">Choose your preferred language for reports, briefings, and dashboard navigation</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        ${Object.values(OFFICER_LOCALES).map(loc => `
          <div class="lang-select-card ${curLang === loc.code ? 'active' : ''}" onclick="OfficerOnboarding.selectLanguage('${loc.code}')">
            <div class="lang-card-native text-base font-bold text-slate-900">${loc.native}</div>
            <div class="lang-card-english text-[11px] text-slate-500 font-semibold">${loc.name}</div>
            <button type="button" class="lang-voice-pill mt-2" onclick="event.stopPropagation(); OfficerOnboarding.playLanguageGreeting('${loc.code}')">
              <span>🔊 Preview</span>
            </button>
          </div>
        `).join('')}
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-slate-100">
        <button type="button" onclick="OfficerOnboarding.toggleLoginMode(true)" class="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1">
          <span>🔑 Quick Officer Login</span>
        </button>
        <button type="button" onclick="OfficerOnboarding.setStep(2)" class="btn-primary-action px-5 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md">
          <span>Continue to Profile →</span>
        </button>
      </div>
    `;
  },

  renderStep2Profile() {
    const d = OfficerOnboardingState.officerData;
    return `
      <div class="text-center mb-5">
        <h3 class="text-lg font-black text-slate-900">Officer Identity & Jurisdiction</h3>
        <p class="text-xs text-slate-500 mt-0.5">Enter your official credentials and district administrative assignment</p>
      </div>

      <form id="officer-profile-form" onsubmit="event.preventDefault(); OfficerOnboarding.submitRegistration();" class="space-y-4">
        
        <!-- Officer Full Name -->
        <div>
          <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Officer Full Name *</label>
          <input type="text" id="officer-name-input" required class="form-input text-xs" placeholder="e.g. Shri Manas Ranjan Jena" value="${d.name || ''}">
        </div>

        <!-- Official Mobile Number -->
        <div>
          <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Official Mobile Number *</label>
          <div class="phone-input-wrapper">
            <span class="phone-prefix">+91</span>
            <input type="tel" id="officer-phone-input" pattern="[0-9]{10}" maxlength="10" required class="form-input phone-input text-xs" placeholder="10-digit official number" value="${d.phone || ''}">
          </div>
        </div>

        <!-- Jurisdiction State & District -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Jurisdiction State *</label>
            <select id="officer-state-input" class="form-select text-xs font-bold" onchange="OfficerOnboarding.onStateChanged(this.value)">
              <option value="Odisha" ${d.state === 'Odisha' ? 'selected' : ''}>Odisha</option>
              <option value="Maharashtra" ${d.state === 'Maharashtra' ? 'selected' : ''}>Maharashtra</option>
              <option value="Assam" ${d.state === 'Assam' ? 'selected' : ''}>Assam</option>
              <option value="Karnataka" ${d.state === 'Karnataka' ? 'selected' : ''}>Karnataka</option>
              <option value="Uttar Pradesh" ${d.state === 'Uttar Pradesh' ? 'selected' : ''}>Uttar Pradesh</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Assigned District *</label>
            <select id="officer-district-input" class="form-select text-xs font-bold">
              ${this.getDistrictsForState(d.state).map(dist => `
                <option value="${dist.id}" ${d.district_id === dist.id || d.district === dist.name ? 'selected' : ''}>${dist.name}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Designation / Role -->
        <div>
          <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Designation / Role *</label>
          <select id="officer-role-input" class="form-select text-xs font-bold">
            <option value="District Agricultural Officer (DAO)" ${d.designation.includes('DAO') ? 'selected' : ''}>District Agricultural Officer (DAO)</option>
            <option value="Block Development Officer (BDO)" ${d.designation.includes('BDO') ? 'selected' : ''}>Block Development Officer (BDO)</option>
            <option value="District Collector / ADM" ${d.designation.includes('Collector') ? 'selected' : ''}>District Collector / ADM</option>
            <option value="Assistant Agriculture Officer (AAO)" ${d.designation.includes('AAO') ? 'selected' : ''}>Assistant Agriculture Officer (AAO)</option>
          </select>
        </div>

        <!-- Officer ID Input (Auto-Formatted with OFI- prefix) -->
        <div>
          <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Officer Identification Code (1–2 Digits) *</label>
          <div class="flex items-center">
            <span class="inline-flex items-center px-3 py-2 bg-slate-800 text-emerald-400 font-mono font-black text-xs rounded-l-xl border border-r-0 border-slate-700 select-none">
              OFI-
            </span>
            <input type="text" id="officer-id-input" maxlength="2" required class="form-input rounded-l-none text-xs font-mono font-bold" placeholder="01" value="${d.officerIdNumber || '01'}" oninput="this.value = this.value.replace(/\\D/g, '')">
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Example: enter <code>1</code> for <code>OFI-01</code>, or <code>14</code> for <code>OFI-14</code>.</p>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
          <button type="button" onclick="OfficerOnboarding.setStep(1)" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
            ← Back
          </button>
          <button type="submit" class="btn-primary-action px-6 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md">
            <span>Complete Setup & Launch 🏛️</span>
          </button>
        </div>

      </form>
    `;
  },

  renderLoginScreen() {
    return `
      <div class="text-center mb-5">
        <h3 class="text-lg font-black text-slate-900">Quick Officer Login</h3>
        <p class="text-xs text-slate-500 mt-0.5">Login using your registered Officer ID or Mobile Number</p>
      </div>

      <form id="officer-login-form" onsubmit="event.preventDefault(); OfficerOnboarding.submitQuickLogin();" class="space-y-4">
        
        <!-- Officer ID / Mobile Input -->
        <div>
          <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Officer ID or Mobile Number *</label>
          <div class="flex items-center">
            <span class="inline-flex items-center px-3 py-2 bg-slate-800 text-sky-400 font-mono font-bold text-xs rounded-l-xl border border-r-0 border-slate-700 select-none">
              OFI- / 📱
            </span>
            <input type="text" id="officer-login-query" required class="form-input rounded-l-none text-xs font-bold" placeholder="e.g. 1 (for OFI-01) or 9437019284">
          </div>
          <div class="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-[11px] text-slate-600">
            <div>
              <div class="font-black text-indigo-950 mb-1 flex items-center justify-between">
                <span>🇮🇳 Apex Senior Officer (National Scope • All Farmers):</span>
                <span class="text-[9px] font-mono text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-bold">ALL FARMERS</span>
              </div>
              <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-00')" class="w-full text-left px-3 py-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/50 text-white rounded-xl text-[11px] font-extrabold hover:border-indigo-400 cursor-pointer shadow-sm flex items-center justify-between transition">
                <div class="flex items-center space-x-2">
                  <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-black text-[10px] border border-emerald-400/30">OFI-00</span>
                  <span class="text-white font-bold">Dr. Manoj Ahuja, IAS</span>
                  <span class="text-indigo-300 text-[10px] font-normal hidden sm:inline">• Union Agriculture Secretary (GoI)</span>
                </div>
                <span class="text-[10px] text-emerald-300 font-bold bg-white/10 px-2 py-0.5 rounded-md">View All Farmers →</span>
              </button>
            </div>
            <div class="pt-2 border-t border-slate-200">
              <div class="font-bold text-slate-800 mb-1">🏛️ District Officers (Strict Single District View):</div>
              <div class="flex flex-wrap gap-1.5">
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-01')" class="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-sky-700 hover:bg-sky-50 cursor-pointer">OFI-01 (Sundargarh DAO)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-05')" class="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-sky-700 hover:bg-sky-50 cursor-pointer">OFI-05 (Kalahandi DAO)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-06')" class="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-sky-700 hover:bg-sky-50 cursor-pointer">OFI-06 (Balangir DAO)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-07')" class="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-sky-700 hover:bg-sky-50 cursor-pointer">OFI-07 (Bargarh DAO)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-02')" class="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-sky-700 hover:bg-sky-50 cursor-pointer">OFI-02 (Nashik DAO)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-08')" class="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-sky-700 hover:bg-sky-50 cursor-pointer">OFI-08 (Akola DAO)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-03')" class="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-sky-700 hover:bg-sky-50 cursor-pointer">OFI-03 (Yavatmal DAO)</button>
              </div>
            </div>
            <div class="pt-2 border-t border-slate-200">
              <div class="font-bold text-amber-900 mb-1">⭐ Senior State Officers (Full Statewide Jurisdiction):</div>
              <div class="flex flex-wrap gap-1.5">
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-10')" class="px-2.5 py-1 bg-amber-100/80 border border-amber-300 rounded-lg text-[10px] font-black text-amber-900 hover:bg-amber-200 cursor-pointer shadow-2xs">OFI-10 (State Director • Odisha)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-11')" class="px-2.5 py-1 bg-amber-100/80 border border-amber-300 rounded-lg text-[10px] font-black text-amber-900 hover:bg-amber-200 cursor-pointer shadow-2xs">OFI-11 (State Commissioner • Maharashtra)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-12')" class="px-2.5 py-1 bg-amber-100/80 border border-amber-300 rounded-lg text-[10px] font-black text-amber-900 hover:bg-amber-200 cursor-pointer shadow-2xs">OFI-12 (State Commissioner • Karnataka)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-13')" class="px-2.5 py-1 bg-amber-100/80 border border-amber-300 rounded-lg text-[10px] font-black text-amber-900 hover:bg-amber-200 cursor-pointer shadow-2xs">OFI-13 (State Commissioner • Assam)</button>
                <button type="button" onclick="OfficerOnboarding.loginDirectly('OFI-14')" class="px-2.5 py-1 bg-amber-100/80 border border-amber-300 rounded-lg text-[10px] font-black text-amber-900 hover:bg-amber-200 cursor-pointer shadow-2xs">OFI-14 (State APC • Uttar Pradesh)</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
          <button type="button" onclick="OfficerOnboarding.toggleLoginMode(false)" class="text-xs font-bold text-sky-600 hover:text-sky-800">
            ← New Officer Setup
          </button>
          <button type="submit" class="btn-primary-action px-6 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md">
            <span>Log In to Dashboard →</span>
          </button>
        </div>

      </form>
    `;
  },

  getDistrictsForState(stateName) {
    const map = {
      Odisha: [
        { id: 'D_OD_SUN', name: 'Sundargarh' },
        { id: 'D_OD1', name: 'Kalahandi' },
        { id: 'D_OD2', name: 'Balangir' },
        { id: 'D_OD3', name: 'Bargarh' }
      ],
      Maharashtra: [
        { id: 'D1', name: 'Nashik' },
        { id: 'D2', name: 'Akola' },
        { id: 'D3', name: 'Yavatmal' }
      ],
      Assam: [
        { id: 'D_AS1', name: 'Nagaon' },
        { id: 'D_AS2', name: 'Golaghat' },
        { id: 'D_AS3', name: 'Barpeta' }
      ],
      Karnataka: [
        { id: 'D_KN1', name: 'Raichur' },
        { id: 'D_KN2', name: 'Belagavi' },
        { id: 'D_KN3', name: 'Dharwad' }
      ],
      'Uttar Pradesh': [
        { id: 'D_UP1', name: 'Varanasi' },
        { id: 'D_UP2', name: 'Prayagraj' },
        { id: 'D_UP3', name: 'Gorakhpur' }
      ]
    };
    return map[stateName] || map['Odisha'];
  },

  onStateChanged(stateName) {
    OfficerOnboardingState.officerData.state = stateName;
    const distSelect = document.getElementById('officer-district-input');
    if (distSelect) {
      const dists = this.getDistrictsForState(stateName);
      distSelect.innerHTML = dists.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      OfficerOnboardingState.officerData.district = dists[0].name;
      OfficerOnboardingState.officerData.district_id = dists[0].id;
    }
  },

  playLanguageGreeting(langCode) {
    const loc = OFFICER_LOCALES[langCode] || OFFICER_LOCALES.en;
    if (typeof window.speakText === 'function') {
      window.speakText(loc.greeting, langCode, `officer-greeting-${langCode}`);
    }
  },

  submitRegistration() {
    const name = document.getElementById('officer-name-input')?.value.trim();
    const phone = document.getElementById('officer-phone-input')?.value.trim();
    const stateVal = document.getElementById('officer-state-input')?.value;
    const distSelect = document.getElementById('officer-district-input');
    const distId = distSelect?.value || 'D_OD_SUN';
    const distName = distSelect?.options[distSelect.selectedIndex]?.text || 'Sundargarh';
    const role = document.getElementById('officer-role-input')?.value || 'District Agricultural Officer (DAO)';
    const rawId = document.getElementById('officer-id-input')?.value.trim() || '1';

    const formattedIdNum = rawId.length === 1 ? `0${rawId}` : rawId;
    const fullId = `OFI-${formattedIdNum}`;

    const sessionData = {
      id: fullId,
      name: name || 'Administrative Officer',
      phone: `+91-${phone}`,
      state: stateVal,
      district: distName,
      district_id: distId,
      designation: role,
      language: OfficerOnboardingState.selectedLanguage
    };

    this.saveSession(sessionData);
    this.applyOfficerSession(sessionData);
    this.hideModal();
  },

  loginDirectly(officerId) {
    const norm = officerId.toUpperCase().startsWith('OFI-') ? officerId.toUpperCase() : `OFI-${officerId.padStart(2, '0')}`;
    const found = MOCK_OFFICER_REGISTRY.find(o => o.id.toUpperCase() === norm);
    if (found) {
      this.saveSession(found);
      this.applyOfficerSession(found);
      this.hideModal();
    }
  },

  submitQuickLogin() {
    const rawQuery = (document.getElementById('officer-login-query')?.value || '').trim();
    if (!rawQuery) {
      alert('Please enter an Officer ID (e.g. 01 or OFI-01) or Mobile Number.');
      return;
    }

    const cleanDigits = rawQuery.replace(/\D/g, '');
    const cleanId = rawQuery.toUpperCase().startsWith('OFI-') 
      ? rawQuery.toUpperCase() 
      : (cleanDigits ? `OFI-${cleanDigits.padStart(2, '0')}` : '');

    // 1. Strict exact ID matching
    let found = MOCK_OFFICER_REGISTRY.find(o => 
      o.id.toUpperCase() === cleanId || 
      o.id.toUpperCase() === `OFI-${cleanDigits}` ||
      o.id.toLowerCase() === rawQuery.toLowerCase()
    );

    // 2. Phone matching ONLY for full phone queries (7+ digits)
    if (!found && cleanDigits.length >= 7) {
      found = MOCK_OFFICER_REGISTRY.find(o => 
        (o.phone || '').replace(/\D/g, '').includes(cleanDigits)
      );
    }

    if (!found) {
      found = {
        id: cleanId || 'OFI-01',
        name: 'Officer ' + (cleanId || 'User'),
        phone: '+91-94370-19284',
        state: 'Odisha',
        district: 'Sundargarh',
        district_id: 'D_OD_SUN',
        designation: 'District Agricultural Officer (DAO)',
        language: 'en',
        scope: 'district'
      };
    }

    this.saveSession(found);
    this.applyOfficerSession(found);
    this.hideModal();
  },

  applyOfficerSession(session) {
    const nameEl = document.getElementById('officer-display-name');
    const idEl = document.getElementById('officer-display-id');
    const roleEl = document.getElementById('officer-display-role');

    if (nameEl) nameEl.textContent = `Officer: ${session.name}`;
    if (idEl) idEl.textContent = `ID: ${session.id}`;
    if (roleEl) roleEl.textContent = `${session.designation} • ${session.district}, ${session.state}`;

    const distFilter = document.getElementById('officer-district-select');
    if (distFilter && session.district_id) {
      distFilter.value = session.district_id;
      if (typeof window.filterDistrictData === 'function') {
        window.filterDistrictData(session.district_id);
      }
    }

    const langSelect = document.getElementById('officer-lang-select');
    if (langSelect && session.language) {
      langSelect.value = session.language;
    }

    if (typeof window.fetchOfficerData === 'function') {
      window.fetchOfficerData();
    }

    console.log(`👨‍💼 Active Officer Session Loaded: ${session.name} (${session.id})`);
  }
};

window.OfficerOnboarding = OfficerOnboarding;
