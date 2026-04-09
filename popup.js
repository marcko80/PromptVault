// PromptVault — popup.js v1.1
// Categorie dinamiche, CRUD prompt, search, filter, inject, import/export

'use strict';

// ─── COSTANTI ────────────────────────────────────────────
const MODEL_LABELS = {
  all: 'Tutti', claude: 'Claude', chatgpt: 'ChatGPT',
  gemini: 'Gemini', perplexity: 'Perplexity', mistral: 'Mistral',
};

const PLATFORM_HOSTS = {
  'claude.ai': 'claude', 'chat.openai.com': 'chatgpt', 'chatgpt.com': 'chatgpt',
  'gemini.google.com': 'gemini', 'perplexity.ai': 'perplexity',
  'www.perplexity.ai': 'perplexity', 'mistral.ai': 'mistral', 'chat.mistral.ai': 'mistral',
};

// ─── STATE ───────────────────────────────────────────────
const state = {
  prompts:         [],
  categories:      [],   // lista categorie personalizzate
  editingId:       null,
  filterModel:     'all',
  filterCategory:  'all',
  searchQuery:     '',
  currentPlatform: null,
};

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await detectPlatform();
  renderAll();
  bindAllEvents();
});

// ─── STORAGE ─────────────────────────────────────────────
async function loadData() {
  const result = await chrome.storage.local.get(['prompts', 'categories']);
  state.prompts     = result.prompts    || [];
  state.categories  = result.categories || [];
  syncCategoriesFromPrompts(); // assicura coerenza
}

async function persist() {
  await chrome.storage.local.set({
    prompts:    state.prompts,
    categories: state.categories,
  });
}

// Deriva le categorie anche dai prompt esistenti (migrazione / import)
function syncCategoriesFromPrompts() {
  const fromPrompts = [...new Set(
    state.prompts.map(p => p.category).filter(Boolean)
  )];
  const merged = [...new Set([...state.categories, ...fromPrompts])];
  state.categories = merged.sort((a, b) => a.localeCompare(b, 'it'));
}

// ─── PLATFORM ─────────────────────────────────────────────
async function detectPlatform() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      try {
        const host = new URL(tabs?.[0]?.url || '').hostname;
        state.currentPlatform = PLATFORM_HOSTS[host] || null;
      } catch { state.currentPlatform = null; }
      updatePlatformPill();
      resolve();
    });
  });
}

function updatePlatformPill() {
  const pill = document.getElementById('platform-pill');
  if (!pill) return;
  if (state.currentPlatform) {
    pill.textContent = MODEL_LABELS[state.currentPlatform];
    pill.className = `platform-pill visible pill-${state.currentPlatform}`;
  } else {
    pill.className = 'platform-pill';
  }
}

// ─── RENDER (orchestrator) ────────────────────────────────
function renderAll() {
  renderCategoryFilterChips();
  renderCategoryDatalist();
  renderCategoryManager();
  renderList();
}

// ─── CATEGORY FILTER CHIPS ───────────────────────────────
function renderCategoryFilterChips() {
  const wrap = document.getElementById('filter-cat-chips');
  if (!wrap) return;

  const cats = state.categories;

  if (cats.length === 0) {
    wrap.innerHTML = '';
    document.getElementById('cat-filter-wrap').style.display = 'none';
    return;
  }

  document.getElementById('cat-filter-wrap').style.display = '';

  wrap.innerHTML =
    `<button class="chip chip-cat${state.filterCategory === 'all' ? ' active' : ''}" data-cat="all">
       📂 Tutte le categorie
     </button>` +
    cats.map(c =>
      `<button class="chip chip-cat${state.filterCategory === c ? ' active' : ''}" data-cat="${escHtml(c)}">
         ${escHtml(c)}
       </button>`
    ).join('');

  wrap.querySelectorAll('.chip-cat').forEach(chip => {
    chip.addEventListener('click', () => {
      state.filterCategory = chip.dataset.cat;
      renderCategoryFilterChips();
      renderList();
    });
  });
}

// datalist per il campo categoria nel form
function renderCategoryDatalist() {
  const dl = document.getElementById('category-list');
  if (!dl) return;
  dl.innerHTML = state.categories.map(c => `<option value="${escHtml(c)}">`).join('');
}

