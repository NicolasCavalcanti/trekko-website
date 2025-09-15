// js/admin-cadastur.js
// Implements CSV upload workflow for Cadastur integration.

document.addEventListener('DOMContentLoaded', () => {
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

  let csvContent = '';

  function enableValidation() {
    validateBtn.disabled = false;
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('bg-gray-100');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('bg-gray-100'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('bg-gray-100');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFile();
    }
  });

  fileInput.addEventListener('change', handleFile);

  function handleFile() {
    if (!fileInput.files.length) return;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      csvContent = e.target.result;
      enableValidation();
    };
    reader.readAsText(file);
  }

  validateBtn.addEventListener('click', () => {
    if (!csvContent) return;
    const lines = csvContent.trim().split(/\r?\n/);
    if (!lines.length) return;
    const headers = lines[0].split(',');
    const bodyLines = lines.slice(1, 6); // show first 5 rows

    const thead = previewTable.querySelector('thead');
    const tbody = previewTable.querySelector('tbody');
    thead.innerHTML = '<tr>' + headers.map(h => `<th class="px-4 py-2">${h}</th>`).join('') + '</tr>';
    tbody.innerHTML = bodyLines
      .map(line => '<tr>' + line.split(',').map(c => `<td class="px-4 py-2">${c}</td>`).join('') + '</tr>')
      .join('');

    validationArea.classList.remove('hidden');
    summarySection.classList.remove('hidden');
    executeBtn.disabled = false;

    const total = lines.length - 1; // remove header
    countNovos.textContent = total;
    countAtualizados.textContent = 0;
    countSemMudanca.textContent = 0;
    countDesativar.textContent = 0;
  });

  executeBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) return;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('replaceBase', document.getElementById('replaceBase').checked ? '1' : '0');
    formData.append('softDelete', document.getElementById('softDelete').checked ? '1' : '0');

    try {
      const resp = await fetch('/api/admin/cadastur/import', {
        method: 'POST',
        body: formData
      });
      const data = await resp.json().catch(() => ({ message: 'Importação concluída' }));
      resultMessage.textContent = data.message || 'Importação concluída';
    } catch (err) {
      resultMessage.textContent = 'Erro ao enviar arquivo';
    }
    resultSection.classList.remove('hidden');
  });
});
