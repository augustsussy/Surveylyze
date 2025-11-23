document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".survey-step");
  const tabs = document.querySelectorAll(".tab");
  const progressBar = document.querySelector(".progress");          // visual bar
  const progressText = document.querySelector(".progress-text");    // optional text
  const nextBtn = document.querySelector(".next");
  const prevBtn = document.querySelector(".prev");
  const surveyForm = document.getElementById("survey-form");

  const profileBtn = document.getElementById("profile-btn");
  const profilePanel = document.getElementById("profile-panel");

  // For question-based progress / validation
  const questionBlocks = Array.from(document.querySelectorAll(".question-block"));
  const totalQuestions = questionBlocks.length;

  // -----------------------------
  // QUESTION COMPLETION LOGIC
  // -----------------------------
  function getAnsweredCount() {
    let answeredCount = 0;

    questionBlocks.forEach((block) => {
      const inputs = block.querySelectorAll("input, select, textarea");
      let isAnswered = false;

      inputs.forEach((input) => {
        if (isAnswered) return; // already counted this block

        if (input.type === "radio") {
          const checked = surveyForm.querySelector(
            `input[name="${CSS.escape(input.name)}"]:checked`
          );
          if (checked) isAnswered = true;
        } else if (input.tagName === "SELECT") {
          if (input.value && input.value !== "") isAnswered = true;
        } else if (input.type === "text" || input.tagName === "TEXTAREA") {
          if (input.value.trim() !== "") isAnswered = true;
        }
      });

      if (isAnswered) {
        answeredCount += 1;
        block.classList.remove("unanswered");
      } else {
        block.classList.add("unanswered");
      }
    });

    return answeredCount;
  }

  function updateQuestionProgress() {
    const answeredCount = getAnsweredCount();
    const percent = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }

    // If you want text like "3/10 answered"
    if (progressText && totalQuestions > 0) {
      progressText.textContent = `${answeredCount}/${totalQuestions}`;
    }
  }

  function allQuestionsAnswered() {
    // If there are no questions, treat as valid
    if (totalQuestions === 0) return true;
    return getAnsweredCount() === totalQuestions;
  }

  function focusFirstUnanswered() {
    const firstUnanswered = document.querySelector(".question-block.unanswered");
    if (firstUnanswered) {
      firstUnanswered.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Listen for changes to update progress
  if (surveyForm) {
    surveyForm.addEventListener("input", updateQuestionProgress);
    surveyForm.addEventListener("change", updateQuestionProgress);

    // Guard: block submit if not complete (covers Enter key, etc.)
    surveyForm.addEventListener("submit", (e) => {
      if (!allQuestionsAnswered()) {
        e.preventDefault();
        focusFirstUnanswered();
        alert("Please answer all questions before submitting the survey.");
      }
    });
  }

  // Initial progress
  updateQuestionProgress();

  // -----------------------------
  // MULTI-STEP SURVEY LOGIC
  // (progress bar is now question-based,
  // so we don't touch its width here)
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

        // If we have multiple steps and we're not on the last one yet
        if (currentStep < steps.length - 1) {
          currentStep++;
          updateSurvey();
        } else {
          // Last step → validate all questions before final submit
          if (!allQuestionsAnswered()) {
            focusFirstUnanswered();
            alert("Please answer all questions before submitting the survey.");
            return;
          }

          if (surveyForm) {
            surveyForm.submit();
          }
        }
      });
    }

    // PREVIOUS BUTTON
    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.preventDefault();

        const dashboardUrl = prevBtn.dataset.backUrl;

        // If first step → go back to dashboard
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

    // TAB CLICKING (future-proof)
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
      radio.addEventListener("change", () => {
        updateStars(radio.value);
        updateQuestionProgress(); // Likert answers also affect progress
      });
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
