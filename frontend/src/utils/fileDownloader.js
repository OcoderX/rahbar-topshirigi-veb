/**
 * Utility for downloading/saving attachments to the user's computer
 * with their real filename, extension, and native "Save As" file picker.
 */

const MIME_CONFIG = {
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    desc: 'Excel ishchi kitobi (.xlsx)',
  },
  xls: {
    mime: 'application/vnd.ms-excel',
    desc: 'Excel hujjati (.xls)',
  },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    desc: 'Word hujjati (.docx)',
  },
  doc: {
    mime: 'application/msword',
    desc: 'Word hujjati (.doc)',
  },
  pdf: {
    mime: 'application/pdf',
    desc: 'PDF hujjati (.pdf)',
  },
  png: {
    mime: 'image/png',
    desc: 'PNG tasviri (.png)',
  },
  jpg: {
    mime: 'image/jpeg',
    desc: 'JPEG tasviri (.jpg)',
  },
  jpeg: {
    mime: 'image/jpeg',
    desc: 'JPEG tasviri (.jpeg)',
  },
  webp: {
    mime: 'image/webp',
    desc: 'WEBP tasviri (.webp)',
  },
  gif: {
    mime: 'image/gif',
    desc: 'GIF tasviri (.gif)',
  },
  txt: {
    mime: 'text/plain',
    desc: 'Matnli hujjat (.txt)',
  },
  zip: {
    mime: 'application/zip',
    desc: 'ZIP arxivi (.zip)',
  },
  rar: {
    mime: 'application/x-rar-compressed',
    desc: 'RAR arxivi (.rar)',
  },
  mp3: {
    mime: 'audio/mpeg',
    desc: 'Audio fayl (.mp3)',
  },
  webm: {
    mime: 'audio/webm',
    desc: 'Audio/Video fayl (.webm)',
  },
  mp4: {
    mime: 'video/mp4',
    desc: 'Video fayl (.mp4)',
  },
};

/**
 * Downloads or saves an attachment with native "Save As" dialog or clean filename download.
 *
 * @param {Object} att Attachment object { name, url, type, size }
 * @returns {Promise<{ success?: boolean, cancelled?: boolean, filename: string }>}
 */
export async function downloadAttachment(att) {
  if (!att || !att.url) {
    throw new Error('Fayl manzili topilmadi');
  }

  const filename = att.name || 'fayl';
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
  const typeConfig = MIME_CONFIG[ext] || {
    mime: att.type || 'application/octet-stream',
    desc: ext ? `${ext.toUpperCase()} fayli (.${ext})` : 'Fayl',
  };

  let blob;

  // 1. If base64 data URL
  if (att.url.startsWith('data:')) {
    const res = await fetch(att.url);
    blob = await res.blob();
  } else {
    // 2. Fetch from backend with authentication token
    const token = localStorage.getItem('token');
    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const downloadUrl = `${apiUrl}/tasks/download?url=${encodeURIComponent(att.url)}&name=${encodeURIComponent(filename)}${token ? `&token=${token}` : ''}`;

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(downloadUrl, { headers });
      if (!res.ok) {
        // Fallback: try direct url
        const fallbackUrl = att.url.startsWith('http') ? att.url : `${apiUrl}${att.url}`;
        const fbRes = await fetch(fallbackUrl, { credentials: 'omit' });
        if (!fbRes.ok) throw new Error('Faylni yuklab bo‘lmadi');
        blob = await fbRes.blob();
      } else {
        blob = await res.blob();
      }
    } catch (_err) {
      const fallbackUrl = att.url.startsWith('http') ? att.url : `${apiUrl}${att.url}`;
      const fbRes = await fetch(fallbackUrl, { credentials: 'omit' });
      if (!fbRes.ok) throw new Error('Faylni yuklab bo‘lmadi');
      blob = await fbRes.blob();
    }
  }

  // 3. If Chromium "Save As" file picker is available
  if ('showSaveFilePicker' in window) {
    try {
      const accept = {};
      if (ext) {
        accept[typeConfig.mime] = [`.${ext}`];
      } else {
        accept[typeConfig.mime] = [];
      }

      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: typeConfig.desc,
            accept,
          },
        ],
        excludeAcceptAllOption: false,
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      return { success: true, filename: fileHandle.name };
    } catch (err) {
      if (err.name === 'AbortError') {
        // User clicked cancel on Save As dialog — not an error
        return { cancelled: true, filename };
      }
      console.warn('showSaveFilePicker failed, falling back to standard download:', err);
    }
  }

  // 4. Fallback for browsers without showSaveFilePicker
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  return { success: true, filename };
}
