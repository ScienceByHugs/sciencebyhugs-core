// Deploy as a separate standalone Apps Script project; keep invoice scripts unchanged.
const CATALOG_SPREADSHEET_ID = '1oU9T3wLObSiyzqpw69M2nABqmZ16_jJzWZ6adcNjxHE';
const CATALOG_SYNC_URL = 'https://tkhcvmkejzaoervocnzk.supabase.co/functions/v1/sync-google-catalog';

function doPost(e) {
  const json = value => ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
  try {
    if (!e || e.parameter.api !== 'syncCatalog') {
      return json({ success: false, error: 'Unsupported request.' });
    }
    const payload = JSON.parse(e.postData.contents || '{}');
    const key = PropertiesService.getScriptProperties().getProperty('SUPABASE_SECRET_KEY');
    if (!key || payload.bridgeKey !== key) {
      return json({ success: false, error: 'Unauthorized catalog sync request.' });
    }
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) {
      return json({ success: false, error: 'Catalog sync is already running. Try again shortly.' });
    }
    try {
      const ss = SpreadsheetApp.openById(CATALOG_SPREADSHEET_ID);
      const catalog = ss.getSheetByName('Catalog');
      const sourcing = ss.getSheetByName('New Product List');
      if (!catalog || !sourcing) throw new Error('Catalog or New Product List sheet not found.');
      if (catalog.getLastRow() < 2) throw new Error('Catalog contains no products.');
      const shipping = {};
      if (sourcing.getLastRow() >= 2) {
        sourcing.getRange(2, 1, sourcing.getLastRow() - 1, 3).getValues().forEach(row => {
          const name = String(row[0] || '').trim().toLowerCase();
          if (name) shipping[name] = String(row[2] || '').trim();
        });
      }
      const products = catalog.getRange(2, 1, catalog.getLastRow() - 1, 8).getValues()
        .filter(row => String(row[0] || '').trim()).map(row => {
          const name = String(row[0]).trim();
          const price = typeof row[3] === 'number' ? row[3]
            : Number(String(row[3] || '').replace(/[$,]/g, '').trim());
          if (!Number.isFinite(price) || price < 0) throw new Error('Invalid price for ' + name);
          return {
            name, category: String(row[1] || '').trim(),
            product_type: String(row[2] || '').trim(), price,
            description: String(row[4] || '').trim(),
            image_url: String(row[5] || '').trim(),
            storefront_status: String(row[6] || 'Available').trim(),
            featured: String(row[7] || '').trim().toLowerCase() === 'yes',
            shipping_from: shipping[name.toLowerCase()] || ''
          };
        });
      if (!products.length) throw new Error('No valid Catalog products found.');
      const response = UrlFetchApp.fetch(CATALOG_SYNC_URL, {
        method: 'post', contentType: 'application/json',
        headers: { apikey: key },
        payload: JSON.stringify({ source: 'google_catalog', products }),
        muteHttpExceptions: true
      });
      const result = JSON.parse(response.getContentText());
      if (response.getResponseCode() !== 200 || result.success !== true) {
        throw new Error(result.error || 'Supabase catalog sync failed.');
      }
      return json(result);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return json({ success: false, error: error.message || String(error) });
  }
}
