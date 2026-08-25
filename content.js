let isScraping = false;
let scrapedLeads = [];
let maxResultsLimit = 50;
let stopRequested = false;

// Helper delay utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Find the Google Maps search results feed container
function getFeedContainer() {
  return (
    document.querySelector('div[role="feed"]') ||
    document.querySelector('div.m6QErb[aria-label*="Results"]') ||
    document.querySelector('div.m6QErb[aria-label*="Hasil"]') ||
    document.querySelector('div.m6QErb.DxyBCb.kA9KIf.dS8AEf')
  );
}

// Extract lead data from an individual listing card
function parseItemCard(card) {
  // Maps link and Place URL
  const linkEl = card.querySelector('a.hfpxzc') || card.querySelector('a[href*="/maps/place/"]');
  const url = linkEl ? linkEl.href : '';

  // Place / Business Name
  const titleEl = card.querySelector('.qBF1Pd') || card.querySelector('div.fontHeadlineSmall');
  const title = titleEl ? titleEl.textContent.trim() : (linkEl ? linkEl.getAttribute('aria-label') || '' : '');

  if (!title) return null;

  // Rating score
  let rating = '';
  const ratingEl = card.querySelector('.MW4etd') || card.querySelector('span[aria-label*="stars"], span[aria-label*="bintang"]');
  if (ratingEl) {
    const rText = ratingEl.textContent || ratingEl.getAttribute('aria-label') || '';
    const rMatch = rText.match(/(\d+([.,]\d+)?)/);
    if (rMatch) rating = rMatch[1].replace(',', '.');
  }

  // Review count
  let reviewCount = '';
  const reviewEl = card.querySelector('.UY7F9') || card.querySelector('span[aria-label*="reviews"], span[aria-label*="ulasan"]');
  if (reviewEl) {
    const revText = reviewEl.textContent || reviewEl.getAttribute('aria-label') || '';
    const revMatch = revText.match(/([0-9.,]+)/);
    if (revMatch) reviewCount = revMatch[1].replace(/[.,]/g, '');
  }

  // Official Website Link
  let website = '';
  const websiteEl = card.querySelector('a[data-value="Website"], a[aria-label*="Website"], a[aria-label*="Situs Web"], a[aria-label*="situs web"]');
  if (websiteEl && websiteEl.href) {
    website = websiteEl.href;
  }

  // Additional info lines (Category, Price, Status, Address, Phone, Services, Review Snippet)
  let category = '';
  let price = '';
  let status = '';
  let address = '';
  let phone = '';
  let services = '';
  let reviewSnippet = '';

  const infoContainers = Array.from(card.querySelectorAll('.W4Efsd'));
  const phoneRegex = /(\+?\d{1,4}[\s-]?)?(\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}/;
  const statusRegex = /(buka|tutup|open|closed|operational|hours|pukul|jam|\b24\s*(jam|hours)\b|\d{1,2}[:.]\d{2})/i;
  const serviceRegex = /(makan di tempat|dine-in|bawa pulang|takeaway|takeout|pesan antar|delivery|drive-thru|outdoor|indoor|servis di lokasi)/i;
  const priceRegex = /^([$€£¥₹]|Rp\s*[\d.,\-kK]+|\$\$+|\$\$\$+)+$/i;

  // Helper to extract clean text tokens from leaf nodes to prevent merging adjacent spans
  function getContainerTokens(container) {
    const leafSpans = Array.from(container.querySelectorAll('span')).filter(
      (s) => s.children.length === 0 && s.textContent.trim().length > 0
    );

    let rawTokens = [];
    if (leafSpans.length > 0) {
      rawTokens = leafSpans.map((s) => s.textContent.trim());
    } else {
      rawTokens = [container.textContent.trim()];
    }

    const tokens = [];
    rawTokens.forEach((tok) => {
      tok.split(/[·⋅•|\n]/).forEach((sub) => {
        const clean = sub.trim();
        if (clean && clean !== '·' && clean !== '⋅' && clean !== '•' && clean !== '|') {
          tokens.push(clean);
        }
      });
    });

    return tokens;
  }

  function isRatingOrReviewToken(text) {
    if (!text) return false;
    // Matches patterns like "5,0", "5.0", "(10)", "5,0(10)", "4.8 (1,234)", "(1.2k)", or purely numbers and parentheses
    const pattern = /^\s*(\d+[.,]\d+)?\s*\(?[\d.,kK]+\)?\s*$/;
    const pureNumbersAndParens = /^[\d.,\s\(\)]+$/;
    return pattern.test(text) || pureNumbersAndParens.test(text);
  }

  infoContainers.forEach((container, containerIdx) => {
    // Check for customer review quote snippet
    const quoteEl = container.querySelector('span[jscontroller] span, .ah5Ghc');
    if (quoteEl && (quoteEl.textContent.startsWith('"') || quoteEl.textContent.startsWith('“'))) {
      reviewSnippet = quoteEl.textContent.replace(/^[“"]|[”"]$/g, '').trim();
    }

    const tokens = getContainerTokens(container);
    const serviceParts = [];
    const statusParts = [];

    tokens.forEach((token) => {
      // 1. Phone number check
      const phoneMatch = token.match(phoneRegex);
      if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7 && !phone) {
        phone = phoneMatch[0].trim();
        return;
      }

      // 2. Price tier check
      if (priceRegex.test(token) || /^(Rp\s*\d+|[$€£¥]{1,4})/i.test(token)) {
        if (!price) price = token;
        return;
      }

      // 3. Service options check (Dine-in, Takeout, Delivery, etc.)
      if (serviceRegex.test(token)) {
        serviceParts.push(token);
        return;
      }

      // 4. Operational status check (Open, Closed, Hours)
      if (statusRegex.test(token)) {
        statusParts.push(token);
        return;
      }

      // 5. Skip rating, review count, or quote fragments
      if (isRatingOrReviewToken(token)) return;
      if (token.startsWith('"') || token.startsWith('“') || token.startsWith('”')) {
        if (!reviewSnippet) reviewSnippet = token.replace(/^[“"]|[”"]$/g, '').trim();
        return;
      }

      // 6. In the first line with rating, non-rating text is the Category
      if (containerIdx === 0 && !category) {
        category = token;
        return;
      }

      // 7. In subsequent lines (or fallback), remaining descriptive text is the Address
      if (!address && token !== category && token.length > 2) {
        address = token;
      }
    });

    if (serviceParts.length > 0 && !services) {
      services = serviceParts.join(' · ');
    }

    if (statusParts.length > 0 && !status) {
      status = statusParts.join(' ⋅ ');
    }
  });

  return {
    title,
    category,
    rating,
    reviewCount,
    price,
    status,
    address,
    phone,
    services,
    reviewSnippet,
    website,
    url
  };
}

