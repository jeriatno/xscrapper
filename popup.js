let scrapedData = [];
let isScraping = false;

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnView = document.getElementById('btnView');
const btnExport = document.getElementById('btnExport');
const countScraped = document.getElementById('countScraped');
const statusState = document.getElementById('statusState');
const statusMessage = document.getElementById('statusMessage');
const maxResultsInput = document.getElementById('maxResults');

function updateUI(scraping) {
  isScraping = scraping;
  btnStart.style.display = scraping ? 'none' : 'flex';
  btnStop.style.display = scraping ? 'flex' : 'none';
  btnView.disabled = scraping || scrapedData.length === 0;
  btnExport.disabled = scraping || scrapedData.length === 0;
  statusState.textContent = scraping ? 'Berjalan...' : (scrapedData.length > 0 ? 'Selesai' : 'Siap');
  statusState.style.color = scraping ? '#f59e0b' : '#a3e635';
}

function saveDataLocally(data) {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ latestScrapedData: data });
  }
}

// Cek status saat popup dibuka
async function checkTabAndStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('google.') || !tab.url.includes('/maps')) {
    statusMessage.textContent = 'Harap buka halaman Google Maps terlebih dahulu!';
    btnStart.disabled = true;
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script mungkin belum terinjeksi atau belum siap
      return;
    }
    if (response) {
      scrapedData = response.data || [];
      countScraped.textContent = scrapedData.length;
      updateUI(response.isScraping);
      if (response.statusMessage) {
        statusMessage.textContent = response.statusMessage;
      }
    }
  });
}

// Mulai scraping
btnStart.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const maxResults = parseInt(maxResultsInput.value, 10) || 50;

  statusMessage.textContent = 'Memulai auto-scroll & ekstraksi data...';
  updateUI(true);

  chrome.tabs.sendMessage(tab.id, {
    action: 'START_SCRAPING',
    maxResults: maxResults
  }, (response) => {
    if (chrome.runtime.lastError) {
      statusMessage.textContent = 'Gagal menghubungi halaman. Muat ulang (refresh) Google Maps.';
      updateUI(false);
    }
  });
});

// Hentikan scraping
btnStop.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: 'STOP_SCRAPING' });
  statusMessage.textContent = 'Menghentikan scraping...';
});

// Terima update dari content.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'UPDATE_PROGRESS') {
    scrapedData = message.data || [];
    countScraped.textContent = scrapedData.length;
    statusMessage.textContent = `Mengambil: ${message.currentName || 'Memproses...'}`;
    saveDataLocally(scrapedData);
  } else if (message.action === 'SCRAPING_COMPLETE') {
    scrapedData = message.data || [];
    countScraped.textContent = scrapedData.length;
    statusMessage.textContent = `Selesai! Total ${scrapedData.length} tempat terekstrak.`;
    saveDataLocally(scrapedData);
    updateUI(false);
  } else if (message.action === 'SCRAPING_STOPPED') {
    scrapedData = message.data || [];
    countScraped.textContent = scrapedData.length;
    statusMessage.textContent = `Dihentikan. Total ${scrapedData.length} tempat tersimpan.`;
    saveDataLocally(scrapedData);
    updateUI(false);
  } else if (message.action === 'SCRAPING_ERROR') {
    statusMessage.textContent = `Error: ${message.error}`;
    updateUI(false);
  }
});

// Buka viewer data di tab browser baru
btnView.addEventListener('click', () => {
  if (!scrapedData || scrapedData.length === 0) return;
  saveDataLocally(scrapedData);
  chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
});

// Export to CSV
btnExport.addEventListener('click', () => {
  if (!scrapedData || scrapedData.length === 0) return;

  const headers = ['Nama Tempat', 'Rating', 'Jumlah Ulasan', 'Alamat', 'Nomor Telepon', 'Website URL', 'Google Maps URL'];
  
  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const cleanStr = String(str).replace(/"/g, '""');
    return `"${cleanStr}"`;
  };

  const rows = scrapedData.map(item => [
    escapeCsv(item.title),
    escapeCsv(item.rating),
    escapeCsv(item.reviewCount),
    escapeCsv(item.address),
    escapeCsv(item.phone),
    escapeCsv(item.website),
    escapeCsv(item.url)
  ].join(','));

  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `gmaps_leads_${timestamp}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

checkTabAndStatus();
