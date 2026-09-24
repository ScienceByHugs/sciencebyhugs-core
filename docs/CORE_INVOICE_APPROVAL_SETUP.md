# Core Invoice Approval / PDF Setup

This file adds the Google-side approval/PDF portion of the Nexus invoice workflow.

## Apps Script

1. Open the company **Science By Hugs Invoice System** Apps Script project.
2. Create a new file named `CORE_INVOICE_APPROVAL.gs`.
3. Paste the contents of `CORE_INVOICE_APPROVAL.gs`.
4. Update the existing `doPost(e)` in `NEXUS_INVOICE_BRIDGE.gs` so it includes the approval route **before** the unknown-API response:

```js
function doPost(e) {
  const params =
    e && e.parameter
      ? e.parameter
      : {};

  if (params.api === 'nexusInvoiceRequest') {
    return handleNexusInvoiceRequest_(e);
  }

  if (params.api === 'approveNexusInvoice') {
    return handleApproveNexusInvoice_(e);
  }

  return nexusInvoiceJson_({
    success: false,
    error: 'Unknown POST API.'
  });
}
```

5. Save.
6. **Deploy → Manage deployments → Edit → New version → Deploy**.
7. Keep the same Web App deployment URL and access settings.

## Behavior

Approval does **not** email the customer.

It:
- requires the queue row to be `Awaiting Approval`;
- changes it temporarily to `Processing PDF`;
- exports only that invoice tab to PDF;
- saves the PDF to the company Drive folder **Invoice PDF**;
- writes the Drive URL to column K (**Invoice PDF**) in Invoice Log;
- sets the queue row to `Completed`;
- returns the PDF URL to Supabase.

The Google handler is idempotent by invoice number, so an accidental repeated approval should return the existing PDF instead of creating another one while its stored Drive file still exists.
