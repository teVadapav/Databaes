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
  isSpeaking: false
};

// API Base URL (relative path)
const API_BASE = '/api';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Smart Krishi v3 App...');
  await loadInitialData();
});

async function loadInitialData() {
  try {
    // 1. Fetch all farmers
    const res = await fetch(`${API_BASE}/farmers`);
    state.farmers = await res.json();

    // Populate dropdowns
    populateFarmerSelects();

    // Set initial farmer (F1 - Ramesh Patil)
    if (state.farmers.length > 0) {
      await selectFarmer(state.farmers[0].id);
    }

    // 2. Fetch initial Officer Dashboard data
    await fetchOfficerData();

    // 3. Initialize IVR Simulator
    await startIvrCall();

  } catch (err) {
    console.error('Error loading initial data:', err);
  }
}

function populateFarmerSelects() {
  const farmerSelect = document.getElementById('farmer-select');
  const simSelect = document.getElementById('sim-farmer-select');

  if (farmerSelect) {
    farmerSelect.innerHTML = state.farmers.map(f => `
      <option value="${f.id}">
        ${f.name} — ${f.crop} (${f.district_name || f.district_id})
      </option>
    `).join('');
  }

  if (simSelect) {
    simSelect.innerHTML = state.farmers.map(f => `
      <option value="${f.id}">
        ${f.name} (${f.device_type === 'feature_phone' ? '☎️ Basic' : '📱 Smart'})
      </option>
    `).join('');
  }
}

// --- GLOBAL VIEW NAVIGATION ---
function switchMainView(viewName) {
  state.activeView = viewName;

  // Stop any active speech when switching views
  stopSpeech();

  // Update tabs UI
  const views = {
    farmer: document.getElementById('view-farmer'),
    officer: document.getElementById('view-officer'),
    simulator: document.getElementById('view-simulator')
  };

  const navBtns = {
    farmer: document.getElementById('nav-farmer-btn'),
    officer: document.getElementById('nav-officer-btn'),
    simulator: document.getElementById('nav-simulator-btn')
  };

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
        navBtns[k].className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all bg-emerald-600 text-white shadow";
      } else {
        navBtns[k].className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all text-slate-300 hover:text-white hover:bg-slate-700";
      }
    }
  });

  if (viewName === 'officer') {
    fetchOfficerData();
  }
}

// --- MODULE 1: FARMER APP CONTROLS ---

function setFarmerAccessMode(mode) {
  state.farmerAccessMode = mode;
  const btnAssisted = document.getElementById('btn-mode-assisted');
  const btnSelf = document.getElementById('btn-mode-self');

  if (mode === 'assisted') {
    btnAssisted.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all bg-emerald-700 text-white shadow-sm";
    btnSelf.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all text-slate-600 hover:text-slate-900";
  } else {
    btnSelf.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all bg-emerald-700 text-white shadow-sm";
    btnAssisted.className = "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-all text-slate-600 hover:text-slate-900";
  }
}

async function onFarmerSelected(farmerId) {
  await selectFarmer(farmerId);
}

function onLanguageChanged(lang) {
  state.selectedLanguage = lang;
  renderFarmerAdvisory();
  renderFarmerAlerts();
}

async function selectFarmer(farmerId) {
  state.selectedFarmerId = farmerId;
  const farmer = state.farmers.find(f => f.id === farmerId);
  state.currentFarmer = farmer;

  // Auto-set default UI mode based on Adaptive Capacity
  if (farmer && farmer.default_ui_mode) {
    setFarmerAccessMode(farmer.default_ui_mode);
  }

  // Pre-select language preference
  if (farmer && farmer.language) {
    state.selectedLanguage = farmer.language;
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = farmer.language;
  }

  // Update Farmer Selector UI
  const farmerSelect = document.getElementById('farmer-select');
  if (farmerSelect) farmerSelect.value = farmerId;

  // Fetch Advisory and Distress Score
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

    renderFarmerProfileCard();
    renderFarmerAdvisory();
    renderFarmerMandiPrice();
    renderFarmerAlerts();
    renderFarmerSchemes();

  } catch (err) {
    console.error('Error fetching farmer details:', err);
  }
}

