// ===== PER-QUESTION ANALYTICS DASHBOARD =====

document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("analytics-data");

  if (!dataEl) {
    console.error("No analytics data found!");
    return;
  }

  const DATA = {
    metrics: JSON.parse(dataEl.getAttribute('data-metrics') || '{}'),
    question_analytics: JSON.parse(dataEl.getAttribute('data-question-analytics') || '[]')
  };

  console.log("Analytics Data Loaded:", DATA);

  renderAnalytics(DATA);
});

function renderAnalytics(DATA) {
  // ==========================================
  // 1. FILL TOP STATS
  // ==========================================
  const statTotal = document.getElementById("stat-total");
  const statSubmissions = document.getElementById("stat-submissions");
  const statActive = document.getElementById("stat-active");

  if (statTotal) statTotal.textContent = DATA.metrics.surveys_total || 0;
  if (statSubmissions) statSubmissions.textContent = DATA.metrics.submissions || 0;
  if (statActive) statActive.textContent = DATA.metrics.active_surveys || 0;

  // ==========================================
  // 2. RENDER PER-QUESTION ANALYTICS
  // ==========================================
  const container = document.getElementById("question-analytics-container");

  if (!container) {
    console.error("Question analytics container not found!");
    return;
  }

  if (DATA.question_analytics.length === 0) {
    container.innerHTML = `
      <div class="card card-lite p-4 text-center">
        <h5 class="mb-2">No Response Data Yet</h5>
        <p class="text-muted">Analytics will appear here once students submit survey responses.</p>
      </div>
    `;
    return;
  }

  // Clear container
  container.innerHTML = '';

  // Group questions by survey
  const surveyGroups = {};
  DATA.question_analytics.forEach(q => {
    if (!surveyGroups[q.survey_title]) {
      surveyGroups[q.survey_title] = [];
    }
    surveyGroups[q.survey_title].push(q);
  });

  // Render each survey group
  Object.entries(surveyGroups).forEach(([surveyTitle, questions]) => {
    // Sort questions by order_number
    questions.sort((a, b) => a.order_number - b.order_number);

    // Add survey header
    const surveyHeader = document.createElement("div");
    surveyHeader.className = "survey-header";
    surveyHeader.innerHTML = `
      <h3 class="survey-title">
        <i class="bi bi-clipboard-data"></i> ${surveyTitle}
      </h3>
      <div class="survey-subtitle">${questions.length} question${questions.length > 1 ? 's' : ''} • ${questions[0].response_count} response${questions[0].response_count > 1 ? 's' : ''}</div>
    `;
    container.appendChild(surveyHeader);

    // Render each question with incremental numbering
    questions.forEach((q, index) => {
      const questionCard = createQuestionCard(q, index + 1);
      container.appendChild(questionCard);
    });
  });
}

