let scrapedData = [];
let isScraping = false;

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnView = document.getElementById('btnView');
const countScraped = document.getElementById('countScraped');
const statusState = document.getElementById('statusState');
const statusMessage = document.getElementById('statusMessage');
const maxResultsInput = document.getElementById('maxResults');

function updateUI(scraping) {
  isScraping = scraping;
  btnStart.style.display = scraping ? 'none' : 'flex';
  btnStop.style.display = scraping ? 'flex' : 'none';
  btnView.disabled = scraping || scrapedData.length === 0;
  statusState.textContent = scraping ? 'Running...' : (scrapedData.length > 0 ? 'Done' : 'Ready');
  statusState.style.color = scraping ? '#f59e0b' : '#a3e635';
}

function saveDataLocally(data) {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ latestScrapedData: data });
  }
}

// Check active tab and scraper state on popup open
async function checkTabAndStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('google.') || !tab.url.includes('/maps')) {
    statusMessage.textContent = 'Please open a Google Maps page first!';
    btnStart.disabled = true;
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script may not be ready or injected yet
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

// Start scraping
btnStart.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const maxResults = parseInt(maxResultsInput.value, 10) || 50;

  statusMessage.textContent = 'Starting auto-scroll and lead extraction...';
  updateUI(true);

  chrome.tabs.sendMessage(tab.id, {
    action: 'START_SCRAPING',
    maxResults: maxResults
  }, (response) => {
    if (chrome.runtime.lastError) {
      statusMessage.textContent = 'Failed to connect to page. Please refresh Google Maps.';
      updateUI(false);
    }
  });
});

// Stop scraping
btnStop.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: 'STOP_SCRAPING' });
  statusMessage.textContent = 'Stopping scraping...';
});

// Receive progress updates from content.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'UPDATE_PROGRESS') {
    scrapedData = message.data || [];
    countScraped.textContent = scrapedData.length;
    statusMessage.textContent = `Extracting: ${message.currentName || 'Processing...'}`;
    saveDataLocally(scrapedData);
  } else if (message.action === 'SCRAPING_COMPLETE') {
    scrapedData = message.data || [];
    countScraped.textContent = scrapedData.length;
    statusMessage.textContent = `Completed! ${scrapedData.length} places extracted.`;
    saveDataLocally(scrapedData);
    updateUI(false);
  } else if (message.action === 'SCRAPING_STOPPED') {
    scrapedData = message.data || [];
    countScraped.textContent = scrapedData.length;
    statusMessage.textContent = `Stopped. ${scrapedData.length} places saved.`;
    saveDataLocally(scrapedData);
    updateUI(false);
  } else if (message.action === 'SCRAPING_ERROR') {
    statusMessage.textContent = `Error: ${message.error}`;
    updateUI(false);
  }
});

// Open interactive leads viewer in a new browser tab
btnView.addEventListener('click', () => {
  if (!scrapedData || scrapedData.length === 0) return;
  saveDataLocally(scrapedData);
  chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
});

checkTabAndStatus();