// ─── CATEGORY MANAGER (settings) ─────────────────────────
function renderCategoryManager() {
  const list = document.getElementById('cat-manager-list');
  if (!list) return;

  if (state.categories.length === 0) {
    list.innerHTML = `<div class="cat-empty">Nessuna categoria ancora. Creane una qui sotto o salva un prompt con una categoria.</div>`;
    return;
  }

  list.innerHTML = state.categories.map(c => {
    const count = state.prompts.filter(p => p.category === c).length;
    return `
      <div class="cat-row">
        <span class="cat-name">${escHtml(c)}</span>
        <span class="cat-count">${count} prompt</span>
        <button class="btn-cat-rename" data-cat="${escHtml(c)}" title="Rinomina">✏</button>
        <button class="btn-cat-delete" data-cat="${escHtml(c)}" title="Elimina categoria">✕</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.btn-cat-rename').forEach(btn =>
    btn.addEventListener('click', () => renameCategory(btn.dataset.cat)));
  list.querySelectorAll('.btn-cat-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteCategory(btn.dataset.cat)));
}

async function addCategory() {
  const input = document.getElementById('new-cat-input');
  const name  = input.value.trim();
  if (!name) return;
  if (state.categories.includes(name)) {
    showToast('Categoria già esistente', 'error'); return;
  }
  state.categories.push(name);
  state.categories.sort((a, b) => a.localeCompare(b, 'it'));
  await persist();
  input.value = '';
  renderAll();
  showToast(`✅ Categoria "${name}" creata`, 'success');
}

async function renameCategory(oldName) {
  const newName = prompt(`Rinomina categoria "${oldName}" in:`, oldName);
  if (!newName || newName === oldName) return;
  if (state.categories.includes(newName)) {
    showToast('Nome già in uso', 'error'); return;
  }
  state.categories = state.categories.map(c => c === oldName ? newName : c);
  state.prompts = state.prompts.map(p =>
    p.category === oldName ? { ...p, category: newName, updatedAt: new Date().toISOString() } : p
  );
  if (state.filterCategory === oldName) state.filterCategory = newName;
  await persist();
  renderAll();
  showToast(`✅ Rinominata in "${newName}"`, 'success');
}

async function deleteCategory(name) {
  const count = state.prompts.filter(p => p.category === name).length;
  const msg = count > 0
    ? `Eliminare la categoria "${name}"? I ${count} prompt associati resteranno senza categoria.`
    : `Eliminare la categoria "${name}"?`;
  if (!confirm(msg)) return;

  state.categories = state.categories.filter(c => c !== name);
  state.prompts = state.prompts.map(p =>
    p.category === name ? { ...p, category: '', updatedAt: new Date().toISOString() } : p
  );
  if (state.filterCategory === name) state.filterCategory = 'all';
  await persist();
  renderAll();
  showToast(`Categoria "${name}" eliminata`);
}

// ─── RENDER LIST ─────────────────────────────────────────
function renderList() {
  const listEl  = document.getElementById('prompt-list');
  const emptyEl = document.getElementById('empty-state');
  const countEl = document.getElementById('search-count');

  const filtered = getFiltered();

  countEl.textContent = filtered.length < state.prompts.length
    ? `${filtered.length}/${state.prompts.length}`
    : `${state.prompts.length}`;

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  listEl.innerHTML = filtered.map(renderCard).join('');

  listEl.querySelectorAll('[data-action]').forEach(btn =>
    btn.addEventListener('click', handleCardAction));
}

function getFiltered() {
  const q = state.searchQuery.toLowerCase().trim();

  return state.prompts.filter(p => {
    const okModel = state.filterModel === 'all' || p.model === 'all' || p.model === state.filterModel;
    const okCat   = state.filterCategory === 'all' || p.category === state.filterCategory;
    if (!okModel || !okCat) return false;
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });
}

function renderCard(p) {
  const tagsHtml = (p.tags || []).slice(0, 5)
    .map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
  const canInject  = !!state.currentPlatform;
  const injectLabel = canInject
    ? `⚡ Inietta in ${MODEL_LABELS[state.currentPlatform]}`
    : '📋 Copia prompt';

  return `
    <div class="prompt-card">
      <div class="card-top">
        <span class="card-title">${escHtml(p.title)}</span>
        <span class="model-badge badge-${p.model || 'all'}">${MODEL_LABELS[p.model] || 'Tutti'}</span>
      </div>
      ${p.description ? `<div class="card-desc">${escHtml(p.description)}</div>` : ''}
      <div class="card-preview">${escHtml(p.content.slice(0, 130))}</div>
      <div class="card-meta">
        ${tagsHtml}
        ${p.category ? `<span class="card-category">📂 ${escHtml(p.category)}</span>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn-inject${!canInject ? ' offline' : ''}"
                data-action="${canInject ? 'inject' : 'copy'}"
                data-id="${p.id}">${injectLabel}</button>
        ${canInject ? `<button class="btn-copy" data-action="copy" data-id="${p.id}">📋</button>` : ''}
        <button class="btn-sm edit"   data-action="edit"   data-id="${p.id}" title="Modifica">✏</button>
        <button class="btn-sm delete" data-action="delete" data-id="${p.id}" title="Elimina">✕</button>
      </div>
    </div>`;
}

// ─── CARD ACTIONS ─────────────────────────────────────────
async function handleCardAction(e) {
  const { action, id } = e.currentTarget.dataset;
  if (action === 'inject') await doInject(id);
  else if (action === 'copy')   await doCopy(id, e.currentTarget);
  else if (action === 'edit')   openEditForm(id);
  else if (action === 'delete') doDelete(id);
}

async function doInject(id) {
  const p = findById(id);
  if (!p) return;
  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
    try {
      const res = await chrome.tabs.sendMessage(tabs[0].id, { type: 'INJECT_PROMPT', text: p.content });
      if (res?.success) {
        await recordUsage(id);
        showToast('⚡ Prompt iniettato!', 'success');
        setTimeout(() => window.close(), 600);
      } else throw new Error();
    } catch {
      await doCopyText(p.content);
      await recordUsage(id);
      showToast('📋 Copiato! (ricarica la pagina AI se è la prima volta)', 'success');
    }
  });
}

async function doCopy(id, btn) {
  const p = findById(id);
  if (!p) return;
  await doCopyText(p.content, btn);
  await recordUsage(id);
}

async function doCopyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✅';
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1400);
    }
  } catch { showToast('Errore copiando negli appunti', 'error'); }
}

