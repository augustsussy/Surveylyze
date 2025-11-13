/* ===============================
   CONFIG / ROUTES
================================= */
const DASHBOARD_URL = 'analytics_admin.html'; // Back to Dashboard target

/* ===============================
   DOM ELEMENTS
================================= */
const canvas       = document.getElementById('canvas');
const menuBtn      = document.getElementById('btnMenu');
const menu         = document.getElementById('menu');
const dateIcon     = document.getElementById('dateIcon');
const dueDateInput = document.getElementById('dueDate');
const topbar       = document.querySelector('.topbar');
const modal        = document.getElementById('modalOverlay'); // new survey modal

const assignSelect = document.getElementById('assignTo');
const statusToggle = document.getElementById('statusToggle');
const btnSave      = document.getElementById('btnSave');
const btnPublish   = document.getElementById('btnPublish');
const btnExport    = document.getElementById('btnExport');
const btnPreview   = document.getElementById('btnPreview');
const btnBack      = document.getElementById('btnBack');
const btnNew       = document.getElementById('btnNew');
const modalCancel  = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

const sectionTabsList = document.getElementById('sectionTabs');
const btnAddSection   = document.getElementById('btnAddSection');
const sectionCounter  = document.getElementById('sectionCounter');

const sectionPrev        = document.getElementById('sectionPrev');
const sectionNext        = document.getElementById('sectionNext');
const btnDeleteSection   = document.getElementById('btnDeleteSection');

const sectionModalOverlay = document.getElementById('sectionModalOverlay');
const sectionModalTitle   = document.getElementById('sectionModalTitle');
const sectionNameInput    = document.getElementById('sectionNameInput');
const sectionModalCancel  = document.getElementById('sectionModalCancel');
const sectionModalSave    = document.getElementById('sectionModalSave');

const settingsForm = document.getElementById('surveySettingsForm');

/* ===============================
   STATE
================================= */
const state = {
  meta: {
    assignTo: '',
    dueDate: '',
    published: false
  },
  sections: [],            // [{id,title}]
  activeSectionId: null,   // id of selected section
  questionsBySection: {}   // {sectionId: [questions]}
};

const uid = () => 'q_' + Math.random().toString(36).slice(2, 9);

/* ===============================
   QUESTION TEMPLATES
================================= */
const TEMPLATES = {
  multiple_choice: () => ({
    id: uid(),
    type: 'multiple_choice',
    text: '',
    options: ['Option 1', 'Option 2', 'Option 3']
  }),
  likert: () => ({
    id: uid(),
    type: 'likert',
    text: ''
  }),
  short_answer: () => ({
    id: uid(),
    type: 'short_answer',
    text: ''
  }),
  paragraph: () => ({
    id: uid(),
    type: 'paragraph',
    text: ''
  })
};

const labelFor = t =>
  ({
    multiple_choice: 'Multiple Choice',
    likert: 'Likert Scale',
    short_answer: 'Short Answer',
    paragraph: 'Paragraph'
  }[t] || t);

/* ===============================
   SECTION HELPERS
================================= */
function createSection(title) {
  return {
    id: 'sec_' + Math.random().toString(36).slice(2, 9),
    title: title || 'Untitled'
  };
}

function ensureSectionQuestions(sectionId) {
  if (!state.questionsBySection[sectionId]) {
    state.questionsBySection[sectionId] = [];
  }
  return state.questionsBySection[sectionId];
}

function getActiveSectionId() {
  if (!state.activeSectionId && state.sections.length) {
    state.activeSectionId = state.sections[0].id;
  }
  return state.activeSectionId;
}

function getActiveQuestions() {
  const secId = getActiveSectionId();
  if (!secId) return [];
  return ensureSectionQuestions(secId);
}

/* ===============================
   RENDER SECTIONS BAR
================================= */
function renderSections() {
  if (!sectionTabsList) return;

  const sections = state.sections;
  sectionTabsList.innerHTML = '';

  sections.forEach((sec, index) => {
    const li = document.createElement('li');
    li.className =
      'section-tab' +
      (sec.id === state.activeSectionId ? ' is-active' : '');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'section-tab-btn';
    btn.textContent = sec.title || `Part ${index + 1}`;

    // click = switch
    btn.onclick = () => {
      state.activeSectionId = sec.id;
      renderSections();
      render();
      persist();
    };

    // double click = rename
    btn.ondblclick = () => openSectionModal('rename', sec.id);

    li.appendChild(btn);

    if (sec.id === state.activeSectionId) {
      const underline = document.createElement('div');
      underline.className = 'section-underline';
      li.appendChild(underline);
    }

    sectionTabsList.appendChild(li);
  });

  if (sectionCounter) {
    const idx = sections.findIndex(s => s.id === state.activeSectionId);
    const current = idx === -1 ? 1 : idx + 1;
    sectionCounter.textContent = `${current}/${Math.max(sections.length, 1)}`;
  }
}