function createQuestionCard(q, questionNumber) {
  // Main card
  const card = document.createElement("div");
  card.className = "card card-lite p-3 mb-3";

  // Header with question info
  const header = document.createElement("div");
  header.style.cssText = "border-bottom: 2px solid #e8dbff; padding-bottom: 12px; margin-bottom: 16px;";
  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div>
        <h5 style="margin: 0 0 4px 0; color: #4c3f8f; font-weight: 700;">
          Question ${questionNumber}: ${q.question_text}
        </h5>
        <small style="color: #999; font-weight: 600;">
          ${q.response_count} response${q.response_count > 1 ? 's' : ''}
        </small>
      </div>
      <span style="background: #e8dbff; color: #4c3f8f; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 12px;">
        ${q.question_type.replace('_', ' ').toUpperCase()}
      </span>
    </div>
  `;
  card.appendChild(header);

  // Content area
  const content = document.createElement("div");

  // === SHORT ANSWER → WORD CLOUD ===
  if (q.question_type === 'short_answer') {
    const canvasId = `wordcloud-${q.question_id}`;
    content.innerHTML = `
      <h6 class="mb-3">Frequency affects size</h6>
      <div class="wordcloud-container">
        <canvas id="${canvasId}" width="800" height="400"></canvas>
      </div>
    `;
    card.appendChild(content);

    setTimeout(() => {
      renderWordCloud(q, canvasId);
    }, 100);
  }

  // === LIKERT SCALE → BAR CHART ===
  else if (q.question_type === 'likert' || q.question_type === 'likert_scale') {
    content.innerHTML = `
      <h6 class="mb-3">Agreement Distribution</h6>
      <canvas id="likert-${q.question_id}" style="max-height: 300px;"></canvas>
    `;
    card.appendChild(content);

    setTimeout(() => {
      renderLikertChart(q);
    }, 0);
  }

  // === MCQ → PIE CHART ===
  else if (q.question_type === 'mcq') {
    content.innerHTML = `
      <h6 class="mb-3">Response Distribution</h6>
      <div style="max-width: 500px; margin: 0 auto;">
        <canvas id="mcq-${q.question_id}" style="max-height: 350px;"></canvas>
      </div>
    `;
    card.appendChild(content);

    setTimeout(() => {
      renderMCQPieChart(q);
    }, 0);
  }

  return card;
}

// ==========================================
// CHART RENDERERS
// ==========================================

function renderWordCloud(q, canvasId) {
  const container = document.getElementById(canvasId);
  if (!container) {
    console.error(`Container ${canvasId} not found`);
    return;
  }

  const keywords = q.keywords || {};
  const wordList = Object.entries(keywords);

  // ✅ No keywords at all
  if (wordList.length === 0) {
    container.parentElement.innerHTML = `
      <h6 class="mb-3">Response Word Cloud</h6>
      <div style="text-align: center; padding: 60px; color: #999; background: #f8f9fa; border-radius: 12px;">
        No keywords available
      </div>
    `;
    return;
  }

  // ✅ Create interactive word cloud (NO THRESHOLD CHECK)
  const maxFreq = Math.max(...wordList.map(([, freq]) => freq));
  const minFreq = Math.min(...wordList.map(([, freq]) => freq));

  // Calculate font sizes (20px to 56px range for better visibility with few words)
  const getFontSize = (freq) => {
    if (maxFreq === minFreq) return 38; // Single frequency - medium size
    const ratio = (freq - minFreq) / (maxFreq - minFreq);
    return 20 + (ratio * 36); // 20px to 56px
  };

  // Color palette
  const colors = ['#B57EDC', '#9B6BC7', '#8B5CB8', '#7B4DA9', '#6B3E9A'];

  // Shuffle word list for visual variety (not just by frequency)
  const shuffledWords = [...wordList].sort(() => Math.random() - 0.5);

  // Create word cloud HTML
  const wordCloudHTML = shuffledWords
    .map(([word, freq]) => {
      const fontSize = getFontSize(freq);
      const color = colors[Math.floor(Math.random() * colors.length)];
      return `
        <span
          class="word-cloud-word"
          data-word="${word}"
          data-freq="${freq}"
          style="font-size: ${fontSize}px; color: ${color};"
        >
          ${word}
        </span>
      `;
    })
    .join('');

  container.parentElement.innerHTML = `
    <div class="wordcloud-container" id="wordcloud-${q.question_id}">
      ${wordCloudHTML}
    </div>
    <div class="word-tooltip" id="tooltip-${q.question_id}"></div>
    <div class="popup-overlay" id="overlay-${q.question_id}"></div>
    <div class="word-detail-popup" id="popup-${q.question_id}">
      <div class="popup-header">Word Frequency</div>
      <div class="popup-count" id="popup-count-${q.question_id}">0</div>
      <div class="popup-label">responses contain "<span id="popup-word-${q.question_id}"></span>"</div>
      <button class="popup-close" id="close-btn-${q.question_id}">Close</button>
    </div>
  `;

  // Add interactivity
  setTimeout(() => {
    const words = document.querySelectorAll(`#wordcloud-${q.question_id} .word-cloud-word`);
    const tooltip = document.getElementById(`tooltip-${q.question_id}`);
    const popup = document.getElementById(`popup-${q.question_id}`);
    const overlay = document.getElementById(`overlay-${q.question_id}`);
    const wordCloudContainer = document.getElementById(`wordcloud-${q.question_id}`);

    words.forEach(wordEl => {
      // Hover effect - show tooltip
      wordEl.addEventListener('mouseenter', (e) => {
        const word = wordEl.dataset.word;
        const freq = wordEl.dataset.freq;
        tooltip.textContent = `"${word}" - ${freq} time${freq > 1 ? 's' : ''}`;
        tooltip.classList.add('show');
      });

      wordEl.addEventListener('mousemove', (e) => {
        tooltip.style.left = `${e.pageX}px`;
        tooltip.style.top = `${e.pageY - 40}px`;
      });

      wordEl.addEventListener('mouseleave', () => {
        tooltip.classList.remove('show');
      });

      // Click effect - show popup
      wordEl.addEventListener('click', () => {
        const word = wordEl.dataset.word;
        const freq = wordEl.dataset.freq;

        document.getElementById(`popup-word-${q.question_id}`).textContent = word;
        document.getElementById(`popup-count-${q.question_id}`).textContent = freq;

        popup.classList.add('show');
        overlay.classList.add('show');
      });
    });

    overlay.addEventListener('click', () => {
      popup.classList.remove('show');
      overlay.classList.remove('show');
    });

    const closeBtn = document.getElementById(`close-btn-${q.question_id}`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        popup.classList.remove('show');
        overlay.classList.remove('show');
      });
    }

    // Magnetic effect - words subtly follow cursor

    // Magnetic effect - words subtly follow cursor
    wordCloudContainer.addEventListener('mousemove', (e) => {
      const rect = wordCloudContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      words.forEach(wordEl => {
        const wordRect = wordEl.getBoundingClientRect();
        const wordX = wordRect.left - rect.left + wordRect.width / 2;
        const wordY = wordRect.top - rect.top + wordRect.height / 2;

        const deltaX = x - wordX;
        const deltaY = y - wordY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Only affect words within 200px (increased from 150px for better effect)
        if (distance < 200) {
          const force = (200 - distance) / 200;
          const moveX = (deltaX / distance) * force * 12; // Increased from 8
          const moveY = (deltaY / distance) * force * 12;

          wordEl.style.transform = `translate(${moveX}px, ${moveY}px)`;
        } else {
          wordEl.style.transform = 'translate(0, 0)';
        }
      });
    });

    // Reset positions when mouse leaves
    wordCloudContainer.addEventListener('mouseleave', () => {
      words.forEach(wordEl => {
        wordEl.style.transform = 'translate(0, 0)';
      });
    });
  }, 100);
}