async function recordUsage(id) {
  const idx = state.prompts.findIndex(p => p.id === id);
  if (idx !== -1) {
    state.prompts[idx].usageCount = (state.prompts[idx].usageCount || 0) + 1;
    await persist();
  }
}

async function doDelete(id) {
  const p = findById(id);
  if (!confirm(`Eliminare "${p?.title}"?`)) return;
  state.prompts = state.prompts.filter(x => x.id !== id);
  await persist();
  renderList();
  showToast('Prompt eliminato');
}

// ─── FORM ─────────────────────────────────────────────────
function openAddForm() {
  state.editingId = null;
  setText('form-title', 'Nuovo Prompt');
  ['f-title','f-content','f-description','f-tags','f-category'].forEach(id => setVal(id, ''));
  document.getElementById('f-model').value = 'all';
  updateCharHint();
  showView('view-form');
}

function openEditForm(id) {
  const p = findById(id);
  if (!p) return;
  state.editingId = id;
  setText('form-title', 'Modifica Prompt');
  setVal('f-title',       p.title);
  setVal('f-content',     p.content);
  setVal('f-description', p.description || '');
  setVal('f-category',    p.category || '');
  setVal('f-tags',        (p.tags || []).join(', '));
  document.getElementById('f-model').value = p.model || 'all';
  updateCharHint();
  showView('view-form');
}

async function saveForm() {
  const title   = val('f-title');
  const content = val('f-content');
  if (!title)   { showToast('Il titolo è obbligatorio', 'error'); return; }
  if (!content) { showToast('Il prompt non può essere vuoto', 'error'); return; }

  const tags     = val('f-tags').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  const category = val('f-category');
  const now      = new Date().toISOString();

  // Aggiunge la categoria alla lista se nuova
  if (category && !state.categories.includes(category)) {
    state.categories.push(category);
    state.categories.sort((a, b) => a.localeCompare(b, 'it'));
  }

  if (state.editingId) {
    const idx = state.prompts.findIndex(p => p.id === state.editingId);
    if (idx !== -1) state.prompts[idx] = {
      ...state.prompts[idx],
      title, content, tags, category,
      description: val('f-description'),
      model: document.getElementById('f-model').value,
      updatedAt: now,
    };
    showToast('✅ Prompt aggiornato', 'success');
  } else {
    state.prompts.unshift({
      id: crypto.randomUUID(), title, content, tags, category,
      description: val('f-description'),
      model: document.getElementById('f-model').value,
      createdAt: now, updatedAt: now, usageCount: 0,
    });
    showToast('✅ Prompt salvato', 'success');
  }

  state.editingId = null;
  await persist();
  showView('view-list');
  renderAll();
}

