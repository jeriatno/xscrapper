<div align="center">
  <img src="icons/icon128.png" alt="Google Maps Scraper Logo" width="96" height="96" />
  <h1>XMaps Scraper</h1>
  <p><strong>Chrome Extension (Manifest V3)</strong></p>
  <p>A lightweight and powerful Google Chrome Extension designed to automatically extract business leads from Google Maps search results and export them directly to a <strong>CSV</strong> file.</p>
</div>

---

## 🚀 Key Features

- **Comprehensive Data Extraction**:
  - 🏢 **Place / Business Name**
  - 🏷️ **Category** (Kafe, Restaurant, Clinic, etc.)
  - ⭐ **Rating** (Star score)
  - 💬 **Review Count**
  - 💰 **Price Level** ($, $$, $$$, Rp...)
  - ⏰ **Opening Hours & Status** (Open, Closed, 24 Hours)
  - 📍 **Full Address**
  - 📞 **Phone Number**
  - 🍽️ **Service Options** (Dine-in, Takeaway, Delivery)
  - 💬 **Review Highlight Snippet**
  - 🌐 **Website URL**
  - 🔗 **Google Maps Place URL**
- ⚡ **Automated Infinite Scroll**: Automatically scrolls through the Google Maps results panel until your target limit is reached or the end of results is detected.
- 🎯 **Configurable Target Limit**: Set the maximum number of leads to scrape (e.g., 20, 50, 100, 500+).
- 🛑 **Full Scraping Control**: Start and Stop buttons allowing you to pause/abort the process at any point.
- 👁️ **In-Browser Interactive Table Viewer**: Open and preview the extracted data in a full browser tab with real-time search, multi-column sorting, and direct links.
- 📋 **One-Click Row Copy**: Copy all details of any individual lead directly to clipboard formatted with clean labels and emojis.
- 📥 **Export to CSV**: Download extracted data with UTF-8 BOM encoding for seamless viewing in Microsoft Excel, Google Sheets, and LibreOffice.
- 🎨 **Modern Dark UI**: Sleek, responsive, and intuitive popup interface.

---

## 📁 File Structure

```text
maps-scrapper/
├── manifest.json   # Chrome Extension Manifest V3 configuration
├── popup.html      # Popup UI layout and styling
├── popup.js        # UI logic and data sync handler
├── content.js      # Google Maps DOM parser and auto-scroller
├── viewer.html     # In-browser full data viewer & search table
├── viewer.js       # Interactive table logic, sorting, copy, and CSV export
└── README.md       # Project documentation
```

---

## 🛠️ Installation Guide

1. Open **Google Chrome** (or any Chromium-based browser like Brave, Edge).
2. Navigate to the extensions management page:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select this project directory (`maps-scrapper`).
6. The **XMaps Scraper** extension is now installed and ready to use!

---

## 📖 How to Use

1. Go to [Google Maps](https://www.google.com/maps).
2. Search for any business or keyword (e.g., `Coffee Shop New York` or `Dentist London`).
3. Make sure the search results list is visible on the left side panel.
4. Click the **XMaps Scraper** extension icon in your browser toolbar (pin it for convenience).
5. Set your desired **Max Target Leads** (default: 50).
6. Click **▶ Start Scraping**.
7. The extension will auto-scroll the results feed and parse lead data in real-time.
8. Once finished (or after clicking **⏹ Stop**):
   - Click **👁️ Buka Data di Browser** to open the interactive data table in a new tab.
   - Use **📋 Copy** on any row to copy all lead details to your clipboard.
   - Sort, filter, and click **📥 Export to CSV** directly from the viewer.

---

## 📊 CSV Column Format

The generated CSV file (`gmaps_leads_YYYY-MM-DD-HH-MM-SS.csv`) includes the following columns:

| Column | Description |
| :--- | :--- |
| **Nama Tempat** (Business Name) | Name of the business or place |
| **Kategori** (Category) | Business category / primary industry |
| **Rating** | Average rating score (e.g., 4.8) |
| **Jumlah Ulasan** (Review Count) | Total number of user reviews |
| **Tingkat Harga** (Price Level) | Price tier ($, $$, $$$, Rp...) |
| **Jam Buka / Status** (Status) | Operational hours & Open/Closed status |
| **Alamat** (Address) | Formatted address string |
| **Nomor Telepon** (Phone Number) | Contact telephone number |
| **Pilihan Layanan** (Service Options) | Dine-in, Takeaway, Delivery, etc. |
| **Cuplikan Review** (Review Snippet) | Customer review excerpt / quote |
| **Website URL** | Official website link |
| **Google Maps URL** | Direct link to the place on Google Maps |

---

## 💡 Tips & Notes

- **Network Speed**: The auto-scroll delay is calibrated to allow Google Maps enough time to fetch new search cards. If your network is slow, allow a few extra seconds between scroll steps.
- **Reloading the Extension**: If you make modifications to the code and reload the extension in `chrome://extensions/`, remember to refresh (F5) the Google Maps tab.
- **Spreadsheet Compatibility**: The CSV output includes a UTF-8 BOM (`\uFEFF`) header so special characters, accents, and phone numbers render without formatting issues in Microsoft Excel.
