/* =============================================
   MEU PONTO — App Logic v4 · HUD Edition
   ============================================= */

// ── Constants ──────────────────────────────────
const SLOTS       = ['entrada', 'inicio_almoco', 'fim_almoco', 'saida'];
const SLOT_LABELS = { entrada: 'Entrada', inicio_almoco: 'Início almoço', fim_almoco: 'Fim almoço', saida: 'Saída' };
const SLOT_ICONS  = { entrada: '🕐', inicio_almoco: '🍽', fim_almoco: '☕', saida: '🚪' };
const SLOT_NUMS   = { entrada: '01', inicio_almoco: '02', fim_almoco: '03', saida: '04' };
const DAY_NAMES   = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const DB_NAME    = 'meuponto_db';
const DB_VERSION = 1;
const STORE_NAME = 'registros';
const MAX_IMG_PX  = 800;
const IMG_QUALITY = 0.6;
const MAX_DAYS    = 90;

// ── State ──────────────────────────────────────
let idb            = null;
let currentDateKey = todayKey();
let activeSlot     = null;

// ── 1. DATE HELPERS ────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dateKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function shiftDateKey(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + delta);
  return dateKeyFromDate(dt);
}

function formatDateLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  const dn = DAY_NAMES[dt.getDay()];
  return `${dn.charAt(0).toUpperCase()}${dn.slice(1)}, ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

function calcHours(slots) {
  if (!slots.entrada || !slots.saida) return null;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  let worked = toMin(slots.saida.time) - toMin(slots.entrada.time);
  if (worked <= 0) return null;
  if (slots.inicio_almoco && slots.fim_almoco) {
    const lunch = toMin(slots.fim_almoco.time) - toMin(slots.inicio_almoco.time);
    if (lunch > 0) worked -= lunch;
  }
  if (worked <= 0) return null;
  return `${Math.floor(worked / 60)}h ${String(worked % 60).padStart(2,'0')}min`;
}

// ── 2. HEADER CLOCK ────────────────────────────
function startClock() {
  const el = document.getElementById('header-clock');
  if (!el) return;
  const tick = () => { el.textContent = nowTime(); };
  tick();
  setInterval(tick, 10000);
}

// ── 3. INDEXEDDB ───────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'date' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbGet(date) {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(date);
    req.onsuccess = (e) => resolve(e.target.result || null);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbPut(record) {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(record);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbDelete(date) {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(date);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbGetAll() {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbGetAllKeys() {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── 4. IMAGE COMPRESSION ───────────────────────
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload  = (e) => {
      const img   = new Image();
      img.onerror = reject;
      img.onload  = () => {
        let { width, height } = img;
        if (width > MAX_IMG_PX) {
          height = Math.round((height * MAX_IMG_PX) / width);
          width  = MAX_IMG_PX;
        }
        const canvas  = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', IMG_QUALITY));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── 5. HOUSEKEEPING ────────────────────────────
async function runHousekeeping() {
  try {
    const keys   = await idbGetAllKeys();
    const cutoff = dateKeyFromDate(new Date(Date.now() - MAX_DAYS * 864e5));
    for (const key of keys) {
      if (key < cutoff) await idbDelete(key);
    }
  } catch (err) {
    console.warn('[housekeeping]', err);
  }
}

// ── 6. MIGRATE localStorage ────────────────────
async function migrateFromLocalStorage() {
  try {
    const raw = localStorage.getItem('ponto_db');
    if (!raw) return;
    const old = JSON.parse(raw);
    for (const [date, slots] of Object.entries(old)) {
      if (!slots || !Object.keys(slots).length) continue;
      const existing = await idbGet(date);
      if (!existing) await idbPut({ date, slots });
    }
    localStorage.removeItem('ponto_db');
  } catch (err) {
    console.warn('[migrate]', err);
  }
}

// ── 7. TAB NAVIGATION ──────────────────────────
function showTab(tab) {
  document.querySelectorAll('.tab').forEach((el) =>
    el.classList.toggle('active', el.dataset.tab === tab)
  );
  document.querySelectorAll('.view').forEach((el) =>
    el.classList.toggle('active', el.id === `view-${tab}`)
  );
  if (tab === 'historico') renderHistory();
}

// ── 8. DATE NAVIGATION ─────────────────────────
function changeDate(delta) {
  currentDateKey = shiftDateKey(currentDateKey, delta);
  renderToday();
}

// ── 9. RENDER: TODAY ───────────────────────────
async function renderToday() {
  document.getElementById('current-date-label').textContent = formatDateLabel(currentDateKey);

  const record = await idbGet(currentDateKey);
  const slots  = record ? record.slots : {};
  const filled = SLOTS.filter((s) => slots[s]).length;

  // Update status text
  const statusEl = document.getElementById('summary-status');
  if (statusEl) {
    statusEl.textContent = filled === 4 ? 'completo' : filled === 0 ? 'aguardando' : `${filled}/4 reg.`;
  }

  SLOTS.forEach((s) => {
    const el    = document.getElementById(`slot-${s}`);
    const entry = slots[s];

    el.innerHTML = '';
    el.className = entry ? 'slot filled' : 'slot';
    el.onclick   = null;

    const numTag = `<span class="slot-num">${SLOT_NUMS[s]}</span>`;

    if (entry) {
      el.innerHTML = `
        ${numTag}
        <div class="slot-inner">
          <img class="slot-thumb" src="${entry.img}" alt="${SLOT_LABELS[s]}" />
          <div class="slot-time">${entry.time}</div>
          <div class="slot-label">${SLOT_LABELS[s]}</div>
        </div>
        <button class="slot-remove" aria-label="Remover ${SLOT_LABELS[s]}">✕</button>
      `;
      el.querySelector('.slot-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeSlot(s);
      });
    } else {
      el.innerHTML = `
        ${numTag}
        <div class="slot-inner">
          <div class="slot-icon">${SLOT_ICONS[s]}</div>
          <div class="slot-label">${SLOT_LABELS[s]}</div>
        </div>
      `;
    }

    el.onclick = (e) => {
      if (e.target.classList.contains('slot-remove')) return;
      openCamera(s);
    };
  });

  renderSummary(slots);
}

function renderSummary(slots) {
  SLOTS.forEach((s) => {
    const el = document.getElementById(`s-${s}`);
    if (slots[s]) {
      el.textContent = slots[s].time;
      el.classList.add('has-value');
    } else {
      el.textContent = '--:--';
      el.classList.remove('has-value');
    }
  });
  const total = calcHours(slots);
  document.getElementById('s-total').textContent = total || '--h --min';
}

// ── 10. CAMERA ─────────────────────────────────
function openCamera(slot) {
  activeSlot = slot;
  const fi   = document.getElementById('file-input');
  fi.value   = '';
  setTimeout(() => fi.click(), 50);
}

document.getElementById('file-input').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file || !activeSlot) return;

  const capturedSlot = activeSlot;
  activeSlot         = null;

  try {
    const compressed = await compressImage(file);
    const existing   = await idbGet(currentDateKey);
    const slots      = existing ? { ...existing.slots } : {};
    slots[capturedSlot] = { img: compressed, time: nowTime() };
    await idbPut({ date: currentDateKey, slots });
    await renderToday();
    if (document.getElementById('view-historico').classList.contains('active')) {
      await renderHistory();
    }
  } catch (err) {
    console.error('[camera]', err);
    alert('Erro ao salvar a foto: ' + err.message);
  }
});

// ── 11. REMOVE SLOT ────────────────────────────
async function removeSlot(slot) {
  try {
    const existing = await idbGet(currentDateKey);
    if (!existing) return;
    const slots = { ...existing.slots };
    delete slots[slot];
    if (Object.keys(slots).length === 0) {
      await idbDelete(currentDateKey);
    } else {
      await idbPut({ date: currentDateKey, slots });
    }
    await renderToday();
    if (document.getElementById('view-historico').classList.contains('active')) {
      await renderHistory();
    }
  } catch (err) {
    console.error('[removeSlot]', err);
  }
}

// ── 12. RENDER: HISTORY ────────────────────────
async function renderHistory() {
  const list     = document.getElementById('history-list');
  list.innerHTML = '<p class="empty-state">// carregando...</p>';

  try {
    const all  = await idbGetAll();
    const rows = all
      .filter((r) => r.slots && Object.keys(r.slots).length > 0)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (!rows.length) {
      list.innerHTML = '<p class="empty-state">// nenhum registro</p>';
      return;
    }

    list.innerHTML = rows.map(({ date, slots }) => {
      const badges = SLOTS.map(
        (s) => `<div class="badge${slots[s] ? ' ok' : ''}"></div>`
      ).join('');
      const count = SLOTS.filter((s) => slots[s]).length;
      const h     = calcHours(slots);
      const [y, m, d] = date.split('-');
      return `
        <div class="history-item" data-date="${date}" role="button" tabindex="0">
          <div class="history-date">
            <div class="history-date-main">${formatDateLabel(date)}</div>
            <div class="history-date-sub">${count}/4 registros${h ? ' · ' + h : ''}</div>
          </div>
          <div class="history-badges">${badges}</div>
          ${h ? `<div class="history-meta">${h}</div>` : `<div class="history-meta">${count}/4</div>`}
          <span class="history-arrow">›</span>
        </div>`;
    }).join('');

    list.querySelectorAll('.history-item').forEach((el) => {
      el.addEventListener('click', () => openDayModal(el.dataset.date));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') openDayModal(el.dataset.date);
      });
    });
  } catch (err) {
    console.error('[renderHistory]', err);
    list.innerHTML = '<p class="empty-state">// erro ao carregar</p>';
  }
}

// ── 13. MODAL ──────────────────────────────────
async function openDayModal(key) {
  try {
    const record = await idbGet(key);
    const slots  = record ? record.slots : {};

    document.getElementById('modal-title').textContent = formatDateLabel(key);
    document.getElementById('modal-slots').innerHTML = SLOTS.map((s) => {
      const e = slots[s];
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

    document.getElementById('modal-export-btn').onclick = () => exportDay(key, slots);
    document.getElementById('modal').classList.remove('hidden');
  } catch (err) {
    console.error('[openDayModal]', err);
  }
}

function closeModal(overlay, event) {
  if (event && event.target !== overlay) return;
  document.getElementById('modal').classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('modal').classList.add('hidden');
});

// ── 14. EXPORT CSV ─────────────────────────────
async function exportDay(key, slotsArg) {
  try {
    const dateKey = key || currentDateKey;
    let slots = slotsArg;
    if (!slots) {
      const record = await idbGet(dateKey);
      slots = record ? record.slots : {};
    }
    let csv = 'Tipo,Horário\n';
    SLOTS.forEach((s) => {
      csv += `${SLOT_LABELS[s]},${slots[s] ? slots[s].time : 'sem registro'}\n`;
    });
    const h = calcHours(slots);
    if (h) csv += `Total trabalhado,${h}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ponto_${dateKey}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[exportDay]', err);
  }
}

// ── 15. INIT ───────────────────────────────────
async function init() {
  try {
    startClock();
    idb = await openDB();
    await migrateFromLocalStorage();
    await runHousekeeping();
    await renderToday();
  } catch (err) {
    console.error('[init]', err);
    document.getElementById('current-date-label').textContent = 'erro ao carregar';
  }
}

init();