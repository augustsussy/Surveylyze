/* ===============================
   CONFIG / ROUTES
================================= */
const DASHBOARD_URL = '/my-surveys/'; // ✅ Changed to My Surveys

/* ===============================
   DOM ELEMENTS
================================= */
const canvas       = document.getElementById('canvas');
const menuBtn      = document.getElementById('btnMenu');
const menu         = document.getElementById('menu');
const dateIcon     = document.getElementById('dateIcon');
const dueDateInput = document.getElementById('dueDate');
const topbar       = document.querySelector('.topbar');
const modal        = document.getElementById('modalOverlay');
const publishModal = document.getElementById('publishModalOverlay');
const backModal    = document.getElementById('backModalOverlay');
const assignSelect = document.getElementById('assignTo');
const btnSave      = document.getElementById('btnSave');
const btnPublish   = document.getElementById('btnPublish');
const btnExport    = document.getElementById('btnExport');
const btnPreview   = document.getElementById('btnPreview');
const btnBack      = document.getElementById('btnBack');
const btnNew       = document.getElementById('btnNew');
const modalCancel  = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const publishModalCancel  = document.getElementById('publishModalCancel');
const publishModalConfirm = document.getElementById('publishModalConfirm');
const backModalCancel     = document.getElementById('backModalCancel');
const backModalConfirm    = document.getElementById('backModalConfirm');
const saveDraftModal = document.getElementById('saveDraftModalOverlay');
const saveDraftModalCancel = document.getElementById('saveDraftModalCancel');
const saveDraftModalConfirm = document.getElementById('saveDraftModalConfirm');
const openSaveDraftModal = () => saveDraftModal && saveDraftModal.classList.add('show');
const closeSaveDraftModal = () => saveDraftModal && saveDraftModal.classList.remove('show');

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
  questions: [],
  hasUnsavedChanges: false
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
   RENDER QUESTIONS
