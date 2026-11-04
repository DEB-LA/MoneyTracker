/**
 * Money Tracker - Core Application Logic
 * Pure vanilla JavaScript with localStorage persistence.
 */

(function () {
  'use strict';

  // --- Constants & Storage ---
  const STORAGE_KEY = 'money_tracker_expenses_v1';

  // State
  let expenses = [];
  let searchQuery = '';

  // --- DOM Elements ---
  // Summary
  const totalAmountEl = document.getElementById('total-amount');
  const totalCountEl = document.getElementById('total-count');
  const listBadgeEl = document.getElementById('list-badge');

  // Add Form
  const expenseForm = document.getElementById('expense-form');
  const expenseNameInput = document.getElementById('expense-name');
  const expenseAmountInput = document.getElementById('expense-amount');
  const expenseDateInput = document.getElementById('expense-date');
  const nameError = document.getElementById('name-error');
  const amountError = document.getElementById('amount-error');
  const dateError = document.getElementById('date-error');

  // Search
  const searchContainer = document.getElementById('search-container');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const searchFeedback = document.getElementById('search-feedback');
  const resetSearchBtn = document.getElementById('reset-search-btn');

  // List & States
  const expenseList = document.getElementById('expense-list');
  const emptyState = document.getElementById('empty-state');
  const noResultsState = document.getElementById('no-results-state');

  // Edit Modal
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');
  const editIdInput = document.getElementById('edit-expense-id');
  const editNameInput = document.getElementById('edit-expense-name');
  const editAmountInput = document.getElementById('edit-expense-amount');
  const editDateInput = document.getElementById('edit-expense-date');
  const editNameError = document.getElementById('edit-name-error');
  const editAmountError = document.getElementById('edit-amount-error');
  const editDateError = document.getElementById('edit-date-error');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // --- Helpers ---

  /**
   * Returns current local date as YYYY-MM-DD
   */
  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format numbers to USD currency (e.g. $1,234.56)
   */
  function formatCurrency(num) {
    const val = Number(num) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  /**
   * Format YYYY-MM-DD string to friendly readable format (e.g., Nov 4, 2026)
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return dateStr;
  }

  /**
   * Escape HTML to safely render user inputs
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Persistence ---

  function loadExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          expenses = parsed;
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse expenses from localStorage:', e);
    }
    expenses = [];
  }

  function saveExpenses() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses to localStorage:', e);
      alert('Could not save data. Your browser storage might be full or disabled.');
    }
  }

  // --- Calculations & Rendering ---

  function updateOverview() {
    const total = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    totalAmountEl.textContent = formatCurrency(total);

    const count = expenses.length;
    if (count === 1) {
      totalCountEl.textContent = '1 expense recorded';
      listBadgeEl.textContent = '1 item';
    } else {
      totalCountEl.textContent = `${count} expenses recorded`;
      listBadgeEl.textContent = `${count} items`;
    }
  }

  function getFilteredExpenses() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return expenses;

    return expenses.filter(exp => {
      const titleMatch = (exp.title || '').toLowerCase().includes(q);
      const amountMatch = String(exp.amount || '').includes(q);
      const dateMatch = (exp.date || '').includes(q);
      return titleMatch || amountMatch || dateMatch;
    });
  }

  function renderList() {
    updateOverview();

    // Hide or show search clear button
    if (searchQuery.trim().length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    // Check if there are no expenses at all
    if (expenses.length === 0) {
      searchContainer.classList.add('hidden');
      searchFeedback.classList.add('hidden');
      expenseList.innerHTML = '';
      emptyState.classList.remove('hidden');
      noResultsState.classList.add('hidden');
      return;
    }

    searchContainer.classList.remove('hidden');
    const filtered = getFilteredExpenses();

    // Check if search returned no results
    if (filtered.length === 0 && searchQuery.trim().length > 0) {
      expenseList.innerHTML = '';
      emptyState.classList.add('hidden');
      noResultsState.classList.remove('hidden');
      searchFeedback.classList.add('hidden');
      return;
    }

    noResultsState.classList.add('hidden');
    emptyState.classList.add('hidden');

    // Show search stats if active
    if (searchQuery.trim().length > 0) {
      const filteredTotal = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      searchFeedback.innerHTML = `
        <span>Showing <strong>${filtered.length}</strong> of ${expenses.length} results</span>
        <span>Filtered Total: <strong>${formatCurrency(filteredTotal)}</strong></span>
      `;
      searchFeedback.classList.remove('hidden');
    } else {
      searchFeedback.classList.add('hidden');
    }

    // Sort: Date descending (newest first), then createdAt descending
    const sorted = [...filtered].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // Render items
    expenseList.innerHTML = sorted.map(exp => `
      <li class="expense-item" data-id="${escapeHtml(exp.id)}">
        <div class="expense-info">
          <span class="expense-title">${escapeHtml(exp.title)}</span>
          <span class="expense-date">
            <span>📅</span> ${formatDate(exp.date)}
          </span>
        </div>
        <div class="expense-right">
          <span class="expense-amount">${formatCurrency(exp.amount)}</span>
          <div class="expense-actions">
            <button 
              type="button" 
              class="action-btn edit-btn" 
              data-id="${escapeHtml(exp.id)}" 
              title="Edit expense"
              aria-label="Edit expense: ${escapeHtml(exp.title)}"
            >
              ✏️
            </button>
            <button 
              type="button" 
              class="action-btn delete-btn" 
              data-id="${escapeHtml(exp.id)}" 
              title="Delete expense"
              aria-label="Delete expense: ${escapeHtml(exp.title)}"
            >
              🗑️
            </button>
          </div>
        </div>
      </li>
    `).join('');
  }

  // --- Add Expense Handling ---

  function validateAddForm() {
    let isValid = true;
    const title = expenseNameInput.value.trim();
    const amountVal = parseFloat(expenseAmountInput.value);
    const dateVal = expenseDateInput.value;

    if (!title) {
      expenseNameInput.classList.add('input-error');
      nameError.classList.add('visible');
      isValid = false;
    } else {
      expenseNameInput.classList.remove('input-error');
      nameError.classList.remove('visible');
    }

    if (isNaN(amountVal) || amountVal <= 0) {
      expenseAmountInput.classList.add('input-error');
      amountError.classList.add('visible');
      isValid = false;
    } else {
      expenseAmountInput.classList.remove('input-error');
      amountError.classList.remove('visible');
    }

    if (!dateVal) {
      expenseDateInput.classList.add('input-error');
      dateError.classList.add('visible');
      isValid = false;
    } else {
      expenseDateInput.classList.remove('input-error');
      dateError.classList.remove('visible');
    }

    return isValid;
  }

  expenseForm.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validateAddForm()) {
      return;
    }

    const title = expenseNameInput.value.trim();
    const amount = Math.round(parseFloat(expenseAmountInput.value) * 100) / 100;
    const date = expenseDateInput.value;

    const newExpense = {
      id: 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
      title: title,
      amount: amount,
      date: date,
      createdAt: Date.now()
    };

    expenses.unshift(newExpense);
    saveExpenses();

    // Reset Form
    expenseForm.reset();
    expenseDateInput.value = getTodayString();
    expenseNameInput.classList.remove('input-error');
    expenseAmountInput.classList.remove('input-error');
    expenseDateInput.classList.remove('input-error');
    nameError.classList.remove('visible');
    amountError.classList.remove('visible');
    dateError.classList.remove('visible');

    renderList();
  });

  // Clear validation error styling on live input
  expenseNameInput.addEventListener('input', () => {
    if (expenseNameInput.value.trim()) {
      expenseNameInput.classList.remove('input-error');
      nameError.classList.remove('visible');
    }
  });

  expenseAmountInput.addEventListener('input', () => {
    const val = parseFloat(expenseAmountInput.value);
    if (!isNaN(val) && val > 0) {
      expenseAmountInput.classList.remove('input-error');
      amountError.classList.remove('visible');
    }
  });

  expenseDateInput.addEventListener('change', () => {
    if (expenseDateInput.value) {
      expenseDateInput.classList.remove('input-error');
      dateError.classList.remove('visible');
    }
  });

  // --- Delete Expense Handling ---

  function handleDeleteExpense(id) {
    const item = expenses.find(exp => exp.id === id);
    if (!item) return;

    // Ask user to confirm first
    const isConfirmed = window.confirm(
      `Are you sure you want to delete this expense?\n\n"${item.title}" - ${formatCurrency(item.amount)} (${formatDate(item.date)})`
    );

    if (isConfirmed) {
      expenses = expenses.filter(exp => exp.id !== id);
      saveExpenses();
      renderList();
    }
  }

  // --- Edit Expense Handling (Modal) ---

  function openEditModal(id) {
    const item = expenses.find(exp => exp.id === id);
    if (!item) return;

    editIdInput.value = item.id;
    editNameInput.value = item.title;
    editAmountInput.value = item.amount;
    editDateInput.value = item.date;

    // Reset errors
    editNameInput.classList.remove('input-error');
    editAmountInput.classList.remove('input-error');
    editDateInput.classList.remove('input-error');
    editNameError.classList.remove('visible');
    editAmountError.classList.remove('visible');
    editDateError.classList.remove('visible');

    editModal.classList.remove('hidden');
    editNameInput.focus();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editForm.reset();
  }

  function validateEditForm() {
    let isValid = true;
    const title = editNameInput.value.trim();
    const amountVal = parseFloat(editAmountInput.value);
    const dateVal = editDateInput.value;

    if (!title) {
      editNameInput.classList.add('input-error');
      editNameError.classList.add('visible');
      isValid = false;
    } else {
      editNameInput.classList.remove('input-error');
      editNameError.classList.remove('visible');
    }

    if (isNaN(amountVal) || amountVal <= 0) {
      editAmountInput.classList.add('input-error');
      editAmountError.classList.add('visible');
      isValid = false;
    } else {
      editAmountInput.classList.remove('input-error');
      editAmountError.classList.remove('visible');
    }

    if (!dateVal) {
      editDateInput.classList.add('input-error');
      editDateError.classList.add('visible');
      isValid = false;
    } else {
      editDateInput.classList.remove('input-error');
      editDateError.classList.remove('visible');
    }

    return isValid;
  }

  editForm.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validateEditForm()) {
      return;
    }

    const id = editIdInput.value;
    const itemIndex = expenses.findIndex(exp => exp.id === id);
    if (itemIndex === -1) return;

    const title = editNameInput.value.trim();
    const amount = Math.round(parseFloat(editAmountInput.value) * 100) / 100;
    const date = editDateInput.value;

    expenses[itemIndex] = {
      ...expenses[itemIndex],
      title: title,
      amount: amount,
      date: date
    };

    saveExpenses();
    closeEditModal();
    renderList();
  });

  closeModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  // Close modal when clicking on the darkened backdrop outside the card
  editModal.addEventListener('click', function (e) {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
      closeEditModal();
    }
  });

  // --- Event Delegation for List Action Buttons ---

  expenseList.addEventListener('click', function (e) {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      const id = editBtn.dataset.id;
      openEditModal(id);
      return;
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      handleDeleteExpense(id);
      return;
    }
  });

  // --- Search Handling ---

  searchInput.addEventListener('input', function () {
    searchQuery = this.value;
    renderList();
  });

  clearSearchBtn.addEventListener('click', function () {
    searchQuery = '';
    searchInput.value = '';
    searchInput.focus();
    renderList();
  });

  resetSearchBtn.addEventListener('click', function () {
    searchQuery = '';
    searchInput.value = '';
    renderList();
  });

  // --- Initialization ---

  function init() {
    // Set default date to today
    expenseDateInput.value = getTodayString();

    // Load from localStorage and render initial state
    loadExpenses();
    renderList();
  }

  init();
})();