// Main scraping routine with automated infinite scrolling
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
      error: 'Results feed not found. Please execute a search on Google Maps first.'
    });
    return;
  }

  const seenUrls = new Set();
  let scrollAttempts = 0;
  const maxScrollAttemptsWithoutNew = 10;
  let lastItemCount = 0;

  while (isScraping && !stopRequested && scrapedLeads.length < maxResultsLimit) {
    // Query all listing card elements in the feed
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

    // Check if the end of the results list has been reached
    const endReached = document.querySelector('.HlvSq') || document.querySelector('span.PbZDve');
    if (endReached && endReached.textContent.includes('end of the list')) {
      break;
    }

    // Auto-scroll down
    feed.scrollTop = feed.scrollHeight;
    await sleep(1500);

    // Check if new items loaded after scrolling
    if (cards.length === lastItemCount) {
      scrollAttempts++;
      // Scroll slightly up and down again to trigger lazy loading
      feed.scrollTop -= 200;
      await sleep(400);
      feed.scrollTop = feed.scrollHeight;
      await sleep(1000);

      if (scrollAttempts >= maxScrollAttemptsWithoutNew) {
        break; // No further items loaded
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

// Runtime message listener for popup commands
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
      statusMessage: isScraping
        ? 'Extracting leads...'
        : (scrapedLeads.length > 0 ? `${scrapedLeads.length} leads extracted.` : 'Ready.')
    });
  }
  return true;
});
