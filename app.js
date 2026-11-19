'use strict';

const STORAGE_KEY = 'oracleNetworks.clientReports.v1';
const THEME_KEY = 'oracleNetworks.theme.v1';
const PLAN_NAMES = ['BVS Fixed', 'BVS Combo', 'Elite Staking Plan (ESP)'];
const PLAN_EXPLANATIONS = {
  'BVS Combo': {
    heading: 'BVS Combo – Best Value Staking Combo',
    tagline: 'Start Small. Build Assets. Create Opportunities.',
    description: 'An ideal starting point for individuals who want to take their first step towards digital asset accumulation while also aiming to receive monthly reward coins. This combo brings together two financial objectives — building your BDX holdings for the long term and accumulating monthly rewards along the way.',
    closing: 'The right starting point for those who believe that wealth creation begins with a smart first step.'
  },
  'BVS Fixed': {
    heading: 'BVS – Best Value Staking Fixed Plan',
    tagline: 'Accumulate Today. Build for Tomorrow.',
    description: 'Designed for individuals whose primary objective is long-term digital asset accumulation. The Best Value Staking Fixed Plan focuses on building your BDX portfolio through a structured staking approach, helping you stay committed to your asset-building journey.',
    closing: 'A strategic choice for those who want to focus on accumulating digital assets rather than short-term financial rewards.'
  },
  'Elite Staking Plan (ESP)': {
    heading: 'ESP – Elite Staking Plan',
    tagline: 'Think Bigger. Plan Strategically. Aspire Beyond.',
    description: 'Designed for individuals with bigger financial aspirations and clearly defined monthly financial goals. The Elite Staking Plan is positioned for those looking to participate at a higher level, with a focus on monthly reward coins and a structured approach to their digital asset strategy.',
    closing: 'For people who think beyond today and want to align their investment decisions with their bigger financial ambitions.'
  }
};
const PLAN_COLORS = { 'BVS Fixed': '#89929d', 'BVS Combo': '#c6a45b', 'Elite Staking Plan (ESP)': '#d6d9df', Silver: '#89929d', Gold: '#c6a45b', Platinum: '#d6d9df' };
const FIXED_TIERS = [5000, 10000, 20000, 50000, 100000];
const ESP_TIERS = [
  { volume: 50000, rate: 4.75 },
  { volume: 100000, rate: 5.00 },
  { volume: 200000, rate: 5.25 },
  { volume: 500000, rate: 5.50 }
];
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', BDT: '৳', EUR: '€', USDT: '₮' };
const INDIA_TIME_ZONE = 'Asia/Kolkata';
const views = [...document.querySelectorAll('[data-view]')];
const form = document.querySelector('#report-form');
const field = {
  name: document.querySelector('#client-name'),
  phone: document.querySelector('#client-phone'),
  coins: document.querySelector('#investment-coins'),
  currency: document.querySelector('#investment-currency'),
  price: document.querySelector('#unit-price'),
  datetime: document.querySelector('#investment-date'),
  reference: document.querySelector('#transaction-reference'),
  otherGoal: document.querySelector('#other-financial-goal'),
  confirm: document.querySelector('#confirm-record')
};
let currentPage = 'home';
let wizardStep = 0;
let currentDraftId = null;
let activeDetailRecord = null;
let pendingDeleteId = null;

