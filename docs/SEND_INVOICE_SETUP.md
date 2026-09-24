# Send Invoice Apps Script Setup

Add `SEND_INVOICE.gs` to the company Apps Script project.

Then add this route to the existing `doPost(e)` **before** the unknown-API response:

```js
if (params.api === 'sendNexusInvoice') {
  return handleSendNexusInvoice_(e);
}
```

Your complete routing section should include:

```js
if (params.api === 'nexusInvoiceRequest') {
  return handleNexusInvoiceRequest_(e);
}

if (params.api === 'approveNexusInvoice') {
  return handleApproveNexusInvoice_(e);
}

if (params.api === 'sendNexusInvoice') {
  return handleSendNexusInvoice_(e);
}
```

Save and redeploy the existing Web App as a **new version**.

## Gmail permission

This file uses Gmail to send the approved PDF attachment. The first time, Google may ask for an additional Gmail permission.

The code intentionally requires `admin@sciencebyhugs.com` to be available as a Gmail **Send mail as** alias. It will fail safely rather than silently send from another address.

## Safety behavior

- Approval does not send.
- Sending requires a separate Core action.
- The Apps Script bridge stores an idempotency record by invoice number to prevent accidental duplicate sends.
