(function () {
  const STATUS_LABELS = {
    DRAFT: 'Rascunho',
    PUBLISHED: 'Publicada',
    SCHEDULED: 'Agendada',
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
  };

  const STATUS_BADGES = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PUBLISHED: 'bg-emerald-100 text-emerald-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-slate-200 text-slate-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  const DEFAULT_PAGE_SIZE = 10;
  const TRAIL_SEARCH_LIMIT = 8;
  const TRAIL_SEARCH_DEBOUNCE = 250;
  const MAX_DESCRIPTION_LENGTH = 3000;
  const MAX_EXPEDITION_DURATION_DAYS = 30;

  const state = {
    user: null,
    expeditions: [],
    pagination: null,
    filters: {
      status: '',
      from: '',
      to: '',
      search: '',
    },
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    selectedTrail: null,
    editingExpeditionId: null,
    editingExpeditionStatus: null,
    citiesCache: new Map(),
  };

  const elements = {};
  const listeners = [];
  let debouncedTrailSearch = null;

  const adminApi = () => window.trekkoAdminApi;

  const isBrowser = typeof window !== 'undefined';

  function registerListener(target, type, handler, options) {
    if (!target) return;
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  }

  function cleanupListeners() {
    while (listeners.length) {
      const dispose = listeners.pop();
      try {
        dispose();
      } catch (error) {
        console.warn('Falha ao remover listener', error);
      }
    }
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), delay);
    };
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  }

  function formatDateRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return '—';
    }
    return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : '';
  }

  function isUnauthorized(response) {
    if (!response) return false;
    if (response.status === 401 || response.status === 403) {
      if (typeof AdminGuard !== 'undefined' && typeof AdminGuard.handleUnauthorized === 'function') {
        AdminGuard.handleUnauthorized(new Error(`HTTP_${response.status}`));
      }
      return true;
    }
    return false;
  }

  function ensureElements() {
    Object.assign(elements, {
      loading: document.getElementById('loading'),
      table: document.getElementById('expeditionsTable'),
      noExpeditions: document.getElementById('noExpeditions'),
      createFirstExpeditionBtn: document.getElementById('createFirstExpeditionBtn'),
      tableBody: document.getElementById('expeditionsTableBody'),
      paginationControls: document.getElementById('paginationControls'),
      prevPageBtn: document.getElementById('prevPageBtn'),
      nextPageBtn: document.getElementById('nextPageBtn'),
      pageNumbers: document.getElementById('pageNumbers'),
      statusFilter: document.getElementById('statusFilter'),
      fromDateFilter: document.getElementById('fromDateFilter'),
      toDateFilter: document.getElementById('toDateFilter'),
      searchFilter: document.getElementById('searchFilter'),
      applyFiltersBtn: document.getElementById('applyFiltersBtn'),
      newExpeditionBtn: document.getElementById('newExpeditionBtn'),
      modal: document.getElementById('expeditionModal'),
      modalTitle: document.getElementById('modalTitle'),
      closeModalBtn: document.getElementById('closeModal'),
      saveDraftBtn: document.getElementById('saveDraftBtn'),
      publishBtn: document.getElementById('publishBtn'),
      expeditionForm: document.getElementById('expeditionForm'),
      modalStateSelect: document.getElementById('modalStateSelect'),
      modalCitySelect: document.getElementById('modalCitySelect'),
      modalTrailSearch: document.getElementById('modalTrailSearch'),
      trailResults: document.getElementById('trailResults'),
      selectedTrailContainer: document.getElementById('selectedTrail'),
      selectedTrailName: document.getElementById('selectedTrailName'),
      selectedTrailLocation: document.getElementById('selectedTrailLocation'),
      clearSelectedTrailBtn: document.getElementById('clearSelectedTrailBtn'),
      startDateInput: document.getElementById('startDate'),
      endDateInput: document.getElementById('endDate'),
      priceInput: document.getElementById('price'),
      maxPeopleInput: document.getElementById('maxPeople'),
      descriptionInput: document.getElementById('description'),
      descriptionCount: document.getElementById('descriptionCount'),
      formErrors: document.getElementById('formErrors'),
      errorList: document.getElementById('errorList'),
      userMenuBtn: document.getElementById('userMenuBtn'),
      userDropdown: document.getElementById('userDropdown'),
      userName: document.getElementById('userName'),
      logoutBtn: document.getElementById('logoutBtn'),
    });
  }

  async function initialize() {
    ensureElements();

    if (typeof AdminGuard === 'undefined' || !adminApi()) {
      console.error('Dependências da área administrativa indisponíveis.');
      return;
    }

    try {
      const user = await AdminGuard.requireAuth();
      if (!user) {
        return;
      }
      state.user = user;
      setupUI();
      await adminApi().ensureCsrfToken().catch(() => undefined);
      await loadExpeditions();
    } catch (error) {
      console.error('Não foi possível inicializar a página de expedições', error);
    }
  }

  function setupUI() {
    cleanupListeners();
    bindFilters();
    bindModalControls();
    bindTableInteractions();
    bindUserMenu();
    setDateConstraints();
    updateDescriptionCounter();
    if (state.user) {
      updateUserIdentity(state.user);
    }
  }

  function bindFilters() {
    if (!elements.statusFilter || !elements.applyFiltersBtn) {
      return;
    }

    registerListener(elements.applyFiltersBtn, 'click', () => {
      applyFilters();
    });

    registerListener(elements.statusFilter, 'change', () => applyFilters());
    registerListener(elements.fromDateFilter, 'change', () => applyFilters());
    registerListener(elements.toDateFilter, 'change', () => applyFilters());

    if (elements.searchFilter) {
      registerListener(elements.searchFilter, 'keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          applyFilters();
        }
      });
    }
  }

  function bindModalControls() {
    if (!elements.modal) return;

    registerListener(elements.newExpeditionBtn, 'click', () => openCreateExpedition());
    registerListener(elements.createFirstExpeditionBtn, 'click', () => openCreateExpedition());
    registerListener(elements.closeModalBtn, 'click', () => closeModal());
    registerListener(elements.modal, 'click', (event) => {
      if (event.target === elements.modal) {
        closeModal();
      }
    });

    if (elements.saveDraftBtn) {
      registerListener(elements.saveDraftBtn, 'click', async (event) => {
        event.preventDefault();
        await handleExpeditionSubmit('draft');
      });
    }

    if (elements.expeditionForm) {
      registerListener(elements.expeditionForm, 'submit', async (event) => {
        event.preventDefault();
        await handleExpeditionSubmit('publish');
      });
    }

    if (elements.modalStateSelect) {
      registerListener(elements.modalStateSelect, 'change', () => {
        loadCitiesForState(elements.modalStateSelect.value);
      });
    }

    if (elements.modalTrailSearch) {
      debouncedTrailSearch = debounce(async () => {
        await searchTrails();
      }, TRAIL_SEARCH_DEBOUNCE);
      registerListener(elements.modalTrailSearch, 'input', () => debouncedTrailSearch());
    }

    if (elements.clearSelectedTrailBtn) {
      registerListener(elements.clearSelectedTrailBtn, 'click', () => {
        state.selectedTrail = null;
        updateSelectedTrailDisplay();
      });
    }

    if (elements.descriptionInput) {
      registerListener(elements.descriptionInput, 'input', () => updateDescriptionCounter());
    }
  }

  function bindTableInteractions() {
    if (!elements.tableBody) {
      return;
    }

    registerListener(elements.tableBody, 'click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const actionElement = target.closest('[data-action]');
      if (!actionElement) return;
      const action = actionElement.dataset.action;
      const expeditionId = actionElement.dataset.id;
      if (!action || !expeditionId) return;

      if (action === 'edit') {
        openEditExpedition(expeditionId);
      }
    });

    registerListener(elements.tableBody, 'change', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      const action = target.dataset.action;
      const expeditionId = target.dataset.id;
      if (action !== 'status' || !expeditionId) return;

      const newStatus = target.value;
      if (!newStatus) return;

      const current = state.expeditions.find((expedition) => expedition.id === expeditionId)?.status;
      if (current === newStatus) {
        return;
      }

      target.disabled = true;
      try {
        await updateExpeditionStatus(expeditionId, newStatus);
      } catch (error) {
        console.error('Falha ao atualizar status da expedição', error);
        target.value = current || '';
      } finally {
        target.disabled = false;
      }
    });
  }

  function bindUserMenu() {
    if (!elements.userMenuBtn || !elements.userDropdown) {
      return;
    }

    registerListener(elements.userMenuBtn, 'click', () => {
      elements.userDropdown.classList.toggle('hidden');
    });

    registerListener(document, 'click', (event) => {
      if (!elements.userDropdown || !elements.userMenuBtn) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (elements.userDropdown.contains(target) || elements.userMenuBtn.contains(target)) {
        return;
      }
      elements.userDropdown.classList.add('hidden');
    });

    if (elements.logoutBtn) {
      registerListener(elements.logoutBtn, 'click', async (event) => {
        event.preventDefault();
        await handleLogout();
      });
    }
  }

  function setDateConstraints() {
    if (!elements.startDateInput || !elements.endDateInput) return;
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    elements.startDateInput.min = iso;
    elements.endDateInput.min = iso;
  }

  function updateDescriptionCounter() {
    if (!elements.descriptionInput || !elements.descriptionCount) return;
    const length = elements.descriptionInput.value.length;
    elements.descriptionCount.textContent = `${Math.min(length, MAX_DESCRIPTION_LENGTH)}`;
  }

  function updateUserIdentity(user) {
    if (elements.userName) {
      const label = user.name || user.email || 'Usuário';
      elements.userName.textContent = label;
    }
  }

  function setLoading(isLoading) {
    if (elements.loading) {
      elements.loading.classList.toggle('hidden', !isLoading);
    }
    if (elements.table) {
      elements.table.classList.toggle('hidden', isLoading);
    }
  }

  function applyFilters() {
    state.filters.status = elements.statusFilter?.value ?? '';
    state.filters.from = elements.fromDateFilter?.value ?? '';
    state.filters.to = elements.toDateFilter?.value ?? '';
    state.filters.search = (elements.searchFilter?.value ?? '').trim();
    state.currentPage = 1;
    loadExpeditions().catch((error) => {
      console.error('Falha ao aplicar filtros', error);
    });
  }

  function buildListQuery(page = 1) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(state.pageSize));
    if (state.filters.status) params.append('status', state.filters.status);
    if (state.filters.from) params.set('from', state.filters.from);
    if (state.filters.to) params.set('to', state.filters.to);
    return params.toString();
  }

  async function loadExpeditions(page = state.currentPage) {
    if (!adminApi()) return;

    state.currentPage = page;
    setLoading(true);
    if (elements.noExpeditions) {
      elements.noExpeditions.classList.add('hidden');
    }

    const query = buildListQuery(page);

    try {
      const response = await adminApi().fetch(`/admin/expeditions?${query}`);
      if (isUnauthorized(response)) {
        return;
      }
      if (!response.ok) {
        throw new Error(`Falha ao carregar expedições (${response.status})`);
      }

      const payload = await response.json();
      state.expeditions = Array.isArray(payload?.expeditions) ? payload.expeditions : [];
      state.pagination = payload?.pagination ?? null;

      renderExpeditions();
      renderPagination();
    } catch (error) {
      console.error('Erro ao buscar expedições', error);
      state.expeditions = [];
      state.pagination = null;
      renderExpeditions();
      renderPagination();
    } finally {
      setLoading(false);
    }
  }

  function filterExpeditionsForDisplay(expeditions) {
    const search = normalizeText(state.filters.search);
    if (!search) {
      return expeditions;
    }

    return expeditions.filter((expedition) => {
      const values = [
        expedition.title,
        expedition.trail?.name,
        expedition.leadGuide?.name,
        expedition.leadGuide?.displayName,
      ];
      return values.some((value) => normalizeText(value || '').includes(search));
    });
  }

  function renderExpeditions() {
    if (!elements.tableBody) return;
    elements.tableBody.innerHTML = '';

    const items = filterExpeditionsForDisplay(state.expeditions);

    if (elements.table) {
      elements.table.classList.toggle('hidden', items.length === 0);
    }

    if (items.length === 0) {
      if (elements.noExpeditions) {
        elements.noExpeditions.classList.remove('hidden');
      }
      reapplyPermissions();
      return;
    }

    if (elements.noExpeditions) {
      elements.noExpeditions.classList.add('hidden');
    }

    const fragment = document.createDocumentFragment();

    items.forEach((expedition) => {
      fragment.appendChild(buildExpeditionRow(expedition));
    });

    elements.tableBody.appendChild(fragment);
    reapplyPermissions();
  }

  function buildExpeditionRow(expedition) {
    const row = document.createElement('tr');

    const trailCell = document.createElement('td');
    trailCell.className = 'px-6 py-4 whitespace-nowrap';
    trailCell.innerHTML = `
      <div class="text-sm font-medium text-gray-900">${escapeHtml(expedition.trail?.name ?? '—')}</div>
      <div class="text-sm text-gray-500">${escapeHtml(expedition.title ?? '—')}</div>
    `;

    const periodCell = document.createElement('td');
    periodCell.className = 'px-6 py-4 whitespace-nowrap';
    periodCell.textContent = formatDateRange(expedition.startDate, expedition.endDate);

    const priceCell = document.createElement('td');
    priceCell.className = 'px-6 py-4 whitespace-nowrap';
    priceCell.textContent = formatCurrency((expedition.priceCents ?? 0) / 100);

    const capacityCell = document.createElement('td');
    capacityCell.className = 'px-6 py-4 whitespace-nowrap';
    const booked = Number(expedition.bookedHeadcount ?? 0);
    const maxParticipants = Number(expedition.maxParticipants ?? 0);
    capacityCell.innerHTML = `
      <div class="text-sm text-gray-900">${booked}/${maxParticipants}</div>
      <div class="text-xs text-gray-500">Vagas disponíveis: ${Math.max(maxParticipants - booked, 0)}</div>
    `;

    const statusCell = document.createElement('td');
    statusCell.className = 'px-6 py-4 whitespace-nowrap';
    const badge = document.createElement('span');
    badge.className = `inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
      STATUS_BADGES[expedition.status] || 'bg-gray-100 text-gray-700'
    }`;
    badge.textContent = STATUS_LABELS[expedition.status] || expedition.status;
    statusCell.appendChild(badge);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.dataset.action = 'edit';
    editButton.dataset.id = expedition.id;
    editButton.dataset.permission = 'EXPEDICOES';
    editButton.className = 'inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50';
    editButton.textContent = 'Editar';

    const statusSelect = document.createElement('select');
    statusSelect.dataset.action = 'status';
    statusSelect.dataset.id = expedition.id;
    statusSelect.dataset.permission = 'EXPEDICOES';
    statusSelect.className = 'inline-flex px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:border-gray-400';

    Object.entries(STATUS_LABELS).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      statusSelect.appendChild(option);
    });
    statusSelect.value = expedition.status;

    actionsCell.appendChild(editButton);
    actionsCell.appendChild(statusSelect);

    row.appendChild(trailCell);
    row.appendChild(periodCell);
    row.appendChild(priceCell);
    row.appendChild(capacityCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    return row;
  }

  function renderPagination() {
    if (!elements.paginationControls || !elements.prevPageBtn || !elements.nextPageBtn || !elements.pageNumbers) {
      return;
    }

    const pagination = state.pagination;
    const hasPages = pagination && pagination.totalPages > 1;
    elements.paginationControls.classList.toggle('hidden', !hasPages);

    if (!pagination) {
      return;
    }

    elements.prevPageBtn.disabled = !pagination.hasPreviousPage;
    elements.nextPageBtn.disabled = !pagination.hasNextPage;

    elements.prevPageBtn.onclick = () => {
      if (pagination.hasPreviousPage) {
        loadExpeditions(Math.max(1, state.currentPage - 1));
      }
    };

    elements.nextPageBtn.onclick = () => {
      if (pagination.hasNextPage) {
        loadExpeditions(Math.min(pagination.totalPages, state.currentPage + 1));
      }
    };

    elements.pageNumbers.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const maxVisible = 7;
    const startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);

    for (let page = startPage; page <= endPage; page += 1) {
      const button = document.createElement('button');
      const isActive = page === state.currentPage;
      button.textContent = String(page);
      button.className = `px-3 py-1 rounded-md ${
        isActive ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`;
      button.disabled = isActive;
      button.addEventListener('click', () => loadExpeditions(page));
      fragment.appendChild(button);
    }

    elements.pageNumbers.appendChild(fragment);
  }

  function escapeHtml(value) {
    if (value == null) return '';
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char] || char));
  }

  function resetModal() {
    state.editingExpeditionId = null;
    state.editingExpeditionStatus = null;
    state.selectedTrail = null;

    if (elements.expeditionForm) {
      elements.expeditionForm.reset();
    }

    if (elements.descriptionCount) {
      elements.descriptionCount.textContent = '0';
    }

    if (elements.modalStateSelect) {
      elements.modalStateSelect.value = '';
    }

    if (elements.modalCitySelect) {
      elements.modalCitySelect.innerHTML = '<option value="">Cidade</option>';
    }

    hideFormFeedback();
    updateSelectedTrailDisplay();
    setDateConstraints();
    updateDescriptionCounter();
  }

  function openCreateExpedition() {
    resetModal();
    if (elements.modalTitle) {
      elements.modalTitle.textContent = 'Nova Expedição';
    }
    openModal();
  }

  async function openEditExpedition(expeditionId) {
    if (!adminApi()) return;

    setModalLoading(true);
    try {
      const response = await adminApi().fetch(`/admin/expeditions/${expeditionId}`);
      if (isUnauthorized(response)) {
        return;
      }
      if (!response.ok) {
        throw new Error(`Falha ao carregar expedição (${response.status})`);
      }

      const payload = await response.json();
      const expedition = payload?.expedition;
      if (!expedition) {
        throw new Error('Expedição não encontrada');
      }

      resetModal();
      state.editingExpeditionId = expedition.id;
      state.editingExpeditionStatus = expedition.status;

      if (elements.modalTitle) {
        elements.modalTitle.textContent = 'Editar expedição';
      }

      const startISO = expedition.startDate?.slice(0, 10) ?? '';
      const endISO = expedition.endDate?.slice(0, 10) ?? '';

      if (elements.startDateInput && startISO) {
        elements.startDateInput.value = startISO;
      }
      if (elements.endDateInput && endISO) {
        elements.endDateInput.value = endISO;
      }
      if (elements.priceInput) {
        elements.priceInput.value = expedition.priceCents ? (expedition.priceCents / 100).toFixed(2) : '';
      }
      if (elements.maxPeopleInput) {
        elements.maxPeopleInput.value = expedition.maxParticipants ?? '';
      }
      if (elements.descriptionInput) {
        elements.descriptionInput.value = expedition.description ?? '';
      }
      updateDescriptionCounter();

      if (expedition.trail?.id) {
        const trailDetail = await fetchTrailDetail(expedition.trail.id).catch(() => null);
        const location = trailDetail?.city
          ? `${trailDetail.city.name}, ${trailDetail.city.state.code}`
          : trailDetail?.state
            ? trailDetail.state.code
            : '';
        state.selectedTrail = {
          id: expedition.trail.id,
          name: expedition.trail.name,
          location: location || expedition.trail.name,
        };
      } else {
        state.selectedTrail = null;
      }
      updateSelectedTrailDisplay();

      openModal();
    } catch (error) {
      console.error('Erro ao carregar expedição', error);
      alert('Não foi possível carregar os dados da expedição.');
    } finally {
      setModalLoading(false);
    }
  }

  async function fetchTrailDetail(trailId) {
    if (!adminApi()) return null;
    const response = await adminApi().fetch(`/admin/trails/${trailId}`);
    if (isUnauthorized(response) || !response.ok) {
      return null;
    }
    const payload = await response.json();
    return payload?.trail ?? null;
  }

  function openModal() {
    if (!elements.modal) return;
    elements.modal.classList.remove('hidden');
    if (isBrowser) {
      document.body.classList.add('overflow-hidden');
    }
  }

  function closeModal() {
    if (!elements.modal) return;
    elements.modal.classList.add('hidden');
    if (isBrowser) {
      document.body.classList.remove('overflow-hidden');
    }
  }

  function setModalLoading(isLoading) {
    if (!elements.modal) return;
    elements.modal.classList.toggle('pointer-events-none', isLoading);
    elements.modal.classList.toggle('opacity-80', isLoading);
  }

  function updateSelectedTrailDisplay() {
    if (!elements.selectedTrailContainer || !elements.selectedTrailName || !elements.selectedTrailLocation) {
      return;
    }
    if (!state.selectedTrail) {
      elements.selectedTrailContainer.classList.add('hidden');
      return;
    }

    elements.selectedTrailName.textContent = state.selectedTrail.name;
    elements.selectedTrailLocation.textContent = state.selectedTrail.location || '';
    elements.selectedTrailContainer.classList.remove('hidden');
  }

  function hideFormFeedback() {
    if (!elements.formErrors || !elements.errorList) return;
    elements.formErrors.classList.add('hidden');
    elements.formErrors.classList.remove('bg-red-50', 'border-red-200', 'bg-emerald-50', 'border-emerald-200');
    elements.errorList.innerHTML = '';
  }

  function showFormErrors(errors) {
    if (!elements.formErrors || !elements.errorList) return;
    elements.formErrors.classList.remove('hidden');
    elements.formErrors.classList.add('bg-red-50', 'border-red-200');
    elements.formErrors.classList.remove('bg-emerald-50', 'border-emerald-200');
    elements.errorList.innerHTML = '';
    errors.forEach((message) => {
      const item = document.createElement('li');
      item.className = 'text-sm text-red-800';
      item.textContent = message;
      elements.errorList.appendChild(item);
    });
  }

  function showFormSuccess(message) {
    if (!elements.formErrors || !elements.errorList) return;
    elements.formErrors.classList.remove('hidden');
    elements.formErrors.classList.remove('bg-red-50', 'border-red-200');
    elements.formErrors.classList.add('bg-emerald-50', 'border-emerald-200');
    elements.errorList.innerHTML = '';
    const item = document.createElement('li');
    item.className = 'text-sm text-emerald-700';
    item.textContent = message;
    elements.errorList.appendChild(item);
  }

  function validateExpeditionData(data) {
    const errors = [];

    if (!data.trailId) {
      errors.push('Selecione uma trilha.');
    }

    if (!data.startDate) {
      errors.push('Informe a data de início.');
    }

    if (!data.endDate) {
      errors.push('Informe a data de fim.');
    }

    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        errors.push('A data de fim deve ser igual ou posterior à data de início.');
      }
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > MAX_EXPEDITION_DURATION_DAYS) {
        errors.push(`A duração máxima da expedição é de ${MAX_EXPEDITION_DURATION_DAYS} dias.`);
      }
    }

    if (!Number.isFinite(data.price) || data.price < 1) {
      errors.push('Informe um preço por pessoa válido (mínimo R$ 1,00).');
    }

    if (!Number.isInteger(data.maxPeople) || data.maxPeople < 1 || data.maxPeople > 50) {
      errors.push('A quantidade máxima deve estar entre 1 e 50 participantes.');
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Descreva a expedição.');
    }

    return errors;
  }

  function collectExpeditionFormData() {
    const startDate = elements.startDateInput?.value ?? '';
    const endDate = elements.endDateInput?.value ?? '';
    const price = Number.parseFloat(elements.priceInput?.value.replace(',', '.') ?? '');
    const maxPeople = Number.parseInt(elements.maxPeopleInput?.value ?? '0', 10);
    const description = elements.descriptionInput?.value ?? '';

    return {
      trailId: state.selectedTrail?.id ?? '',
      startDate,
      endDate,
      price,
      priceCents: Number.isFinite(price) ? Math.round(price * 100) : 0,
      maxPeople,
      description: description.trim(),
    };
  }

  async function handleExpeditionSubmit(action) {
    hideFormFeedback();
    const data = collectExpeditionFormData();
    const errors = validateExpeditionData(data);

    if (errors.length > 0) {
      showFormErrors(errors);
      return;
    }

    if (state.editingExpeditionId) {
      await updateExpedition(state.editingExpeditionId, data, action);
    } else {
      await createExpedition(data, action);
    }
  }

  async function createExpedition(data, action) {
    if (!adminApi()) return;
    setModalLoading(true);
    try {
      const payload = {
        trailId: data.trailId,
        startDate: data.startDate,
        endDate: data.endDate,
        priceCents: data.priceCents,
        maxPeople: data.maxPeople,
        description: data.description,
      };

      const response = await adminApi().fetch('/admin/expeditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (isUnauthorized(response)) {
        return;
      }
      if (!response.ok) {
        throw new Error(`Falha ao criar expedição (${response.status})`);
      }

      const result = await response.json();
      const expeditionId = result?.expedition?.id;
      let refreshed = false;

      if (expeditionId && action === 'publish') {
        await updateExpeditionStatus(expeditionId, 'PUBLISHED');
        refreshed = true;
      }

      showFormSuccess('Expedição salva com sucesso.');
      closeModal();
      if (!refreshed) {
        await loadExpeditions(1);
      }
    } catch (error) {
      console.error('Erro ao criar expedição', error);
      showFormErrors(['Não foi possível criar a expedição.']);
    } finally {
      setModalLoading(false);
    }
  }

  async function updateExpedition(expeditionId, data, action) {
    if (!adminApi()) return;
    setModalLoading(true);
    try {
      const payload = {
        trailId: data.trailId,
        startDate: data.startDate,
        endDate: data.endDate,
        priceCents: data.priceCents,
        maxPeople: data.maxPeople,
        description: data.description,
      };

      const response = await adminApi().fetch(`/admin/expeditions/${expeditionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (isUnauthorized(response)) {
        return;
      }
      if (!response.ok) {
        throw new Error(`Falha ao atualizar expedição (${response.status})`);
      }

      let refreshed = false;
      if (action === 'publish' && state.editingExpeditionStatus !== 'PUBLISHED') {
        await updateExpeditionStatus(expeditionId, 'PUBLISHED');
        refreshed = true;
      }

      showFormSuccess('Expedição atualizada com sucesso.');
      closeModal();
      if (!refreshed) {
        await loadExpeditions(state.currentPage);
      }
    } catch (error) {
      console.error('Erro ao atualizar expedição', error);
      showFormErrors(['Não foi possível atualizar a expedição.']);
    } finally {
      setModalLoading(false);
    }
  }

  async function updateExpeditionStatus(expeditionId, status) {
    if (!adminApi()) return;
    const response = await adminApi().fetch(`/admin/expeditions/${expeditionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (isUnauthorized(response)) {
      return;
    }
    if (!response.ok) {
      throw new Error(`Falha ao atualizar status (${response.status})`);
    }
    await loadExpeditions(state.currentPage);
  }

  async function loadCitiesForState(stateCode) {
    if (!elements.modalCitySelect) return;
    elements.modalCitySelect.innerHTML = '<option value="">Cidade</option>';
    if (!stateCode) {
      return;
    }

    if (state.citiesCache.has(stateCode)) {
      populateCityOptions(state.citiesCache.get(stateCode));
      return;
    }

    try {
      const params = new URLSearchParams({ state: stateCode, pageSize: '100', sort: 'name:asc' });
      const response = await adminApi().fetch(`/public/cities-with-trails?${params.toString()}`);
      if (isUnauthorized(response)) {
        return;
      }
      if (!response.ok) {
        throw new Error(`Falha ao carregar cidades (${response.status})`);
      }
      const payload = await response.json();
      const cities = Array.isArray(payload?.cities) ? payload.cities : [];
      state.citiesCache.set(stateCode, cities);
      populateCityOptions(cities);
    } catch (error) {
      console.error('Erro ao carregar cidades', error);
    }
  }

  function populateCityOptions(cities) {
    if (!elements.modalCitySelect) return;
    const fragment = document.createDocumentFragment();
    fragment.appendChild(new Option('Cidade', ''));
    cities.forEach((city) => {
      fragment.appendChild(new Option(`${city.name} (${city.state.code})`, String(city.id)));
    });
    elements.modalCitySelect.innerHTML = '';
    elements.modalCitySelect.appendChild(fragment);
  }

  async function searchTrails() {
    if (!adminApi() || !elements.modalTrailSearch) return;
    const query = elements.modalTrailSearch.value.trim();
    const stateCode = elements.modalStateSelect?.value ?? '';
    const cityId = elements.modalCitySelect?.value ?? '';

    if (!query && !stateCode && !cityId) {
      if (elements.trailResults) {
        elements.trailResults.classList.add('hidden');
        elements.trailResults.innerHTML = '';
      }
      return;
    }

    const params = new URLSearchParams();
    params.set('pageSize', String(TRAIL_SEARCH_LIMIT));
    if (query) params.set('search', query);
    if (stateCode) params.set('state', stateCode);
    if (cityId) params.set('city', cityId);

    try {
      const response = await adminApi().fetch(`/admin/trails?${params.toString()}`);
      if (isUnauthorized(response)) {
        return;
      }
      if (!response.ok) {
        throw new Error(`Falha ao buscar trilhas (${response.status})`);
      }
      const payload = await response.json();
      const trails = Array.isArray(payload?.trails) ? payload.trails : [];
      renderTrailResults(trails);
    } catch (error) {
      console.error('Erro ao buscar trilhas', error);
    }
  }

  function renderTrailResults(trails) {
    if (!elements.trailResults) return;
    elements.trailResults.innerHTML = '';
    if (!trails.length) {
      elements.trailResults.classList.add('hidden');
      return;
    }

    const fragment = document.createDocumentFragment();
    trails.forEach((trail) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50';
      const location = trail.city
        ? `${trail.city.name}, ${trail.city.state.code}`
        : trail.state
          ? trail.state.code
          : '';
      item.innerHTML = `
        <div class="font-medium text-gray-900">${escapeHtml(trail.name)}</div>
        <div class="text-sm text-gray-500">${escapeHtml(location)}</div>
      `;
      item.addEventListener('click', () => {
        state.selectedTrail = {
          id: trail.id,
          name: trail.name,
          location,
        };
        updateSelectedTrailDisplay();
        elements.trailResults.classList.add('hidden');
        elements.trailResults.innerHTML = '';
        if (elements.modalTrailSearch) {
          elements.modalTrailSearch.value = '';
        }
      });
      fragment.appendChild(item);
    });

    elements.trailResults.appendChild(fragment);
    elements.trailResults.classList.remove('hidden');
  }

  async function handleLogout() {
    if (!adminApi()) return;
    try {
      const response = await adminApi().fetch('/auth/logout', { method: 'POST' });
      if (!response.ok && response.status !== 204) {
        throw new Error(`Falha ao encerrar sessão (${response.status})`);
      }
    } catch (error) {
      console.error('Erro ao encerrar sessão', error);
    } finally {
      window.location.href = 'https://www.trekko.com.br/';
    }
  }

  function reapplyPermissions() {
    if (!state.user || typeof PermissionManager === 'undefined') return;
    PermissionManager.apply(state.user.role, AdminGuard.currentPermissions);
  }

  if (isBrowser) {
    document.addEventListener('DOMContentLoaded', initialize);
  }
})();
