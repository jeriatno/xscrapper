let allLeads = [];
let currentSort = {
  column: null,
  direction: 'asc' // 'asc' | 'desc'
};

const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const totalCountBadge = document.getElementById('totalCountBadge');
const btnDownloadCsv = document.getElementById('btnDownloadCsv');
const sortableHeaders = document.querySelectorAll('th.sortable');

// Render operational status badge (Open / Closed)
function formatStatusBadge(statusText) {
  if (!statusText) return '<span style="color: #64748b;">-</span>';
  
  const isClosed = /tutup|closed/i.test(statusText);
  const isOpen = /buka|open|24\s*(jam|hours)/i.test(statusText);
  
  let className = 'status-badge';
  if (isClosed && !isOpen) {
    className += ' status-closed';
  } else if (isOpen) {
    className += ' status-open';
  } else {
    className += ' status-open';
  }
  
  return `<span class="${className}">${escapeHtml(statusText)}</span>`;
}

// Render HTML table rows
function renderTable(dataToRender) {
  tableBody.innerHTML = '';

  if (!dataToRender || dataToRender.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="13" class="empty-state">
          <div>📭 No leads found</div>
          <p>No data extracted yet or no items match your search filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  dataToRender.forEach((item, index) => {
    const tr = document.createElement('tr');

    const ratingHtml = item.rating 
      ? `<span class="rating-badge">★ ${item.rating}</span>`
      : '<span style="color: #64748b;">-</span>';

    const reviewsHtml = item.reviewCount
      ? `<span class="reviews-badge">${Number(item.reviewCount).toLocaleString()}</span>`
      : '<span style="color: #64748b;">-</span>';

    const priceHtml = item.price
      ? `<span class="price-badge">${escapeHtml(item.price)}</span>`
      : '<span style="color: #64748b;">-</span>';

    const statusHtml = formatStatusBadge(item.status);

    const servicesHtml = item.services
      ? `<div class="services-tag">${escapeHtml(item.services)}</div>`
      : '<span style="color: #64748b;">-</span>';

    const websiteHtml = item.website
      ? `<a href="${item.website}" target="_blank" rel="noopener noreferrer" class="link">Visit ↗</a>`
      : '<span style="color: #64748b;">-</span>';

    const mapLinkHtml = item.url
      ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="link">Open Maps ↗</a>`
      : '<span style="color: #64748b;">-</span>';

    tr.innerHTML = `
      <td style="color: #64748b;">${index + 1}</td>
      <td><strong>${escapeHtml(item.title || '-')}</strong></td>
      <td><span style="color: #93c5fd; font-size: 12px;">${escapeHtml(item.category || '-')}</span></td>
      <td>${ratingHtml}</td>
      <td>${reviewsHtml}</td>
      <td>${priceHtml}</td>
      <td>${statusHtml}</td>
      <td>${escapeHtml(item.address || '-')}</td>
      <td>${escapeHtml(item.phone || '-')}</td>
      <td>${servicesHtml}</td>
      <td>${websiteHtml}</td>
      <td>${mapLinkHtml}</td>
      <td style="text-align: center;">
        <button class="btn-row-copy" data-index="${index}">📋 Copy</button>
      </td>
    `;

    // Attach copy event listener to the per-row button
    const copyBtn = tr.querySelector('.btn-row-copy');
    copyBtn.addEventListener('click', () => copyRowInfo(item, copyBtn));

    tableBody.appendChild(tr);
  });
}

// Copy full row info formatted with clear labels to clipboard
function copyRowInfo(item, buttonEl) {
  const lines = [
    `🏢 Name: ${item.title || '-'}`,
    `🏷️ Category: ${item.category || '-'}`,
    `⭐ Rating: ${item.rating || '-'} (${item.reviewCount || '0'} reviews)`,
    item.price ? `💰 Price: ${item.price}` : null,
    item.status ? `⏰ Status: ${item.status}` : null,
    `📍 Address: ${item.address || '-'}`,
    `📞 Phone: ${item.phone || '-'}`,
    item.services ? `🍽️ Services: ${item.services}` : null,
    item.website ? `🌐 Website: ${item.website}` : null,
    item.url ? `🔗 Google Maps: ${item.url}` : null
  ].filter(Boolean).join('\n');

  navigator.clipboard.writeText(lines).then(() => {
    buttonEl.textContent = '✓ Copied!';
    buttonEl.classList.add('copied');
    setTimeout(() => {
      buttonEl.textContent = '📋 Copy';
      buttonEl.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    buttonEl.textContent = 'Failed';
    setTimeout(() => {
      buttonEl.textContent = '📋 Copy';
    }, 2000);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Filter and sort leads data based on active criteria
function getProcessedData() {
  const keyword = searchInput.value.toLowerCase().trim();
  
  // 1. Search Filter
  let filtered = allLeads.filter((item) => {
    if (!keyword) return true;
    return (
      (item.title && item.title.toLowerCase().includes(keyword)) ||
      (item.category && item.category.toLowerCase().includes(keyword)) ||
      (item.address && item.address.toLowerCase().includes(keyword)) ||
      (item.phone && item.phone.toLowerCase().includes(keyword)) ||
      (item.price && item.price.toLowerCase().includes(keyword)) ||
      (item.status && item.status.toLowerCase().includes(keyword)) ||
      (item.services && item.services.toLowerCase().includes(keyword)) ||
      (item.rating && item.rating.toString().includes(keyword))
    );
  });

  // 2. Column Sort
  if (currentSort.column) {
    const col = currentSort.column;
    const isAsc = currentSort.direction === 'asc';

    filtered.sort((a, b) => {
      let valA = a[col];
      let valB = b[col];

      // Numeric sorting for rating & reviewCount
      if (col === 'rating' || col === 'reviewCount') {
        valA = valA !== '' && valA !== undefined && valA !== null ? parseFloat(valA) : -1;
        valB = valB !== '' && valB !== undefined && valB !== null ? parseFloat(valB) : -1;
        return isAsc ? valA - valB : valB - valA;
      }

      // String sorting for text columns
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();

      if (!valA && valB) return 1;
      if (valA && !valB) return -1;

      return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  return filtered;
}

function updateView() {
  const processed = getProcessedData();
  totalCountBadge.textContent = searchInput.value.trim()
    ? `${processed.length} of ${allLeads.length} Leads`
    : `${allLeads.length} Leads`;
  renderTable(processed);
}

// Column header sorting click handler
sortableHeaders.forEach((th) => {
  th.addEventListener('click', () => {
    const column = th.getAttribute('data-sort');
    if (!column) return;

    if (currentSort.column === column) {
      currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.column = column;
      // Default to descending for rating & reviews so best rated appear first
      currentSort.direction = (column === 'rating' || column === 'reviewCount') ? 'desc' : 'asc';
    }

    // Update header indicator styling
    sortableHeaders.forEach((header) => {
      header.classList.remove('sorted-asc', 'sorted-desc');
      const icon = header.querySelector('.sort-icon');
      if (icon) icon.textContent = '↕';
    });

    th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    const activeIcon = th.querySelector('.sort-icon');
    if (activeIcon) {
      activeIcon.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
    }

    updateView();
  });
});

// Search filter input listener
searchInput.addEventListener('input', () => {
  updateView();
});

// Export to CSV handler
btnDownloadCsv.addEventListener('click', () => {
  const dataToExport = getProcessedData();
  if (!dataToExport || dataToExport.length === 0) return;

  const headers = [
    'Nama Tempat',
    'Kategori',
    'Rating',
    'Jumlah Ulasan',
    'Tingkat Harga',
    'Jam Buka / Status',
    'Alamat',
    'Nomor Telepon',
    'Pilihan Layanan',
    'Cuplikan Review',
    'Website URL',
    'Google Maps URL'
  ];
  
  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const cleanStr = String(str).replace(/"/g, '""');
    return `"${cleanStr}"`;
  };

  const rows = dataToExport.map((item) => [
    escapeCsv(item.title),
    escapeCsv(item.category),
    escapeCsv(item.rating),
    escapeCsv(item.reviewCount),
    escapeCsv(item.price),
    escapeCsv(item.status),
    escapeCsv(item.address),
    escapeCsv(item.phone),
    escapeCsv(item.services),
    escapeCsv(item.reviewSnippet),
    escapeCsv(item.website),
    escapeCsv(item.url)
  ].join(','));

  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
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

// Load leads data from chrome.storage.local
function loadData() {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['latestScrapedData'], (result) => {
      allLeads = result.latestScrapedData || [];
      updateView();
    });
  }
}

// Live update listener when storage changes
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.latestScrapedData) {
      allLeads = changes.latestScrapedData.newValue || [];
      updateView();
    }
  });
}

loadData();
