document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  const commonPasswords = [
    "password","123456","123456789","qwerty","abc123","111111","123123",
    "letmein","welcome","iloveyou","admin","login","dragon","baseball"
  ];

  form.addEventListener("submit", (e) => {
    const pw1 = document.querySelector("input[name='password1']").value.trim();
    const pw2 = document.querySelector("input[name='password2']").value.trim();
    const firstName = (document.querySelector("input[name='firstname']")?.value || "").toLowerCase();
    const lastName  = (document.querySelector("input[name='lastname']")?.value || "").toLowerCase();
    const email     = (document.querySelector("input[name='email']")?.value || "").toLowerCase();

    const errors = [];

    // --- Match check ---
    if (pw1 !== pw2) errors.push("Passwords do not match.");

    // --- Length check ---
    if (pw1.length < 8) errors.push("Password must contain at least 8 characters.");

    // --- Numeric-only check ---
    if (/^\d+$/.test(pw1)) errors.push("Password cannot be entirely numeric.");

    // --- Similarity check (first name, last name, email) ---
    const lowerPw = pw1.toLowerCase();
    if (firstName && lowerPw.includes(firstName))
      errors.push("Password is too similar to your first name.");
    if (lastName && lowerPw.includes(lastName))
      errors.push("Password is too similar to your last name.");
    if (email && lowerPw.includes(email.split("@")[0]))
      errors.push("Password is too similar to your email address.");

    // --- Common password list check ---
    if (commonPasswords.includes(lowerPw))
      errors.push("Password is too common or easily guessable.");

    // --- If any errors, block submission and show them ---
    if (errors.length > 0) {
      e.preventDefault();
      return;
    }
  });
});