================================= */
function renderQuestions() {
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  canvas.innerHTML = '';

  state.questions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'q-card';
    card.draggable = true;
    card.dataset.id = q.id;
    card.dataset.type = q.type;

    /* ----- Drag events ----- */
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
    });

    /* ----- Title ----- */
    const title = document.createElement('div');
    title.className = 'q-title';
    title.textContent = `Question ${i + 1}: ${labelFor(q.type)}`;
    card.appendChild(title);

    /* ----- Editable prompt ----- */
    const prompt = document.createElement('input');
    prompt.className = 'input';
    prompt.placeholder = 'Enter your question here…';
    prompt.value = q.text || '';

    prompt.addEventListener('input', e => {
      q.text = e.target.value;
      state.hasUnsavedChanges = true;
    });
    card.appendChild(prompt);

    /* ----- Type-specific controls ----- */
    if (q.type === 'multiple_choice') {
      q.options.forEach((opt, idx) => {
        const row = document.createElement('div');
        row.className = 'mc-opt';
        row.innerHTML = `
          <span class="mc-dot"></span>
          <div class="input" contenteditable="true">${escapeHTML(opt)}</div>
          <div class="mc-actions">
            <button class="mc-btn add-opt" title="Add Option">+</button>
            <button class="mc-btn del-opt" title="Remove Option">−</button>
          </div>
        `;

        const editable = row.querySelector('[contenteditable]');
        editable.addEventListener('input', e => {
          q.options[idx] = e.target.textContent;
          state.hasUnsavedChanges = true;
        });

        const addBtn = row.querySelector('.add-opt');
        addBtn.onclick = () => {
          q.options.splice(idx + 1, 0, 'New Option');
          render();
        };

        const delBtn = row.querySelector('.del-opt');
        delBtn.onclick = () => {
          if (q.options.length > 1) {
            q.options.splice(idx, 1);
            render();
          }
        };

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

    /* ----- Actions ----- */
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

function render() {
  renderQuestions();
  state.hasUnsavedChanges = true;
}

/* ===============================
   CRUD HELPERS
================================= */
function add(type, index = null) {
  const tpl = TEMPLATES[type];
  if (!tpl) return;

  const newQ = tpl();

  if (index === null || index < 0 || index > state.questions.length) {
    state.questions.push(newQ);
  } else {
    state.questions.splice(index, 0, newQ);
  }

  render();
}

function removeQ(id) {
  state.questions = state.questions.filter(q => q.id !== id);
  render();
}

function duplicate(id) {
  const i = state.questions.findIndex(q => q.id === id);
  if (i === -1) return;

  const copy = JSON.parse(JSON.stringify(state.questions[i]));
  copy.id = uid();
  state.questions.splice(i + 1, 0, copy);
  render();
}

function syncOrderFromDOM() {
  if (!canvas) return;
  const ids = [...canvas.querySelectorAll('.q-card')].map(
    el => el.dataset.id
  );
  state.questions.sort(
    (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
  );
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
      const nearest = getNearestCard(e.clientY);
      const index = nearest
        ? [...canvas.children].indexOf(nearest)
        : state.questions.length;
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
   MODAL FUNCTIONS
================================= */
const openModal  = () => modal && modal.classList.add('show');
const closeModal = () => modal && modal.classList.remove('show');

const openPublishModal  = () => publishModal && publishModal.classList.add('show');
const closePublishModal = () => publishModal && publishModal.classList.remove('show');

const openBackModal  = () => backModal && backModal.classList.add('show');
const closeBackModal = () => backModal && backModal.classList.remove('show');

/* ===============================
   MODAL HANDLERS
================================= */
// New Survey Modal
if (btnNew) btnNew.onclick = openModal;
if (modalCancel) modalCancel.onclick = closeModal;

if (modal) {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
}

if (modalConfirm) {
  modalConfirm.onclick = () => {
    // Clear everything and reload
    state.questions = [
      TEMPLATES.short_answer(),
      TEMPLATES.likert(),
      TEMPLATES.multiple_choice()
    ];
    document.getElementById('surveyTitle').value = '';
    document.getElementById('surveyDescription').value = '';
    const firstDropdown = document.querySelector('.section-dropdown');
    if (firstDropdown) firstDropdown.value = '';
    document.getElementById('dueDate').value = '';

    // Remove survey_id if editing
    const surveyIdInput = document.querySelector('input[name="survey_id"]');
    if (surveyIdInput) {
      surveyIdInput.remove();
    }

    state.hasUnsavedChanges = false;
    renderQuestions();
    closeModal();
  };
}

// Publish Modal
if (publishModalCancel) {
  publishModalCancel.onclick = closePublishModal;
}

if (publishModal) {
  publishModal.addEventListener('click', e => {
    if (e.target === publishModal) closePublishModal();
  });
}

if (publishModalConfirm) {
  publishModalConfirm.onclick = () => {
    closePublishModal();

    // ✅ Check form validity BEFORE serializing
    if (!settingsForm.checkValidity()) {
      settingsForm.reportValidity(); // Shows validation errors
      return; // Stop if invalid
    }

    serializeQuestions();

    if (settingsForm) {
      const actionInput = document.createElement('input');
      actionInput.type = 'hidden';
      actionInput.name = 'action';
      actionInput.value = 'publish';
      settingsForm.appendChild(actionInput);

      state.hasUnsavedChanges = false;
      settingsForm.submit();
    }
  };
}

// Back Modal
if (backModalCancel) {
  backModalCancel.onclick = closeBackModal;
}

if (backModal) {
  backModal.addEventListener('click', e => {
    if (e.target === backModal) closeBackModal();
  });
}

if (backModalConfirm) {
  backModalConfirm.onclick = () => {
    closeBackModal();
    state.hasUnsavedChanges = false;
    window.location.href = DASHBOARD_URL;
  };
}

// Close modals on ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modal && modal.classList.contains('show')) closeModal();
    if (publishModal && publishModal.classList.contains('show')) closePublishModal();
    if (backModal && backModal.classList.contains('show')) closeBackModal();
    if (saveDraftModal && saveDraftModal.classList.contains('show')) closeSaveDraftModal(); // Add this
  }
});

/* ===============================
   TRACK CHANGES
================================= */
// Mark as changed when form fields change
if (settingsForm) {
  settingsForm.addEventListener('input', () => {
    state.hasUnsavedChanges = true;
  });
}

/* ===============================
   STICKY TOPBAR SHADOW
================================= */
if (topbar) {
  const obs = new IntersectionObserver(
    ([e]) => {
      topbar.classList.toggle(
        'is-stuck',
        e.intersectionRatio < 1
      );
    },
    { threshold: [1] }
  );
  obs.observe(topbar);
}

/* ===============================
   TOP BUTTONS
================================= */
if (btnSave) {
  btnSave.onclick = (e) => {
    e.preventDefault();
    openSaveDraftModal();
  };
}

if (btnPublish) {
  btnPublish.onclick = (e) => {
    e.preventDefault();
    openPublishModal();
  };
}

if (btnExport) {
  btnExport.onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (document.getElementById('surveyTitle').value || 'survey') + '.json';
    a.click();
  };
}

if (btnPreview) {
  btnPreview.onclick = preview;
}

if (btnBack) {
  btnBack.onclick = () => {
    if (state.hasUnsavedChanges) {
      openBackModal();
    } else {
      window.location.href = DASHBOARD_URL;
    }
  };
}

// Save Draft Modal handlers
if (saveDraftModalCancel) {
  saveDraftModalCancel.onclick = closeSaveDraftModal;
}

if (saveDraftModal) {
  saveDraftModal.addEventListener('click', e => {
    if (e.target === saveDraftModal) closeSaveDraftModal();
  });
}

if (saveDraftModalConfirm) {
  saveDraftModalConfirm.onclick = () => {
    closeSaveDraftModal();

    // ✅ Check form validity
    if (!settingsForm.checkValidity()) {
      settingsForm.reportValidity();
      return;
    }

    serializeQuestions();

    if (settingsForm) {
      const actionInput = document.createElement('input');
      actionInput.type = 'hidden';
      actionInput.name = 'action';
      actionInput.value = 'draft';
      settingsForm.appendChild(actionInput);

      state.hasUnsavedChanges = false;
      settingsForm.submit();
    }
  };
}

/* ===============================
   SETTINGS BINDINGS
================================= */
if (assignSelect) {
  assignSelect.addEventListener('input', e => {
    state.meta.assignTo = e.target.value;
    state.hasUnsavedChanges = true;
  });
}

if (dueDateInput) {
  dueDateInput.addEventListener('input', e => {
    state.meta.dueDate = e.target.value;
    state.hasUnsavedChanges = true;
  });
}

/* Clickable calendar icon */
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
   PREVIEW HELPER
================================= */
function preview() {
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
  ${state.questions
    .map(
      (q, i) => `
    <div class="card">
      <div><strong>${i + 1}. ${q.text || labelFor(q.type)}</strong></div>
      <div class="row">
      ${
        q.type === 'short_answer'
          ? `<input type="text" placeholder="Your answer">`
          : q.type === 'paragraph'
          ? `<textarea placeholder="Your answer"></textarea>`
          : q.type === 'likert'
          ? Array.from({ length: 5 })
              .map(
                () =>
                  `<span style="font-size:22px;color:#c7b4e6;margin-right:6px">★</span>`
              )
              .join('')
          : q.type === 'multiple_choice'
          ? q.options
              .map(
                o =>
                  `<div><span class="dot"></span>${escapeHTML(
                    o
                  )}</div>`
              )
              .join('')
          : ''
      }
      </div>
    </div>
  `
    )
    .join('')}
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
   SAVE QUESTIONS TO HIDDEN INPUT
================================= */
function serializeQuestions() {
  console.log("📤 Serializing questions...");

  // Check if survey_id exists
  const surveyIdInput = document.querySelector('input[name="survey_id"]');
  if (surveyIdInput) {
    console.log("✅ survey_id found:", surveyIdInput.value);
  } else {
    console.log("⚠️ No survey_id - creating new survey");
  }

  console.log("🔍 Current state.questions:", state.questions);
  console.log("🔍 Number of questions in state:", state.questions.length);

  syncOrderFromDOM();

  const questionsPayload = [];
  const cards = document.querySelectorAll('#canvas .q-card');

  console.log(`📝 Processing ${cards.length} question cards`);

  cards.forEach((card, index) => {
    const id = card.dataset.id;
    const type = card.dataset.type;

    console.log(`\n🔎 Looking for card ${index + 1} with ID:`, id);

    const fromState = state.questions.find(q => q.id === id);
    if (!fromState) {
      console.warn("❌ Question not found in state:", id);
      console.warn("Available IDs in state:", state.questions.map(q => q.id));

      // FALLBACK: Get data from DOM
      const input = card.querySelector('.input');
      const text = input ? input.value.trim() : '';

      if (!text) {
        console.warn("No text found, skipping this card");
        return;
      }

      console.log("✅ Using fallback - getting data from DOM");

      let questionType = 'short_answer';
      if (type === 'multiple_choice' || type === 'mcq') {
        questionType = 'mcq';
      } else if (type === 'likert' || type === 'likert_scale') {
        questionType = 'likert';
      }

      const questionObj = {
        order_number: index + 1,
        question: text,
        question_type: questionType,
      };

      if (questionType === 'mcq') {
        const options = [];
        const optionEls = card.querySelectorAll('.mc-opt [contenteditable]');
        optionEls.forEach(optEl => {
          const val = optEl.textContent.trim();
          if (val) options.push(val);
        });
        questionObj.options = options.length > 0 ? options : ['Option 1', 'Option 2', 'Option 3'];
      }

      questionsPayload.push(questionObj);
      console.log(`✅ Question ${index + 1} processed (fallback):`, questionObj.question);
      return;
    }

    console.log("✅ Found in state:", fromState.text);

    let questionType = 'short_answer';
    if (type === 'multiple_choice' || type === 'mcq') {
      questionType = 'mcq';
    } else if (type === 'likert' || type === 'likert_scale') {
      questionType = 'likert';
    }

    const input = card.querySelector('.input');
    const text = (input && input.value.trim()) || fromState.text || '';

    if (!text) {
      console.warn("Empty question text, skipping");
      return;
    }

    const questionObj = {
      order_number: index + 1,
      question: text,
      question_type: questionType,
    };

    if (questionType === 'mcq') {
      const options = [];
      const optionEls = card.querySelectorAll('.mc-opt [contenteditable]');

      optionEls.forEach(optEl => {
        const val = optEl.textContent.trim();
        if (val) options.push(val);
      });

      if (options.length === 0 && fromState.options) {
        questionObj.options = fromState.options;
      } else {
        questionObj.options = options;
      }
    }

    questionsPayload.push(questionObj);
    console.log(`✅ Question ${index + 1} processed:`, questionObj.question);
  });

  console.log("📊 Final questions payload:", questionsPayload);
  console.log("📊 Number of questions to save:", questionsPayload.length);

  let hidden = document.getElementById('questionsData');
  if (!hidden) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'questions';
    hidden.id = 'questionsData';
    settingsForm.appendChild(hidden);
  }

  hidden.value = JSON.stringify(questionsPayload);
  console.log("✅ Questions data serialized and set in hidden input");
}

if (settingsForm) {
  settingsForm.addEventListener('submit', (e) => {
    console.log("📤 Form submitting via event listener...");
    serializeQuestions();
  });
}

/* ===============================
   SECTION SELECTOR (+/- BUTTONS)
================================= */
const sectionContainer = document.getElementById('sectionSelectorsContainer');
const selectedSectionsInput = document.getElementById('selectedSectionsInput');
const addSectionBtn = document.getElementById('addSectionBtn');

if (sectionContainer && selectedSectionsInput && addSectionBtn) {

  const firstDropdown = sectionContainer.querySelector('.section-dropdown');
  const optionsHTML = firstDropdown ? firstDropdown.innerHTML : '';

  addSectionBtn.addEventListener('click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'section-selector-row';
    newRow.innerHTML = `
      <select class="section-dropdown" required>
        ${optionsHTML}
      </select>
      <button type="button" class="section-btn remove-section" title="Remove">
        <i class="bi bi-dash-lg"></i>
      </button>
    `;

    sectionContainer.appendChild(newRow);
    updateRemoveButtons();
    updateSelectedSections();
    state.hasUnsavedChanges = true;
  });

  sectionContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-section');
    if (removeBtn) {
      const row = removeBtn.closest('.section-selector-row');
      const rows = sectionContainer.querySelectorAll('.section-selector-row');

      if (rows.length > 1) {
        row.remove();
        updateRemoveButtons();
        updateSelectedSections();
        state.hasUnsavedChanges = true;
      }
    }
  });

  sectionContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('section-dropdown')) {
      updateSelectedSections();
      state.hasUnsavedChanges = true;
    }
  });

  function updateRemoveButtons() {
    const rows = sectionContainer.querySelectorAll('.section-selector-row');
    const removeButtons = sectionContainer.querySelectorAll('.remove-section');

    removeButtons.forEach(btn => {
      btn.disabled = rows.length === 1;
    });
  }

  function updateSelectedSections() {
    const dropdowns = sectionContainer.querySelectorAll('.section-dropdown');
    const selected = Array.from(dropdowns)
      .map(dropdown => dropdown.value)
      .filter(value => value !== '');

    const unique = [...new Set(selected)];

    selectedSectionsInput.value = unique.join(',');

    console.log('Selected sections:', unique);
  }

  updateRemoveButtons();
  updateSelectedSections();
}