function renderFarmerProfileCard() {
  const f = state.currentFarmer;
  if (!f) return;

  const cropEmojis = { onion: '🧅', cotton: '🌿', soybean: '🌱', rice: '🌾', maize: '🌽' };
  const cropEmoji = cropEmojis[f.crop.toLowerCase()] || '🌾';

  document.getElementById('fp-name').textContent = f.name;
  document.getElementById('fp-crop-badge').textContent = `${cropEmoji} ${f.crop.toUpperCase()} — ${f.crop_stage.toUpperCase()}`;
  document.getElementById('fp-location').textContent = `📍 ${f.village || ''}, ${f.district_name || f.district_id}`;
  document.getElementById('fp-landholding').textContent = `📐 ${f.landholding_hectares} Hectares`;
  document.getElementById('fp-loan').textContent = `💳 Loan Due: ${f.loan_due_date}`;

  // Channel icon and note
  const isIvr = f.recommended_channel === 'ivr_or_sms';
  document.getElementById('fp-channel-icon').textContent = isIvr ? '☎️' : '📱';
  document.getElementById('fp-channel-title').textContent = isIvr ? 'Voice IVR & Plain SMS' : 'Smartphone In-App & Voice';
  document.getElementById('fp-device-note').textContent = `${f.device_type.replace('_', ' ').toUpperCase()} (${f.network_quality.toUpperCase()} Network)`;
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
}

function renderFarmerAdvisory() {
  const adv = state.currentAdvisory;
  if (!adv) return;

  const lang = state.selectedLanguage || 'hi';
  const title = adv.title[lang] || adv.title['en'];
  const text = adv.text[lang] || adv.text['en'];

  document.getElementById('advisory-title').textContent = title;
  document.getElementById('advisory-spoken-text').textContent = text;

  // Badge styling
  const badge = document.getElementById('advisory-badge');
  if (adv.action_type === 'market_intervention') {
    badge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 uppercase tracking-wider";
    badge.textContent = `🚨 MARKET INTERVENTION (${adv.rule_id})`;
  } else if (adv.action_type === 'contingency_crop_switch') {
    badge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wider";
    badge.textContent = `🌾 CRIDA CONTINGENCY SWITCH (${adv.rule_id})`;
  } else {
    badge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider";
    badge.textContent = `🌱 AGRONOMY ADVISORY (${adv.rule_id})`;
  }

  // Contingency crop list
  const contingencyBox = document.getElementById('contingency-box');
  const contingencyList = document.getElementById('contingency-crops-list');
  if (adv.contingency_crops && adv.contingency_crops.length > 0) {
    contingencyBox.classList.remove('hidden');
    contingencyList.innerHTML = adv.contingency_crops.map(c => `
      <div class="bg-white p-3 rounded-xl border border-amber-200">
        <div class="font-black text-sm text-amber-950">${c.name}</div>
        <div class="text-xs text-amber-700 font-bold mt-0.5">⏱ Duration: ${c.duration_days} Days</div>
        <p class="text-xs text-slate-600 mt-1">${c.rationale}</p>
      </div>
    `).join('');
  } else {
    contingencyBox.classList.add('hidden');
  }

  // Weather summary
  const wd = adv.weather_data;
  document.getElementById('ctx-rainfall').textContent = wd.rainfall_deviation_pct < 0 
    ? `${Math.abs(wd.rainfall_deviation_pct).toFixed(1)}% Deficit`
    : `+${wd.rainfall_deviation_pct.toFixed(1)}% Normal`;
  document.getElementById('ctx-dryspell').textContent = `${wd.dry_spell_days} Days`;
  document.getElementById('ctx-onset').textContent = wd.onset_status.toUpperCase();
}

