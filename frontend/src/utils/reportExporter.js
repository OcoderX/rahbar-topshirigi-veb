/**
 * Utility for exporting official task execution reports and media portfolios
 * with uniform image dimensions, video players, voice memos, and printable PDF styling.
 */
import { formatDateTime } from './date';

function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return window.location.origin;
}

function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const base = getApiBaseUrl();
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

const STATUS_CONFIG = {
  pending: { label: 'Kutilmoqda', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  in_progress: { label: 'Ko‘rildi', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  submitted: { label: 'Rahbar tasdig‘i kutilmoqda', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  completed: { label: 'Bajarildi', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
};

function formatSize(bytes) {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Builds the standalone printable HTML for a single task execution report.
 */
export function generateTaskReportHtml(task) {
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const isRework = task.rework_required && task.status === 'in_progress';
  const displayStatusLabel = isRework ? 'Qayta ishlovda' : statusCfg.label;
  const statusColor = isRework ? '#b45309' : statusCfg.color;
  const statusBg = isRework ? '#fef3c7' : statusCfg.bg;
  const statusBorder = isRework ? '#fde68a' : statusCfg.border;

  const initialAttachments = Array.isArray(task.attachments) ? task.attachments : [];
  const completionAttachments = Array.isArray(task.completion_attachments) ? task.completion_attachments : [];

  const completionImages = completionAttachments.filter(
    (a) => (a.type || '').startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(a.name || '')
  );
  const completionVideos = completionAttachments.filter(
    (a) => (a.type || '').startsWith('video/') || /\.(mp4|webm|mov)$/i.test(a.name || '')
  );
  const completionDocs = completionAttachments.filter(
    (a) => !completionImages.includes(a) && !completionVideos.includes(a)
  );

  const initialAudio = task.audio_url ? resolveMediaUrl(task.audio_url) : null;
  const completionAudio = task.completion_audio ? resolveMediaUrl(task.completion_audio) : null;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>Ijro hisoboti — #${task.id} ${task.title || ''}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .page-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    .print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 12px 18px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover { background: #1d4ed8; }
    .doc-header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 24px;
    }
    .doc-emblem {
      font-size: 32px;
      margin-bottom: 6px;
    }
    .doc-org {
      font-size: 13px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #475569;
    }
    .doc-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .doc-subtitle {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .badge-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 12px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusBorder};
    }
    .table-meta {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .table-meta th, .table-meta td {
      padding: 9px 14px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .table-meta th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      width: 25%;
    }
    .table-meta td {
      color: #0f172a;
      width: 25%;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      margin: 22px 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .content-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 18px;
      color: #1e293b;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .content-box.highlight {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
      font-weight: 500;
    }
    .audio-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f1f5f9;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      margin-bottom: 16px;
    }
    .audio-card audio {
      flex: 1;
      height: 36px;
    }
    /* Uniform Media Gallery Grid */
    .media-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    .media-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .media-thumb-container {
      width: 100%;
      height: 170px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .media-thumb-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s;
    }
    .media-thumb-container video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .media-info {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
    }
    .media-name {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .media-meta-sub {
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .media-meta-sub a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
    }
    .doc-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
    }
    .doc-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #334155;
    }
    .doc-chip a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
    }
    .signatures-block {
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .sign-col {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .sign-line {
      border-bottom: 1px dashed #94a3b8;
      padding-bottom: 4px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      color: #475569;
    }
    .stamp-box {
      border: 2px dashed #94a3b8;
      border-radius: 8px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .page-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .print-bar {
        display: none !important;
      }
      .media-thumb-container {
        height: 150px;
      }
      .media-grid {
        grid-template-columns: repeat(3, 1fr);
        page-break-inside: avoid;
      }
      .signatures-block {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="print-bar">
      <div>
        <strong>Rasmiy hisobot hujjati tayyorlandi.</strong>
        <span style="color: #64748b; font-size: 12px; margin-left: 8px;">Ushbu hujjatni PDF qilib saqlashingiz yoki printerda chop etishingiz mumkin.</span>
      </div>
      <button class="print-btn" onclick="window.print()">
        🖨️ Chop etish / PDF saqlash
      </button>
    </div>

    <div class="doc-header">
      <div class="doc-emblem">🇺🇿</div>
      <div class="doc-org">Andijon Viloyati Hokimligi · Ijro Nazorati Tizimi</div>
      <h1 class="doc-title">Topshiriq Ijro Hisoboti va Media Dalolatnomasi</h1>
      <div class="doc-subtitle">Hujjat raqami: #${task.id} · Shakllantirilgan sana: ${formatDateTime(new Date().toISOString())}</div>
    </div>

    <!-- Meta Table -->
    <table class="table-meta">
      <tr>
        <th>Topshiriq nomi:</th>
        <td colspan="3"><strong>${task.title || '—'}</strong></td>
      </tr>
      <tr>
        <th>Holati:</th>
        <td><span class="badge-status">${displayStatusLabel}</span></td>
        <th>Muddati:</th>
        <td>${task.due_date ? formatDateTime(task.due_date) : 'Muddatsiz'}</td>
      </tr>
      <tr>
        <th>Mas’ul ijrochi:</th>
        <td>${task.assignee_name || '—'} (${task.assignee_position || 'Xodim'})</td>
        <th>Hudud:</th>
        <td>${task.assignee_district || task.assignee_region || 'Andijon viloyati'}</td>
      </tr>
      <tr>
        <th>Berilgan vaqt:</th>
        <td>${formatDateTime(task.created_at)}</td>
        <th>Yakunlangan vaqt:</th>
        <td>${task.completed_at ? formatDateTime(task.completed_at) : (task.submitted_at ? formatDateTime(task.submitted_at) : '—')}</td>
      </tr>
      ${task.approved_by_name ? `
      <tr>
        <th>Tasdiqladi:</th>
        <td colspan="3"><strong>${task.approved_by_name}</strong> ${task.approved_by_position ? `(${task.approved_by_position})` : ''} · ${task.completed_at ? formatDateTime(task.completed_at) : ''}</td>
      </tr>` : ''}
    </table>

    <!-- Task Description -->
    <div class="section-title">📋 1. Topshiriq Mazmuni</div>
    <div class="content-box">${task.description || 'Topshiriq tavsifi ko‘rsatilmagan.'}</div>

    <!-- Leader Voice Instructions -->
    ${initialAudio ? `
      <div class="section-title">🎙️ Rahbarning Ovozli Ko‘rsatmasi</div>
      <div class="audio-card">
        <audio controls src="${initialAudio}"></audio>
        <a href="${initialAudio}" target="_blank" download style="font-size: 11px; color: #2563eb; font-weight: 600;">Yuklab olish ⬇</a>
      </div>
    ` : ''}

    <!-- Initial Leader Attachments -->
    ${initialAttachments.length > 0 ? `
      <div class="section-title">📎 Topshiriq Hujjatlari (${initialAttachments.length} ta)</div>
      <div class="doc-chips">
        ${initialAttachments.map((a) => `
          <span class="doc-chip">
            📄 ${a.name || 'fayl'} ${a.size ? `(${formatSize(a.size)})` : ''}
            ${a.url ? `<a href="${resolveMediaUrl(a.url)}" target="_blank" download>Yuklab olish ⬇</a>` : ''}
          </span>
        `).join('')}
      </div>
    ` : ''}

    <!-- Employee Completion Note -->
    <div class="section-title">📝 2. Xodimning Ijro Hisoboti (Hisobot Xabari)</div>
    <div class="content-box highlight">
      ${task.completion_note ? task.completion_note : 'Ijro hisoboti matni kiritilmagan.'}
    </div>

    <!-- Employee Completion Voice -->
    ${completionAudio ? `
      <div class="section-title">🎙️ Xodimning Ovozli Hisoboti</div>
      <div class="audio-card">
        <audio controls src="${completionAudio}"></audio>
        <a href="${completionAudio}" target="_blank" download style="font-size: 11px; color: #2563eb; font-weight: 600;">Yuklab olish ⬇</a>
      </div>
    ` : ''}

    <!-- Execution Evidence Photos & Media (Uniform Dimensions) -->
    <div class="section-title">🖼️ 3. Ijro Dalillari — Fotosuratlar va Medialar (${completionAttachments.length} ta)</div>
    ${completionAttachments.length === 0 ? `
      <div style="font-style: italic; color: #64748b; padding: 10px 0;">Ushbu topshiriqqa faylli ijro dalili biriktirilmagan.</div>
    ` : `
      ${completionImages.length > 0 ? `
        <h4 style="font-size: 12px; color: #475569; margin: 10px 0 8px;">📷 Fotosuratlar (Dalolatnoma tasvirlari):</h4>
        <div class="media-grid">
          ${completionImages.map((img) => {
            const url = resolveMediaUrl(img.url);
            return `
              <div class="media-card">
                <div class="media-thumb-container">
                  <img src="${url}" alt="${img.name || 'Ijro fotosurati'}" />
                </div>
                <div class="media-info">
                  <div class="media-name" title="${img.name || 'rasm'}">${img.name || 'Fotosurat'}</div>
                  <div class="media-meta-sub">
                    <span>${img.size ? formatSize(img.size) : 'Rasm'}</span>
                    <a href="${url}" target="_blank" download>Ochish / Yuklab olish ⬇</a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${completionVideos.length > 0 ? `
        <h4 style="font-size: 12px; color: #475569; margin: 14px 0 8px;">🎥 Videolar (Video dalillar):</h4>
        <div class="media-grid">
          ${completionVideos.map((vid) => {
            const url = resolveMediaUrl(vid.url);
            return `
              <div class="media-card">
                <div class="media-thumb-container">
                  <video controls src="${url}"></video>
                </div>
                <div class="media-info">
                  <div class="media-name" title="${vid.name || 'video'}">${vid.name || 'Videoyozuv'}</div>
                  <div class="media-meta-sub">
                    <span>${vid.size ? formatSize(vid.size) : 'Video'}</span>
                    <a href="${url}" target="_blank" download>Yuklab olish ⬇</a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${completionDocs.length > 0 ? `
        <h4 style="font-size: 12px; color: #475569; margin: 14px 0 8px;">📑 Biriktirilgan Hujjatlar va Dalolatnomalar:</h4>
        <div class="doc-chips">
          ${completionDocs.map((doc) => {
            const url = resolveMediaUrl(doc.url);
            return `
              <span class="doc-chip">
                📁 <strong>${doc.name || 'hujjat'}</strong> ${doc.size ? `(${formatSize(doc.size)})` : ''}
                <a href="${url}" target="_blank" download>Yuklab olish ⬇</a>
              </span>
            `;
          }).join('')}
        </div>
      ` : ''}
    `}

    <!-- Rework Section if applicable -->
    ${Number(task.rework_count) > 0 ? `
      <div class="section-title">⚠️ Qayta Ishlash Tarixi</div>
      <div class="content-box" style="background: #fffbeb; border-color: #fde68a; color: #b45309;">
        <strong>Rad etish va qayta ishlash sababi:</strong> ${task.rework_reason || 'Sabab ko‘rsatilmagan.'}
        <div style="margin-top: 6px; font-size: 11px;">
          Qaytarilgan: ${task.rework_count} marta · ${task.rework_requested_by_name ? `Rahbar: ${task.rework_requested_by_name}` : ''}
        </div>
      </div>
    ` : ''}

    <!-- Signatures -->
    <div class="signatures-block">
      <div class="sign-col">
        <div class="sign-line">
          <span>Ijrochi: <strong>${task.assignee_name || 'Xodim'}</strong></span>
          <span>Imzo: ______________</span>
        </div>
        <div style="font-size: 11px; color: #64748b;">Hisobot topshirildi va ma’lumotlar to‘g‘riligi tasdiqlanadi.</div>
      </div>
      <div class="sign-col">
        <div class="sign-line">
          <span>Tasdiqlovchi rahbar: <strong>${task.approved_by_name || 'Rahbar'}</strong></span>
          <span>Imzo: ______________</span>
        </div>
        <div class="stamp-box">
          Muhr o‘rni (M.O‘.)
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens printable official task report in a new window/tab.
 */
export function openTaskReportPrintWindow(task) {
  const html = generateTaskReportHtml(task);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Popup blocked: trigger file download fallback
    downloadTaskReportHtmlFile(task);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Downloads official task report as an offline HTML document.
 */
export function downloadTaskReportHtmlFile(task) {
  const html = generateTaskReportHtml(task);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const filename = `ijro_hisoboti_${task.id}_${Date.now()}.html`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Generates an executive multimedia batch report for multiple tasks.
 */
export function generateBatchMultimediaReportHtml({ tasks = [], title = 'Vazifalar Multimedia Hisoboti', author = 'Administrator' }) {
  const nowStr = formatDateTime(new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b; background: #f8fafc; padding: 24px; font-size: 13px; line-height: 1.5;
    }
    .wrapper { max-width: 980px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .print-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 12px 18px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; }
    .print-btn { background: #2563eb; color: #fff; border: none; padding: 8px 18px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .task-card {
      border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px; margin-bottom: 24px; background: #ffffff;
      page-break-inside: avoid;
    }
    .task-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
    .media-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px; }
    .media-thumb { height: 160px; background: #0f172a; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .media-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .media-thumb video { width: 100%; height: 100%; object-fit: cover; }
    .badge { padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; display: inline-block; }
    @media print {
      body { background: #fff; padding: 0; }
      .wrapper { border: none; padding: 0; max-width: 100%; }
      .print-bar { display: none; }
      .task-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="print-bar">
      <div><strong>${title}</strong> (${tasks.length} ta vazifa)</div>
      <button class="print-btn" onclick="window.print()">🖨️ Chop etish / PDF saqlash</button>
    </div>
    <div class="header">
      <h1 style="font-size: 20px; text-transform: uppercase;">Topshiriqlar va Ijro Dalillari Multimedia Hisoboti</h1>
      <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Muallif: ${author} · Sana: ${nowStr} · Jami: ${tasks.length} ta vazifa</p>
    </div>

    ${tasks.map((t) => {
      const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
      const completionAttachments = Array.isArray(t.completion_attachments) ? t.completion_attachments : [];
      const images = completionAttachments.filter((a) => (a.type || '').startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(a.name || ''));
      const videos = completionAttachments.filter((a) => (a.type || '').startsWith('video/') || /\.(mp4|webm)$/i.test(a.name || ''));

      return `
        <div class="task-card">
          <div class="task-header">
            <div>
              <span style="font-size: 11px; color: #64748b; font-weight: 700;">#${t.id}</span>
              <h3 style="font-size: 15px; color: #0f172a; margin-top: 2px;">${t.title}</h3>
              <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                Ijrochi: <strong>${t.assignee_name || '—'}</strong> (${t.assignee_position || 'Xodim'}) · ${t.assignee_district || t.assignee_region || 'Andijon viloyati'}
              </div>
            </div>
            <span class="badge" style="background: ${cfg.bg}; color: ${cfg.color}; border: 1px solid ${cfg.border};">
              ${cfg.label}
            </span>
          </div>

          ${t.description ? `<p style="font-size: 12px; color: #334155; margin-bottom: 8px;"><strong>Mazmuni:</strong> ${t.description}</p>` : ''}
          ${t.completion_note ? `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #166534; margin-bottom: 10px;"><strong>Xodim hisoboti:</strong> «${t.completion_note}»</div>` : ''}

          ${images.length > 0 ? `
            <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 6px;">Fotosuratlar (${images.length} ta):</div>
            <div class="media-grid">
              ${images.map((img) => `
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff;">
                  <div class="media-thumb">
                    <img src="${resolveMediaUrl(img.url)}" alt="${img.name}" />
                  </div>
                  <div style="padding: 5px 8px; font-size: 10px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${img.name}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${videos.length > 0 ? `
            <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 10px;">Videolar (${videos.length} ta):</div>
            <div class="media-grid">
              ${videos.map((vid) => `
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff;">
                  <div class="media-thumb">
                    <video controls src="${resolveMediaUrl(vid.url)}"></video>
                  </div>
                  <div style="padding: 5px 8px; font-size: 10px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${vid.name}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  </div>
</body>
</html>`;
}

export function openBatchMultimediaReportWindow(payload) {
  const html = generateBatchMultimediaReportHtml(payload);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