/* ===============================
   DELETE CURRENT SECTION
================================= */
if (btnDeleteSection) {
  btnDeleteSection.addEventListener('click', () => {
    if (state.sections.length <= 1) {
      toast('You must have at least one part.');
      return;
    }

    const currentId = getActiveSectionId();
    const idx = state.sections.findIndex(s => s.id === currentId);
    if (idx === -1) return;

    if (!confirm('Delete this part and all of its questions?')) {
      return;
    }

    const [removed] = state.sections.splice(idx, 1);
    delete state.questionsBySection[removed.id];

    if (state.sections.length) {
      const newIndex = Math.min(idx, state.sections.length - 1);
      state.activeSectionId = state.sections[newIndex].id;
    } else {
      const sec = createSection('Part 1');
      state.sections.push(sec);
      state.activeSectionId = sec.id;
      state.questionsBySection[sec.id] = [];
    }

    persist();
    renderSections();
    render();
  });
}

/* ===============================
   SECTION ARROWS
================================= */
if (sectionPrev && sectionTabsList) {
  sectionPrev.addEventListener('click', () => {
    sectionTabsList.scrollBy({ left: -140, behavior: 'smooth' });
  });
}
if (sectionNext && sectionTabsList) {
  sectionNext.addEventListener('click', () => {
    sectionTabsList.scrollBy({ left: 140, behavior: 'smooth' });
  });
}

/* ===============================
   RENDER QUESTIONS (ACTIVE PART)
================================= */
function render() {
  if (!canvas) return;

  canvas.innerHTML = '';
  const questions = getActiveQuestions();

  questions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'q-card';
    card.draggable = true;
    card.dataset.id = q.id;
    card.dataset.type = q.type;

    /* drag events */
    card.addEventListener('dragstart', e => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', q.id);

      const ghost = document.createElement('div');
      ghost.className = 'ghost';
      ghost.id = 'ghost';
      card.parentNode.insertBefore(ghost, card.nextSibling);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      const g = document.getElementById('ghost');
      if (g) g.remove();
      syncOrderFromDOM();
      render();
      persist();
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = document.querySelector('.q-card.dragging');
      if (!dragging || dragging === card) return;
      const rect = card.getBoundingClientRect();
      const before = e.clientY - rect.top < rect.height / 2;
      canvas.insertBefore(dragging, before ? card : card.nextSibling);
    });

    card.addEventListener('drop', () => {
      syncOrderFromDOM();
      render();
      persist();
    });

    /* title */
    const title = document.createElement('div');
    title.className = 'q-title';
    title.textContent = `Question ${i + 1}: ${labelFor(q.type)}`;
    card.appendChild(title);

    /* prompt */
    const prompt = document.createElement('input');
    prompt.className = 'input';
    prompt.placeholder = 'Enter your question here…';
    prompt.value = q.text || '';
    prompt.addEventListener('input', e => {
      q.text = e.target.value;
      persist();
    });
    card.appendChild(prompt);

    /* type-specific bits */
    if (q.type === 'multiple_choice') {
      q.options.forEach((opt, idx) => {
        const row = document.createElement('div');
        row.className = 'mc-opt';
        row.innerHTML = `
          <span class="mc-dot"></span>
          <div class="input" contenteditable="true">${escapeHTML(opt)}</div>
        `;
        row.querySelector('[contenteditable]').addEventListener('input', e => {
          q.options[idx] = e.target.textContent;
          persist();
        });
        card.appendChild(row);
      });
    }

    if (q.type === 'likert') {
      const stars = document.createElement('div');
      stars.className = 'star-row';
      stars.innerHTML = '<i class="bi bi-star-fill star"></i>'.repeat(5);
      card.appendChild(stars);
    }

    if (q.type === 'paragraph') {
      const ta = document.createElement('textarea');
      ta.className = 'textarea';
      ta.placeholder = 'Long answer text';
      ta.disabled = true;
      card.appendChild(ta);
    }

    if (q.type === 'short_answer') {
      const sa = document.createElement('input');
      sa.className = 'input';
      sa.placeholder = 'Short answer text';
      sa.disabled = true;
      card.appendChild(sa);
    }

    /* actions */
    const actions = document.createElement('div');
    actions.className = 'q-actions';
    actions.innerHTML = `
      <button class="iconbtn" title="Duplicate"><i class="bi bi-files"></i></button>
      <button class="iconbtn" title="Delete"><i class="bi bi-trash3"></i></button>
    `;
    const [dup, del] = actions.querySelectorAll('button');
    dup.onclick = () => duplicate(q.id);
    del.onclick = () => removeQ(q.id);
    card.appendChild(actions);

    canvas.appendChild(card);
  });
}

