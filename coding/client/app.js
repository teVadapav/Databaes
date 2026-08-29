/**
 * Smart Krishi — Kisan Sahayak (Sundargarh, Odisha)
 * Frontend Application Logic (Vanilla JS)
 */

// Application State
const state = {
  activeView: 'farmer',         // 'farmer' | 'dashboard' | 'officer'
  selectedFarmerId: 'F1',
  selectedLanguage: 'or',       // Default to Odia for Sundargarh
  activeFarmerTab: 'advisory',  // 'advisory' | 'mandi' | 'weather' | 'schemes'
  farmers: [],
  currentFarmer: null,
  currentAdvisory: null,
  currentDistress: null,
  officerFarmers: [],
  officerMetrics: {},
  selectedOfficerFarmer: null,
  isSpeaking: false
};

const API_BASE = '/api';

// Date Formatter Helper: YYYY-MM-DD -> DD/MM/YYYY
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
}

// UI Translations Dictionary
const I18N = {
  or: {
    appTitle: "Farmer App",
    myProfile: "My Profile (ତଥ୍ୟ)",
    officerPanel: "Officer Panel",
    listenBtn: "ଶୁଣନ୍ତୁ • Listen Advisory",
    updateBtn: "Update Info (ତଥ୍ୟ ବଦଳାନ୍ତୁ)",
    tabAdvisory: "My Advisory",
    tabAdvisorySub: "ମୋର ପରାମର୍ଶ",
    tabMandi: "Mandi Price",
    tabMandiSub: "ମଣ୍ଡି ଦର ଓ ଏମଏସପି",
    tabWeather: "Weather & Alerts",
    tabWeatherSub: "ପାଣିପାଗ ଓ ବର୍ଷା",
    tabSchemes: "Govt Schemes",
    tabSchemesSub: "ସରକାରୀ ଯୋଜନା",
    saveProfileBtn: "Save My Info & Update App (ପ୍ରୋଫାଇଲ ସଂରକ୍ଷଣ କରନ୍ତୁ)",
    mandiAlertTitle: "Price Alert: Mandi Price is Below Government MSP!",
    mandiAlertDesc: "Do not sell in panic. Register at APMC MSP procurement center or apply for WDRA warehouse pledge loan.",
    rainfedText: "Rainfed (କେବଳ ବର୍ଷା)",
    irrigatedText: "Protective Well (କୂପ)",
    canalText: "Canal (କେନାଲ)",
  },
  hi: {
    appTitle: "किसान ऐप",
    myProfile: "मेरी प्रोफाइल (जानकारी)",
    officerPanel: "अधिकारी पैनल",
    listenBtn: "सुनें • Listen Advisory",
    updateBtn: "जानकारी बदलें",
    tabAdvisory: "मेरी सलाह",
    tabAdvisorySub: "फसल सलाह",
    tabMandi: "मंडी भाव",
    tabMandiSub: "मंडी भाव व MSP",
    tabWeather: "मौसम व अलर्ट",
    tabWeatherSub: "वर्षा स्थिति",
    tabSchemes: "सरकारी योजनाएं",
    tabSchemesSub: "योजनाएं व सहायता",
    saveProfileBtn: "जानकारी सहेजें (Save Info)",
    mandiAlertTitle: "भाव चेतावनी: मंडी भाव सरकारी एमएसपी से कम है!",
    mandiAlertDesc: "घबराहट में कम दाम पर फसल न बेचें। ई-नाम (e-NAM) पर पंजीकरण करें या गोदाम रसीद पर ऋण प्राप्त करें।",
    rainfedText: "वर्षा आधारित (Rainfed)",
    irrigatedText: "सिंचित (Well/Borewell)",
    canalText: "नहरी (Canal)",
  },
  en: {
    appTitle: "Farmer App",
    myProfile: "My Profile",
    officerPanel: "Officer Panel",
    listenBtn: "Listen Advisory 🔊",
    updateBtn: "Update Farm Info ✏️",
    tabAdvisory: "My Advisory",
    tabAdvisorySub: "Crop Advisory",
    tabMandi: "Mandi Price",
    tabMandiSub: "APMC vs Govt MSP",
    tabWeather: "Weather & Alerts",
    tabWeatherSub: "Rainfall Status",
    tabSchemes: "Govt Schemes",
    tabSchemesSub: "Safety Nets & Aid",
    saveProfileBtn: "Save Profile & Update Advisory",
    mandiAlertTitle: "Price Alert: Today's Price is Below Government MSP!",
    mandiAlertDesc: "Do not sell in panic. Register at designated APMC MSP procurement center or apply for WDRA warehouse pledge loan.",
    rainfedText: "Rainfed",
    irrigatedText: "Protective Well",
    canalText: "Canal",
  }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Smart Krishi (Sundargarh, Odisha)...');
  await loadInitialData();
});

async function loadInitialData() {
  try {
    const res = await fetch(`${API_BASE}/farmers`);
    state.farmers = await res.json();

    populateFarmerSelects();

    if (state.farmers.length > 0) {
      await selectFarmer(state.farmers[0].id);
    }

    await fetchOfficerData();
  } catch (err) {
    console.error('Error loading initial data:', err);
  }
}

function populateFarmerSelects() {
  const select = document.getElementById('farmer-select');
  if (select) {
    select.innerHTML = state.farmers.map(f => `
      <option value="${f.id}">
        ${f.name} — ${f.crop} (${f.village}, ${f.district_name || f.district_id})
      </option>
    `).join('');
  }
}

