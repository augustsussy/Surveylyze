// ===== ANALYTICS DASHBOARD - Real Backend Data =====

document.addEventListener("DOMContentLoaded", () => {
  // Get data from hidden div (passed from Django)
  const dataEl = document.getElementById("analytics-data");

  if (!dataEl) {
    console.error("No analytics data found!");
    return;
  }

  // Parse JSON data from data attributes
  const DATA = {
    metrics: JSON.parse(dataEl.dataset.metrics || '{}'),
    feedback_summary: JSON.parse(dataEl.dataset.feedbackSummary || '{}'),
    agreement_levels: JSON.parse(dataEl.dataset.agreementLevels || '{}'),
    keywords: JSON.parse(dataEl.dataset.keywords || '{}')
  };

  console.log("Analytics Data Loaded:", DATA); // Debug log

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
  // 2. TAG CLOUD (Keywords)
  // ==========================================
  const tagRoot = document.getElementById("tagCloud");
  if (tagRoot) {
    tagRoot.innerHTML = ''; // Clear existing

    const keywordEntries = Object.entries(DATA.keywords || {});

    if (keywordEntries.length === 0) {
      tagRoot.innerHTML = '<span style="color: #999;">No keywords available yet.</span>';
    } else {
      const freqs = Object.values(DATA.keywords);
      const minF = Math.min(...freqs);
      const maxF = Math.max(...freqs);

      // Scale function: maps frequency to font size multiplier
      const scale = v => {
        if (maxF === minF) return 1;
        return 0.6 + ((v - minF) / (maxF - minF)) * 1.6; // Range: 0.6x to 2.2x
      };

      // Sort by frequency (highest first)
      keywordEntries.sort((a, b) => b[1] - a[1]);

      keywordEntries.forEach(([word, freq]) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = word;
        span.style.fontSize = (scale(freq) * 14) + "px";
        tagRoot.appendChild(span);
      });
    }
  }

  // ==========================================
  // 3. FEEDBACK PIE CHART
  // ==========================================
  const feedbackCanvas = document.getElementById("feedbackPie");
  if (feedbackCanvas) {
    const feedbackData = DATA.feedback_summary || {};
    const hasData = Object.values(feedbackData).some(v => v > 0);

    if (!hasData) {
      // Show "No data" message
      feedbackCanvas.parentElement.innerHTML = `
        <h6 class="mb-3">Overall Feedback Summary</h6>
        <div style="text-align: center; padding: 40px; color: #999;">
          No feedback data available yet.
        </div>
      `;
    } else {
      new Chart(feedbackCanvas, {
        type: "pie",
        data: {
          labels: Object.keys(feedbackData),
          datasets: [{
            data: Object.values(feedbackData),
            backgroundColor: [
              '#63c665',  // Positive - Green
              '#a36bf2',  // Neutral - Purple
              '#e85d5d'   // Negative - Red
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 15,
                font: {
                  size: 13,
                  weight: 600
                }
              }
            },
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
  }

  // ==========================================
  // 4. AGREEMENT LEVELS BAR CHART
  // ==========================================
  const agreementCanvas = document.getElementById("agreementBar");
  if (agreementCanvas) {
    const agreementData = DATA.agreement_levels || {};
    const hasData = Object.values(agreementData).some(v => v > 0);

    if (!hasData) {
      // Show "No data" message
      agreementCanvas.parentElement.innerHTML = `
        <h6 class="mb-3">Agreement Levels (Likert Scale)</h6>
        <div style="text-align: center; padding: 40px; color: #999;">
          No Likert scale responses yet.
        </div>
      `;
    } else {
      new Chart(agreementCanvas, {
        type: "bar",
        data: {
          labels: Object.keys(agreementData),
          datasets: [{
            label: 'Responses',
            data: Object.values(agreementData),
            backgroundColor: [
              '#e85d5d',  // Strongly Disagree - Red
              '#ff9a76',  // Disagree - Light Red
              '#ffd966',  // Neutral - Yellow
              '#90d890',  // Agree - Light Green
              '#63c665'   // Strongly Agree - Green
            ],
            borderWidth: 0,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                font: {
                  size: 12,
                  weight: 600
                }
              },
              grid: {
                color: '#f0f0f0'
              }
            },
            x: {
              ticks: {
                font: {
                  size: 11,
                  weight: 600
                }
              },
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Responses: ${context.parsed.y}`;
                }
              }
            }
          }
        }
      });
    }
  }
}