// admin_responses.js

document.addEventListener('DOMContentLoaded', () => {
  // Clear individual filter
  window.clearFilter = function(filterName) {
    const form = document.getElementById('filterForm');
    const input = form.querySelector(`[name="${filterName}"]`);

    if (input) {
      input.value = '';
      form.submit();
    }
  };

  // Auto-submit form when filters change
  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    const selects = filterForm.querySelectorAll('select');
    selects.forEach(select => {
      select.addEventListener('change', () => {
        filterForm.submit();
      });
    });
  }

  // Add smooth scroll to pagination
  const paginationLinks = document.querySelectorAll('.pagination a');
  paginationLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Highlight row on hover
  const tableRows = document.querySelectorAll('.response-table tbody tr');
  tableRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.style.transform = 'scale(1.01)';
    });

    row.addEventListener('mouseleave', () => {
      row.style.transform = 'scale(1)';
    });
  });
});