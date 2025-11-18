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

  // Render each question
  DATA.question_analytics.forEach((q, index) => {
    const questionCard = createQuestionCard(q, index);
    container.appendChild(questionCard);
  });
}

function createQuestionCard(q, index) {
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
          Question ${q.order_number}: ${q.question_text}
        </h5>
        <small style="color: #999; font-weight: 600;">
          ${q.survey_title} • ${q.response_count} response${q.response_count > 1 ? 's' : ''}
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

  // === SHORT ANSWER ===
  if (q.question_type === 'short_answer') {
    content.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-6">
          <h6 class="mb-3">Sentiment Analysis</h6>
          <canvas id="sentiment-${q.question_id}" style="max-height: 220px;"></canvas>
        </div>
        <div class="col-12 col-lg-6">
          <h6 class="mb-3">Common Keywords</h6>
          <div id="keywords-${q.question_id}" class="tagcloud"></div>
        </div>
      </div>
    `;
    card.appendChild(content);

    // Render after adding to DOM
    setTimeout(() => {
      renderSentimentChart(q);
      renderKeywords(q);
    }, 0);
  }

  // === LIKERT SCALE ===
  else if (q.question_type === 'likert' || q.question_type === 'likert_scale') {
    content.innerHTML = `
      <h6 class="mb-3">Agreement Distribution</h6>
      <canvas id="likert-${q.question_id}" style="max-height: 260px;"></canvas>
    `;
    card.appendChild(content);

    setTimeout(() => {
      renderLikertChart(q);
    }, 0);
  }

  // === MCQ ===
  else if (q.question_type === 'mcq') {
    content.innerHTML = `
      <h6 class="mb-3">Response Distribution</h6>
      <canvas id="mcq-${q.question_id}" style="max-height: 260px;"></canvas>
    `;
    card.appendChild(content);

    setTimeout(() => {
      renderMCQChart(q);
    }, 0);
  }

  return card;
}

// ==========================================
// CHART RENDERERS
// ==========================================
function renderSentimentChart(q) {
  const canvas = document.getElementById(`sentiment-${q.question_id}`);
  if (!canvas) return;

  const hasData = Object.values(q.sentiment).some(v => v > 0);

  if (!hasData) {
    canvas.parentElement.innerHTML = `
      <h6 class="mb-3">Sentiment Analysis</h6>
      <div style="text-align: center; padding: 40px; color: #999;">No sentiment data</div>
    `;
    return;
  }

  new Chart(canvas, {
    type: "pie",
    data: {
      labels: Object.keys(q.sentiment),
      datasets: [{
        data: Object.values(q.sentiment),
        backgroundColor: ['#63c665', '#a36bf2', '#e85d5d'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
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

function renderKeywords(q) {
  const container = document.getElementById(`keywords-${q.question_id}`);
  if (!container) return;

  const keywords = Object.entries(q.keywords || {});

  if (keywords.length === 0) {
    container.innerHTML = '<span style="color: #999;">No keywords available</span>';
    return;
  }

  container.innerHTML = '';
  keywords.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([word, freq]) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = word;
    tag.title = `${freq} mention${freq > 1 ? 's' : ''}`;
    container.appendChild(tag);
  });
}

function renderLikertChart(q) {
  const canvas = document.getElementById(`likert-${q.question_id}`);
  if (!canvas) return;

  const hasData = Object.values(q.agreement_levels).some(v => v > 0);

  if (!hasData) {
    canvas.parentElement.innerHTML = `
      <h6 class="mb-3">Agreement Distribution</h6>
      <div style="text-align: center; padding: 40px; color: #999;">No responses yet</div>
    `;
    return;
  }

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: Object.keys(q.agreement_levels),
      datasets: [{
        label: 'Responses',

        data: Object.values(q.agreement_levels),
        backgroundColor: ['#e85d5d', '#ff9a76', '#ffd966', '#90d890', '#63c665'],
        borderWidth: 0,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { font: { size: 11, weight: 600 } } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderMCQChart(q) {
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

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: Object.keys(q.mcq_distribution),
      datasets: [{
        label: 'Responses',
        data: Object.values(q.mcq_distribution),
        backgroundColor: '#B57EDC',
        borderWidth: 0,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y', // Horizontal bars
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } }
      },
      plugins: { legend: { display: false } }
    }
  });
}