/* ===============================
   CRUD HELPERS (PER SECTION)
================================= */
function add(type, index = null) {
  const tpl = TEMPLATES[type];
  if (!tpl) return;
  const questions = getActiveQuestions();
  const newQ = tpl();

  if (index === null || index < 0 || index > questions.length) {
    questions.push(newQ);
  } else {
    questions.splice(index, 0, newQ);
  }

  persist();
  render();
}

function removeQ(id) {
  const secId     = getActiveSectionId();
  const questions = ensureSectionQuestions(secId);
  const idx = questions.findIndex(q => q.id === id);
  if (idx !== -1) questions.splice(idx, 1);
  persist();
  render();
}

function duplicate(id) {
  const secId     = getActiveSectionId();
  const questions = ensureSectionQuestions(secId);
  const i = questions.findIndex(q => q.id === id);
  if (i === -1) return;
  const copy = JSON.parse(JSON.stringify(questions[i]));
  copy.id = uid();
  questions.splice(i + 1, 0, copy);
  persist();
  render();
}

function syncOrderFromDOM() {
  if (!canvas) return;
  const secId     = getActiveSectionId();
  const questions = ensureSectionQuestions(secId);

  const ids = [...canvas.querySelectorAll('.q-card')].map(
    el => el.dataset.id
  );
  questions.sort(
    (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
  );
  persist();
}

/* ===============================
   LOCAL STORAGE
================================= */
function persist() {
  localStorage.setItem('purple_survey_builder', JSON.stringify(state));
}

function restore() {
  const raw = localStorage.getItem('purple_survey_builder');
  if (raw) {
    const s = JSON.parse(raw);
    Object.assign(state.meta, s.meta || {});

    if (Array.isArray(s.sections)) {
      state.sections           = s.sections;
      state.activeSectionId    = s.activeSectionId || null;
      state.questionsBySection = s.questionsBySection || {};
    } else {
      // migrate old single-section data
      const sec = createSection('Part 1');
      state.sections = [sec];
      state.activeSectionId = sec.id;
      state.questionsBySection[sec.id] = s.questions || [];
    }
  } else {
    // first time
    const firstSec = createSection('Part 1');
    state.sections.push(firstSec);
    state.activeSectionId = firstSec.id;
    state.questionsBySection[firstSec.id] = [
      TEMPLATES.short_answer(),
      TEMPLATES.likert(),
      TEMPLATES.multiple_choice()
    ];
  }

  if (!state.sections.length) {
    const sec = createSection('Part 1');
    state.sections = [sec];
    state.activeSectionId = sec.id;
    state.questionsBySection[sec.id] = [];
  }
  if (!state.activeSectionId) {
    state.activeSectionId = state.sections[0].id;
  }

  if (assignSelect) assignSelect.value = state.meta.assignTo || '';
  if (dueDateInput) dueDateInput.value = state.meta.dueDate || '';
  if (statusToggle) statusToggle.checked = !!state.meta.published;
}

/* ===============================
   TOOLBOX (click + drag)
================================= */
document.querySelectorAll('.tool').forEach(btn => {
  btn.addEventListener('click', () => add(btn.dataset.type));

  btn.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', 'tool:' + btn.dataset.type);
  });
});

if (canvas) {
  canvas.addEventListener('dragover', e => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const draggingCard = document.querySelector('.q-card.dragging');
    if (data.startsWith('tool:') && !draggingCard) {
      const nearest = getNearestCard(e.clientY);
      showGhostAt(nearest);
    }
  });

  canvas.addEventListener('drop', e => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const draggingCard = document.querySelector('.q-card.dragging');
    removeGhost();
    if (data.startsWith('tool:') && !draggingCard) {
      const nearest   = getNearestCard(e.clientY);
      const questions = getActiveQuestions();
      const index = nearest
        ? [...canvas.children].indexOf(nearest)
        : questions.length;
      add(data.split(':')[1], index);
    }
  });
}

