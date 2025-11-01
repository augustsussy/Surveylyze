document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".survey-step");
  const tabs = document.querySelectorAll(".tab");
  const progress = document.querySelector(".progress");
  const progressText = document.querySelector(".progress-text");
  const nextBtn = document.querySelector(".next");
  const prevBtn = document.querySelector(".prev");

  const profileBtn = document.getElementById("profile-btn");
  const profilePanel = document.getElementById("profile-panel");
  // Only run survey logic if there are steps
  let currentStep = 0;
  if (steps && steps.length > 0) {
    function updateSurvey() {
      steps.forEach((step, i) => step.classList.toggle("active", i === currentStep));
      tabs.forEach((tab, i) => tab.classList.toggle("active", i === currentStep));

      if (progress) {
        progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
      }
      if (progressText) {
        progressText.textContent = `${currentStep + 1}/${steps.length}`;
      }
      if (prevBtn) prevBtn.disabled = currentStep === 0;
      if (nextBtn) nextBtn.textContent = currentStep === steps.length - 1 ? "Submit" : "Next";
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (currentStep < steps.length - 1) {
          currentStep++;
          updateSurvey();
        } else {
          // Replace this with real submit behavior later
          alert("Survey submitted! (Static demo)");
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentStep > 0) {
          currentStep--;
          updateSurvey();
        }
      });
    }

    if (tabs && tabs.length > 0) {
      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
          currentStep = index;
          updateSurvey();
        });
      });
    }

    updateSurvey();
  } // end survey logic

  // Profile dropdown logic (safe-guarded)
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