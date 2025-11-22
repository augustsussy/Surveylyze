document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".survey-step");
  const tabs = document.querySelectorAll(".tab");
  const progress = document.querySelector(".progress");
  const progressText = document.querySelector(".progress-text");
  const nextBtn = document.querySelector(".next");
  const prevBtn = document.querySelector(".prev");
  const surveyForm = document.getElementById("survey-form");

  const profileBtn = document.getElementById("profile-btn");
  const profilePanel = document.getElementById("profile-panel");

  // -----------------------------
  // MULTI-STEP SURVEY LOGIC
  // -----------------------------
  let currentStep = 0;

  if (steps && steps.length > 0) {
    function updateSurvey() {
      // Show active step
      steps.forEach((step, i) => {
        step.classList.toggle("active", i === currentStep);
      });

      // Update tabs (future-proof)
      tabs.forEach((tab, i) => {
        tab.classList.toggle("active", i === currentStep);
      });

      // Progress bar width
      if (progress) {
        progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
      }

      // Progress text
      if (progressText) {
        progressText.textContent = `${currentStep + 1}/${steps.length}`;
      }

      // Buttons
      if (prevBtn) {
        prevBtn.textContent = currentStep === 0 ? "Back to Dashboard" : "Previous";
      }

      if (nextBtn) {
        nextBtn.textContent =
          currentStep === steps.length - 1 ? "Submit" : "Next";
      }
    }

    // NEXT BUTTON
    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (currentStep < steps.length - 1) {
          currentStep++;
          updateSurvey();
        } else {
          if (surveyForm) {
            surveyForm.submit();
          }
        }
      });
    }

    // UPDATED PREVIOUS BUTTON
    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.preventDefault();

        // If first step → go back to dashboard
        const dashboardUrl = prevBtn.dataset.backUrl;
        if (currentStep === 0 || !steps || steps.length === 1) {
          if (dashboardUrl) {
            window.location.href = dashboardUrl;
            return;
          }
        }

        // Otherwise go back a step
        if (currentStep > 0) {
          currentStep--;
          updateSurvey();
        }
      });
    }

    // TAB CLICKING
    if (tabs && tabs.length > 0) {
      tabs.forEach((tab, index) => {
        tab.addEventListener("click", (e) => {
          e.preventDefault();
          currentStep = index;
          updateSurvey();
        });
      });
    }

    updateSurvey();
  }

  // -----------------------------
  // STAR RATING (LIKERT)
  // -----------------------------
  const starGroups = document.querySelectorAll(".star-rating");

  starGroups.forEach((group) => {
    const radios = group.querySelectorAll('input[type="radio"]');
    const labels = group.querySelectorAll("label");
    const qKey = group.getAttribute("data-question-id");
    const scoreEl = document.getElementById("score_" + qKey);

    function updateStars(value) {
      const valNum = parseInt(value, 10) || 0;

      labels.forEach((label) => {
        const starVal = parseInt(label.dataset.value, 10);
        label.classList.toggle("active", starVal <= valNum);
      });

      if (scoreEl) {
        scoreEl.textContent = `${valNum} / 5`;
      }
    }

    radios.forEach((radio) => {
      radio.addEventListener("change", () => updateStars(radio.value));
    });

    const checked = group.querySelector('input[type="radio"]:checked');
    if (checked) {
      updateStars(checked.value);
    }
  });

  // -----------------------------
  // PROFILE DROPDOWN
  // -----------------------------
  if (profileBtn && profilePanel) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profilePanel.classList.toggle("show");
    });

    window.addEventListener("click", (e) => {
      if (!profileBtn.contains(e.target) && !profilePanel.contains(e.target)) {
        profilePanel.classList.remove("show");
      }
    });
  }
});
