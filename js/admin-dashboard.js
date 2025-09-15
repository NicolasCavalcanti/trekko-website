// js/admin-dashboard.js
// Dashboard principal da área administrativa: carregamento de métricas, eventos
// e atalhos para criação rápida.

const DASHBOARD_SLA_SECONDS = 4;
const DASHBOARD_TIMEOUT = DASHBOARD_SLA_SECONDS * 1000;

const DASHBOARD_ENDPOINTS = {
  metrics: '/api/admin/dashboard/metrics',
  events: '/api/admin/dashboard/events',
  quickActions: {
    trail: '/api/admin/trails',
    expedition: '/api/admin/expeditions',
    post: '/api/admin/posts',
  },
};

const STORAGE_KEYS = {
  metrics: 'trekko.dashboard.metrics',
  events: 'trekko.dashboard.events',
};

const METRIC_LABELS = {
  trails: 'Trilhas',
  expeditions: 'Expedições',
  activeGuides: 'Guias ativos',
  reservations: 'Reservas',
  revenue: 'Receita',
};

document.addEventListener('DOMContentLoaded', () => {
  const user = typeof AdminGuard !== 'undefined' ? AdminGuard.requireAuth() : null;
  if (!user) {
    return;
  }

  document.querySelectorAll('[data-sla]').forEach((el) => {
    el.textContent = `${DASHBOARD_SLA_SECONDS}s`;
  });

  const metricsMeta = document.getElementById('metricsMeta');
  const metricsValidation = document.getElementById('metricsValidation');
  const metricsError = document.getElementById('metricsError');

  const eventsMeta = document.getElementById('eventsMeta');
  const eventsError = document.getElementById('eventsError');
  const eventsSkeleton = document.getElementById('eventsSkeleton');
  const eventsList = document.getElementById('eventsList');
  const eventsEmpty = document.getElementById('eventsEmpty');

  const refreshButton = document.getElementById('refreshDashboard');
  const refreshStatus = document.getElementById('refreshStatus');

  const metricsState = {
    values: {
      trails: 0,
      expeditions: 0,
      activeGuides: 0,
      reservations: 0,
      revenue: 0,
    },
    payload: null,
  };

  function setRefreshInProgress(inProgress) {
    if (!refreshButton || !refreshStatus) return;
    refreshButton.disabled = inProgress;
    refreshButton.classList.toggle('opacity-60', inProgress);
    refreshStatus.classList.toggle('hidden', !inProgress);
  }

  async function loadMetrics() {
    const start = performance.now();
    hideElement(metricsError);
    if (metricsMeta) {
      metricsMeta.textContent = 'Carregando indicadores...';
    }
    if (metricsValidation) {
      metricsValidation.textContent = 'Reconciliando com relatórios...';
      metricsValidation.classList.remove('text-red-600', 'text-emerald-600', 'text-amber-600');
      metricsValidation.classList.add('text-gray-500');
    }

    const cached = readFromStorage(STORAGE_KEYS.metrics);

    try {
      const response = await fetchWithTimeout(DASHBOARD_ENDPOINTS.metrics);
      if (!response.ok) {
        throw new Error(`Falha ao buscar métricas (${response.status})`);
      }
      const payload = await parseJsonSafely(response);
      const normalized = normalizeMetrics(payload);
      applyMetricValues(normalized);
      metricsState.values = normalized;
      metricsState.payload = payload;

      const updatedAt = payload?.lastUpdated || payload?.updatedAt || payload?.generatedAt || new Date().toISOString();
      const duration = performance.now() - start;
      updateMetricsMeta({ updatedAt, duration });
      validateMetricsAgainstReports(payload, normalized);

      saveToStorage(STORAGE_KEYS.metrics, {
        totals: normalized,
        fetchedAt: new Date().toISOString(),
        payloadMeta: {
          lastUpdated: updatedAt,
          reportSnapshot: payload?.reportTotals || payload?.reports || payload?.reportSummary || null,
        },
      });
    } catch (error) {
      console.error('Falha ao carregar métricas', error);
      if (cached?.totals) {
        applyMetricValues(cached.totals);
        const duration = performance.now() - start;
        updateMetricsMeta({
          updatedAt: cached.payloadMeta?.lastUpdated || cached.fetchedAt,
          duration,
          fromCache: true,
        });
        if (metricsValidation) {
          metricsValidation.textContent = 'Exibindo dados em cache. Valide com o relatório oficial.';
          metricsValidation.classList.remove('text-gray-500', 'text-emerald-600');
          metricsValidation.classList.add('text-amber-600');
        }
      } else {
        applyMetricValues({ trails: 0, expeditions: 0, activeGuides: 0, reservations: 0, revenue: 0 });
        if (metricsMeta) {
          metricsMeta.textContent = 'Não foi possível carregar os indicadores.';
        }
        if (metricsValidation) {
          metricsValidation.textContent = 'Indicadores indisponíveis. Sem dados para reconciliar.';
          metricsValidation.classList.remove('text-gray-500', 'text-emerald-600');
          metricsValidation.classList.add('text-red-600');
        }
        if (metricsError) {
          metricsError.textContent = 'Erro ao conectar com o serviço de métricas. Tente novamente mais tarde.';
          showElement(metricsError);
        }
      }
    }
  }

  async function loadEvents() {
    hideElement(eventsError);
    if (eventsSkeleton) showElement(eventsSkeleton);
    if (eventsList) hideElement(eventsList);
    if (eventsEmpty) hideElement(eventsEmpty);
    if (eventsMeta) {
      eventsMeta.textContent = 'Carregando eventos...';
    }

    const cached = readFromStorage(STORAGE_KEYS.events);

    try {
      const response = await fetchWithTimeout(DASHBOARD_ENDPOINTS.events);
      if (!response.ok) {
        throw new Error(`Falha ao buscar eventos (${response.status})`);
      }
      const payload = await parseJsonSafely(response);
      const events = normalizeEvents(payload);
      renderEvents(events);
      if (eventsSkeleton) hideElement(eventsSkeleton);
      if (eventsList) toggleElement(eventsList, events.length > 0);
      if (eventsEmpty) toggleElement(eventsEmpty, events.length === 0);

      const referenceDate = events.length ? events[0].timestamp : payload?.lastEventAt;
      if (eventsMeta) {
        eventsMeta.textContent = referenceDate
          ? `Atualizado em ${formatDateTime(referenceDate)}`
          : 'Eventos sincronizados.';
      }

      saveToStorage(STORAGE_KEYS.events, {
        events,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Falha ao carregar eventos', error);
      if (eventsSkeleton) hideElement(eventsSkeleton);
      if (cached?.events?.length) {
        renderEvents(cached.events);
        if (eventsList) showElement(eventsList);
        if (eventsEmpty) hideElement(eventsEmpty);
        if (eventsMeta) {
          eventsMeta.textContent = `Exibindo eventos em cache (${formatDateTime(cached.fetchedAt)}).`;
        }
      } else {
        if (eventsError) {
          eventsError.textContent = 'Não foi possível carregar os eventos recentes.';
          showElement(eventsError);
        }
        if (eventsEmpty) showElement(eventsEmpty);
        if (eventsMeta) {
          eventsMeta.textContent = 'Eventos indisponíveis.';
        }
      }
    }
  }

  function applyMetricValues(values) {
    setText('metric-trails', formatNumber(values.trails));
    setText('metric-expeditions', formatNumber(values.expeditions));
    setText('metric-active-guides', formatNumber(values.activeGuides));
    setText('metric-reservations', formatNumber(values.reservations));
    setText('metric-revenue', formatCurrency(values.revenue));
  }

  function updateMetricsMeta({ updatedAt, duration, fromCache }) {
    if (!metricsMeta) return;
    const parts = [];
    if (updatedAt) parts.push(`Atualizado em ${formatDateTime(updatedAt)}`);
    if (typeof duration === 'number') parts.push(`Carregado em ${(duration / 1000).toFixed(1)} s`);
    if (fromCache) parts.push('Usando dados em cache');
    parts.push(`SLA ${DASHBOARD_SLA_SECONDS}s`);
    metricsMeta.textContent = parts.join(' · ');
  }

  function validateMetricsAgainstReports(payload, metrics) {
    if (!metricsValidation) return;
    const reportTotals = payload?.reportTotals || payload?.reports || payload?.reportSummary;
    if (!reportTotals) {
      metricsValidation.textContent = 'Aguardando consolidação dos relatórios.';
      metricsValidation.classList.remove('text-red-600', 'text-emerald-600', 'text-amber-600');
      metricsValidation.classList.add('text-gray-500');
      return;
    }

    const normalizedReports = {
      trails: readFirstNumber(reportTotals, ['trails', 'totalTrails', 'trailCount', 'trilhas']),
      expeditions: readFirstNumber(reportTotals, ['expeditions', 'totalExpeditions', 'expeditionCount', 'expedicoes']),
      activeGuides: readFirstNumber(reportTotals, ['activeGuides', 'guides', 'guiaAtivos', 'totalGuides']),
      reservations: readFirstNumber(reportTotals, ['reservations', 'totalReservations', 'bookingCount', 'reservas']),
      revenue: readCurrency(reportTotals, ['revenue', 'totalRevenue', 'receita', 'grossRevenue', 'netRevenue']),
    };

    const mismatches = Object.entries(normalizedReports)
      .filter(([key, value]) => value != null && !numbersRoughlyEqual(value, metrics[key]));

    if (mismatches.length === 0) {
      const reference = reportTotals.generatedAt || payload?.lastReportSync || payload?.reports?.generatedAt;
      metricsValidation.textContent = reference
        ? `Números reconciliados com os relatórios (${formatDateTime(reference)}).`
        : 'Números reconciliados com os relatórios.';
      metricsValidation.classList.remove('text-red-600', 'text-amber-600', 'text-gray-500');
      metricsValidation.classList.add('text-emerald-600');
    } else {
      const labels = mismatches.map(([key]) => METRIC_LABELS[key] || key);
      metricsValidation.textContent = `Diferenças encontradas nos relatórios: ${labels.join(', ')}.`;
      metricsValidation.classList.remove('text-emerald-600', 'text-gray-500');
      metricsValidation.classList.add('text-red-600');
    }
  }

  function renderEvents(events) {
    if (!eventsList) return;
    eventsList.innerHTML = '';
    if (!events.length) return;

    const fragment = document.createDocumentFragment();
    events.forEach((event) => {
      const item = document.createElement('li');
      item.className = 'p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4';

      const left = document.createElement('div');
      left.className = 'space-y-1';

      const title = document.createElement('p');
      title.className = 'text-base font-semibold text-gray-900';
      title.textContent = event.title || event.label || deriveEventTitle(event.type);
      left.appendChild(title);

      if (event.description) {
        const description = document.createElement('p');
        description.className = 'text-sm text-gray-600';
        description.textContent = event.description;
        left.appendChild(description);
      }

      if (event.actor) {
        const actor = document.createElement('p');
        actor.className = 'text-xs text-gray-400';
        actor.textContent = `Por ${event.actor}`;
        left.appendChild(actor);
      }

      const right = document.createElement('div');
      right.className = 'text-right space-y-2 min-w-[120px]';

      const badge = document.createElement('span');
      badge.className = `inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full ${badgeClassForEvent(event.severity || event.type)}`;
      badge.textContent = (event.type || 'EVENTO').toUpperCase();
      right.appendChild(badge);

      const time = document.createElement('time');
      time.className = 'block text-sm text-gray-500';
      time.dateTime = event.timestamp;
      time.textContent = formatDateTime(event.timestamp);
      right.appendChild(time);

      item.appendChild(left);
      item.appendChild(right);

      fragment.appendChild(item);
    });

    eventsList.appendChild(fragment);
  }

  function setupQuickActions() {
    const modal = document.getElementById('quickActionModal');
    const modalTitle = document.getElementById('quickActionModalTitle');
    const modalFields = document.getElementById('quickActionFields');
    const modalFeedback = document.getElementById('quickActionFeedback');
    const modalForm = document.getElementById('quickActionForm');
    const modalClose = document.getElementById('quickActionModalClose');
    const modalCancel = document.getElementById('quickActionCancel');
    const modalSubmit = document.getElementById('quickActionSubmit');

    if (!modal || !modalForm) return;

    const quickActionConfig = {
      trail: {
        title: 'Cadastrar nova trilha',
        endpoint: DASHBOARD_ENDPOINTS.quickActions.trail,
        successMessage: 'Trilha cadastrada com sucesso!',
        fields: [
          { name: 'name', label: 'Nome da trilha', type: 'text', placeholder: 'Ex: Travessia da Serra do Mar', required: true },
          { name: 'state', label: 'Estado/UF', type: 'text', placeholder: 'Ex: SP', maxLength: 2, required: true, transform: (value) => value?.toUpperCase() },
          { name: 'difficulty', label: 'Dificuldade', type: 'select', required: true, options: ['Fácil', 'Moderada', 'Difícil', 'Muito difícil'] },
        ],
        transformPayload(payload) {
          return {
            name: payload.name,
            state: payload.state,
            difficulty: payload.difficulty,
            status: 'ACTIVE',
          };
        },
      },
      expedition: {
        title: 'Nova expedição',
        endpoint: DASHBOARD_ENDPOINTS.quickActions.expedition,
        successMessage: 'Expedição criada com sucesso!',
        fields: [
          { name: 'title', label: 'Nome da expedição', type: 'text', placeholder: 'Ex: Expedição Monte Roraima', required: true },
          { name: 'startDate', label: 'Data de início', type: 'date', required: true },
          { name: 'vacancies', label: 'Vagas', type: 'number', min: 1, max: 50, required: true },
          { name: 'guide', label: 'Guia responsável', type: 'text', placeholder: 'Ex: Maria Silva', required: true },
        ],
        transformPayload(payload) {
          return {
            title: payload.title,
            startDate: payload.startDate,
            vacancies: Number(payload.vacancies),
            guide: payload.guide,
            status: 'PLANNED',
          };
        },
      },
      post: {
        title: 'Novo post no blog',
        endpoint: DASHBOARD_ENDPOINTS.quickActions.post,
        successMessage: 'Post criado e enviado para revisão!',
        fields: [
          { name: 'title', label: 'Título', type: 'text', placeholder: 'Ex: Guia completo da Serra Fina', required: true },
          { name: 'slug', label: 'Slug', type: 'text', placeholder: 'ex: guia-completo-serra-fina', required: true },
          { name: 'status', label: 'Status', type: 'select', options: ['rascunho', 'revisao', 'publicado'], required: true },
        ],
        transformPayload(payload) {
          return {
            title: payload.title,
            slug: payload.slug,
            status: payload.status,
          };
        },
      },
    };

    let currentAction = null;

    function openModal(actionKey) {
      const config = quickActionConfig[actionKey];
      if (!config) return;
      currentAction = config;
      modalTitle.textContent = config.title;
      renderActionFields(config.fields, modalFields);
      modalForm.reset();
      if (modalFeedback) {
        modalFeedback.className = 'text-sm hidden';
        modalFeedback.textContent = '';
      }
      modalSubmit.textContent = config.submitLabel || 'Salvar';
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
    }

    function closeModal() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
      currentAction = null;
    }

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    modalClose?.addEventListener('click', closeModal);
    modalCancel?.addEventListener('click', closeModal);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    modalForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentAction) return;
      modalSubmit.disabled = true;
      modalSubmit.classList.add('opacity-60');
      if (modalFeedback) {
        modalFeedback.textContent = 'Enviando...';
        modalFeedback.className = 'text-sm text-gray-500';
      }

      const formData = new FormData(modalForm);
      const payload = {};
      currentAction.fields.forEach((field) => {
        const raw = formData.get(field.name);
        if (field.transform && typeof field.transform === 'function') {
          payload[field.name] = field.transform(raw);
        } else {
          payload[field.name] = raw;
        }
      });
      const finalPayload = currentAction.transformPayload
        ? currentAction.transformPayload(payload)
        : payload;

      try {
        const response = await fetchWithTimeout(
          currentAction.endpoint,
          {
            method: currentAction.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload),
          },
          currentAction.timeout || DASHBOARD_TIMEOUT,
        );
        if (!response.ok) {
          throw new Error(`Falha ao enviar dados (${response.status})`);
        }
        const result = await parseJsonSafely(response);
        if (modalFeedback) {
          modalFeedback.textContent = result?.message || currentAction.successMessage || 'Operação concluída com sucesso.';
          modalFeedback.className = 'text-sm text-emerald-600';
        }
        setTimeout(() => {
          closeModal();
          loadMetrics();
          if (currentAction.refreshEvents) {
            loadEvents();
          }
        }, currentAction.closeDelay || 1200);
      } catch (error) {
        console.error('Erro ao executar ação rápida', error);
        if (modalFeedback) {
          modalFeedback.textContent = currentAction.errorMessage || 'Não foi possível concluir a operação. Tente novamente.';
          modalFeedback.className = 'text-sm text-red-600';
        }
      } finally {
        modalSubmit.disabled = false;
        modalSubmit.classList.remove('opacity-60');
      }
    });

    document.querySelectorAll('[data-quick-action]').forEach((button) => {
      const actionKey = button.getAttribute('data-quick-action');
      button.addEventListener('click', () => openModal(actionKey));
    });
  }

  refreshButton?.addEventListener('click', async () => {
    setRefreshInProgress(true);
    await Promise.all([loadMetrics(), loadEvents()]).catch(() => {});
    setRefreshInProgress(false);
  });

  loadMetrics();
  loadEvents();
  setupQuickActions();
});

