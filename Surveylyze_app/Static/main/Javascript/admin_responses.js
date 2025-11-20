
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

  // Smooth scroll to pagination
  const paginationLinks = document.querySelectorAll('.pagination a');
  paginationLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // ========================================
  // ENHANCED DATE PICKER FUNCTIONALITY
  // ========================================

  // Style date inputs when they have values
  const dateInputs = document.querySelectorAll('input[type="date"]');

  dateInputs.forEach(input => {
    // Add class when date has value
    const updateDateStyle = () => {
      if (input.value) {
        input.classList.add('has-value');
      } else {
        input.classList.remove('has-value');
      }
    };

    updateDateStyle();
    input.addEventListener('change', updateDateStyle);

    // Add animation when calendar opens
    input.addEventListener('focus', function() {
      this.style.boxShadow = '0 0 0 3px rgba(181, 126, 220, 0.15)';
    });

    input.addEventListener('blur', function() {
      this.style.boxShadow = '';
    });
  });

  // Date range validation
  const dateFrom = document.querySelector('input[name="date_from"]');
  const dateTo = document.querySelector('input[name="date_to"]');

  if (dateFrom && dateTo) {
    dateFrom.addEventListener('change', () => {
      if (dateFrom.value) {
        dateTo.min = dateFrom.value;
      }
    });

    dateTo.addEventListener('change', () => {
      if (dateTo.value) {
        dateFrom.max = dateTo.value;
      }
    });
  }

  // Row hover effects
  const tableRows = document.querySelectorAll('.response-table tbody tr');
  tableRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.style.transform = 'scale(1.005)';
      row.style.boxShadow = '0 2px 8px rgba(181, 126, 220, 0.1)';
    });

    row.addEventListener('mouseleave', () => {
      row.style.transform = 'scale(1)';
      row.style.boxShadow = '';
    });
  });
});