
/**
 * SmartInventory Pro - Google Sheets Sync Engine
 * Author: Senior Frontend Engineer
 * Version: 1.0.0
 * 
 * Deskripsi:
 * Kode ini dipasang di Google Apps Script (Extensions > Apps Script di Google Sheets).
 * Berfungsi untuk menerima push data dari webapp dan menyimpannya ke spreadsheet.
 */

/**
 * Health Check Endpoint
 */
function doGet(e) {
  return ContentService.createTextOutput("SmartInventory Sync API is Online and Ready.")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Main Sync Endpoint
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Gunakan lock untuk mencegah race condition saat sinkronisasi simultan
    lock.waitLock(30000); 
    
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let resultMessage = [];

    // 1. Sinkronisasi Data Inventory (Full Snapshot)
    if (payload.items && Array.isArray(payload.items)) {
      syncInventory(ss, payload.items);
      resultMessage.push(payload.items.length + " items synced");
    }
    
    // 2. Sinkronisasi Data Transaksi (Flat History)
    if (payload.transactions && Array.isArray(payload.transactions)) {
      syncTransactions(ss, payload.transactions);
      resultMessage.push(payload.transactions.length + " transactions synced");
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sync Complete: " + resultMessage.join(", "),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper: Sinkronisasi Tab Inventory
 */
function syncInventory(ss, items) {
  let sheet = ss.getSheetByName("Inventory");
  if (!sheet) {
    sheet = ss.insertSheet("Inventory");
  }
  
  // Definisi Header
  const headers = [["ID", "SKU", "Nama Barang", "Kategori", "Stok Saat Ini", "Batas Minimum", "Satuan", "Harga Satuan", "Update Terakhir"]];
  
  // Transformasi data ke baris spreadsheet
  const rows = items.map(item => [
    item.id,
    item.sku,
    item.name,
    item.category,
    item.stock,
    item.minStock,
    item.unit,
    item.price,
    item.lastUpdated
  ]);
  
  // Tulis data ke sheet
  sheet.clear();
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers)
       .setFontWeight("bold")
       .setBackground("#1e293b")
       .setFontColor("#ffffff")
       .setHorizontalAlignment("center");
       
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    // Format kolom harga ke Rupiah
    sheet.getRange(2, 8, rows.length, 1).setNumberFormat("#,##0");
  }
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers[0].length);
}

/**
 * Helper: Sinkronisasi Tab Transaksi
 */
function syncTransactions(ss, transactions) {
  let sheet = ss.getSheetByName("Transactions");
  if (!sheet) {
    sheet = ss.insertSheet("Transactions");
  }
  
  // Definisi Header (Format Flat untuk Database)
  const headers = [["ID TX", "Tipe", "Tanggal", "Ref/Surat Jalan", "Supplier/Tujuan", "Petugas", "Nama Barang", "SKU", "Qty", "Satuan", "Catatan"]];
  
  const rows = [];
  
  // Flattening data: satu baris per item di dalam transaksi
  transactions.forEach(tx => {
    const txItems = Array.isArray(tx.items) ? tx.items : [];
    txItems.forEach(item => {
      rows.push([
        tx.id,
        tx.type,
        tx.date,
        tx.referenceNumber || "-",
        tx.supplier || "-",
        tx.performer || "Admin",
        item.itemName,
        item.sku,
        item.quantity,
        item.unit,
        tx.notes || ""
      ]);
    });
  });
  
  sheet.clear();
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers)
       .setFontWeight("bold")
       .setBackground("#1e293b")
       .setFontColor("#ffffff")
       .setHorizontalAlignment("center");
       
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers[0].length);
}
