// admin-cadastur.js - fluxo de upload e importação do CSV Cadastur
let selectedFile;
let fileRef;
let importId;

function qs(id) { return document.getElementById(id); }

function initDropzone() {
  const dropzone = qs('dropzone');
  const fileInput = qs('fileInput');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('bg-gray-100');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('bg-gray-100'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('bg-gray-100');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });
}

function handleFile(file) {
  if (file.size > 50 * 1024 * 1024) {
    alert('Arquivo excede 50MB');
    return;
  }
  selectedFile = file;
  qs('validateBtn').disabled = false;
}

async function validateFile() {
  if (!selectedFile) return;
  if (!qs('replaceBase').checked) {
    alert('É necessário marcar "Substituir base atual".');
    return;
  }

  const form = new FormData();
  form.append('file', selectedFile);

  const res = await fetch('/api/admin/cadastur/validate', {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  fileRef = data.fileRef;

  renderPreview(data.preview || []);
  renderErrors(data.errors || []);
  renderSummary(data.summary || {});
  qs('validationArea').classList.remove('hidden');
  qs('summarySection').classList.remove('hidden');
  qs('executeBtn').disabled = false;
}

function renderPreview(rows) {
  const table = qs('previewTable');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  thead.innerHTML = '<tr>' + headers.map(h=>`<th class="px-2 py-1">${h}</th>`).join('') + '</tr>';
  rows.forEach(r => {
    tbody.innerHTML += '<tr>' + headers.map(h=>`<td class="px-2 py-1">${r[h]}</td>`).join('') + '</tr>';
  });
}

function renderErrors(errors) {
  const el = qs('errorList');
  if (!errors.length) { el.textContent = ''; return; }
  el.innerHTML = errors.map(err => `Linha ${err.linha}: ${err.motivo}`).join('<br>');
}

function renderSummary(summary) {
  qs('countNovos').textContent = summary.novos || 0;
  qs('countAtualizados').textContent = summary.atualizados || 0;
  qs('countSemMudanca').textContent = summary.semMudanca || 0;
  qs('countDesativar').textContent = summary.aDesativar || 0;
}

async function executeImport() {
  if (!fileRef) return;
  const payload = {
    fileRef,
    substituirBase: qs('replaceBase').checked,
    desativarAusentes: qs('softDelete').checked,
  };
  const res = await fetch('/api/admin/cadastur/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  importId = data.importId;
  qs('resultMessage').textContent = `Importação concluída. IDs afetados: ${data.summary?.novos || 0} novos, ${data.summary?.atualizados || 0} atualizados.`;
  qs('resultSection').classList.remove('hidden');
  qs('rollbackBtn').classList.remove('hidden');
  loadHistory();
}

async function rollbackImport() {
  if (!importId) return;
  await fetch('/api/admin/cadastur/rollback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ importId }),
  });
  qs('resultMessage').textContent = 'Rollback solicitado.';
  qs('rollbackBtn').classList.add('hidden');
  loadHistory();
}

async function loadHistory() {
  const res = await fetch('/api/admin/cadastur/history');
  const data = await res.json();
  const tbody = qs('historyTable').querySelector('tbody');
  tbody.innerHTML = '';
  (data.items || []).forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2">${new Date(item.createdAt).toLocaleString()}</td>
      <td class="px-4 py-2">${item.actorId}</td>
      <td class="px-4 py-2">${item.summary?.novos || 0}</td>
      <td class="px-4 py-2">${item.summary?.atualizados || 0}</td>
      <td class="px-4 py-2">${item.summary?.desativados || 0}</td>
      <td class="px-4 py-2">${item.fileHash?.slice(0,8) || ''}</td>
      <td class="px-4 py-2">${item.status}</td>
      <td class="px-4 py-2"><button data-id="${item.id}" class="text-blue-600 underline rollback-item">Reverter</button></td>`;
    tbody.appendChild(row);
  });
}

function setupHistoryActions() {
  qs('historyTable').addEventListener('click', async (e) => {
    const btn = e.target.closest('.rollback-item');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    await fetch('/api/admin/cadastur/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importId: id }),
    });
    loadHistory();
  });
}

function initButtons() {
  qs('downloadTemplate').onclick = () => window.location.href = '/api/admin/cadastur/template';
  qs('downloadBase').onclick = () => window.location.href = '/api/admin/cadastur/export';
  qs('validateBtn').onclick = validateFile;
  qs('executeBtn').onclick = executeImport;
  qs('rollbackBtn').onclick = rollbackImport;
}

document.addEventListener('DOMContentLoaded', () => {
  initDropzone();
  initButtons();
  setupHistoryActions();
  loadHistory();
});
