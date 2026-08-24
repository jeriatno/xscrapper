let isScraping = false;
let scrapedLeads = [];
let maxResultsLimit = 50;
let stopRequested = false;

// Helper delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cari container feed Google Maps
function getFeedContainer() {
  return (
    document.querySelector('div[role="feed"]') ||
    document.querySelector('div.m6QErb[aria-label*="Results"]') ||
    document.querySelector('div.m6QErb[aria-label*="Hasil"]') ||
    document.querySelector('div.m6QErb.DxyBCb.kA9KIf.dS8AEf')
  );
}

// Ekstraksi data dari satu kartu listing
function parseItemCard(card) {
  // Link & URL Maps
  const linkEl = card.querySelector('a.hfpxzc') || card.querySelector('a[href*="/maps/place/"]');
  const url = linkEl ? linkEl.href : '';

  // Nama Tempat
  const titleEl = card.querySelector('.qBF1Pd') || card.querySelector('div.fontHeadlineSmall');
  const title = titleEl ? titleEl.textContent.trim() : (linkEl ? linkEl.getAttribute('aria-label') || '' : '');

  if (!title) return null;

  // Rating
  let rating = '';
  const ratingEl = card.querySelector('.MW4etd') || card.querySelector('span[aria-label*="stars"], span[aria-label*="bintang"]');
  if (ratingEl) {
    const rText = ratingEl.textContent || ratingEl.getAttribute('aria-label') || '';
    const rMatch = rText.match(/(\d+([.,]\d+)?)/);
    if (rMatch) rating = rMatch[1].replace(',', '.');
  }

  // Jumlah Ulasan
  let reviewCount = '';
  const reviewEl = card.querySelector('.UY7F9') || card.querySelector('span[aria-label*="reviews"], span[aria-label*="ulasan"]');
  if (reviewEl) {
    const revText = reviewEl.textContent || reviewEl.getAttribute('aria-label') || '';
    const revMatch = revText.match(/([0-9.,]+)/);
    if (revMatch) reviewCount = revMatch[1].replace(/[.,]/g, '');
  }

  // Website Link
  let website = '';
  const websiteEl = card.querySelector('a[data-value="Website"], a[aria-label*="Website"], a[aria-label*="Situs Web"], a[aria-label*="situs web"]');
  if (websiteEl && websiteEl.href) {
    website = websiteEl.href;
  }

  // Baris Info Tambahan (Kategori, Alamat, Nomor Telepon)
  let address = '';
  let phone = '';

  const infoContainers = card.querySelectorAll('.W4Efsd');
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}/;

  infoContainers.forEach((container) => {
    const text = container.textContent.trim();
    if (!text) return;

    // Deteksi nomor telepon
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch && phoneMatch[0].length >= 8 && !phone) {
      phone = phoneMatch[0].trim();
    }

    // Bagian teks terpisah oleh bullet '·'
    const parts = text.split('·').map((p) => p.trim());
    parts.forEach((part) => {
      // Jika bukan rating, bukan nomor telepon, dan bukan kata buka/tutup
      const isStatus = /Buka|Tutup|Open|Closed|24 Jam|24 hours/i.test(part);
      const isReviewPart = /^\(?\d+\)?$/.test(part);
      const isPhonePart = phoneMatch && part.includes(phoneMatch[0]);

      if (!isStatus && !isReviewPart && !isPhonePart && part.length > 5 && !address) {
        address = part;
      }
    });
  });

  return {
    title,
    rating,
    reviewCount,
    address,
    phone,
    website,
    url
  };
}

// Logika scraping utama dengan auto-scroll
async function runScraper(maxResults) {
  isScraping = true;
  stopRequested = false;
  maxResultsLimit = maxResults;
  scrapedLeads = [];

  const feed = getFeedContainer();
  if (!feed) {
    isScraping = false;
    chrome.runtime.sendMessage({
      action: 'SCRAPING_ERROR',
      error: 'Daftar hasil tidak ditemukan. Lakukan pencarian di Google Maps terlebih dahulu.'
    });
    return;
  }

  const seenUrls = new Set();
  let scrollAttempts = 0;
  const maxScrollAttemptsWithoutNew = 10;
  let lastItemCount = 0;

  while (isScraping && !stopRequested && scrapedLeads.length < maxResultsLimit) {
    // Ambil semua elemen kartu hasil
    const cards = feed.querySelectorAll('.Nv2PK, div[role="article"]');

    cards.forEach((card) => {
      if (scrapedLeads.length >= maxResultsLimit || stopRequested) return;

      const lead = parseItemCard(card);
      if (lead) {
        const uniqueKey = lead.url || (lead.title + '|' + lead.address);
        if (!seenUrls.has(uniqueKey)) {
          seenUrls.add(uniqueKey);
          scrapedLeads.push(lead);

          chrome.runtime.sendMessage({
            action: 'UPDATE_PROGRESS',
            data: scrapedLeads,
            currentName: lead.title
          });
        }
      }
    });

    if (scrapedLeads.length >= maxResultsLimit || stopRequested) break;

    // Cek apakah sudah mencapai akhir daftar
    const endReached = document.querySelector('.HlvSq') || document.querySelector('span.PbZDve');
    if (endReached && endReached.textContent.includes('end of the list')) {
      break;
    }

    // Auto-scroll ke bawah
    feed.scrollTop = feed.scrollHeight;
    await sleep(1500);

    // Cek apakah ada data baru setelah scroll
    if (cards.length === lastItemCount) {
      scrollAttempts++;
      // Sedikit scroll ke atas lalu ke bawah lagi untuk memicu loading
      feed.scrollTop -= 200;
      await sleep(400);
      feed.scrollTop = feed.scrollHeight;
      await sleep(1000);

      if (scrollAttempts >= maxScrollAttemptsWithoutNew) {
        break; // Tidak ada hasil baru yang dimuat
      }
    } else {
      scrollAttempts = 0;
      lastItemCount = cards.length;
    }
  }

  const finalAction = stopRequested ? 'SCRAPING_STOPPED' : 'SCRAPING_COMPLETE';
  isScraping = false;
  stopRequested = false;

  chrome.runtime.sendMessage({
    action: finalAction,
    data: scrapedLeads
  });
}

// Listener pesan dari popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_SCRAPING') {
    if (!isScraping) {
      runScraper(request.maxResults || 50);
      sendResponse({ status: 'started' });
    } else {
      sendResponse({ status: 'already_running' });
    }
  } else if (request.action === 'STOP_SCRAPING') {
    stopRequested = true;
    isScraping = false;
    sendResponse({ status: 'stopping' });
  } else if (request.action === 'GET_STATUS') {
    sendResponse({
      isScraping: isScraping,
      data: scrapedLeads,
      statusMessage: isScraping ? 'Sedang mengekstrak data...' : (scrapedLeads.length > 0 ? `Tersedia ${scrapedLeads.length} data.` : 'Siap.')
    });
  }
  return true;
});
