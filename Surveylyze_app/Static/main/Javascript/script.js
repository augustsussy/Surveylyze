// script.js

document.addEventListener("DOMContentLoaded", () => {
  // Redirect for "Get Started" button
  const getStartedBtn = document.querySelector(".btn-primary");
  if (getStartedBtn) {
    getStartedBtn.addEventListener("click", () => {
      window.location.href = "/signup/";
    });
  }
});