// --- GLOBAL VIEW NAVIGATION ---
function switchMainView(viewName) {
  state.activeView = viewName;
  stopSpeech();

  const views = {
    farmer: document.getElementById('view-farmer'),
    dashboard: document.getElementById('view-dashboard'),
    sandbox: document.getElementById('view-sandbox'),
    officer: document.getElementById('view-officer')
  };

  const navBtns = {
    farmer: document.getElementById('nav-farmer-btn'),
    dashboard: document.getElementById('nav-dashboard-btn'),
    sandbox: document.getElementById('nav-sandbox-btn'),
    officer: document.getElementById('nav-officer-btn')
  };

  // Top quick bar is shown on farmer & dashboard views
  const quickBar = document.getElementById('top-quick-bar');
  if (quickBar) {
    if (viewName === 'farmer' || viewName === 'dashboard') {
      quickBar.classList.remove('hidden');
    } else {
      quickBar.classList.add('hidden');
    }
  }

  Object.keys(views).forEach(k => {
    if (views[k]) {
      if (k === viewName) {
        views[k].classList.remove('hidden');
        views[k].classList.add('block');
      } else {
        views[k].classList.add('hidden');
        views[k].classList.remove('block');
      }
    }

    if (navBtns[k]) {
      if (k === viewName) {
        navBtns[k].className = "px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all bg-emerald-600 text-white shadow";
      } else {
        navBtns[k].className = "px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all text-emerald-200 hover:text-white hover:bg-emerald-800";
      }
    }
  });

  if (viewName === 'dashboard') {
    populateProfileForm();
  } else if (viewName === 'officer') {
    fetchOfficerData();
  }
}

// --- LANGUAGE SWITCHING ---
function setLanguage(lang) {
  state.selectedLanguage = lang;

  // Update quick buttons
  ['or', 'hi', 'en'].forEach(l => {
    const btn = document.getElementById(`btn-lang-${l}`);
    if (btn) {
      if (l === lang) {
        btn.className = "px-3 py-1.5 rounded-lg text-xs font-black transition-all bg-emerald-700 text-white shadow-sm";
      } else {
        btn.className = "px-3 py-1.5 rounded-lg text-xs font-black transition-all text-slate-700 hover:text-emerald-900";
      }
    }
  });

  // Update radio in dashboard form
  const radios = document.getElementsByName('profile_language');
  radios.forEach(r => {
    if (r.value === lang) {
      r.checked = true;
      r.parentElement.className = "cursor-pointer border-2 rounded-xl p-3 text-center transition-all bg-white border-emerald-600 font-black text-emerald-900";
    } else {
      r.checked = false;
      r.parentElement.className = "cursor-pointer border-2 rounded-xl p-3 text-center transition-all bg-white border-slate-200 font-bold text-slate-700";
    }
  });

  // Update UI Labels
  applyI18nLabels();

  // Re-render views with selected language
  renderFarmerHero();
  renderFarmerAdvisory();
  renderFarmerMandi();
  renderFarmerWeather();
  renderFarmerSchemes();
}

function applyI18nLabels() {
  const t = I18N[state.selectedLanguage] || I18N.or;

  const map = {
    'lbl-nav-app': t.appTitle,
    'lbl-nav-profile': t.myProfile,
    'lbl-nav-officer': t.officerPanel,
    'hero-audio-label': t.listenBtn,
    'hero-edit-label': t.updateBtn,
    'btn-title-advisory': t.tabAdvisory,
    'btn-sub-advisory': t.tabAdvisorySub,
    'btn-title-mandi': t.tabMandi,
    'btn-sub-mandi': t.tabMandiSub,
    'btn-title-weather': t.tabWeather,
    'btn-sub-weather': t.tabWeatherSub,
    'btn-title-schemes': t.tabSchemes,
    'btn-sub-schemes': t.tabSchemesSub,
    'btn-save-profile-lbl': t.saveProfileBtn,
    'mandi-warning-title': t.mandiAlertTitle,
    'mandi-warning-desc': t.mandiAlertDesc
  };

  Object.entries(map).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  });
}

