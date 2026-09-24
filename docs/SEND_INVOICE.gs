/**
 * SCIENCE BY HUGs — SEND APPROVED INVOICE
 *
 * Add this file to the SAME company Apps Script project.
 *
 * This endpoint sends an already-approved invoice PDF by email.
 * It is deliberately separate from PDF approval/creation.
 */

const INVOICE_SEND_FROM_ALIAS =
  'admin@sciencebyhugs.com';


function handleSendNexusInvoice_(e) {
  try {
    const raw =
      e && e.postData && e.postData.contents
        ? e.postData.contents
        : '';

    if (!raw) {
      return nexusInvoiceJson_({
        success: false,
        error: 'Missing request body.'
      });
    }

    const payload = JSON.parse(raw);

    const expectedKey =
      PropertiesService
        .getScriptProperties()
        .getProperty('SUPABASE_SECRET_KEY');

    if (
      !expectedKey ||
      !payload.bridgeKey ||
      payload.bridgeKey !== expectedKey
    ) {
      return nexusInvoiceJson_({
        success: false,
        error: 'Unauthorized send bridge request.'
      });
    }

    const invoiceNumber =
      String(payload.invoiceNumber || '').trim();

    const customerName =
      String(payload.customerName || '').trim();

    const recipient =
      String(payload.recipient || '').trim();

    const pdfUrl =
      String(payload.pdfUrl || '').trim();

    if (
      !invoiceNumber ||
      !recipient ||
      !pdfUrl
    ) {
      return nexusInvoiceJson_({
        success: false,
        error:
          'Invoice number, recipient, and PDF URL are required.'
      });
    }

    const props =
      PropertiesService.getScriptProperties();

    const idempotencyKey =
      'NEXUS_SENT_' + invoiceNumber;

    const previous =
      props.getProperty(idempotencyKey);

    if (previous) {
      try {
        return nexusInvoiceJson_(
          JSON.parse(previous)
        );
      } catch (ignore) {}
    }

    const fileIdMatch =
      pdfUrl.match(/\/d\/([^/]+)/);

    if (!fileIdMatch) {
      throw new Error(
        'Could not determine PDF file ID.'
      );
    }

    const pdfFile =
      DriveApp.getFileById(
        fileIdMatch[1]
      );

    const aliases =
      GmailApp.getAliases();

    if (
      aliases.indexOf(
        INVOICE_SEND_FROM_ALIAS
      ) === -1
    ) {
      throw new Error(
        'The Gmail send-as alias ' +
        INVOICE_SEND_FROM_ALIAS +
        ' is not available to this Apps Script account.'
      );
    }

    const subject =
      'Science By HUGs Invoice ' +
      invoiceNumber;

    const greeting =
      customerName
        ? 'Hi ' + customerName + ','
        : 'Hello,';

    const body =
      greeting +
      '\n\n' +
      'Your Science By HUGs invoice ' +
      invoiceNumber +
      ' is attached as a PDF.' +
      '\n\n' +
      'Thank you,' +
      '\n' +
      'Science By HUGs';

    GmailApp.sendEmail(
      recipient,
      subject,
      body,
      {
        from: INVOICE_SEND_FROM_ALIAS,
        name: 'Science By HUGs',
        attachments: [
          pdfFile.getBlob()
        ]
      }
    );

    const result = {
      success: true,
      invoiceNumber: invoiceNumber,
      recipient: recipient,
      sentAt: new Date().toISOString()
    };

    props.setProperty(
      idempotencyKey,
      JSON.stringify(result)
    );

    return nexusInvoiceJson_(result);

  } catch (error) {
    console.error(
      'Invoice send failed: ' +
      (error && error.message
        ? error.message
        : String(error))
    );

    return nexusInvoiceJson_({
      success: false,
      error:
        error && error.message
          ? error.message
          : 'Invoice send failed.'
    });
  }
}