function getNearestCard(y) {
  const cards = [...canvas.querySelectorAll('.q-card')];
  let nearest = null;
  for (const c of cards) {
    const rect = c.getBoundingClientRect();
    if (y < rect.top + rect.height / 2) {
      nearest = c;
      break;
    }
  }
  return nearest;
}

function showGhostAt(beforeEl) {
  removeGhost();
  const g = document.createElement('div');
  g.className = 'ghost';
  if (beforeEl) canvas.insertBefore(g, beforeEl);
  else canvas.appendChild(g);
}

function removeGhost() {
  const g = canvas.querySelector('.ghost');
  if (g) g.remove();
}

/* ===============================
   MENU
================================= */
if (menuBtn && menu) {
  menuBtn.onclick = () => {
    menu.classList.toggle('show');
    const close = e => {
      if (!menu.contains(e.target) && e.target !== menuBtn) {
        menu.classList.remove('show');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  };
}

/* ===============================
   NEW SURVEY MODAL
================================= */
const openModal  = () => modal && modal.classList.add('show');
const closeModal = () => modal && modal.classList.remove('show');

if (btnNew) btnNew.onclick = openModal;
if (modalCancel) modalCancel.onclick = closeModal;

if (modal) {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
    closeModal();
  }
});

if (modalConfirm) {
  modalConfirm.onclick = () => {
    localStorage.removeItem('purple_survey_builder');
    location.reload();
  };
}

/* ===============================
   SECTION NAME MODAL
================================= */
let sectionModalMode = 'create'; // 'create' | 'rename'
let editingSectionId = null;

function openSectionModal(mode, sectionId) {
  sectionModalMode = mode;
  editingSectionId = sectionId || null;
  if (!sectionModalOverlay) return;

  if (mode === 'create') {
    sectionModalTitle.textContent = 'Add section';
    const count = state.sections.length + 1;
    sectionNameInput.value = `Part ${count}`;
  } else {
    const sec = state.sections.find(s => s.id === sectionId);
    sectionModalTitle.textContent = 'Rename section';
    sectionNameInput.value = (sec && sec.title) || '';
  }

  sectionModalOverlay.classList.add('show');
  sectionNameInput.focus();
  sectionNameInput.select();
}

function closeSectionModal() {
  if (sectionModalOverlay) {
    sectionModalOverlay.classList.remove('show');
  }
  editingSectionId = null;
}

if (btnAddSection) {
  btnAddSection.addEventListener('click', () =>
    openSectionModal('create', null)
  );
}

if (sectionModalCancel) {
  sectionModalCancel.addEventListener('click', closeSectionModal);
}

if (sectionModalSave) {
  sectionModalSave.addEventListener('click', () => {
    const name = sectionNameInput.value.trim();
    if (!name) return;

    if (sectionModalMode === 'create') {
      const sec = createSection(name);
      state.sections.push(sec);
      state.activeSectionId = sec.id;
      ensureSectionQuestions(sec.id);
    } else if (sectionModalMode === 'rename' && editingSectionId) {
      const sec = state.sections.find(s => s.id === editingSectionId);
      if (sec) sec.title = name;
    }

    persist();
    renderSections();
    render();
    closeSectionModal();
  });
}

if (sectionModalOverlay) {
  sectionModalOverlay.addEventListener('click', e => {
    if (e.target === sectionModalOverlay) closeSectionModal();
  });
}

/* ===============================
   STICKY TOPBAR SHADOW
================================= */
if (topbar) {
  const obs = new IntersectionObserver(
    ([e]) => {
      topbar.classList.toggle('is-stuck', e.intersectionRatio < 1);
    },
    { threshold: [1] }
  );
  obs.observe(topbar);
}

/* ===============================
   TOP BUTTONS
================================= */
if (btnSave) {
  btnSave.onclick = () => {
    persist();
    toast('Draft saved');
  };
}

if (btnExport) {
  btnExport.onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'survey.json';
    a.click();
  };
}

if (btnPreview) {
  btnPreview.onclick = preview;
}

if (btnBack) {
  btnBack.onclick = () => {
    window.location.href = DASHBOARD_URL;
  };
}