function renderMCQPieChart(q) {
  const canvas = document.getElementById(`mcq-${q.question_id}`);
  if (!canvas) return;

  const hasData = Object.values(q.mcq_distribution).some(v => v > 0);

  if (!hasData) {
    canvas.parentElement.innerHTML = `
      <h6 class="mb-3">Response Distribution</h6>
      <div style="text-align: center; padding: 40px; color: #999;">No responses yet</div>
    `;
    return;
  }

  // Color palette for pie chart
  const colors = [
    '#B57EDC', // Purple
    '#9B6BC7', // Dark Purple
    '#63c665', // Green
    '#ffd966', // Yellow
    '#ff9a76', // Orange
    '#e85d5d', // Red
    '#5da5ff', // Blue
    '#ff6b9d', // Pink
  ];

  new Chart(canvas, {
    type: "pie",
    data: {
      labels: Object.keys(q.mcq_distribution),
      datasets: [{
        data: Object.values(q.mcq_distribution),
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            font: { size: 13, weight: 600 },
            padding: 15,
            boxWidth: 20,
            boxHeight: 20
          }
        },
        tooltip: {
          backgroundColor: '#1f1f29',
          padding: 12,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector(".btn.btn-outline-danger.w-100");
  const modal = document.getElementById("logoutModal");
  const cancel = document.getElementById("logoutCancel");

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    modal.style.display = "flex";
  });

  cancel.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
});