function renderFarmerMandiPrice() {
  const adv = state.currentAdvisory;
  if (!adv || !adv.price_data) return;

  const pd = adv.price_data;
  document.getElementById('mandi-name').textContent = `${pd.market_name} • ${pd.crop.toUpperCase()}`;
  document.getElementById('mandi-current-price').textContent = `₹${pd.current_price.toLocaleString('en-IN')}`;
  document.getElementById('mandi-msp-price').textContent = `₹${pd.govt_msp.toLocaleString('en-IN')}`;

  const alertBox = document.getElementById('mandi-alert-box');
  const tabIndicator = document.getElementById('tab-mandi-indicator');

  if (pd.is_below_msp) {
    alertBox.className = "bg-red-50 border-2 border-red-400 rounded-2xl p-5 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4";
    document.getElementById('mandi-alert-text').textContent = `Current Mandi price is below MSP by ${pd.shortfall_pct}%. Do NOT sell in panic. Use e-NAM APMC enrollment or WDRA pledge loan.`;
    if (tabIndicator) {
      tabIndicator.textContent = `⚠️ Below MSP (-${pd.shortfall_pct}%)`;
      tabIndicator.className = "inline-flex items-center text-xs font-bold text-red-600";
    }
  } else {
    alertBox.className = "bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4";
    document.getElementById('mandi-alert-text').textContent = `Current market price is ₹${pd.current_price}, maintaining stability above the Government MSP floor benchmark.`;
    if (tabIndicator) {
      tabIndicator.textContent = `✅ Above MSP`;
      tabIndicator.className = "inline-flex items-center text-xs font-bold text-emerald-600";
    }
  }
}

function renderFarmerAlerts() {
  const dis = state.currentDistress;
  const adv = state.currentAdvisory;
  const container = document.getElementById('farmer-alerts-container');
  if (!container || !dis) return;

  const alerts = [];

  // Price alert
  if (adv && adv.price_data && adv.price_data.is_below_msp) {
    alerts.push({
      icon: '🚨',
      title: 'Market Distress Warning',
      body: `Mandi price (₹${adv.price_data.current_price}) is ₹${adv.price_data.govt_msp - adv.price_data.current_price}/quintal below Government MSP. Avoid panic selling.`,
      severity: 'CRITICAL',
      color: 'border-red-400 bg-red-50 text-red-950'
    });
  }

  // Rainfall alert
  if (adv && adv.weather_data && Math.abs(adv.weather_data.rainfall_deviation_pct) > 25) {
    alerts.push({
      icon: '🌦️',
      title: 'Rainfall Deficit Notice',
      body: `Monsoon rainfall is currently ${Math.abs(adv.weather_data.rainfall_deviation_pct).toFixed(1)}% below normal with ${adv.weather_data.dry_spell_days} days dry spell. Apply soil mulch and prepare for PMFBY crop survey.`,
      severity: 'HIGH',
      color: 'border-amber-400 bg-amber-50 text-amber-950'
    });
  }

  // Loan reminder
  if (dis.days_until_loan_due <= 30) {
    alerts.push({
      icon: '💳',
      title: 'KCC Loan Due Reminder',
      body: `Loan repayment deadline is in ${dis.days_until_loan_due} days. Visit your primary cooperative bank for 3% interest subvention renewal or restructuring.`,
      severity: 'MEDIUM',
      color: 'border-purple-400 bg-purple-50 text-purple-950'
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      icon: '✅',
      title: 'All Farm Systems Normal',
      body: 'Weather conditions and market prices are currently stable for your crop.',
      severity: 'INFO',
      color: 'border-emerald-300 bg-emerald-50 text-emerald-950'
    });
  }

  container.innerHTML = alerts.map(a => `
    <div class="p-5 rounded-2xl border-2 ${a.color} flex items-start space-x-4">
      <div class="text-3xl">${a.icon}</div>
      <div class="flex-grow">
        <div class="flex items-center justify-between">
          <h4 class="font-black text-base">${a.title}</h4>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/10">${a.severity}</span>
        </div>
        <p class="text-sm font-medium mt-1 leading-relaxed">${a.body}</p>
      </div>
    </div>
  `).join('');
}

function renderFarmerSchemes() {
  const dis = state.currentDistress;
  const container = document.getElementById('farmer-schemes-container');
  if (!container || !dis) return;

  const interventions = dis.recommended_interventions || [];

  container.innerHTML = interventions.map(item => `
    <div class="bg-slate-50 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 space-y-3 transition">
      <div class="flex items-start justify-between">
        <div>
          <span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">${item.scheme_id}</span>
          <h4 class="text-base font-extrabold text-slate-900 mt-1">${item.scheme_name}</h4>
        </div>
        <span class="text-xs font-black uppercase px-2 py-1 rounded ${item.urgency === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}">${item.urgency}</span>
      </div>

      <div class="bg-white p-3 rounded-xl border border-slate-100">
        <div class="text-[11px] font-bold text-slate-500 uppercase">Trigger Cause:</div>
        <div class="text-xs font-semibold text-slate-800 mt-0.5">${item.trigger}</div>
      </div>

      <div class="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
        <div class="text-[11px] font-bold text-emerald-800 uppercase">Action for Farmer:</div>
        <div class="text-xs font-semibold text-emerald-950 mt-0.5">${item.action_item}</div>
      </div>
    </div>
  `).join('');
}