// ─── SETTINGS ─────────────────────────────────────────────
function openSettings() {
  updateStats();
  renderCategoryManager();
  showView('view-settings');
}

function updateStats() {
  const cats = new Set(state.prompts.map(p => p.category).filter(Boolean));
  setText('stat-total', state.prompts.length);
  setText('stat-used',  state.prompts.reduce((s, p) => s + (p.usageCount || 0), 0));
  setText('stat-cats',  cats.size);
}

function exportPrompts() {
  const data = { prompts: state.prompts, categories: state.categories };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: `promptvault-${new Date().toISOString().slice(0,10)}.json` }).click();
  URL.revokeObjectURL(url);
  showToast('✅ File JSON esportato', 'success');
}

async function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    // Supporta sia array piatto [{...}] sia {prompts:[...], categories:[...]}
    const imported   = Array.isArray(parsed) ? parsed : (parsed.prompts || []);
    const importCats = Array.isArray(parsed) ? [] : (parsed.categories || []);

    const existingIds = new Set(state.prompts.map(p => p.id));
    const toAdd = imported.filter(p => p?.id && p?.title && p?.content && !existingIds.has(p.id));

    state.prompts    = [...toAdd, ...state.prompts];
    state.categories = [...new Set([...state.categories, ...importCats])].sort((a,b) => a.localeCompare(b,'it'));
    syncCategoriesFromPrompts();
    await persist();
    updateStats();
    renderAll();
    showToast(`✅ ${toAdd.length} prompt importati`, 'success');
  } catch (err) {
    showToast(`Errore: ${err.message}`, 'error');
  }
  e.target.value = '';
}

async function clearAllPrompts() {
  if (!confirm('Eliminare TUTTI i prompt e le categorie? Irreversibile.')) return;
  state.prompts = [];
  state.categories = [];
  await persist();
  state.filterCategory = 'all';
  updateStats();
  showView('view-list');
  renderAll();
  showToast('Tutto eliminato');
}

// ─── NAVIGATION ───────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// ─── EVENTS ───────────────────────────────────────────────
function bindAllEvents() {
  document.getElementById('btn-add').addEventListener('click', openAddForm);
  document.getElementById('btn-add-first').addEventListener('click', openAddForm);
  document.getElementById('btn-settings').addEventListener('click', openSettings);

  document.getElementById('search-input').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderList();
  });

  document.querySelectorAll('#filter-model-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#filter-model-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filterModel = chip.dataset.model;
      renderList();
    });
  });

  // Form
  document.getElementById('btn-back-form').addEventListener('click', () => { state.editingId = null; showView('view-list'); });
  document.getElementById('btn-cancel-form').addEventListener('click', () => { state.editingId = null; showView('view-list'); });
  document.getElementById('btn-save-form').addEventListener('click', saveForm);
  document.getElementById('f-content').addEventListener('input', updateCharHint);
  document.getElementById('f-title').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('f-content').focus(); }
  });

  // Settings
  document.getElementById('btn-back-settings').addEventListener('click', () => showView('view-list'));
  document.getElementById('btn-export').addEventListener('click', exportPrompts);
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', handleImport);
  document.getElementById('btn-clear-all').addEventListener('click', clearAllPrompts);
  document.getElementById('btn-add-cat').addEventListener('click', addCategory);
  document.getElementById('new-cat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addCategory();
  });
}

// ─── UTILS ────────────────────────────────────────────────
const val     = id => document.getElementById(id)?.value.trim() || '';
const setVal  = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
const findById = id => state.prompts.find(p => p.id === id);

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateCharHint() {
  const len = document.getElementById('f-content')?.value?.length || 0;
  const el  = document.getElementById('char-hint');
  if (el) el.textContent = `${len.toLocaleString('it')} caratteri`;
}

let _toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast${type ? ' ' + type : ''}`;
  void toast.offsetWidth;
  toast.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
}
