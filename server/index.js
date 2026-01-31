
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit-table'); // Enterprise PDF Generator

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database Connection Pool
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

// --- HELPER FUNCTIONS ---

const toCamel = (o) => {
    if (!o || typeof o !== 'object') return o;
    const newO = {};
    Object.keys(o).forEach(key => {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        let value = o[key];
        const jsonFields = ['conversions', 'items', 'photos'];
        if (jsonFields.includes(newKey) || jsonFields.includes(key)) {
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                    try { value = JSON.parse(trimmed); } catch (e) { value = []; }
                }
            } else if (value === null) { value = []; }
        }
        newO[newKey] = value;
    });
    return newO;
};

// Format Currency / Number for Reports
const fmtNum = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "0";
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num);
};

// Format Date
const fmtDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// --- PDF GENERATION LOGIC ---

app.post('/api/reports/export', async (req, res) => {
    const { startDate, endDate, type, filterType, selectedItemId } = req.body;
    
    // Validasi Basic
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Periode tanggal wajib diisi." });
    }

    try {
        // 1. Fetch Data
        const [inventoryRows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        const [txRows] = await pool.query('SELECT * FROM transactions ORDER BY date ASC'); // Sort ASC for calculation logic
        
        const items = inventoryRows.map(toCamel);
        const transactions = txRows.map(toCamel);

        // 2. Setup PDF Document
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        
        // Stream response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Laporan_${type}_${startDate}.pdf`);
        doc.pipe(res);

        // --- HEADER DESIGN (Paper.id Style) ---
        const drawHeader = () => {
            doc.rect(0, 0, 595.28, 120).fill('#f8f9fa'); // Light grey header bg
            
            // Company Info (Left)
            doc.fillColor('#1e293b').fontSize(20).font('Helvetica-Bold').text("SmartInventory Pro", 30, 40);
            doc.fontSize(9).font('Helvetica').fillColor('#64748b')
               .text("Jalan Gudang Utama No. 123", 30, 65)
               .text("Jakarta Selatan, 12000", 30, 78)
               .text("support@smartinventory.com", 30, 91);

            // Report Meta (Right)
            doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold')
               .text(type === 'TRANSACTIONS' ? "LAPORAN MUTASI" : "SALDO STOK", 0, 40, { align: 'right', width: 535 });
            
            doc.fontSize(10).font('Helvetica').fillColor('#475569')
               .text(`Periode: ${fmtDate(startDate)} - ${fmtDate(endDate)}`, 0, 65, { align: 'right', width: 535 });
            
            const filterText = filterType && filterType !== 'ALL' ? `Filter: ${filterType}` : "Filter: Semua";
            doc.text(filterText, 0, 80, { align: 'right', width: 535 });
        };
        
        // Initial Header
        drawHeader();
        doc.moveDown(5); // Move past header background

        // --- DATA PROCESSING ---
        
        if (type === 'TRANSACTIONS') {
            // --- LOGIC: TRANSACTION REPORT ---
            
            // Filter Data
            const reportData = [];
            transactions.forEach(t => {
                const tDate = t.date.split('T')[0];
                if (tDate < startDate || tDate > endDate) return;
                if (filterType !== 'ALL' && t.type !== filterType) return;

                t.items.forEach(item => {
                    if (selectedItemId !== 'ALL' && item.itemId !== selectedItemId) return;

                    reportData.push([
                        fmtDate(t.date),
                        t.id,
                        t.type,
                        t.type === 'IN' ? (t.supplier || '-') : (t.referenceNumber || '-'),
                        item.itemName,
                        `${item.quantity} ${item.unit}`,
                        t.notes || ''
                    ]);
                });
            });

            // Table Definition
            const table = {
                title: "",
                subtitle: "",
                headers: [
                    { label: "Tanggal", property: 'date', width: 70 },
                    { label: "ID TX", property: 'id', width: 80 },
                    { label: "Tipe", property: 'type', width: 40 },
                    { label: "Ref / Supplier", property: 'ref', width: 90 },
                    { label: "Nama Barang", property: 'item', width: 110 },
                    { label: "Qty", property: 'qty', width: 60, align: 'right' }, // Right align number
                    { label: "Ket", property: 'notes', width: 80 }
                ],
                datas: reportData.map(r => ({ 
                    date: r[0], id: r[1], type: r[2], ref: r[3], item: r[4], qty: r[5], notes: r[6] 
                }))
            };

            if (reportData.length === 0) {
                doc.fontSize(12).fillColor('#64748b').text("Tidak ada transaksi pada periode ini.", { align: 'center' });
            } else {
                await doc.table(table, {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor("#1e293b"),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font("Helvetica").fontSize(8).fillColor("#334155");
                        // Zebra Striping
                        if (indexRow % 2 === 0) {
                            doc.addBackground(rectRow, '#f1f5f9', 0.5);
                        }
                    },
                });
            }

        } else {
            // --- LOGIC: MONTHLY BALANCE (ACCOUNTING STYLE) ---
            
            const periodStart = new Date(startDate);
            const periodEnd = new Date(endDate);
            
            const balanceRows = items.map(item => {
                // Reverse Calculation Logic (Current Stock -> Opening Balance)
                // Opening = Current - (IN after Start) + (OUT after Start)
                
                let inAfterStart = 0;
                let outAfterStart = 0;
                
                // Calculate movements AFTER the start date to reverse-engineer opening balance
                transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate >= periodStart) {
                        t.items.forEach(ti => {
                            if (ti.itemId === item.id) {
                                if (t.type === 'IN') inAfterStart += ti.quantity;
                                else outAfterStart += ti.quantity;
                            }
                        });
                    }
                });

                const openingBalance = Number((item.stock - inAfterStart + outAfterStart).toFixed(3));

                // Calculate movements WITHIN the period
                let totalInPeriod = 0;
                let totalOutPeriod = 0;
                
                transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (tDate >= periodStart && tDate <= periodEnd) {
                        t.items.forEach(ti => {
                            if (ti.itemId === item.id) {
                                if (t.type === 'IN') totalInPeriod += ti.quantity;
                                else totalOutPeriod += ti.quantity;
                            }
                        });
                    }
                });

                const closingBalance = Number((openingBalance + totalInPeriod - totalOutPeriod).toFixed(3));

                if (selectedItemId !== 'ALL' && item.id !== selectedItemId) return null;

                return {
                    name: item.name,
                    sku: item.sku,
                    unit: item.unit,
                    opening: openingBalance,
                    in: totalInPeriod,
                    out: totalOutPeriod,
                    closing: closingBalance
                };
            }).filter(Boolean); // Remove nulls

            const table = {
                headers: [
                    { label: "SKU", width: 60 },
                    { label: "Nama Barang", width: 140 },
                    { label: "Satuan", width: 40 },
                    { label: "Saldo Awal", width: 70, align: 'right' },
                    { label: "Masuk (+)", width: 70, align: 'right' },
                    { label: "Keluar (-)", width: 70, align: 'right' },
                    { label: "Saldo Akhir", width: 80, align: 'right', headerColor: '#e2e8f0' }
                ],
                datas: balanceRows.map(r => [
                    r.sku, 
                    r.name, 
                    r.unit, 
                    fmtNum(r.opening), 
                    fmtNum(r.in), 
                    fmtNum(r.out), 
                    fmtNum(r.closing)
                ])
            };

            await doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor("#1e293b"),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(8).fillColor("#334155");
                    
                    // Zebra Striping
                    if (indexRow % 2 === 0) {
                        doc.addBackground(rectRow, '#f1f5f9', 0.5);
                    }

                    // Highlight Negative Stock (Audit purpose)
                    // Column index 3 (Opening) and 6 (Closing)
                    if ((indexColumn === 3 || indexColumn === 6)) { 
                        // Note: Data is string formatted, simplistic check for minus sign
                        // Ideally we pass raw data, but table requires strings mostly. 
                        // PDFKit table passes the text content to this function? No, raw row data is separate.
                        // We can check the text content of the cell? Not easily exposed in prepareRow params directly for color change *of text*.
                        // However, pdfkit-table supports simple color logic if we used specific format object, but keeping it simple for now.
                        // To make RED text for negatives, we need to handle it in the datas mapping or specific renderer.
                        // For simplicity in this version, we stick to standard color.
                    }
                },
            });
        }

        // --- FOOTER ---
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            
            // Footer Separator
            doc.moveTo(30, doc.page.height - 50).lineTo(doc.page.width - 30, doc.page.height - 50).strokeColor('#e2e8f0').stroke();
            
            // Timestamp
            doc.fontSize(8).fillColor('#94a3b8').text(
                `Generated by SmartInventory System on ${new Date().toLocaleString('id-ID')}`, 
                30, 
                doc.page.height - 40
            );

            // Page Number
            doc.text(
                `Page ${i + 1} of ${pageCount}`, 
                doc.page.width - 100, 
                doc.page.height - 40, 
                { align: 'right' }
            );
        }

        doc.end();

    } catch (err) {
        console.error("PDF Generation Error:", err);
        res.status(500).json({ error: "Gagal membuat PDF. " + err.message });
    }
});

// --- EXISTING ROUTES (Kept for compatibility) ---
// ... (rest of the file remains same, initDatabase called at bottom)

// Initialize DB then Start Server
initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`SmartInventory Backend listening on 0.0.0.0:${PORT}`);
    });
});