// --- VOICE & SPEECH SYNTHESIS LAYER (Bhashini Mock) ---

function playCurrentAdvisoryAudio() {
  const adv = state.currentAdvisory;
  if (!adv) return;

  const lang = state.selectedLanguage || 'hi';
  const text = adv.text[lang] || adv.text['en'];

  speakText(text, lang);
}

function speakText(textToSpeak, langCode) {
  if (!('speechSynthesis' in window)) {
    alert('Browser speech synthesis is not supported on this device. Playing simulated audio tone.');
    return;
  }

  // If already speaking, toggle pause/stop
  if (state.isSpeaking) {
    window.speechSynthesis.cancel();
    state.isSpeaking = false;
    updateVoiceButtonUI(false);
    return;
  }

  window.speechSynthesis.cancel(); // Clear queue

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  
  // Set voice language code mapping
  const langMap = {
    hi: 'hi-IN',
    mr: 'mr-IN',
    en: 'en-IN'
  };
  utterance.lang = langMap[langCode] || 'hi-IN';
  utterance.rate = 0.9; // Slightly slower for low-literacy clarity
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    state.isSpeaking = true;
    updateVoiceButtonUI(true);
  };

  utterance.onend = () => {
    state.isSpeaking = false;
    updateVoiceButtonUI(false);
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    state.isSpeaking = false;
    updateVoiceButtonUI(false);
  };

  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    state.isSpeaking = false;
    updateVoiceButtonUI(false);
  }
}

function updateVoiceButtonUI(isPlaying) {
  const btnText = document.getElementById('voice-btn-text');
  const icon = document.getElementById('voice-icon');
  if (!btnText || !icon) return;

  if (isPlaying) {
    icon.textContent = '⏹️';
    btnText.textContent = 'Stop Audio (थांबवा)';
  } else {
    icon.textContent = '🔊';
    btnText.textContent = 'Play Spoken Advisory (आवाज ऐका)';
  }
}

// --- MODULE 2: OFFICER DASHBOARD CONTROLS & LIVE RE-RANKING ---