async function selectFarmer(farmerId) {
  state.selectedFarmerId = farmerId;
  const farmer = state.farmers.find(f => f.id === farmerId);
  state.currentFarmer = farmer;

  if (farmer && farmer.language) {
    state.selectedLanguage = farmer.language;
  }

  const farmerSelect = document.getElementById('farmer-select');
  if (farmerSelect) farmerSelect.value = farmerId;

  // Set language selector buttons
  setLanguage(state.selectedLanguage);

  try {
    const [advRes, disRes] = await Promise.all([
      fetch(`${API_BASE}/farmers/${farmerId}/advisory`),
      fetch(`${API_BASE}/farmers/${farmerId}/distress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    ]);

    state.currentAdvisory = await advRes.json();
    state.currentDistress = await disRes.json();

    renderFarmerHero();
    renderFarmerAdvisory();
    renderFarmerMandi();
    renderFarmerWeather();
    renderFarmerSchemes();

  } catch (err) {
    console.error('Error fetching farmer details:', err);
  }
}

async function onFarmerSelected(farmerId) {
  await selectFarmer(farmerId);
}

// --- 4 ACTION TABS NAVIGATION ---
function selectFarmerTab(tabName) {
  state.activeFarmerTab = tabName;
  stopSpeech();

  const tabs = ['advisory', 'mandi', 'weather', 'schemes'];
  tabs.forEach(t => {
    const content = document.getElementById(`farmer-tab-${t}-content`);
    const btn = document.getElementById(`btn-tab-${t}`);

    if (content) {
      if (t === tabName) {
        content.classList.remove('hidden');
        content.classList.add('block');
      } else {
        content.classList.add('hidden');
        content.classList.remove('block');
      }
    }

    if (btn) {
      if (t === tabName) {
        btn.className = "farmer-action-btn touch-target p-4 sm:p-5 rounded-2xl border-2 border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-md flex flex-col items-center justify-center text-center space-y-1.5 ring-4 ring-emerald-500/20";
      } else {
        btn.className = "farmer-action-btn touch-target p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold shadow-sm flex flex-col items-center justify-center text-center space-y-1.5";
      }
    }
  });
}

// --- RENDERING FARMER VIEWS ---
function renderFarmerHero() {
  const f = state.currentFarmer;
  if (!f) return;

  const cropMap = {
    paddy: { or: "ଧାନ (Paddy)", hi: "धान (Paddy)", en: "Paddy" },
    maize: { or: "ମକା (Maize)", hi: "मक्का (Maize)", en: "Maize" },
    arhar: { or: "ଅରହର (Arhar)", hi: "अरहर (Arhar)", en: "Arhar / Pigeonpea" },
    tomato: { or: "ବିଲାତି (Tomato)", hi: "टमाटर (Tomato)", en: "Tomato" }
  };

  const cropText = cropMap[f.crop.toLowerCase()]?.[state.selectedLanguage] || f.crop.toUpperCase();
  const t = I18N[state.selectedLanguage] || I18N.or;

  const irrMap = {
    rainfed: t.rainfedText,
    protective_well: t.irrigatedText,
    canal: t.canalText
  };

  const irrText = irrMap[f.irrigation_type] || f.irrigation_type;

  document.getElementById('hero-farmer-name').textContent = f.name;
  document.getElementById('hero-village-badge').textContent = `📍 ${f.village || 'Sundargarh'}, ${f.district_name || f.district_id}`;
  document.getElementById('hero-crop').textContent = cropText;
  document.getElementById('hero-stage').textContent = f.crop_stage.toUpperCase();
  document.getElementById('hero-irrigation').textContent = irrText;
  document.getElementById('hero-land').textContent = `${f.landholding_hectares} Ha`;
}

function renderFarmerAdvisory() {
  const adv = state.currentAdvisory;
  if (!adv) return;

  const lang = state.selectedLanguage || 'or';
  const title = adv.title[lang] || adv.title['en'];
  const text = adv.text[lang] || adv.text['en'];

  document.getElementById('advisory-title-text').textContent = title;
  document.getElementById('advisory-body-text').textContent = text;

  const badge = document.getElementById('advisory-rule-badge');
  if (adv.action_type === 'market_intervention') {
    badge.className = "px-3.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white uppercase tracking-wider shadow-sm";
    badge.textContent = `🚨 MARKET INTERVENTION (${adv.rule_id})`;
  } else if (adv.action_type === 'contingency_crop_switch') {
    badge.className = "px-3.5 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-sm";
    badge.textContent = `🌾 CRIDA CONTINGENCY SWITCH (${adv.rule_id})`;
  } else {
    badge.className = "px-3.5 py-1 rounded-full text-xs font-black bg-emerald-700 text-white uppercase tracking-wider shadow-sm";
    badge.textContent = `🌱 AGRO-ADVISORY (${adv.rule_id})`;
  }

  // Contingency Crops
  const contingencyContainer = document.getElementById('contingency-crops-container');
  const contingencyList = document.getElementById('contingency-crops-list');

  if (adv.contingency_crops && adv.contingency_crops.length > 0) {
    contingencyContainer.classList.remove('hidden');
    contingencyList.innerHTML = adv.contingency_crops.map(c => `
      <div class="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-1">
        <div class="font-black text-sm text-amber-950">${c.name}</div>
        <div class="text-xs text-amber-800 font-bold">⏱ Duration: ${c.duration_days} Days</div>
        <p class="text-xs text-slate-700 mt-1">${c.rationale}</p>
      </div>
    `).join('');
  } else {
    contingencyContainer.classList.add('hidden');
  }
}

function renderFarmerMandi() {
  const adv = state.currentAdvisory;
  if (!adv || !adv.price_data) return;

  const pd = adv.price_data;
  document.getElementById('mandi-crop-badge').textContent = pd.crop.toUpperCase();
  document.getElementById('mandi-msp-val').textContent = pd.govt_msp > 0 ? pd.govt_msp.toLocaleString('en-IN') : 'N/A';
  document.getElementById('mandi-current-val').textContent = pd.current_price.toLocaleString('en-IN');
  document.getElementById('mandi-date-display').textContent = formatDate(pd.date);

  const warnBanner = document.getElementById('mandi-warning-banner');
  const shortfallText = document.getElementById('mandi-shortfall-text');

  if (pd.is_below_msp) {
    warnBanner.classList.remove('hidden');
    shortfallText.textContent = `Shortfall: -${pd.shortfall_pct}% below Govt MSP`;
  } else {
    warnBanner.classList.add('hidden');
    shortfallText.textContent = `✓ Stable (At or above MSP)`;
  }
}

function renderFarmerWeather() {
  const adv = state.currentAdvisory;
  if (!adv || !adv.weather_data) return;

  const wd = adv.weather_data;
  document.getElementById('weather-dev-val').textContent = wd.rainfall_deviation_pct < 0
    ? `${Math.abs(wd.rainfall_deviation_pct).toFixed(1)}% Deficit`
    : `+${wd.rainfall_deviation_pct.toFixed(1)}% Normal`;

  document.getElementById('weather-dry-val').textContent = `${wd.dry_spell_days} Days`;
  document.getElementById('weather-onset-val').textContent = wd.onset_status.toUpperCase();
}

function renderFarmerSchemes() {
  const dis = state.currentDistress;
  const list = document.getElementById('farmer-schemes-list');
  if (!list || !dis) return;

  list.innerHTML = interventions.map(item => `
    <div class="bg-slate-50 border border-slate-200 hover:border-emerald-500 rounded-2xl p-4 sm:p-5 space-y-2 transition">
      <div class="flex items-center justify-between">
        <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-100 text-emerald-900 uppercase tracking-wider">
          ${item.scheme_id} • ${item.scheme_name}
        </span>
        <span class="text-xs font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase">
          ${item.urgency || 'HIGH'}
        </span>
      </div>
      <div class="text-xs font-bold text-slate-600 mt-1">Trigger Reason: <span class="text-slate-800">${item.trigger}</span></div>
      <div class="text-sm font-black text-slate-900 bg-white p-3 rounded-xl border border-slate-200">
        👉 Action Required: ${item.action_item}
      </div>
    </div>
  `).join('');
}

// --- PROFILE FORM (FARMER DASHBOARD SETUP) ---
function populateProfileForm() {
  const f = state.currentFarmer;
  if (!f) return;

  document.getElementById('prof-name').value = f.name || '';
  document.getElementById('prof-village').value = f.village || '';
  document.getElementById('prof-district').value = f.district_id || 'D1';
  document.getElementById('prof-crop').value = f.crop ? f.crop.toLowerCase() : 'paddy';
  document.getElementById('prof-stage').value = f.crop_stage || 'sowing';
  document.getElementById('prof-land').value = f.landholding_hectares !== undefined ? f.landholding_hectares : 1.0;
  document.getElementById('prof-irrigation').value = f.irrigation_type || 'rainfed';
  document.getElementById('prof-borewell').checked = !!f.borewell_failed;
  document.getElementById('prof-pmfby').checked = !!f.has_pmfby_insurance;
  document.getElementById('prof-kcc').checked = !!f.has_kcc;
  document.getElementById('prof-informal').checked = !!f.informal_debt;
  
  // HTML5 <input type="date"> requires YYYY-MM-DD
  let isoDate = '';
  if (f.loan_due_date) {
    if (f.loan_due_date.includes('/')) {
      const parts = f.loan_due_date.split('/');
      if (parts.length === 3) isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else {
      isoDate = f.loan_due_date;
    }
  }
  document.getElementById('prof-loan-date').value = isoDate;
  document.getElementById('prof-loan-amount').value = f.loan_amount_inr || 0;

  // Language radio
  const radios = document.getElementsByName('profile_language');
  radios.forEach(r => {
    r.checked = (r.value === (f.language || state.selectedLanguage));
  });
}

async function handleSaveProfile(event) {
  event.preventDefault();
  if (!state.currentFarmer) return;

  const farmerId = state.currentFarmer.id || state.selectedFarmerId;
  const langRadio = document.querySelector('input[name="profile_language"]:checked');
  const chosenLang = langRadio ? langRadio.value : (state.selectedLanguage || 'or');

  const rawDate = document.getElementById('prof-loan-date').value;
  const formattedDate = rawDate ? formatDate(rawDate) : (state.currentFarmer.loan_due_date || '');

  const updates = {
    name: document.getElementById('prof-name').value.trim() || state.currentFarmer.name,
    village: document.getElementById('prof-village').value.trim() || state.currentFarmer.village,
    district_id: document.getElementById('prof-district').value || state.currentFarmer.district_id,
    language: chosenLang,
    crop: document.getElementById('prof-crop').value,
    crop_stage: document.getElementById('prof-stage').value,
    landholding_hectares: parseFloat(document.getElementById('prof-land').value) || 1.0,
    irrigation_type: document.getElementById('prof-irrigation').value,
    borewell_failed: document.getElementById('prof-borewell').checked,
    has_pmfby_insurance: document.getElementById('prof-pmfby').checked,
    has_kcc: document.getElementById('prof-kcc').checked,
    informal_debt: document.getElementById('prof-informal').checked,
    loan_due_date: formattedDate,
    loan_amount_inr: parseFloat(document.getElementById('prof-loan-amount').value) || 0
  };

  try {
    const res = await fetch(`${API_BASE}/farmers/${farmerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const result = await res.json();
    if (result.status === 'success') {
      state.currentFarmer = result.farmer;
      state.currentAdvisory = result.advisory;
      state.currentDistress = result.distress;
      state.selectedLanguage = chosenLang;

      // Update farmers array in place
      const idx = state.farmers.findIndex(f => f.id === farmerId);
      if (idx !== -1) {
        state.farmers[idx] = result.farmer;
      }
      populateFarmerSelects();
      const farmerSelect = document.getElementById('farmer-select');
      if (farmerSelect) farmerSelect.value = farmerId;

      // Set language & re-render all farmer sub-views with fresh data
      setLanguage(chosenLang);
      renderFarmerHero();
      renderFarmerAdvisory();
      renderFarmerMandi();
      renderFarmerWeather();
      renderFarmerSchemes();

      // Switch back to farmer main view and advisory tab
      switchMainView('farmer');
      selectFarmerTab('advisory');

      // Refresh officer data in background
      fetchOfficerData();
    } else {
      alert(result.detail || 'Failed to update profile.');
    }
  } catch (err) {
    console.error('Error saving profile:', err);
    alert('Failed to save profile. Please check connection.');
  }
}

// --- OFFICER DASHBOARD (AUTOMATED DECISION SUPPORT) ---
async function fetchOfficerData() {
  try {
    const res = await fetch(`${API_BASE}/officer/farmers`);
    const data = await res.json();

    state.officerFarmers = data.farmers || [];
    state.officerMetrics = data.metrics || {};

    renderOfficerMetrics();
    renderOfficerTable();
  } catch (err) {
    console.error('Error fetching officer data:', err);
  }
}

function renderOfficerMetrics() {
  const m = state.officerMetrics;
  document.getElementById('metric-total-farmers').textContent = m.total_farmers || state.officerFarmers.length;
  document.getElementById('metric-high-risk').textContent = m.high_risk_count || 0;
  document.getElementById('metric-med-risk').textContent = m.medium_risk_count || 0;
  document.getElementById('metric-low-risk').textContent = m.low_risk_count || 0;
}

function renderOfficerTable() {
  const tbody = document.getElementById('officer-table-body');
  if (!tbody) return;

  tbody.innerHTML = state.officerFarmers.map((f, idx) => {
    const riskBadgeColor = f.risk_band === 'High' ? 'bg-rose-100 text-rose-800' : f.risk_band === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
    const channelIcon = f.recommended_channel === 'ivr_or_sms' ? '☎️ Call/IVR' : '📱 App';

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3.5 px-4">
          <div class="font-black text-slate-900">${f.farmer_name}</div>
          <div class="text-xs text-slate-500">${f.phone || ''}</div>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-800">📍 ${f.village || ''}, ${f.district_name || f.district_id}</div>
          <div class="text-xs text-slate-500 font-semibold">${f.crop.toUpperCase()} (${f.crop_stage})</div>
        </td>
        <td class="py-3.5 px-4">
          <span class="px-2.5 py-1 rounded-full text-xs font-black ${riskBadgeColor}">
            ${f.distress_score.toFixed(1)} • ${f.risk_band.toUpperCase()}
          </span>
        </td>
        <td class="py-3.5 px-4 max-w-xs">
          <div class="text-xs font-bold text-slate-800 truncate">${f.top_contributing_signal?.label || 'Climate / Debt Stress'}</div>
        </td>
        <td class="py-3.5 px-4">
          <span class="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            ${f.primary_recommended_scheme || 'PMFBY'}
          </span>
        </td>
        <td class="py-3.5 px-4 text-xs font-bold text-slate-700">
          ${channelIcon}
        </td>
        <td class="py-3.5 px-4 text-right">
          <button onclick="openOfficerModal('${f.farmer_id}')" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm">
            View Details 🔍
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openOfficerModal(farmerId) {
  const f = state.officerFarmers.find(x => x.farmer_id === farmerId);
  if (!f) return;

  state.selectedOfficerFarmer = f;

  document.getElementById('modal-farmer-name').textContent = f.farmer_name;
  document.getElementById('modal-farmer-sub').textContent = `📍 ${f.village || ''}, ${f.district_name || f.district_id} • ${f.crop.toUpperCase()} (${f.crop_stage} stage)`;
  
  const riskBadge = document.getElementById('modal-risk-badge');
  riskBadge.textContent = `${f.risk_band.toUpperCase()} RISK (${f.distress_score.toFixed(1)})`;
  riskBadge.className = f.risk_band === 'High' ? 'px-3 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800' : f.risk_band === 'Medium' ? 'px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800' : 'px-3 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800';

  // Reachability note
  const isIvr = f.recommended_channel === 'ivr_or_sms';
  document.getElementById('modal-reachability-note').innerHTML = isIvr
    ? `Feature phone on 2G poor network. <strong>Dispatch Kisan Mitra VLE or make an IVR call. Do NOT rely on app push notifications.</strong>`
    : `Smartphone with good network connectivity. <strong>In-App voice & rich interactive notifications supported.</strong>`;

  // Dimension Breakdown
  const dimBox = document.getElementById('modal-dimension-breakdown');
  const pts = f.points_breakdown || {};
  const raw = f.raw_dimensions || {};

  dimBox.innerHTML = `
    <div class="py-1.5 flex justify-between text-xs font-bold">
      <span class="text-slate-600">1. Exposure (E) — Climate & Price:</span>
      <span class="font-mono text-slate-900">${pts.exposure_pts || 0} pts (Raw E: ${raw.E || 0})</span>
    </div>
    <div class="py-1.5 flex justify-between text-xs font-bold">
      <span class="text-slate-600">2. Sensitivity (S) — Irrigation:</span>
      <span class="font-mono text-slate-900">${pts.sensitivity_pts || 0} pts (Raw S: ${raw.S || 0})</span>
    </div>
    <div class="py-1.5 flex justify-between text-xs font-bold">
      <span class="text-slate-600">3. Low Adaptive Capacity (100-AC):</span>
      <span class="font-mono text-slate-900">${pts.adaptive_capacity_pts || 0} pts (Raw AC: ${raw.AC || 0})</span>
    </div>
    <div class="py-1.5 flex justify-between text-xs font-bold">
      <span class="text-slate-600">4. Mitigation Deficit (M) — Safety Net:</span>
      <span class="font-mono text-slate-900">${pts.mitigation_deficit_pts || 0} pts (Raw M: ${raw.M || 0})</span>
    </div>
    <div class="py-1.5 flex justify-between text-xs font-bold">
      <span class="text-slate-600">5. Trigger Shock (T) — Loan & Debt:</span>
      <span class="font-mono text-slate-900">${pts.trigger_pts || 0} pts (Raw T: ${raw.T || 0})</span>
    </div>
    <div class="py-1.5 flex justify-between text-xs font-bold">
      <span class="text-slate-600">6. District Fragility (DF):</span>
      <span class="font-mono text-slate-900">${pts.district_fragility_pts || 0} pts (DF: ${raw.DF || 0})</span>
    </div>
  `;

  // Explanations
  const expBox = document.getElementById('modal-explanations');
  expBox.innerHTML = (f.explanation || []).map(e => `
    <li class="flex items-start space-x-2">
      <span class="text-emerald-700 font-bold">•</span>
      <span>${e}</span>
    </li>
  `).join('');

  // Interventions
  const intBox = document.getElementById('modal-interventions');
  intBox.innerHTML = (f.recommended_interventions || []).map(i => `
    <div class="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-emerald-950 uppercase">${i.scheme_id} • ${i.scheme_name}</span>
        <span class="text-[10px] font-black text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded-full">${i.urgency || 'HIGH'}</span>
      </div>
      <p class="text-xs text-emerald-900 font-bold">${i.action_item}</p>
    </div>
  `).join('');

  document.getElementById('officer-detail-modal').classList.remove('hidden');
}

function closeOfficerModal() {
  document.getElementById('officer-detail-modal').classList.add('hidden');
}

// --- WEB SPEECH SYNTHESIS (TTS) ---
function speakCurrentAdvisory() {
  if (!state.currentAdvisory) return;

  if (state.isSpeaking) {
    stopSpeech();
    return;
  }

  const lang = state.selectedLanguage || 'or';
  const text = state.currentAdvisory.text[lang] || state.currentAdvisory.text['en'];

  if ('speechSynthesis' in window) {
    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'or') utterance.lang = 'or-IN';
    else if (lang === 'hi') utterance.lang = 'hi-IN';
    else utterance.lang = 'en-IN';

    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      state.isSpeaking = true;
      const icon = document.getElementById('hero-speaker-icon');
      if (icon) icon.textContent = '⏹️';
      const sbIcon = document.getElementById('sb-speaker-icon');
      if (sbIcon) sbIcon.textContent = '⏹️';
    };

    utterance.onend = () => {
      state.isSpeaking = false;
      const icon = document.getElementById('hero-speaker-icon');
      if (icon) icon.textContent = '🔊';
      const sbIcon = document.getElementById('sb-speaker-icon');
      if (sbIcon) sbIcon.textContent = '🔊';
    };

    utterance.onerror = () => {
      state.isSpeaking = false;
      const icon = document.getElementById('hero-speaker-icon');
      if (icon) icon.textContent = '🔊';
    };

    window.speechSynthesis.speak(utterance);
  } else {
    alert('Text-to-speech is not supported on this browser.');
  }
}
function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  state.isSpeaking = false;
  const heroIcon = document.getElementById('hero-speaker-icon');
  if (heroIcon) heroIcon.textContent = '🔊';
  const sbIcon = document.getElementById('sb-speaker-icon');
  if (sbIcon) sbIcon.textContent = '🔊';
}

// --- ENGINE SANDBOX & MVP TESTER LOGIC ---
let currentSandboxData = null;

async function runSandboxEvaluation() {
  const nameInput = document.getElementById('sb-farmer-name');
  if (!nameInput) return; // Not on sandbox view

  const payload = {
    farmer: {
      name: nameInput.value || 'Demo Farmer',
      village: 'Kuarmunda',
      district_id: document.getElementById('sb-district').value,
      crop: document.getElementById('sb-crop').value,
      crop_stage: document.getElementById('sb-stage').value,
      landholding_hectares: parseFloat(document.getElementById('sb-land').value || 1.0),
      irrigation_type: document.getElementById('sb-irrigation').value,
      borewell_failed: document.getElementById('sb-borewell-failed').checked,
      has_pmfby_insurance: document.getElementById('sb-pmfby').checked,
      has_kcc: document.getElementById('sb-kcc').checked,
      informal_debt: document.getElementById('sb-informal-debt').checked,
      loan_due_date: formatDate(document.getElementById('sb-loan-date').value),
      loan_amount_inr: 45000,
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
    const res = await fetch(`${API_BASE}/simulator/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status === 'success') {
      currentSandboxData = data;
      renderSandboxResults(data);
    }
  } catch (err) {
    console.error('Error running sandbox simulation:', err);
  }
}

function renderSandboxResults(data) {
  const adv = data.advisory;
  const dist = data.distress;
  const trace = data.decision_trace;
  const lang = data.inputs_received.language || 'or';

  // 1. Advisory Card
  const ruleBadge = document.getElementById('sb-out-rule-badge');
  if (adv.rule_id === 'R-30') {
    ruleBadge.textContent = '🚨 RULE R-30: MARKET DISTRESS OVERRIDE';
    ruleBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white uppercase tracking-wider';
  } else if (adv.rule_id === 'R-10') {
    ruleBadge.textContent = '🌾 RULE R-10: CRIDA CONTINGENCY CROP SWITCH';
    ruleBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-amber-600 text-white uppercase tracking-wider';
  } else if (adv.rule_id === 'R-15') {
    ruleBadge.textContent = '🌱 RULE R-15: DRY SPELL MOISTURE STRESS';
    ruleBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-orange-600 text-white uppercase tracking-wider';
  } else {
    ruleBadge.textContent = '🌿 RULE R-20: PHENOLOGICAL STAGE BEST PRACTICE';
    ruleBadge.className = 'px-3 py-1 rounded-full text-xs font-black bg-emerald-700 text-white uppercase tracking-wider';
  }

  const titleEl = document.getElementById('sb-out-advisory-title');
  titleEl.textContent = adv.title[lang] || adv.title['en'] || adv.title['or'];

  const textEl = document.getElementById('sb-out-advisory-text');
  textEl.textContent = adv.text[lang] || adv.text['en'] || adv.text['or'];

  // Contingency box
  const cBox = document.getElementById('sb-out-contingency-box');
  const cList = document.getElementById('sb-out-contingency-list');
  if (adv.rule_id === 'R-10' && adv.contingency_crops && adv.contingency_crops.length > 0) {
    cBox.classList.remove('hidden');
    cList.innerHTML = adv.contingency_crops.map(c => `
      <div class="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
        <div class="font-black text-amber-950 text-xs">${c.crop_name}</div>
        <div class="text-[10px] text-amber-800 font-semibold">Variety: ${c.variety} • Duration: ${c.duration_days} days</div>
      </div>
    `).join('');
  } else {
    cBox.classList.add('hidden');
  }

  // 2. Decision Trace Checklist
  const traceBox = document.getElementById('sb-out-decision-trace');
  traceBox.innerHTML = trace.map(t => {
    const isFired = t.outcome.includes('FIRED');
    const badgeColor = isFired ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200';
    
    return `
      <div class="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-mono font-black text-xs text-slate-900">${t.rule_id}:</span>
            <span class="font-bold text-slate-800 text-xs">${t.name}</span>
          </div>
          <div class="text-[11px] text-slate-500 mt-1 space-y-0.5">
            ${t.conditions.map(c => `
              <div class="flex items-center space-x-1.5">
                <span>${c.met ? '✅' : '❌'}</span>
                <span>${c.criterion}:</span>
                <strong class="${c.met ? 'text-emerald-700' : 'text-slate-500'}">Actual [${c.actual}] vs Expected [${c.expected}]</strong>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="self-start sm:self-center">
          <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${badgeColor}">
            ${t.outcome}
          </span>
        </div>
      </div>
    `;
  }).join('');

  // 3. ICAR-CRIDA 6-Dimension Calculation Matrix
  const riskBadge = document.getElementById('sb-out-risk-badge');
  riskBadge.textContent = `${dist.risk_band.toUpperCase()} RISK (${dist.distress_score.toFixed(1)})`;
  riskBadge.className = dist.risk_band === 'High' 
    ? 'px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800'
    : dist.risk_band === 'Medium'
    ? 'px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800'
    : 'px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800';

  const pts = dist.points_breakdown || {};
  const raw = dist.raw_dimensions || {};

  const dimBox = document.getElementById('sb-out-dim-matrix');
  dimBox.innerHTML = `
    <div class="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
      <div class="font-extrabold text-blue-900">E — Exposure (0.25)</div>
      <div class="text-sm font-black text-blue-950 mt-0.5">${pts.exposure_pts || 0} pts</div>
      <div class="text-[10px] text-blue-700">Raw E: ${raw.E || 0}</div>
    </div>
    <div class="p-2.5 bg-cyan-50/60 rounded-xl border border-cyan-200">
      <div class="font-extrabold text-cyan-900">S — Sensitivity (0.15)</div>
      <div class="text-sm font-black text-cyan-950 mt-0.5">${pts.sensitivity_pts || 0} pts</div>
      <div class="text-[10px] text-cyan-700">Raw S: ${raw.S || 0}</div>
    </div>
    <div class="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
      <div class="font-extrabold text-emerald-900">100-AC — Low Cap (0.15)</div>
      <div class="text-sm font-black text-emerald-950 mt-0.5">${pts.adaptive_capacity_pts || 0} pts</div>
      <div class="text-[10px] text-emerald-700">Raw AC: ${raw.AC || 0}</div>
    </div>
    <div class="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
      <div class="font-extrabold text-amber-900">M — Mitigation Gap (0.15)</div>
      <div class="text-sm font-black text-amber-950 mt-0.5">${pts.mitigation_deficit_pts || 0} pts</div>
      <div class="text-[10px] text-amber-700">Raw M: ${raw.M || 0}</div>
    </div>
    <div class="p-2.5 bg-purple-50/60 rounded-xl border border-purple-200">
      <div class="font-extrabold text-purple-900">T — Trigger Debt (0.20)</div>
      <div class="text-sm font-black text-purple-950 mt-0.5">${pts.trigger_pts || 0} pts</div>
      <div class="text-[10px] text-purple-700">Raw T: ${raw.T || 0}</div>
    </div>
    <div class="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200">
      <div class="font-extrabold text-rose-900">DF — Fragility (0.10)</div>
      <div class="text-sm font-black text-rose-950 mt-0.5">${pts.district_fragility_pts || 0} pts</div>
      <div class="text-[10px] text-rose-700">Raw DF: ${raw.DF || 0}</div>
    </div>
  `;

  // 4. Schemes List
  const schBox = document.getElementById('sb-out-schemes-list');
  schBox.innerHTML = (dist.recommended_interventions || []).map(i => `
    <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
      <div class="flex justify-between items-center">
        <span class="font-extrabold text-slate-900 text-xs">${i.scheme_id} • ${i.scheme_name}</span>
        <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">${i.urgency}</span>
      </div>
      <p class="text-[11px] text-slate-600 font-semibold">${i.action_item}</p>
    </div>
  `).join('');

  // 5. SMS Preview
  const sms = data.sms_preview || {};
  document.getElementById('sb-out-sms-body').textContent = sms.text || '';
  document.getElementById('sb-out-sms-count').textContent = `${sms.char_count || 0} chars (${sms.units || 1} SMS)`;
}

function loadSandboxPreset(presetKey) {
  if (presetKey === 'market_crash') {
    document.getElementById('sb-farmer-name').value = 'Suresh Majhi';
    document.getElementById('sb-district').value = 'D1';
    document.getElementById('sb-crop').value = 'paddy';
    document.getElementById('sb-stage').value = 'harvest';
    document.getElementById('sb-land').value = '0.9';
    document.getElementById('sb-irrigation').value = 'rainfed';
    document.getElementById('sb-borewell-failed').checked = false;
    document.getElementById('sb-pmfby').checked = false;
    document.getElementById('sb-kcc').checked = false;
    document.getElementById('sb-informal-debt').checked = true;
    document.getElementById('sb-loan-date').value = '2026-09-10';
    document.getElementById('sb-lang').value = 'or';
    document.getElementById('sb-cur-price').value = '1950';
    document.getElementById('sb-msp-price').value = '2300';
    document.getElementById('sb-rain-dev').value = '-39.3';
    document.getElementById('sb-dry-days').value = '9';
    document.getElementById('sb-onset-delay').value = '2';
  } else if (presetKey === 'monsoon_delay') {
    document.getElementById('sb-farmer-name').value = 'Pabitra Oram';
    document.getElementById('sb-district').value = 'D2';
    document.getElementById('sb-crop').value = 'maize';
    document.getElementById('sb-stage').value = 'sowing';
    document.getElementById('sb-land').value = '1.5';
    document.getElementById('sb-irrigation').value = 'rainfed';
    document.getElementById('sb-borewell-failed').checked = true;
    document.getElementById('sb-pmfby').checked = false;
    document.getElementById('sb-kcc').checked = false;
    document.getElementById('sb-informal-debt').checked = true;
    document.getElementById('sb-loan-date').value = '2026-09-20';
    document.getElementById('sb-lang').value = 'or';
    document.getElementById('sb-cur-price').value = '2100';
    document.getElementById('sb-msp-price').value = '2090';
    document.getElementById('sb-rain-dev').value = '-52.0';
    document.getElementById('sb-dry-days').value = '14';
    document.getElementById('sb-onset-delay').value = '18';
  } else if (presetKey === 'dry_spell_debt') {
    document.getElementById('sb-farmer-name').value = 'Bikash Kisan';
    document.getElementById('sb-district').value = 'D3';
    document.getElementById('sb-crop').value = 'tomato';
    document.getElementById('sb-stage').value = 'vegetative';
    document.getElementById('sb-land').value = '0.7';
    document.getElementById('sb-irrigation').value = 'protective_well';
    document.getElementById('sb-borewell-failed').checked = true;
    document.getElementById('sb-pmfby').checked = false;
    document.getElementById('sb-kcc').checked = false;
    document.getElementById('sb-informal-debt').checked = true;
    document.getElementById('sb-loan-date').value = '2026-09-02';
    document.getElementById('sb-lang').value = 'hi';
    document.getElementById('sb-cur-price').value = '1200';
    document.getElementById('sb-msp-price').value = '1500';
    document.getElementById('sb-rain-dev').value = '-44.0';
    document.getElementById('sb-dry-days').value = '11';
    document.getElementById('sb-onset-delay').value = '5';
  } else if (presetKey === 'healthy_season') {
    document.getElementById('sb-farmer-name').value = 'Dharanidhar Naik';
    document.getElementById('sb-district').value = 'D1';
    document.getElementById('sb-crop').value = 'arhar';
    document.getElementById('sb-stage').value = 'vegetative';
    document.getElementById('sb-land').value = '2.2';
    document.getElementById('sb-irrigation').value = 'canal';
    document.getElementById('sb-borewell-failed').checked = false;
    document.getElementById('sb-pmfby').checked = true;
    document.getElementById('sb-kcc').checked = true;
    document.getElementById('sb-informal-debt').checked = false;
    document.getElementById('sb-loan-date').value = '2026-12-15';
    document.getElementById('sb-lang').value = 'en';
    document.getElementById('sb-cur-price').value = '7600';
    document.getElementById('sb-msp-price').value = '7000';
    document.getElementById('sb-rain-dev').value = '4.5';
    document.getElementById('sb-dry-days').value = '2';
    document.getElementById('sb-onset-delay').value = '0';
  }

  runSandboxEvaluation();
}

function speakSandboxAdvisory() {
  if (!currentSandboxData || !currentSandboxData.advisory) return;

  if (state.isSpeaking) {
    stopSpeech();
    return;
  }

  const adv = currentSandboxData.advisory;
  const lang = currentSandboxData.inputs_received.language || 'or';
  const text = adv.text[lang] || adv.text['en'] || adv.text['or'];

  if ('speechSynthesis' in window) {
    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'or') utterance.lang = 'or-IN';
    else if (lang === 'hi') utterance.lang = 'hi-IN';
    else utterance.lang = 'en-IN';

    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      state.isSpeaking = true;
      const icon = document.getElementById('sb-speaker-icon');
      if (icon) icon.textContent = '⏹️';
    };

    utterance.onend = () => {
      state.isSpeaking = false;
      const icon = document.getElementById('sb-speaker-icon');
      if (icon) icon.textContent = '🔊';
    };

    utterance.onerror = () => {
      state.isSpeaking = false;
      const icon = document.getElementById('sb-speaker-icon');
      if (icon) icon.textContent = '🔊';
    };

    window.speechSynthesis.speak(utterance);
  }
}
