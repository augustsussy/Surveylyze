// ===== Demo Data (replace later with Python-fed JSON) =====
const DATA = {
  teacher: { name: "Name", role: "Teacher" },
  metrics: { surveys_total: 30, submissions: 50, active_surveys: 2 },
  feedback_summary: { Positive: 62, Neutral: 23, Negative: 15 },
  agreement_levels: {
    "Strongly Disagree": 5, "Disagree": 12, "Neutral": 18, "Agree": 28, "Strongly Agree": 12
  },
  keywords: {
    sustainability: 42, development: 28, environmental: 24, resources: 18, global: 16,
    human: 14, water: 13, energy: 12, ecological: 10, education: 9, community: 8,
    waste: 7, policy: 6, reuse: 5, recycle: 5, climate: 4
  }
};

// Fill stats
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("stat-total").textContent = DATA.metrics.surveys_total;
  document.getElementById("stat-submissions").textContent = DATA.metrics.submissions;
  document.getElementById("stat-active").textContent = DATA.metrics.active_surveys;

  // Tag Cloud (simple scaling)
  const tagRoot = document.getElementById("tagCloud");
  const freqs = Object.values(DATA.keywords);
  const minF = Math.min(...freqs), maxF = Math.max(...freqs);
  const scale = v => (maxF === minF) ? 1 : (0.6 + ((v - minF) / (maxF - minF)) * 1.6); // 0.6x..2.2x
  Object.entries(DATA.keywords)
    .sort((a,b)=>b[1]-a[1])
    .forEach(([word, f]) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = word;
      span.style.fontSize = (scale(f) * 14) + "px";
      tagRoot.appendChild(span);
    });

  // Charts
  // Pie
  new Chart(document.getElementById("feedbackPie"), {
    type: "pie",
    data: {
      labels: Object.keys(DATA.feedback_summary),
      datasets: [{ data: Object.values(DATA.feedback_summary) }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });

  // Bar
  new Chart(document.getElementById("agreementBar"), {
    type: "bar",
    data: {
      labels: Object.keys(DATA.agreement_levels),
      datasets: [{ data: Object.values(DATA.agreement_levels) }]
    },
    options: {
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  });
});