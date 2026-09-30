# Manual catalog sync bridge

Create a separate standalone Google Apps Script project under the account that owns the Science By Hugs Invoice System spreadsheet. Paste `CoreCatalogBridge.gs` into the project.

In Project Settings → Script Properties, configure:

- `SUPABASE_SECRET_KEY`: the same value used by the existing hourly catalog sync.
- `CATALOG_SPREADSHEET_ID`: the ID of the invoice-system spreadsheet that contains the Catalog and New Product List tabs.

Keep both values out of committed script source. Do not send the secret key in chat. Existing deployed scripts are unaffected by this repository change; configure the spreadsheet property before deploying this version.

Deploy → New deployment → Web app. Execute as yourself; access: Anyone. The script authenticates each POST using the server-held bridge key before reading or syncing the catalog. Authorize spreadsheet and external request access when Google prompts.

Copy the resulting `https://script.google.com/macros/s/.../exec` URL. Configure only `internal_runtime_config` → `checkout` → `catalogSyncUrl` to this URL. Keep `appsScriptUrl` unchanged; it handles checkout/invoices. CORE supplies `api=syncCatalog` automatically.

Open CORE → Catalog → Sync Catalog Now. Confirm a new completed sync appears in history with the current product count. The button should return to its normal state after completion. Existing hourly triggers remain in their original project.
