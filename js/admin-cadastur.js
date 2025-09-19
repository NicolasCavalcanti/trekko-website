// js/admin-cadastur.js
// Implements CSV upload workflow for Cadastur integration using the Trekko admin API helpers.

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof AdminGuard !== 'undefined') {
    const session = await AdminGuard.requireAuth();
    if (!session) {
      return;
    }
  }

  const api = window.trekkoAdminApi;
  if (!api) {
    console.error('trekkoAdminApi helper is not available.');
    return;
  }

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const validateBtn = document.getElementById('validateBtn');
  const executeBtn = document.getElementById('executeBtn');
  const previewTable = document.getElementById('previewTable');
  const validationArea = document.getElementById('validationArea');
  const summarySection = document.getElementById('summarySection');
  const resultSection = document.getElementById('resultSection');
  const resultMessage = document.getElementById('resultMessage');
  const countNovos = document.getElementById('countNovos');
  const countAtualizados = document.getElementById('countAtualizados');
  const countSemMudanca = document.getElementById('countSemMudanca');
  const countDesativar = document.getElementById('countDesativar');
  const replaceBaseInput = document.getElementById('replaceBase');
  const softDeleteInput = document.getElementById('softDelete');

  let csvContent = '';

  executeBtn.disabled = true;
  executeBtn.classList.add('opacity-60');

  function setButtonLoading(button, isLoading, loadingLabel) {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('opacity-60', isLoading);
    if (loadingLabel) {
      if (isLoading) {
        if (!button.dataset.initialLabel) {
          button.dataset.initialLabel = button.textContent;
        }
        button.textContent = loadingLabel;
      } else if (button.dataset.initialLabel) {
        button.textContent = button.dataset.initialLabel;
        delete button.dataset.initialLabel;
      }
    }
  }

  function handleUnauthorized(response) {
    if (!response) return false;
    if (response.status === 401 || response.status === 403) {
      if (typeof AdminGuard !== 'undefined' && typeof AdminGuard.handleUnauthorized === 'function') {
        AdminGuard.handleUnauthorized(new Error(`HTTP_${response.status}`));
      }
      return true;
    }
    return false;
  }

  function syncCsrfToken(payload) {
    if (payload && typeof payload.csrfToken === 'string' && window.trekkoAdminApi) {
      window.trekkoAdminApi.setCsrfToken(payload.csrfToken);
    }
  }

  function resetSummary() {
    countNovos.textContent = '0';
    countAtualizados.textContent = '0';
    countSemMudanca.textContent = '0';
    countDesativar.textContent = '0';
  }

  function updateSummary(preview) {
    if (!preview) {
      resetSummary();
      return;
    }

    const total = Number(preview.total) || 0;
    const criar = Number(preview.simulacao?.criar) || 0;
    const atualizar = Number(preview.simulacao?.atualizar) || 0;
    const vincular = Number(preview.simulacao?.vincular) || 0;
    const invalidos = Array.isArray(preview.invalidos) ? preview.invalidos.length : 0;
    const semMudanca = Math.max(total - (criar + atualizar + vincular), 0);

    countNovos.textContent = criar.toString();
    countAtualizados.textContent = atualizar.toString();
    countSemMudanca.textContent = semMudanca.toString();
    countDesativar.textContent = invalidos.toString();
  }

  function showResult(message, isError = false) {
    if (!resultSection || !resultMessage) return;
    resultMessage.textContent = message;
    resultMessage.classList.remove('text-red-600', 'text-emerald-600');
    resultMessage.classList.add(isError ? 'text-red-600' : 'text-emerald-600');
    resultSection.classList.remove('hidden');
  }

  function enableValidation() {
    if (validateBtn) {
      validateBtn.disabled = false;
      validateBtn.classList.remove('opacity-60');
    }
  }

  function updatePreviewTableFromCsv() {
    if (!csvContent || !previewTable) return;
    const lines = csvContent.trim().split(/\r?\n/);
    if (!lines.length) return;

    const headers = lines[0].split(',');
    const bodyLines = lines.slice(1, 6);

    const thead = previewTable.querySelector('thead');
    const tbody = previewTable.querySelector('tbody');
    if (!thead || !tbody) return;

    thead.innerHTML = '<tr>' + headers.map((h) => `<th class="px-4 py-2">${h}</th>`).join('') + '</tr>';
    tbody.innerHTML = bodyLines
      .map((line) => '<tr>' + line.split(',').map((c) => `<td class="px-4 py-2">${c}</td>`).join('') + '</tr>')
      .join('');
  }

  async function requestPreview() {
    if (!fileInput?.files?.length) return null;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const response = await api.fetch('/admin/guides/import-cadastur', {
      method: 'POST',
      body: formData,
    });

    if (handleUnauthorized(response)) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `Falha ao validar CSV (${response.status})`);
    }

    const preview = await response.json().catch(() => ({}));
    syncCsrfToken(preview);
    return preview;
  }

  async function executeImport() {
    if (!fileInput?.files?.length) return null;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('confirm', '1');

    if (replaceBaseInput) {
      formData.append('replaceBase', replaceBaseInput.checked ? '1' : '0');
    }
    if (softDeleteInput) {
      formData.append('softDelete', softDeleteInput.checked ? '1' : '0');
    }

    const response = await api.fetch('/admin/guides/import-cadastur', {
      method: 'POST',
      body: formData,
    });

    if (handleUnauthorized(response)) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `Falha ao processar importação (${response.status})`);
    }

    const result = await response.json().catch(() => ({}));
    syncCsrfToken(result);
    return result;
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('bg-gray-100');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('bg-gray-100'));
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('bg-gray-100');
      if (event.dataTransfer.files.length) {
        fileInput.files = event.dataTransfer.files;
        handleFile();
      }
    });

    fileInput.addEventListener('change', handleFile);
  }

  function handleFile() {
    if (!fileInput?.files?.length) return;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      csvContent = event.target?.result || '';
      enableValidation();
    };
    reader.readAsText(file);
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', async () => {
      if (!csvContent || !fileInput?.files?.length) {
        return;
      }

      updatePreviewTableFromCsv();
      validationArea?.classList.remove('hidden');
      summarySection?.classList.remove('hidden');
      resultSection?.classList.add('hidden');
      resetSummary();

      executeBtn.disabled = true;
      executeBtn.classList.add('opacity-60');

      setButtonLoading(validateBtn, true, 'Validando...');

      try {
        const preview = await requestPreview();
        if (!preview) return;
        updateSummary(preview);
        executeBtn.disabled = false;
        executeBtn.classList.remove('opacity-60');
      } catch (error) {
        console.error('Erro ao validar CSV', error);
        showResult(error instanceof Error ? error.message : 'Erro ao validar arquivo.', true);
      } finally {
        setButtonLoading(validateBtn, false);
      }
    });
  }

  if (executeBtn) {
    executeBtn.addEventListener('click', async () => {
      if (!fileInput?.files?.length) {
        return;
      }

      setButtonLoading(executeBtn, true, 'Importando...');
      showResult('Importando cadastros do Cadastur...', false);

      try {
        const result = await executeImport();
        if (!result) return;
        updateSummary(result);
        const parts = [];
        if (typeof result.processados === 'number') parts.push(`Processados: ${result.processados}`);
        if (typeof result.criados === 'number') parts.push(`Novos: ${result.criados}`);
        if (typeof result.atualizados === 'number') parts.push(`Atualizados: ${result.atualizados}`);
        if (typeof result.vinculados === 'number') parts.push(`Vinculados: ${result.vinculados}`);
        const message = parts.length ? parts.join(' · ') : result.message || 'Importação concluída.';
        showResult(message, false);
      } catch (error) {
        console.error('Erro ao importar Cadastur', error);
        showResult(error instanceof Error ? error.message : 'Erro ao enviar arquivo', true);
      } finally {
        setButtonLoading(executeBtn, false);
      }
    });
  }
});