/* ===============================
   INIT - Load existing survey if editing
================================= */
console.log("🚀 Initializing Survey Builder...");

const surveyDataEl = document.getElementById('surveyData');

if (surveyDataEl) {
  const surveyDataJSON = surveyDataEl.textContent.trim();
  console.log("📋 Found survey data element");
  console.log("📄 Raw JSON:", surveyDataJSON);

  try {
    const surveyData = JSON.parse(surveyDataJSON);
    console.log("✅ Parsed survey data:", surveyData);

    if (surveyData && surveyData.survey_id) {
      console.log("✏️ EDITING MODE - Loading survey:", surveyData.title);

      let surveyIdInput = document.querySelector('input[name="survey_id"]');
      if (!surveyIdInput) {
        surveyIdInput = document.createElement('input');
        surveyIdInput.type = 'hidden';
        surveyIdInput.name = 'survey_id';
        settingsForm.appendChild(surveyIdInput);
        console.log("✅ Created survey_id hidden input");
      }
      surveyIdInput.value = surveyData.survey_id;
      console.log("✅ Set survey_id to:", surveyData.survey_id);

      if (surveyData.title) {
        document.getElementById('surveyTitle').value = surveyData.title;
        console.log("✅ Title loaded:", surveyData.title);
      }
      if (surveyData.description) {
        document.getElementById('surveyDescription').value = surveyData.description;
        console.log("✅ Description loaded");
      }
      if (surveyData.due_date) {
        const dueDateField = document.getElementById('dueDate');
        if (dueDateField) {
          dueDateField.value = surveyData.due_date;
          console.log("✅ Due date loaded:", surveyData.due_date);
        }
      }

      if (surveyData.assigned_sections && surveyData.assigned_sections.length > 0) {
        console.log("✅ Loading sections:", surveyData.assigned_sections);

        const container = document.getElementById('sectionSelectorsContainer');
        const firstDropdown = container.querySelector('.section-dropdown');
        const optionsHTML = firstDropdown ? firstDropdown.innerHTML : '';

        console.log("📦 Saved options HTML");

        container.innerHTML = '';

        surveyData.assigned_sections.forEach((sectionId, index) => {
          console.log(`Creating row ${index + 1} for section:`, sectionId);

          const row = document.createElement('div');
          row.className = 'section-selector-row';
          row.innerHTML = `
            <select class="section-dropdown" required>
              ${optionsHTML}
            </select>
            <button type="button" class="section-btn remove-section" title="Remove">
              <i class="bi bi-dash-lg"></i>
            </button>
          `;

          container.appendChild(row);

          const dropdown = row.querySelector('.section-dropdown');
          dropdown.value = sectionId;

          console.log(`✅ Section ${sectionId} selected in dropdown ${index + 1}`);
        });

        if (typeof updateRemoveButtons === 'function') {
          updateRemoveButtons();
        }
        if (typeof updateSelectedSections === 'function') {
          updateSelectedSections();
        }

        console.log("✅ All sections loaded");
      }

      if (surveyData.questions && surveyData.questions.length > 0) {
        console.log(`📝 Loading ${surveyData.questions.length} questions`);

        state.questions = surveyData.questions.map((q, idx) => {
          let normalizedType = q.question_type;
          if (q.question_type === 'mcq') {
            normalizedType = 'multiple_choice';
          } else if (q.question_type === 'likert_scale') {
            normalizedType = 'likert';
          }

          console.log(`Question ${idx + 1}:`, q.question, 'Type:', normalizedType);

          const newQ = {
            id: uid(),
            type: normalizedType,
            text: q.question,
          };

          if (normalizedType === 'multiple_choice') {
            if (q.options && q.options.length > 0) {
              newQ.options = q.options;
              console.log(`  → Options:`, q.options);
            } else {
              newQ.options = ['Option 1', 'Option 2', 'Option 3'];
            }
          }

          return newQ;
        });

        console.log("✅ Questions loaded into state:", state.questions.length);

        setTimeout(() => {
          renderQuestions();
          console.log("✅ Canvas rendered with questions");
        }, 100);
      } else {
        console.log("⚠️ No questions found in survey data");
        renderQuestions();
      }

      // Mark as not changed when loading
      state.hasUnsavedChanges = false;
    }
  } catch (e) {
    console.error("❌ Error parsing survey data:", e);
    console.error("❌ JSON that failed:", surveyDataJSON);
    state.questions = [
      TEMPLATES.short_answer(),
      TEMPLATES.likert(),
      TEMPLATES.multiple_choice()
    ];
    renderQuestions();
  }
} else {
  console.log("➕ NEW SURVEY MODE");
  state.questions = [
    TEMPLATES.short_answer(),
    TEMPLATES.likert(),
    TEMPLATES.multiple_choice()
  ];
  renderQuestions();
}