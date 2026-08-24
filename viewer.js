let allLeads = [];
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const totalCountBadge = document.getElementById('totalCountBadge');
const btnDownloadCsv = document.getElementById('btnDownloadCsv');

function renderTable(dataToRender) {
  tableBody.innerHTML = '';

  if (!dataToRender || dataToRender.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div>📭 Tidak ada data ditemukan</div>
          <p>Belum ada leads yang berhasil diekstrak atau hasil pencarian tidak cocok.</p>
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
      ? `<span class="reviews-badge">(${Number(item.reviewCount).toLocaleString()})</span>`
      : '';

    const websiteHtml = item.website
      ? `<a href="${item.website}" target="_blank" rel="noopener noreferrer" class="link">Visit ↗</a>`
      : '<span style="color: #64748b;">-</span>';

    const mapLinkHtml = item.url
      ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="link">Open Maps ↗</a>`
      : '<span style="color: #64748b;">-</span>';

    tr.innerHTML = `
      <td style="color: #64748b;">${index + 1}</td>
      <td><strong>${escapeHtml(item.title || '-')}</strong></td>
      <td>${ratingHtml} ${reviewsHtml}</td>
      <td>${escapeHtml(item.address || '-')}</td>
      <td>${escapeHtml(item.phone || '-')}</td>
      <td>${websiteHtml}</td>
      <td>${mapLinkHtml}</td>
    `;

    tableBody.appendChild(tr);
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

// Search Filter
searchInput.addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase().trim();
  if (!keyword) {
    renderTable(allLeads);
    totalCountBadge.textContent = `${allLeads.length} Leads`;
    return;
  }

  const filtered = allLeads.filter(item => {
    return (
      (item.title && item.title.toLowerCase().includes(keyword)) ||
      (item.address && item.address.toLowerCase().includes(keyword)) ||
      (item.phone && item.phone.toLowerCase().includes(keyword)) ||
      (item.rating && item.rating.toString().includes(keyword))
    );
  });

  renderTable(filtered);
  totalCountBadge.textContent = `${filtered.length} of ${allLeads.length} Leads`;
});

// CSV Export
btnDownloadCsv.addEventListener('click', () => {
  if (!allLeads || allLeads.length === 0) return;

  const headers = ['Nama Tempat', 'Rating', 'Jumlah Ulasan', 'Alamat', 'Nomor Telepon', 'Website URL', 'Google Maps URL'];
  
  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const cleanStr = String(str).replace(/"/g, '""');
    return `"${cleanStr}"`;
  };

  const rows = allLeads.map(item => [
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

// Load data from chrome.storage.local
function loadData() {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['latestScrapedData'], (result) => {
      allLeads = result.latestScrapedData || [];
      totalCountBadge.textContent = `${allLeads.length} Leads`;
      renderTable(allLeads);
    });
  }
}

// Listen to storage changes live
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.latestScrapedData) {
      allLeads = changes.latestScrapedData.newValue || [];
      totalCountBadge.textContent = `${allLeads.length} Leads`;
      renderTable(allLeads);
    }
  });
}

loadData();
