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
      // show active step
      steps.forEach((step, i) => {
        step.classList.toggle("active", i === currentStep);
      });

      // update tabs (if you add more later)
      tabs.forEach((tab, i) => {
        tab.classList.toggle("active", i === currentStep);
      });

      // progress bar
      if (progress) {
        progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
      }

      // 1/3, 2/3, etc
      if (progressText) {
        progressText.textContent = `${currentStep + 1}/${steps.length}`;
      }

      // buttons
      if (prevBtn) prevBtn.disabled = currentStep === 0;
      if (nextBtn) {
        nextBtn.textContent =
          currentStep === steps.length - 1 ? "Submit" : "Next";
      }
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        // prevent default submit so we control when to submit
        e.preventDefault();

        if (currentStep < steps.length - 1) {
          currentStep++;
          updateSurvey();
        } else {
          // last step: submit the form for real
          if (surveyForm) {
            surveyForm.submit();
          }
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentStep > 0) {
          currentStep--;
          updateSurvey();
        }
      });
    }

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
  // STAR RATING (LIKERT) LOGIC
  // -----------------------------
  // HTML expectation:
  // <div class="star-rating" data-question-id="q123">
  //   <input ... name="q123" value="1"> ...
  // </div>
  // <span id="score_q123" class="rating-score">0 / 5</span>
  const starGroups = document.querySelectorAll(".star-rating");

  starGroups.forEach((group) => {
    const radios = group.querySelectorAll('input[type="radio"]');
    const qKey = group.getAttribute("data-question-id"); // e.g. "q5"
    const scoreEl = document.getElementById("score_" + qKey); // "score_q5"

    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (scoreEl) {
          scoreEl.textContent = `${radio.value} / 5`;
        }
      });
    });
  });

  // -----------------------------
  // PROFILE DROPDOWN LOGIC
  // -----------------------------
  if (profileBtn && profilePanel) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profilePanel.classList.toggle("show");
    });

    window.addEventListener("click", (e) => {
      if (
        !profileBtn.contains(e.target) &&
        !profilePanel.contains(e.target)
      ) {
        profilePanel.classList.remove("show");
      }
    });
  }
});