function readRecords() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && item.id) : [];
  } catch { return []; }
}
function writeRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    notify('This browser could not save the report. Check local storage settings.');
    return false;
  }
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function formatMoney(value, currency = 'INR', decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  return `${symbol}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)} ${currency}`;
}
function formatNumber(value, max = 8) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: max }).format(n);
}
function parseLocalDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  // datetime-local fields contain no zone. Treat their wall time as India Standard Time.
  const localParts = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  let date;
  if (localParts) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = localParts;
    const utcWallTime = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    const check = new Date(utcWallTime);
    if (check.getUTCFullYear() !== Number(year) || check.getUTCMonth() !== Number(month) - 1 || check.getUTCDate() !== Number(day) || check.getUTCHours() !== Number(hour) || check.getUTCMinutes() !== Number(minute) || check.getUTCSeconds() !== Number(second)) return null;
    date = new Date(utcWallTime - 330 * 60 * 1000);
  } else {
    date = new Date(text);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDate(value, time = false) {
  const date = parseLocalDate(value);
  if (!date) return '—';
  const formatted = new Intl.DateTimeFormat('en-IN', time ? { dateStyle: 'medium', timeStyle: 'short', timeZone: INDIA_TIME_ZONE } : { dateStyle: 'medium', timeZone: INDIA_TIME_ZONE }).format(date);
  return time ? `${formatted} IST` : formatted;
}
function formatDateOnly(value) {
  const date = parseLocalDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: INDIA_TIME_ZONE }).format(date);
}
function timeGreeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: INDIA_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(date));
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}
function coinQuantity(record) {
  if (record.coinAmount !== undefined && record.coinAmount !== null && Number.isFinite(Number(record.coinAmount))) return Math.round(Number(record.coinAmount));
  if (record.bdx !== undefined && record.bdx !== null && Number.isFinite(Number(record.bdx))) return Math.round(Number(record.bdx));
  if (Number(record.amount) > 0 && Number(record.price) > 0) return Math.round(Number(record.amount) / Number(record.price));
  return null;
}
function referenceValuation(record) {
  if (record.referenceValue !== undefined && record.referenceValue !== null && Number.isFinite(Number(record.referenceValue))) return Number(record.referenceValue);
  if (record.coinAmount !== undefined && record.coinAmount !== null) {
    const coins = coinQuantity(record);
    return coins && Number(record.price) > 0 ? coins * Number(record.price) : null;
  }
  // Older saved records stored the entered fiat amount in `amount`.
  return Number(record.amount) > 0 ? Number(record.amount) : null;
}
function getPlan() { return form.querySelector('input[name="plan"]:checked')?.value || ''; }
function makeId() {
  if (globalThis.crypto?.randomUUID) return `ON-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  return `ON-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
function localDateTimeNow() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function currentDraft() {
  const inputCoins = Number(field.coins.value);
  const coinAmount = Number.isFinite(inputCoins) && inputCoins > 0 ? Math.round(inputCoins) : null;
  const price = Number(field.price.value);
  const plan = getPlan();
  const records = readRecords();
  const existing = currentDraftId ? records.find(item => item.id === currentDraftId) : null;
  return {
    id: currentDraftId || 'PREVIEW',
    name: field.name.value.trim(),
    phone: field.phone.value.trim(),
    plan,
    duration: Number(document.querySelector('#plan-duration').value) || 3,
    coinAmount,
    currency: field.currency.value,
    price: Number.isFinite(price) && price > 0 ? price : null,
    bdx: coinAmount,
    referenceValue: coinAmount && Number.isFinite(price) && price > 0 ? coinAmount * price : null,
    datetime: field.datetime.value,
    reference: field.reference.value.trim(),
    financialGoals: [...document.querySelectorAll('input[name="financialGoals"]:checked')].map(input => input.value),
    otherFinancialGoal: field.otherGoal.value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString()
  };
}
function selectedFinancialGoals(record) {
  const goals = Array.isArray(record?.financialGoals) ? record.financialGoals.filter(goal => typeof goal === 'string' && goal.trim()) : [];
  const other = String(record?.otherFinancialGoal || '').trim();
  return other ? [...goals, other] : goals;
}
function buildPlanScenario(record) {
  const principal = coinQuantity(record);
  const plan = record.plan;
  if (!Number.isFinite(principal) || principal <= 0 || !PLAN_NAMES.includes(plan)) return null;
  if (plan === 'BVS Fixed') {
    const years = Number(record.duration) === 5 ? 5 : 3;
    const threeYear = Math.round(principal * 2.5);
    const fiveYear = Math.round(principal * 4);
    const current = years === 5 ? fiveYear : threeYear;
    return {
      title: `BVS Fixed · ${years} years`,
      facts: [
        ['Estimated coin volume', `${formatNumber(principal, 8)} BDX`],
        ['Selected duration', `${years} years`],
        ['Reference percentage', years === 5 ? '400%' : '250%'],
        ['Illustrative total amount', `${formatNumber(current, 8)} BDX`]
      ],
      headers: ['Fixed staking volume (BDX)', '3 years · 250%', '5 years · 400%'],
      rows: FIXED_TIERS.map(volume => [formatNumber(volume, 0), formatNumber(volume * 2.5, 0), formatNumber(volume * 4, 0)]),
      note: 'The table follows the supplied BVS Fixed reference sheet. Percentages and coin amounts are illustrations and have not been independently verified.'
    };
  }
  if (plan === 'BVS Combo') {
    const regular = Math.round(principal * 0.5);
    const fixed = principal - regular;
    const monthly = Math.round(regular * 0.03);
    const scheduled = monthly * 60;
    const regularTotal = regular + scheduled;
    const fixedTotal = fixed * 4;
    const combined = regularTotal + fixedTotal;
    return {
      title: 'BVS Combo · 5 years',
      facts: [
        ['Regular allocation · 50%', `${formatNumber(regular, 8)} BDX`],
        ['Fixed allocation · 50%', `${formatNumber(fixed, 8)} BDX`],
        ['Monthly payout illustration · 3%', `${formatNumber(monthly, 8)} BDX`],
        ['Scheduled payouts · 60 months', `${formatNumber(scheduled, 8)} BDX`],
        ['Regular component total', `${formatNumber(regularTotal, 8)} BDX`],
        ['Fixed component · 400% reference', `${formatNumber(fixedTotal, 8)} BDX`],
        ['Combined illustrative total', `${formatNumber(combined, 8)} BDX`]
      ],
      allocation: [
        { label: 'Regular · 50%', volume: `${formatNumber(regular, 8)} BDX`, detail: '3% monthly · 60 months' },
        { label: 'Fixed · 50%', volume: `${formatNumber(fixed, 8)} BDX`, detail: '400% reference' }
      ],
      headers: ['BVS Combo volume (BDX)', '5 years · regular 3%', '5 years · fixed 400%', '5 years · total'],
      rows: FIXED_TIERS.map(volume => [formatNumber(volume, 0), formatNumber(volume * 1.4, 0), formatNumber(volume * 2, 0), formatNumber(volume * 3.4, 0)]),
      note: 'Reference calculation: 50% regular allocation with a 3% monthly illustration for 60 months, plus its allocated principal; 50% fixed allocation at the 400% reference. Principal repayment and eligibility have not been verified.'
    };
  }
  const matchedTier = ESP_TIERS.find(tier => Math.abs(principal - tier.volume) <= Math.max(0.01, tier.volume * 1e-9));
  const monthly = matchedTier ? Math.round(matchedTier.volume * matchedTier.rate / 100) : null;
  const total = monthly === null ? null : monthly * 60;
  return {
    title: 'Elite Staking Plan (ESP) · 5 years',
    facts: matchedTier ? [
      ['Matched reference tier', `${formatNumber(matchedTier.volume, 0)} BDX`],
      ['Monthly rate shown', `${matchedTier.rate.toFixed(2)}%`],
      ['Monthly reward illustration', `${formatNumber(monthly, 8)} BDX`],
      ['60-month rewards illustration', `${formatNumber(total, 8)} BDX`],
      ['Overall percentage shown', `${(matchedTier.rate * 60).toFixed(0)}%`]
    ] : [
      ['Entered estimated coin volume', `${formatNumber(principal, 8)} BDX`],
      ['Tier status', 'No exact reference tier match'],
      ['Rate application', 'No ESP rate applied']
    ],
    headers: ['Staking volume (BDX)', 'Duration', 'Monthly rate', 'Monthly rewards (BDX)', '60-month rewards (BDX)', 'Overall percentage'],
    rows: ESP_TIERS.map(tier => [formatNumber(tier.volume, 0), '5 years', `${tier.rate.toFixed(2)}%`, formatNumber(tier.volume * tier.rate / 100, 0), formatNumber(tier.volume * tier.rate / 100 * 60, 0), `${(tier.rate * 60).toFixed(0)}%`]),
    note: matchedTier ? 'The applied tier matches the entered estimated BDX quantity exactly. Rates and rewards reproduce the supplied ESP sheet as an illustration and have not been independently verified.' : 'The supplied ESP sheet lists fixed tiers only. Because the entered quantity does not exactly match a tier, no ESP rate is applied; the table is shown for reference.'
  };
}
function planScenarioMarkup(record) {
  const scenario = buildPlanScenario(record);
  if (!scenario) return '';
  const facts = scenario.facts.map(([label, value]) => `<div class="scenario-fact"><span>${escapeHTML(label)}</span><b>${escapeHTML(value)}</b></div>`).join('');
  const allocation = scenario.allocation ? `<div class="scenario-allocation">${scenario.allocation.map(item => `<div class="allocation-card"><span>${escapeHTML(item.label)}</span><b>${escapeHTML(item.volume)}</b><small>${escapeHTML(item.detail)}</small></div>`).join('')}</div>` : '';
  const headers = scenario.headers.map(value => `<th>${escapeHTML(value)}</th>`).join('');
  const rows = scenario.rows.map(row => `<tr>${row.map(value => `<td>${escapeHTML(value)}</td>`).join('')}</tr>`).join('');
  return `<section class="report-scenario"><p class="report-section-label">Plan output · illustrative</p><h3 class="scenario-title">${escapeHTML(scenario.title)}</h3><div class="scenario-facts">${facts}</div>${allocation}<div class="plan-table-wrap"><table class="plan-data"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div><p class="scenario-note">${escapeHTML(scenario.note)}</p></section>`;
}
function planExplanationMarkup(plan) {
  const explanation = PLAN_EXPLANATIONS[plan];
  if (!explanation) return '';
  return `<section class="report-plan-explanation" aria-label="Selected plan explanation"><h2>${escapeHTML(explanation.heading)}</h2><p class="plan-explanation-tagline">${escapeHTML(explanation.tagline)}</p><p class="plan-explanation-copy">${escapeHTML(explanation.description)}</p><p class="plan-explanation-closing">${escapeHTML(explanation.closing)}</p></section>`;
}
function reportMarkup(record) {
  const name = escapeHTML(record.name || 'Client name');
  const reportId = escapeHTML(record.id || 'DRAFT');
  const plan = escapeHTML(record.plan || 'Plan not selected');
  const greeting = escapeHTML(timeGreeting());
  const currency = record.currency || 'INR';
  const coins = coinQuantity(record);
  const investment = coins ? `${formatNumber(coins, 0)} BDX` : '—';
  const price = record.price ? `${formatMoney(record.price, currency, 4)} / BDX` : '—';
  const estimate = coins ? `${formatNumber(coins, 0)} BDX` : '—';
  const valuation = referenceValuation(record);
  const investmentDate = formatDate(record.datetime, true);
  const phone = record.phone ? `<tr><td>Phone number</td><td>${escapeHTML(record.phone)}</td></tr>` : '';
  const reference = record.reference ? `<tr><td>Transaction / reference ID</td><td>${escapeHTML(record.reference)}</td></tr>` : '';
  const goals = selectedFinancialGoals(record);
  const goalsRow = goals.length ? `<tr><td>Financial goals</td><td><div class="report-goals">${goals.map(goal => `<span class="report-goal">${escapeHTML(goal)}</span>`).join('')}</div></td></tr>` : '';
  const planOutput = planScenarioMarkup(record);
  const planExplanation = planExplanationMarkup(record.plan);
  const planClass = { 'BVS Fixed': 'plan-fixed', 'BVS Combo': 'plan-combo', 'Elite Staking Plan (ESP)': 'plan-esp' }[record.plan] || '';
  const reportClass = ['report-paper', 'has-plan-output', planClass].filter(Boolean).join(' ');
  return `<article class="${reportClass}">
    <header class="report-header"><img class="report-logo" src="assets/oracle-mark.png" alt="Oracle Networks" /><div class="report-issue report-datetime"><span class="report-datetime-label">DATE &amp; TIME</span><time class="report-datetime-value" datetime="${escapeHTML(record.datetime || '')}">${escapeHTML(investmentDate)}</time></div></header>
    <div class="report-client-intro"><p class="report-greeting">${greeting},</p><p class="report-client">${name}</p></div>
    <div class="report-plan"><span>THE PERFECT PLAN FOR YOU</span><b>${plan}</b></div>
    <section class="report-record-details"><p class="report-section-label">Recorded details</p>
      <table class="report-data" aria-label="Investment record details"><tbody>
        <tr><td>Investment coin quantity</td><td>${escapeHTML(investment)}</td></tr>
        <tr><td>BDX price at investment</td><td>${escapeHTML(price)}</td></tr>
        <tr><td>Reference valuation</td><td>${escapeHTML(valuation ? formatMoney(valuation, currency) : '—')}</td></tr>
        <tr class="estimate"><td>Estimated BDX amount · whole coins</td><td>${escapeHTML(estimate)}</td></tr>
        ${phone}${reference}${goalsRow}
      </tbody></table>
    </section>
    ${planOutput}
    ${planExplanation}
    <p class="report-disclaimer"><strong>Disclaimer:</strong> This report is generated solely for educational and informational purposes and does not constitute financial, legal or tax advice. All projections are illustrative, with no guaranteed returns. Digital assets involve market risks and potential capital loss. Figures may vary, and investors are responsible for independent due diligence and investment decisions. All activities are subject to applicable Indian laws and taxation. No accuracy, investment outcome or regulatory approval is guaranteed or implied.</p>
    <div class="report-signature-space" aria-hidden="true"></div>
    <div class="report-signature"><span>CLIENT SIGNATURE</span></div>
    <div class="report-footer"><span>INTELLIGENCE. INSIGHT. INDIVIDUALIZED.</span><span>ORACLE NETWORKS &nbsp; · &nbsp; ${reportId}</span></div>
  </article>`;
}
function notify(message) {
  const region = document.querySelector('#toast-region');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 220);
  }, 3300);
}
function goPage(page, options = {}) {
  const target = document.querySelector(`[data-view="${page}"]`);
  if (!target) return;
  currentPage = page;
  for (const view of views) {
    const active = view === target;
    view.classList.toggle('is-active', active);
    view.hidden = !active;
  }
  document.querySelectorAll('.nav-link').forEach(link => {
    const active = link.dataset.page === page || (page === 'detail' && link.dataset.page === 'reports');
    link.classList.toggle('is-active', active);
  });
  const nav = document.querySelector('.primary-nav');
  nav.classList.remove('is-open');
  document.querySelector('.menu-button').setAttribute('aria-expanded', 'false');
  if (!options.keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  if (options.updateHash !== false) history.replaceState(null, '', `#${page === 'create' ? 'new-report' : page === 'detail' ? 'report-preview' : page}`);
  document.querySelector('#main-content').focus({ preventScroll: true });
  if (page === 'dashboard') renderDashboard();
  if (page === 'reports') renderArchive();
}
function goSection(section) {
  if (currentPage !== 'home') goPage('home', { updateHash: false });
  setTimeout(() => {
    const node = document.getElementById(section);
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${section}`);
  }, 40);
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('is-active', link.dataset.section === section));
  document.querySelector('.primary-nav').classList.remove('is-open');
  document.querySelector('.menu-button').setAttribute('aria-expanded', 'false');
}
function updateWizardProgress() {
  document.querySelectorAll('[data-wizard-panel]').forEach(panel => {
    const active = Number(panel.dataset.wizardPanel) === wizardStep;
    panel.hidden = !active;
    panel.classList.toggle('is-visible', active);
  });
  document.querySelectorAll('[data-step-jump]').forEach(button => {
    const number = Number(button.dataset.stepJump);
    button.classList.toggle('is-current', number === wizardStep);
    button.classList.toggle('is-complete', number < wizardStep);
    if (number === wizardStep) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#wizard-back').hidden = wizardStep === 0;
  document.querySelector('#wizard-next').hidden = wizardStep === 2;
  document.querySelector('#finish-actions').hidden = wizardStep !== 2;
  document.querySelector('#form-error').hidden = true;
  if (wizardStep === 2) renderReview();
  updateLivePreview();
}
function showFormError(message = 'Please complete the required fields before continuing.') {
  const element = document.querySelector('#form-error');
  element.textContent = message;
  element.hidden = false;
}
function validateCurrentStep() {
  if (wizardStep === 0) {
    field.name.setCustomValidity(field.name.value.trim() ? '' : 'Enter the client name.');
    if (!field.name.reportValidity()) return false;
    field.name.setCustomValidity('');
    return true;
  }
  if (wizardStep === 1) {
    const plan = getPlan();
    if (!plan) { showFormError('Select a plan to continue.'); return false; }
    const coins = Number(field.coins.value);
    if (!(Number.isInteger(coins) && coins > 0)) { field.coins.reportValidity(); showFormError('Enter a whole-number BDX coin quantity greater than zero.'); return false; }
    if (!(Number(field.price.value) > 0)) { field.price.reportValidity(); showFormError('Enter a BDX price greater than zero.'); return false; }
    if (!field.datetime.value || !parseLocalDate(field.datetime.value)) { field.datetime.reportValidity(); showFormError('Enter a valid investment date and time.'); return false; }
    return true;
  }
  return true;
}
function collectRecord() {
  if (!validateCurrentStepAtFinish()) return null;
  if (!field.confirm.checked) { showFormError('Confirm the details before saving the report.'); return null; }
  const draft = currentDraft();
  const records = readRecords();
  const existing = records.find(record => record.id === currentDraftId);
  draft.id = currentDraftId || makeId();
  draft.createdAt = existing?.createdAt || new Date().toISOString();
  draft.updatedAt = new Date().toISOString();
  if (existing) records[records.findIndex(record => record.id === existing.id)] = draft;
  else records.unshift(draft);
  if (!writeRecords(records)) return null;
  currentDraftId = draft.id;
  updateLivePreview();
  renderDashboard();
  renderArchive();
  return draft;
}
function validateCurrentStepAtFinish() {
  wizardStep = 0;
  updateWizardProgress();
  if (!validateCurrentStep()) return false;
  wizardStep = 1;
  updateWizardProgress();
  if (!validateCurrentStep()) return false;
  wizardStep = 2;
  updateWizardProgress();
  return true;
}
function updateLivePreview() {
  const draft = currentDraft();
  const currency = field.currency.value;
  const validCalc = draft.coinAmount && draft.price;
  document.querySelector('#duration-field').hidden = draft.plan !== 'BVS Fixed';
  document.querySelector('#price-symbol').textContent = CURRENCY_SYMBOLS[currency] || currency;
  document.querySelector('#calc-result').innerHTML = validCalc ? `${escapeHTML(formatNumber(draft.bdx, 0))} <small>BDX</small>` : '— <small>BDX</small>';
  document.querySelector('#calc-amount').textContent = draft.coinAmount ? `${formatNumber(draft.coinAmount, 0)} BDX` : 'Enter BDX coins';
  document.querySelector('#calc-price').textContent = draft.price ? `${formatMoney(draft.price, currency, 4)} / BDX` : 'Enter BDX price';
  document.querySelector('#calc-reference-value').textContent = validCalc ? `Reference valuation: ${formatMoney(draft.referenceValue, currency)}` : 'Reference valuation: —';
  const scenario = buildPlanScenario(draft);
  const planPreview = document.querySelector('#plan-live-preview');
  if (!draft.plan) planPreview.textContent = 'Choose a plan to preview its illustrative output.';
  else if (!scenario) planPreview.textContent = `Enter a BDX coin quantity and price to preview ${draft.plan}.`;
  else planPreview.textContent = `${scenario.title}\n${scenario.facts.slice(0,3).map(([label,value]) => `${label}: ${value}`).join('\n')}`;
  const preview = { ...draft, id: currentDraftId || 'DRAFT / UNSAVED' };
  document.querySelector('#report-preview-mini').innerHTML = reportMarkup(preview);
}
function renderReview() {
  const record = currentDraft();
  const scenario = buildPlanScenario(record);
  const keyFact = scenario?.facts.find(([label]) => ['Illustrative total amount','Combined illustrative total','60-month rewards illustration'].includes(label));
  const rows = [
    ['Client name', record.name || '—'],
    ['Phone number', record.phone || 'Not provided'],
    ['Selected plan', record.plan || '—'],
    ['Plan output', keyFact?.[1] || (scenario ? 'See reference table' : 'Enter coin quantity and price to calculate')],
    ['Investment coin quantity', record.coinAmount ? `${formatNumber(record.coinAmount, 0)} BDX` : '—'],
    ['BDX price at investment', record.price ? `${formatMoney(record.price, record.currency, 4)} / BDX` : '—'],
    ['Reference valuation', record.referenceValue ? formatMoney(record.referenceValue, record.currency) : '—'],
    ['Estimated BDX amount · whole coins', record.bdx ? `${formatNumber(record.bdx, 0)} BDX` : '—'],
    ['Investment date & time', formatDate(record.datetime, true)],
    ['Financial goals', selectedFinancialGoals(record).join(' · ') || 'Not provided'],
    ['Reference ID', record.reference || 'Not provided']
  ];
  document.querySelector('#review-summary').innerHTML = rows.map((item,index) => `<div class="review-row${index === 7 ? ' highlight' : ''}"><span>${escapeHTML(item[0])}</span><b>${escapeHTML(item[1])}</b></div>`).join('');
}
function resetNewReport() {
  form.reset();
  currentDraftId = null;
  wizardStep = 0;
  field.datetime.value = localDateTimeNow();
  field.name.setCustomValidity('');
  updateWizardProgress();
  document.querySelector('#confirm-record').checked = false;
  document.title = 'Oracle Networks — Private Client Desk';
  goPage('create');
}
function saveRecord() {
  const record = collectRecord();
  if (!record) return null;
  notify('Client report saved to this browser.');
  return record;
}
function printRecord(record) {
  document.querySelector('#print-root').innerHTML = reportMarkup(record);
  const clientPart = (record.name || 'Client').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  document.title = `OracleNetworks_${clientPart || 'Client'}_${formatDateOnly(record.createdAt).replaceAll(' ', '-')}`;
  window.print();
}
function openReport(id) {
  const record = readRecords().find(item => item.id === id);
  if (!record) { notify('This report is no longer in the local archive.'); return; }
  activeDetailRecord = record;
  document.querySelector('#detail-title').textContent = `Report for ${record.name || 'client'}.`;
  document.querySelector('#detail-subtitle').textContent = `${record.id} · Created ${formatDate(record.createdAt, true)}`;
  document.querySelector('#report-preview-full').innerHTML = reportMarkup(record);
  goPage('detail');
}
function renderEmpty(text, actionLabel = 'Create a report') {
  return `<div class="empty-state"><div class="empty-mark">O</div><b>${escapeHTML(text)}</b><p>Saved client records will appear here after you create a report. New records stay in this browser.</p><button type="button" class="empty-link" data-action="new-report">${escapeHTML(actionLabel)} ↗</button></div>`;
}
function sortedRecords(records = readRecords()) {
  return [...records].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}
function getSearchable(record) {
  return [record.name,record.phone,record.reference,record.plan,record.id,...selectedFinancialGoals(record)].join(' ').toLocaleLowerCase();
}
function filterRecords({ search = '', plan = 'all', period = 'all' } = {}) {
  let records = sortedRecords();
  const query = search.trim().toLocaleLowerCase();
  if (query) records = records.filter(record => getSearchable(record).includes(query));
  if (plan !== 'all') records = records.filter(record => record.plan === plan);
  if (period !== 'all') {
    const cutoff = Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    records = records.filter(record => new Date(record.createdAt).getTime() >= cutoff);
  }
  return records;
}
function tableMarkup(records, { archive = false } = {}) {
  if (!records.length) return archive ? `<div class="archive-empty">${renderEmpty(readRecords().length ? 'No reports match these filters.' : 'Your archive is ready.')}</div>` : renderEmpty('No client records yet.');
  const rows = records.map(record => `<tr>
    <td>${escapeHTML(record.name || '—')}<div class="recent-meta">${escapeHTML(record.id || '')}</div></td>
    <td class="table-plan">${escapeHTML(record.plan || '—')}</td>
    <td>${coinQuantity(record) ? escapeHTML(formatNumber(coinQuantity(record),0)) : '—'}</td>
    <td>${escapeHTML(formatDateOnly(record.datetime || record.createdAt))}</td>
    <td>${escapeHTML(record.reference || '—')}</td>
    <td><button class="table-action" type="button" data-open="${escapeHTML(record.id)}">VIEW</button><button class="table-action" type="button" data-print="${escapeHTML(record.id)}">PDF</button><button class="table-action delete" type="button" data-delete="${escapeHTML(record.id)}" aria-label="Delete report for ${escapeHTML(record.name || 'client')}">DELETE</button></td>
  </tr>`).join('');
  return `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Client / report ID</th><th>Plan</th><th>BDX coins</th><th>Investment date</th><th>Reference</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderDashboard() {
  const records = sortedRecords();
  const clientCount = new Set(records.map(record => (record.name || '').trim().toLocaleLowerCase()).filter(Boolean)).size;
  const newest = records[0];
  const stats = [
    ['Saved reports', records.length, records.length ? 'Stored in this browser' : 'No reports saved yet'],
    ['Named clients', clientCount, clientCount ? 'Distinct names in local records' : 'Client names appear after saving'],
    ['Most recent', newest ? formatDateOnly(newest.createdAt) : '—', newest ? 'Latest report saved locally' : 'Waiting for your first record']
  ];
  document.querySelector('#dashboard-stats').innerHTML = stats.map((stat,index) => `<article class="stat-card"><span class="stat-label">${escapeHTML(stat[0])}</span><b class="stat-value" ${index < 2 ? `data-count="${Number(stat[1])}"` : ''}>${escapeHTML(stat[1])}</b><span class="stat-meta">${escapeHTML(stat[2])}</span></article>`).join('');
  animateCounters();
  renderPlanChart(records);
  const recent = records.slice(0,4);
  document.querySelector('#recent-reports').innerHTML = recent.length ? `<div class="recent-list">${recent.map(record => `<button type="button" class="recent-item" data-open="${escapeHTML(record.id)}"><span><span class="recent-name">${escapeHTML(record.name || 'Client')}</span><span class="recent-meta">${escapeHTML(record.id)}</span></span><span class="recent-plan">${escapeHTML(record.plan || '—')}</span><span class="recent-date">${escapeHTML(formatDateOnly(record.createdAt))}</span></button>`).join('')}</div>` : renderEmpty('No reports yet.');
  renderDashboardTable();
}
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(node => {
    const end = Number(node.dataset.count) || 0;
    const start = performance.now();
    const duration = 440;
    function frame(now) {
      const progress = Math.min(1,(now-start)/duration);
      node.textContent = String(Math.round(end * (1 - Math.pow(1-progress,3))));
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
function renderPlanChart(records) {
  const container = document.querySelector('#plan-chart');
  if (!records.length) { container.innerHTML = renderEmpty('No plan activity to display.'); return; }
  const chartPlans = [...PLAN_NAMES, ...new Set(records.map(record => record.plan).filter(plan => plan && !PLAN_NAMES.includes(plan)))];
  const counts = Object.fromEntries(chartPlans.map(plan => [plan,records.filter(record => record.plan === plan).length]));
  const total = chartPlans.reduce((sum,plan) => sum + counts[plan],0);
  const radius = 66, circumference = 2*Math.PI*radius;
  let offset = 0;
  const ring = chartPlans.map(plan => {
    const length = total ? counts[plan] / total * circumference : 0;
    const markup = `<circle cx="85" cy="85" r="${radius}" stroke="${PLAN_COLORS[plan] || '#9298a3'}" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-offset}" />`;
    offset += length;
    return markup;
  }).join('');
  const legend = chartPlans.map(plan => `<button type="button" class="legend-button" data-chart-filter="${escapeHTML(plan)}"><i class="legend-swatch" style="background:${PLAN_COLORS[plan] || '#9298a3'}"></i><span>${escapeHTML(plan)}</span><b>${counts[plan]}</b></button>`).join('');
  container.innerHTML = `<div class="donut-wrap"><svg viewBox="0 0 170 170" role="img" aria-label="${total} saved records distributed across plans">${ring}<circle cx="85" cy="85" r="66" stroke="var(--line)" stroke-dasharray="${circumference} 0" stroke-dashoffset="0" style="opacity:${total ? 0 : .55}" /></svg><div class="donut-center"><b>${total}</b><small>RECORDS</small></div></div><div class="chart-legend">${legend}</div>`;
}
function renderDashboardTable() {
  const records = filterRecords({ search: document.querySelector('#dashboard-search').value, plan: document.querySelector('#dashboard-plan-filter').value });
  document.querySelector('#dashboard-table').innerHTML = tableMarkup(records);
}
function renderArchive() {
  const records = filterRecords({
    search: document.querySelector('#report-search').value,
    plan: document.querySelector('#report-plan-filter').value,
    period: document.querySelector('#report-period-filter').value
  });
  document.querySelector('#archive-count').textContent = `${records.length} ${records.length === 1 ? 'REPORT' : 'REPORTS'}`;
  document.querySelector('#reports-table').innerHTML = tableMarkup(records,{ archive: true });
}
function openDeleteConfirmation(id) {
  pendingDeleteId = id;
  const record = readRecords().find(item => item.id === id);
  if (!record) return;
  const dialog = document.querySelector('#confirm-dialog');
  document.querySelector('#confirm-message').textContent = `Delete the report for ${record.name || 'this client'}? This removes the saved record from this browser.`;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else if (window.confirm(document.querySelector('#confirm-message').textContent)) deletePendingRecord();
}
function deletePendingRecord() {
  if (!pendingDeleteId) return;
  const deletedId = pendingDeleteId;
  const records = readRecords().filter(record => record.id !== deletedId);
  if (!writeRecords(records)) return;
  const dialog = document.querySelector('#confirm-dialog');
  if (dialog.open) dialog.close();
  notify('Report removed from this browser.');
  pendingDeleteId = null;
  renderDashboard();
  renderArchive();
  if (activeDetailRecord && activeDetailRecord.id === deletedId) goPage('reports');
}
function startPrint(record) {
  if (!record) return;
  printRecord(record);
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY,theme); } catch {}
  const light = theme === 'light';
  document.querySelector('.theme-toggle').setAttribute('aria-label',`Switch to ${light ? 'dark' : 'light'} theme`);
  document.querySelector('.theme-toggle').title = `Switch to ${light ? 'dark' : 'light'} theme`;
  document.querySelector('.theme-glyph').textContent = light ? '☾' : '◐';
}

// Application navigation and row actions.
document.addEventListener('click', event => {
  const sectionLink = event.target.closest('[data-section]');
  if (sectionLink) { event.preventDefault(); goSection(sectionLink.dataset.section); return; }
  const pageLink = event.target.closest('[data-page]');
  if (pageLink) { event.preventDefault(); goPage(pageLink.dataset.page); return; }
  const action = event.target.closest('[data-action]');
  if (action?.dataset.action === 'new-report') { event.preventDefault(); resetNewReport(); return; }
  const open = event.target.closest('[data-open]');
  if (open) { openReport(open.dataset.open); return; }
  const print = event.target.closest('[data-print]');
  if (print) { startPrint(readRecords().find(record => record.id === print.dataset.print)); return; }
  const remove = event.target.closest('[data-delete]');
  if (remove) { openDeleteConfirmation(remove.dataset.delete); return; }
  const chart = event.target.closest('[data-chart-filter]');
  if (chart) {
    document.querySelector('#dashboard-plan-filter').value = chart.dataset.chartFilter;
    renderDashboardTable();
    return;
  }
});

document.querySelector('.theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
document.querySelector('.menu-button').addEventListener('click', event => {
  const open = document.querySelector('.primary-nav').classList.toggle('is-open');
  event.currentTarget.setAttribute('aria-expanded',String(open));
});
document.querySelector('#wizard-next').addEventListener('click', () => {
  if (!validateCurrentStep()) return;
  wizardStep = Math.min(2,wizardStep+1);
  updateWizardProgress();
});
document.querySelector('#wizard-back').addEventListener('click', () => { wizardStep = Math.max(0,wizardStep-1); updateWizardProgress(); });
document.querySelectorAll('[data-step-jump]').forEach(button => button.addEventListener('click', () => {
  const target = Number(button.dataset.stepJump);
  if (target <= wizardStep) { wizardStep = target; updateWizardProgress(); }
}));
document.querySelector('#wizard-save').addEventListener('click', () => {
  const record = saveRecord();
  if (record) { currentDraftId = null; goPage('reports'); }
});
document.querySelector('#wizard-print').addEventListener('click', () => {
  const record = saveRecord();
  if (record) printRecord(record);
});
document.querySelector('#detail-print').addEventListener('click', () => startPrint(activeDetailRecord));
document.querySelector('#confirm-delete').addEventListener('click', deletePendingRecord);
document.querySelector('#cancel-delete').addEventListener('click', () => { pendingDeleteId = null; document.querySelector('#confirm-dialog').close(); });
document.querySelector('#confirm-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
form.addEventListener('input', () => { field.name.setCustomValidity(''); updateLivePreview(); if (wizardStep === 2) renderReview(); });
form.addEventListener('change', () => { updateLivePreview(); if (wizardStep === 2) renderReview(); });
document.querySelector('#dashboard-search').addEventListener('input', renderDashboardTable);
document.querySelector('#dashboard-plan-filter').addEventListener('change', renderDashboardTable);
document.querySelector('#report-search').addEventListener('input', renderArchive);
document.querySelector('#report-plan-filter').addEventListener('change', renderArchive);
document.querySelector('#report-period-filter').addEventListener('change', renderArchive);
window.addEventListener('afterprint', () => {
  document.querySelector('#print-root').innerHTML = '';
  document.title = 'Oracle Networks — Private Client Desk';
});
window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1);
  if (['home','dashboard','reports'].includes(hash)) goPage(hash,{updateHash:false});
  else if (hash === 'new-report') resetNewReport();
  else if (['about','platform'].includes(hash)) goSection(hash);
});

// Restore theme and initialize the empty, private workspace.
try { setTheme(localStorage.getItem(THEME_KEY) || 'dark'); } catch { setTheme('dark'); }
document.querySelector('#year').textContent = String(new Date().getFullYear());
field.datetime.value = localDateTimeNow();
renderDashboard();
renderArchive();
updateWizardProgress();
if (['dashboard','reports'].includes(location.hash.slice(1))) goPage(location.hash.slice(1),{updateHash:false});
