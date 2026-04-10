/* =============================================
   MEU PONTO — App Logic
   ============================================= */

// ── Constants ──────────────────────────────────
const SLOTS = ['entrada', 'inicio_almoco', 'fim_almoco', 'saida'];

const SLOT_LABELS = {
  entrada: 'Entrada',
  inicio_almoco: 'Início almoço',
  fim_almoco: 'Fim almoço',
  saida: 'Saída',
};

const SLOT_ICONS = {
  entrada: '🕐',
  inicio_almoco: '🍽',
  fim_almoco: '☕',
  saida: '🚪',
};

const DAY_NAMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// ── State ──────────────────────────────────────
let db = {};
let currentDateKey = todayKey();
let activeSlot = null;
let modalDateKey = null;

// ── DB helpers ─────────────────────────────────
function loadDB() {
  try {
    db = JSON.parse(localStorage.getItem('ponto_db') || '{}');
  } catch (e) {
    db = {};
  }
}

function saveDB() {
  try {
    localStorage.setItem('ponto_db', JSON.stringify(db));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}

function getDay(key) {
  if (!db[key]) db[key] = {};
  return db[key];
}

// ── Date helpers ───────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(key) {
  const [y, m, d] = key.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  const dn = DAY_NAMES[dt.getDay()];
  const label = dn.charAt(0).toUpperCase() + dn.slice(1);
  return `${label}, ${d}/${m}/${y}`;
}

function calcHours(day) {
  if (!day.entrada || !day.saida) return null;
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  let worked = toMin(day.saida.time) - toMin(day.entrada.time);
  if (worked <= 0) return null;
  if (day.inicio_almoco && day.fim_almoco) {
    const lunch = toMin(day.fim_almoco.time) - toMin(day.inicio_almoco.time);
    if (lunch > 0) worked -= lunch;
  }
  if (worked <= 0) return null;
  const h = Math.floor(worked / 60);
  const min = ('0' + (worked % 60)).slice(-2);
  return `${h}h ${min}min`;
}

function nowTime() {
  const now = new Date();
  return ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
}

// ── Tab navigation ─────────────────────────────
function showTab(tab) {
  document.querySelectorAll('.tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  document.querySelectorAll('.view').forEach((el) => {
    el.classList.toggle('active', el.id === `view-${tab}`);
  });
  if (tab === 'historico') renderHistory();
}

// ── Date navigation ────────────────────────────
function changeDate(delta) {
  const d = new Date(currentDateKey + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  currentDateKey = d.toISOString().slice(0, 10);
  renderToday();
}

// ── Render: today view ─────────────────────────
function renderToday() {
  document.getElementById('current-date-label').textContent = formatDateLabel(currentDateKey);
  const day = getDay(currentDateKey);

  SLOTS.forEach((s) => {
    const el = document.getElementById(`slot-${s}`);
    const entry = day[s];

    if (entry) {
      el.className = 'slot filled';
      el.onclick = null; // prevent double trigger; remove btn handles it
      el.innerHTML = `
        <img class="slot-thumb" src="${entry.img}" alt="${SLOT_LABELS[s]}" />
        <div class="slot-label">${SLOT_LABELS[s]}</div>
        <div class="slot-time">${entry.time}</div>
        <button class="slot-remove" onclick="removeSlot(event,'${s}')" aria-label="Remover ${SLOT_LABELS[s]}">✕</button>
      `;
      // Allow re-tap to replace photo
      el.addEventListener('click', (e) => {
        if (!e.target.classList.contains('slot-remove')) openCamera(s);
      }, { once: true });
    } else {
      el.className = 'slot';
      el.innerHTML = `
        <div class="slot-icon">${SLOT_ICONS[s]}</div>
        <div class="slot-label">${SLOT_LABELS[s]}</div>
      `;
      el.onclick = () => openCamera(s);
    }
  });

  renderSummary();
}

function renderSummary() {
  const day = getDay(currentDateKey);
  SLOTS.forEach((s) => {
    document.getElementById(`s-${s}`).textContent = day[s] ? day[s].time : '--:--';
  });
  const total = calcHours(day);
  document.getElementById('s-total').textContent = total || '--h --min';
}

// ── Camera / file input ────────────────────────
function openCamera(slot) {
  activeSlot = slot;
  const fi = document.getElementById('file-input');
  fi.value = '';
  fi.click();
}

document.getElementById('file-input').addEventListener('change', function () {
  const file = this.files[0];
  if (!file || !activeSlot) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const day = getDay(currentDateKey);
    day[activeSlot] = { img: e.target.result, time: nowTime() };
    saveDB();
    renderToday();
    renderHistory();
    activeSlot = null;
  };
  reader.readAsDataURL(file);
});

// ── Remove slot ────────────────────────────────
function removeSlot(e, slot) {
  e.stopPropagation();
  const day = getDay(currentDateKey);
  delete day[slot];
  saveDB();
  renderToday();
  renderHistory();
}

// ── Render: history view ───────────────────────
function renderHistory() {
  const list = document.getElementById('history-list');
  const keys = Object.keys(db)
    .filter((k) => Object.keys(db[k]).length > 0)
    .sort()
    .reverse();

  if (!keys.length) {
    list.innerHTML = '<p class="empty-state">Nenhum registro ainda.</p>';
    return;
  }

  list.innerHTML = keys
    .map((k) => {
      const day = db[k];
      const badges = SLOTS.map(
        (s) => `<div class="badge${day[s] ? ' ok' : ''}"></div>`
      ).join('');
      const count = SLOTS.filter((s) => day[s]).length;
      const h = calcHours(day);
      return `
        <div class="history-item" onclick="openDayModal('${k}')" role="button" tabindex="0">
          <div class="history-date">${formatDateLabel(k)}</div>
          <div class="history-badges">${badges}</div>
          <div class="history-meta">${count}/4${h ? ' · ' + h : ''}</div>
        </div>`;
    })
    .join('');
}

// ── Modal ──────────────────────────────────────
function openDayModal(key) {
  modalDateKey = key;
  const day = db[key] || {};
  document.getElementById('modal-title').textContent = formatDateLabel(key);

  document.getElementById('modal-slots').innerHTML = SLOTS.map((s) => {
    const e = day[s];
    if (e) {
      return `
        <div class="modal-slot">
          <div class="modal-slot-label">${SLOT_LABELS[s]}</div>
          <img src="${e.img}" alt="${SLOT_LABELS[s]}" />
          <div class="modal-slot-time">${e.time}</div>
        </div>`;
    }
    return `
      <div class="modal-slot">
        <div class="modal-slot-label">${SLOT_LABELS[s]}</div>
        <div class="modal-slot-empty">sem registro</div>
      </div>`;
  }).join('');

  document.getElementById('modal-export-btn').onclick = () => exportDay(key);
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal(overlay, event) {
  // Close only if clicking the overlay backdrop (not the modal box)
  if (event && event.target !== overlay) return;
  document.getElementById('modal').classList.add('hidden');
  modalDateKey = null;
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('modal').classList.add('hidden');
});

// ── Export CSV ─────────────────────────────────
function exportDay(key) {
  const dateKey = key || currentDateKey;
  const day = getDay(dateKey);

  let csv = 'Tipo,Horário\n';
  SLOTS.forEach((s) => {
    csv += `${SLOT_LABELS[s]},${day[s] ? day[s].time : 'sem registro'}\n`;
  });
  const h = calcHours(day);
  if (h) csv += `Total trabalhado,${h}\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ponto_${dateKey}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Init ───────────────────────────────────────
loadDB();
renderToday();