function fetchWithTimeout(url, options = {}, timeout = DASHBOARD_TIMEOUT) {
  const controller = new AbortController();
  const signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...options, signal })
    .finally(() => clearTimeout(timer));
}

async function parseJsonSafely(response) {
  try {
    const clone = response.clone();
    const text = await clone.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

function normalizeMetrics(payload) {
  const source = payload?.metrics || payload?.data || payload?.totals || payload || {};
  return {
    trails: readFirstNumber(source, ['trails', 'totalTrails', 'trailCount', 'trilhas']),
    expeditions: readFirstNumber(source, ['expeditions', 'totalExpeditions', 'expeditionCount', 'expedicoes']),
    activeGuides: readFirstNumber(source, ['activeGuides', 'guides', 'totalGuides', 'guiaAtivos']),
    reservations: readFirstNumber(source, ['reservations', 'totalReservations', 'bookingCount', 'reservas']),
    revenue: readCurrency(source, ['revenue', 'totalRevenue', 'receita', 'grossRevenue', 'netRevenue']),
  };
}

function normalizeEvents(payload) {
  const events = payload?.events || payload?.data || payload?.items || [];
  return events
    .map((event) => ({
      id: event.id || event.eventId || null,
      type: event.type || event.category || 'evento',
      title: event.title || event.label || '',
      description: event.description || event.details || event.message || '',
      actor: event.actor || event.user || event.performedBy || '',
      timestamp: event.timestamp || event.occurredAt || event.date || event.createdAt || new Date().toISOString(),
      severity: event.severity || event.level || null,
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8);
}

function renderActionFields(fields, container) {
  if (!container) return;
  container.innerHTML = '';
  fields.forEach((field) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'space-y-1';

    const label = document.createElement('label');
    label.className = 'block text-sm font-medium text-gray-700';
    const inputId = `quick-${field.name}`;
    label.setAttribute('for', inputId);
    label.textContent = field.label;

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = 'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500';
      (field.options || []).forEach((option) => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option.charAt(0).toUpperCase() + option.slice(1);
        input.appendChild(optionEl);
      });
    } else if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = field.rows || 4;
      input.className = 'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500';
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
      input.className = 'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500';
      if (field.type === 'number' && typeof field.min !== 'undefined') input.min = field.min;
      if (field.type === 'number' && typeof field.max !== 'undefined') input.max = field.max;
      if (field.maxLength) input.maxLength = field.maxLength;
    }

    input.name = field.name;
    input.id = inputId;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.required) input.required = true;

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    if (field.helper) {
      const helper = document.createElement('p');
      helper.className = 'text-xs text-gray-400';
      helper.textContent = field.helper;
      wrapper.appendChild(helper);
    }

    container.appendChild(wrapper);
  });
}

function readFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Não foi possível ler o armazenamento local', error);
    return null;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Não foi possível salvar no armazenamento local', error);
  }
}

function readFirstNumber(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value.replace(/[^0-9,-]+/g, '').replace(',', '.'));
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function readCurrency(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const normalized = Number(value.replace(/[^0-9,-]+/g, '').replace(',', '.'));
      if (!Number.isNaN(normalized)) return normalized;
    }
  }
  return 0;
}

function numbersRoughlyEqual(a, b) {
  const diff = Math.abs(Number(a || 0) - Number(b || 0));
  return diff < 1e-6;
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function deriveEventTitle(type) {
  if (!type) return 'Evento do sistema';
  const normalized = type.toLowerCase();
  if (normalized.includes('reserva')) return 'Reserva atualizada';
  if (normalized.includes('pagamento')) return 'Pagamento processado';
  if (normalized.includes('guia')) return 'Atualização de guia';
  if (normalized.includes('expedi')) return 'Atualização de expedição';
  if (normalized.includes('trilha')) return 'Atualização de trilha';
  return 'Evento do sistema';
}

function badgeClassForEvent(type) {
  if (!type) return 'bg-gray-100 text-gray-600';
  const normalized = String(type).toLowerCase();
  if (normalized.includes('erro') || normalized.includes('fail') || normalized.includes('critico')) {
    return 'bg-red-100 text-red-600';
  }
  if (normalized.includes('alerta') || normalized.includes('warning')) {
    return 'bg-amber-100 text-amber-600';
  }
  if (normalized.includes('sucesso') || normalized.includes('ok') || normalized.includes('confirm')) {
    return 'bg-emerald-100 text-emerald-600';
  }
  return 'bg-gray-100 text-gray-600';
}

function hideElement(element) {
  if (!element) return;
  element.classList.add('hidden');
}

function showElement(element) {
  if (!element) return;
  element.classList.remove('hidden');
}

function toggleElement(element, shouldShow) {
  if (!element) return;
  element.classList.toggle('hidden', !shouldShow);
}
