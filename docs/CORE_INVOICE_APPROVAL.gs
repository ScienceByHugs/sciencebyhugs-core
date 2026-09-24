/**
 * SCIENCE BY HUGs — CORE INVOICE APPROVAL + PDF
 *
 * Add this file to the SAME Apps Script project as:
 * - SUPABASE.gs
 * - NEXUS_INVOICE_BRIDGE.gs
 * - INVOICE_HELPERS.gs
 *
 * This endpoint is called by the secure Supabase approve-invoice Edge Function.
 * It generates an approved invoice PDF, saves it to the company Invoice PDF
 * folder, writes the PDF URL to Invoice Log, and completes the queue entry.
 */

const INVOICE_PDF_FOLDER_ID =
  '1KJMqwFO_wJGC5j3-3Z0smzJ8tg9CLk8x';


function handleApproveNexusInvoice_(e) {
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
        error: 'Unauthorized approval bridge request.'
      });
    }

    const invoiceNumber =
      String(payload.invoiceNumber || '').trim();

    const invoiceSheetName =
      String(payload.invoiceSheet || '').trim();

    if (!invoiceNumber || !invoiceSheetName) {
      return nexusInvoiceJson_({
        success: false,
        error: 'Invoice number and invoice sheet are required.'
      });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      const props = PropertiesService.getScriptProperties();
      const idempotencyKey = 'NEXUS_PDF_' + invoiceNumber;
      const previous = props.getProperty(idempotencyKey);

      if (previous) {
        try {
          const parsed = JSON.parse(previous);
          if (parsed && parsed.pdfFileId) {
            try {
              DriveApp.getFileById(parsed.pdfFileId);
              return nexusInvoiceJson_(parsed);
            } catch (ignore) {}
          }
        } catch (ignore) {}
      }

      const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);

      const invoiceSheet =
        ss.getSheetByName(invoiceSheetName);

      if (!invoiceSheet) {
        throw new Error('Invoice sheet not found.');
      }

      const queueSheet =
        ss.getSheetByName(CONFIG.processingSheet);

      if (!queueSheet) {
        throw new Error('Invoice Queue sheet not found.');
      }

      const queueLastRow = queueSheet.getLastRow();
      let queueRow = 0;
      let queueStatus = '';

      if (queueLastRow >= 2) {
        const queueValues =
          queueSheet
            .getRange(2, 1, queueLastRow - 1, 4)
            .getDisplayValues();

        for (let i = queueValues.length - 1; i >= 0; i--) {
          if (
            String(queueValues[i][0] || '').trim() === invoiceNumber &&
            String(queueValues[i][1] || '').trim() === invoiceSheetName
          ) {
            queueRow = i + 2;
            queueStatus =
              String(queueValues[i][3] || '').trim();
            break;
          }
        }
      }

      if (!queueRow) {
        throw new Error('Invoice queue entry not found.');
      }

      if (
        queueStatus !== 'Awaiting Approval' &&
        queueStatus !== 'Processing PDF' &&
        queueStatus !== 'Completed'
      ) {
        throw new Error(
          'Invoice is not awaiting approval. Current status: ' +
          queueStatus
        );
      }

      if (queueStatus === 'Completed') {
        throw new Error(
          'Invoice queue is already completed but no valid PDF record was found.'
        );
      }

      queueSheet
        .getRange(queueRow, 4)
        .setValue('Processing PDF');

      SpreadsheetApp.flush();

      const customerName =
        String(
          invoiceSheet
            .getRange('B2')
            .getDisplayValue() || ''
        ).trim();

      const pdfName =
        invoiceNumber +
        ' - ' +
        (customerName || 'Invoice') +
        '.pdf';

      const exportUrl =
        'https://docs.google.com/spreadsheets/d/' +
        encodeURIComponent(ss.getId()) +
        '/export' +
        '?format=pdf' +
        '&gid=' +
        encodeURIComponent(invoiceSheet.getSheetId()) +
        '&size=letter' +
        '&portrait=true' +
        '&fitw=true' +
        '&sheetnames=false' +
        '&printtitle=false' +
        '&pagenumbers=false' +
        '&gridlines=false' +
        '&fzr=false';

      const response =
        UrlFetchApp.fetch(
          exportUrl,
          {
            headers: {
              Authorization:
                'Bearer ' +
                ScriptApp.getOAuthToken()
            },
            muteHttpExceptions: true
          }
        );

      const responseCode =
        response.getResponseCode();

      if (
        responseCode < 200 ||
        responseCode >= 300
      ) {
        throw new Error(
          'PDF export failed with HTTP ' +
          responseCode
        );
      }

      const folder =
        DriveApp.getFolderById(
          INVOICE_PDF_FOLDER_ID
        );

      const pdfBlob =
        response
          .getBlob()
          .setName(pdfName);

      const pdfFile =
        folder.createFile(pdfBlob);

      const pdfUrl =
        pdfFile.getUrl();

      writeInvoicePdfToLog_(
        ss,
        invoiceNumber,
        pdfUrl
      );

      queueSheet
        .getRange(queueRow, 4)
        .setValue('Completed');

      SpreadsheetApp.flush();

      const result = {
        success: true,
        invoiceNumber: invoiceNumber,
        invoiceSheet: invoiceSheetName,
        pdfFileId: pdfFile.getId(),
        pdfUrl: pdfUrl,
        pdfName: pdfName,
        status: 'Completed'
      };

      props.setProperty(
        idempotencyKey,
        JSON.stringify(result)
      );

      return nexusInvoiceJson_(result);

    } catch (error) {
      try {
        const ss =
          SpreadsheetApp.openById(
            CONFIG.spreadsheetId
          );

        const queueSheet =
          ss.getSheetByName(
            CONFIG.processingSheet
          );

        if (queueSheet) {
          const lastRow =
            queueSheet.getLastRow();

          if (lastRow >= 2) {
            const rows =
              queueSheet
                .getRange(
                  2,
                  1,
                  lastRow - 1,
                  4
                )
                .getDisplayValues();

            for (
              let i = rows.length - 1;
              i >= 0;
              i--
            ) {
              if (
                String(rows[i][0] || '').trim() ===
                String(payload.invoiceNumber || '').trim()
              ) {
                queueSheet
                  .getRange(i + 2, 4)
                  .setValue('Awaiting Approval');
                break;
              }
            }
          }
        }
      } catch (ignore) {}

      throw error;

    } finally {
      lock.releaseLock();
    }

  } catch (error) {
    console.error(
      'Nexus invoice approval failed: ' +
      (error && error.message
        ? error.message
        : String(error))
    );

    return nexusInvoiceJson_({
      success: false,
      error:
        error && error.message
          ? error.message
          : 'Invoice approval failed.'
    });
  }
}


function writeInvoicePdfToLog_(
  ss,
  invoiceNumber,
  pdfUrl
) {
  const logSheet =
    ss.getSheetByName(
      CONFIG.invoiceLogSheet
    );

  if (!logSheet) {
    throw new Error(
      'Invoice Log sheet not found.'
    );
  }

  const lastRow =
    logSheet.getLastRow();

  if (lastRow < 2) {
    throw new Error(
      'Invoice Log contains no invoice rows.'
    );
  }

  const invoiceNumbers =
    logSheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getDisplayValues();

  let targetRow = 0;

  for (
    let i = invoiceNumbers.length - 1;
    i >= 0;
    i--
  ) {
    if (
      String(invoiceNumbers[i][0] || '').trim() ===
      invoiceNumber
    ) {
      targetRow = i + 2;
      break;
    }
  }

  if (!targetRow) {
    throw new Error(
      'Invoice Log entry not found.'
    );
  }

  /*
   * Invoice Log:
   * K = Invoice PDF
   */
  logSheet
    .getRange(targetRow, 11)
    .setValue(pdfUrl);
}