async function fetchOfficerData() {
  try {
    const res = await fetch(`${API_BASE}/officer/farmers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.weights)
    });

    const data = await res.json();
    state.officerFarmers = data.farmers;
    state.officerMetrics = data.metrics;

    renderOfficerMetrics();
    renderOfficerTable();

  } catch (err) {
    console.error('Error fetching officer data:', err);
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

function renderOfficerTable() {
  const tbody = document.getElementById('officer-table-body');
  if (!tbody) return;

  const filter = document.getElementById('filter-risk')?.value || 'ALL';
  const filtered = state.officerFarmers.filter(f => {
    if (filter === 'ALL') return true;
    return f.risk_band === filter;
  });

  tbody.innerHTML = filtered.map(f => {
    const bandBadge = f.risk_band === 'High'
      ? '<span class="px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">HIGH (71+)</span>'
      : f.risk_band === 'Medium'
      ? '<span class="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">MED (41-70)</span>'
      : '<span class="px-2.5 py-1 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-300">LOW (0-40)</span>';

    const channelBadge = f.recommended_channel === 'ivr_or_sms'
      ? '<span class="inline-flex items-center space-x-1 font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-xs"><span>☎️</span><span>Call / IVR</span></span>'
      : '<span class="inline-flex items-center space-x-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-xs"><span>📱</span><span>App Push</span></span>';

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-6 py-4">
          <div class="font-black text-slate-900">${f.farmer_name}</div>
          <div class="text-xs text-slate-500">📍 ${f.village}, ${f.district_name}</div>
        </td>
        <td class="px-4 py-4 font-bold text-slate-800">${f.district_name}</td>
        <td class="px-4 py-4">
          <div class="font-bold text-slate-900 capitalize">${f.crop}</div>
          <div class="text-xs text-slate-500 uppercase">${f.crop_stage}</div>
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
            View Details 🔍
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

// --- OFFICER DETAIL MODAL ---

function openOfficerModal(farmerId) {
  const farmer = state.officerFarmers.find(f => f.farmer_id === farmerId);
  if (!farmer) return;

  state.selectedOfficerFarmer = farmer;

  document.getElementById('modal-farmer-name').textContent = farmer.farmer_name;
  document.getElementById('modal-farmer-sub').textContent = `📍 ${farmer.village}, ${farmer.district_name} • ${farmer.crop.toUpperCase()} (${farmer.crop_stage.toUpperCase()})`;

  const badge = document.getElementById('modal-risk-badge');
  badge.textContent = `${farmer.risk_band.toUpperCase()} RISK (${farmer.distress_score})`;
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
      { code:'E',  label:'Exposure (Climate & Price)', pts: pts.exposure_pts,           raw: rd.E,       detail: `Rain ${sub.rain_component ?? 0}% + Price ${sub.price_component ?? 0}% deficit` },
      { code:'S',  label:'Sensitivity (Irrigation)',   pts: pts.sensitivity_pts,        raw: rd.S,       detail: farmer.irrigation_type ? `${farmer.irrigation_type}` : '' },
      { code:'AC', label:'Adaptive Capacity (Inv.)',   pts: pts.adaptive_capacity_pts,  raw: rd.AC_risk, detail: `Land ${sub.land_score ?? 0}/100, Income ${sub.income_score ?? 0}/100` },
      { code:'M',  label:'Mitigation Deficit',        pts: pts.mitigation_deficit_pts, raw: rd.M,       detail: `Protection score ${sub.protection_score ?? 0}/100` },
      { code:'T',  label:'Trigger (Loan & Debt)',      pts: pts.trigger_pts,            raw: rd.T,       detail: `Loan urgency ${sub.loan_urgency ?? 0}, Informal ${sub.informal_shock ?? 0}` },
      { code:'DF', label:'District Fragility',        pts: pts.district_fragility_pts, raw: rd.DF,      detail: `Structural context — not shown to farmer` },
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

// --- MODULE 3: SMS & IVR FALLBACK SIMULATOR ---

async function onSimFarmerChange(farmerId) {
  await startIvrCall(farmerId);
  await triggerSmsDelivery(farmerId);
}

async function startIvrCall(customFarmerId) {
  const farmerId = customFarmerId || document.getElementById('sim-farmer-select')?.value || state.selectedFarmerId;
  try {
    const res = await fetch(`${API_BASE}/simulate/ivr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmer_id: farmerId })
    });

    state.ivrState = await res.json();
    document.getElementById('ivr-screen-text').textContent = state.ivrState.voice_prompt_text;
    document.getElementById('ivr-status-pill').textContent = '● IN CALL (MAIN MENU)';
    document.getElementById('ivr-lang-pill').textContent = `LANG: ${(state.ivrState.language || 'HI').toUpperCase()}`;

    // Auto-trigger SMS emulator to match
    await triggerSmsDelivery(farmerId);

  } catch (err) {
    console.error('Error starting IVR call:', err);
  }
}

async function pressIvrKey(digit) {
  const farmerId = document.getElementById('sim-farmer-select')?.value || state.selectedFarmerId;
  try {
    const res = await fetch(`${API_BASE}/simulate/ivr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmer_id: farmerId, digit_pressed: digit })
    });

    state.ivrState = await res.json();
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
    speakText(state.ivrState.voice_prompt_text, state.ivrState.language || 'hi');
  }
}

async function triggerSmsDelivery(customFarmerId) {
  const farmerId = customFarmerId || document.getElementById('sim-farmer-select')?.value || state.selectedFarmerId;
  try {
    const res = await fetch(`${API_BASE}/simulate/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmer_id: farmerId })
    });

    const data = await res.json();
    document.getElementById('sms-screen-body').textContent = data.sms_body;
    document.getElementById('sms-char-count').textContent = `Length: ${data.character_count} chars (${data.sms_segments} SMS)`;
    document.getElementById('sms-time').textContent = '16:45 IST';

  } catch (err) {
    console.error('Error triggering SMS delivery:', err);
  }
}