/* ===============================
   SETTINGS BINDINGS
================================= */
if (assignSelect) {
  assignSelect.addEventListener('input', e => {
    state.meta.assignTo = e.target.value;
    persist();
  });
}

if (dueDateInput) {
  dueDateInput.addEventListener('input', e => {
    state.meta.dueDate = e.target.value;
    persist();
  });
}

if (statusToggle) {
  statusToggle.addEventListener('change', e => {
    state.meta.published = e.target.checked;
    persist();
  });
}

/* clickable calendar icon */
if (dateIcon && dueDateInput) {
  dateIcon.addEventListener('click', () => {
    if (typeof dueDateInput.showPicker === 'function') {
      dueDateInput.showPicker();
    } else {
      dueDateInput.focus();
      dueDateInput.click?.();
    }
  });
}

/* ===============================
   TOAST + PREVIEW
================================= */
function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position = 'fixed';
  t.style.bottom = '16px';
  t.style.right   = '16px';
  t.style.background = 'rgba(0,0,0,.75)';
  t.style.color   = '#fff';
  t.style.padding = '10px 12px';
  t.style.borderRadius = '10px';
  t.style.fontSize = '.9rem';
  t.style.zIndex  = '9999';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
}

function preview() {
  const htmlSections = state.sections
    .map((sec, sIndex) => {
      const qs = state.questionsBySection[sec.id] || [];
      if (!qs.length) return '';
      const cards = qs
        .map((q, i) => {
          let body = '';

          if (q.type === 'short_answer') {
            body = '<input type="text" placeholder="Your answer">';
          } else if (q.type === 'paragraph') {
            body = '<textarea placeholder="Your answer"></textarea>';
          } else if (q.type === 'likert') {
            body = Array.from({ length: 5 })
              .map(
                () =>
                  '<span style="font-size:22px;color:#c7b4e6;margin-right:6px">★</span>'
              )
              .join('');
          } else if (q.type === 'multiple_choice') {
            body = (q.options || [])
              .map(
                o =>
                  `<div><span class="dot"></span>${escapeHTML(o)}</div>`
              )
              .join('');
          }

          return `
            <div class="card">
              <div><strong>${i + 1}. ${escapeHTML(q.text || labelFor(q.type))}</strong></div>
              <div class="row">${body}</div>
            </div>
          `;
        })
        .join('');

      return `
        <h2 style="margin:16px 0 8px;font-size:18px;">
          Part ${sIndex + 1}: ${escapeHTML(sec.title)}
        </h2>
        ${cards}
      `;
    })
    .join('');

  const html = `
  <!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Preview</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f3fb;margin:0;padding:24px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px;margin-bottom:12px}
    .btn{background:#B57EDC;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:600}
    .row{margin-top:6px}
    .dot{display:inline-block;width:12px;height:12px;border:2px solid #c7b4e6;border-radius:999px;margin-right:8px}
    input[type="text"],textarea{width:100%;padding:10px;border:1px solid #e5d9f4;border-radius:10px}
    textarea{min-height:80px}
  </style></head><body>
  ${htmlSections}
  <button class="btn">Submit</button>
  </body></html>`;

  const w = window.open();
  w.document.write(html);
  w.document.close();
}

function escapeHTML(str = '') {
  return str.replace(/[&<>"']/g, m => {
    return (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m] || m
    );
  });
}

/* ===============================
   SAVE TO HIDDEN INPUT (Django)
================================= */
if (settingsForm) {
  settingsForm.addEventListener('submit', () => {
    const sectionsPayload = state.sections.map((sec, sIndex) => {
      const qs = state.questionsBySection[sec.id] || [];
      return {
        part_number: sIndex + 1,
        part_title: sec.title,
        questions: qs.map((q, qIndex) => {
          let questionType = 'short_answer';
          if (q.type === 'multiple_choice' || q.type === 'mcq') {
            questionType = 'mcq';
          } else if (q.type === 'likert') {
            questionType = 'likert';
          }
          return {
            order_number: qIndex + 1,
            question: q.text || '',
            question_type: questionType
          };
        })
      };
    });

    let hidden = document.getElementById('questionsData');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'questions';
      hidden.id = 'questionsData';
      settingsForm.appendChild(hidden);
    }

    hidden.value = JSON.stringify(sectionsPayload);
  });
}

/* ===============================
   INIT
================================= */
restore();
renderSections();
render();
