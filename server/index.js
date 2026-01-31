
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

// --- AUTO MIGRATION / INITIALIZATION ---
// Fungsi ini akan dijalankan saat server start untuk memastikan tabel ada
const initDatabase = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log("Checking database schema...");

        // 1. Create Playlists Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS playlists (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                created_at DATETIME
            )
        `);

        // 2. Create Playlist Items Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS playlist_items (
                id VARCHAR(50) PRIMARY KEY,
                playlist_id VARCHAR(50),
                title VARCHAR(255),
                url VARCHAR(255),
                video_id VARCHAR(50),
                created_at DATETIME,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
            )
        `);

        // Ensure other tables exist as well (Safety check)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                username VARCHAR(50) UNIQUE,
                password VARCHAR(255),
                role VARCHAR(20),
                email VARCHAR(100)
            )
        `);

        // Insert Default Admin if not exists
        await connection.query(`
            INSERT IGNORE INTO users (id, name, username, password, role, email) 
            VALUES ('u1', 'Super Admin', 'admin', '22', 'admin', 'admin@inventory.com')
        `);

        console.log("Database schema initialized successfully.");
    } catch (err) {
        console.error("Database Initialization Failed:", err);
    } finally {
        if (connection) connection.release();
    }
};

// --- ROUTES ---

app.get('/', (req, res) => {
    res.json({
        message: "SmartInventory API Server",
        status: "Running",
        config_check: {
            user: dbConfig.user,
            host: dbConfig.host,
            database: dbConfig.database,
            pass_length: dbConfig.password ? dbConfig.password.length : 0
        }
    });
});

app.get('/api/health', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.ping();
        res.json({ 
            status: 'online', 
            database: 'connected', 
            timestamp: new Date() 
        });
    } catch (err) {
        console.error("Database Connection Error:", err.message);
        res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed', 
            code: err.code,
            details: err.message,
            troubleshoot: "Pastikan user '" + dbConfig.user + "' diizinkan akses ke host '" + dbConfig.host + "'."
        });
    } finally {
        if (connection) connection.release();
    }
});

// --- AUTH & USERS ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            res.json({ success: true, user: toCamel(rows[0]) });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        await pool.query('INSERT INTO users (id, name, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?)', [u.id, u.name, u.username, u.password, u.role, u.email]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INVENTORY ---
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO inventory (id, name, sku, category, stock, min_stock, unit, conversions, price, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE name=VALUES(name), sku=VALUES(sku), category=VALUES(category), stock=VALUES(stock), min_stock=VALUES(min_stock), unit=VALUES(unit), conversions=VALUES(conversions), price=VALUES(price), last_updated=VALUES(last_updated)`;
        await pool.query(sql, [item.id, item.name, item.sku, item.category, item.stock, item.minStock, item.unit, JSON.stringify(item.conversions || []), item.price, new Date()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Invalid IDs provided" });
    }
    try {
        await pool.query('DELETE FROM inventory WHERE id IN (?)', [ids]);
        res.json({ success: true, count: ids.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TRANSACTIONS ---
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions ORDER BY date DESC, id DESC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', async (req, res) => {
    const tx = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const sqlTx = `INSERT INTO transactions (id, type, date, reference_number, supplier, notes, photos, items, performer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.query(sqlTx, [tx.id, tx.type, new Date(tx.date), tx.referenceNumber || null, tx.supplier || null, tx.notes || '', JSON.stringify(tx.photos || []), JSON.stringify(tx.items || []), tx.performer || 'Admin']);

        const items = Array.isArray(tx.items) ? tx.items : [];
        for (const item of items) {
            let updateSql = tx.type === 'IN' ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await connection.query(updateSql, [item.quantity, item.itemId]);
        }
        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally { connection.release(); }
});

// UPDATE TRANSACTION ENDPOINT (NEWLY ADDED)
app.put('/api/transactions/:id', async (req, res) => {
    const txId = req.params.id;
    const newTx = req.body;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // 1. Get Old Transaction to Revert Stock
        const [oldRows] = await connection.query('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [txId]);
        if (oldRows.length === 0) throw new Error("Transaction not found");
        
        const oldTx = toCamel(oldRows[0]);
        const oldItems = Array.isArray(oldTx.items) ? oldTx.items : [];

        // 2. Revert Old Stock (Inverse Logic)
        // If Old was IN, we SUBTRACT. If Old was OUT, we ADD.
        for (const item of oldItems) {
            let revertSql = oldTx.type === 'IN' 
                ? 'UPDATE inventory SET stock = stock - ? WHERE id = ?' 
                : 'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            await connection.query(revertSql, [item.quantity, item.itemId]);
        }

        // 3. Update Transaction Details
        const updateSql = `UPDATE transactions SET date=?, reference_number=?, supplier=?, notes=?, photos=?, items=?, performer=? WHERE id=?`;
        await connection.query(updateSql, [
            new Date(newTx.date), 
            newTx.referenceNumber || null, 
            newTx.supplier || null, 
            newTx.notes || '', 
            JSON.stringify(newTx.photos || []), 
            JSON.stringify(newTx.items || []), 
            newTx.performer || 'Admin',
            txId
        ]);

        // 4. Apply New Stock (Normal Logic)
        // If New is IN, we ADD. If New is OUT, we SUBTRACT.
        // Note: We assume transaction type (IN/OUT) cannot be changed during edit for safety, 
        // but if it is allowed, this logic handles it because we use newTx.type
        const newItems = Array.isArray(newTx.items) ? newTx.items : [];
        for (const item of newItems) {
            let applySql = newTx.type === 'IN' 
                ? 'UPDATE inventory SET stock = stock + ? WHERE id = ?' 
                : 'UPDATE inventory SET stock = stock - ? WHERE id = ?';
            await connection.query(applySql, [item.quantity, item.itemId]);
        }

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error("Update Transaction Failed:", err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. Fetch current transaction record to know items and quantities
        const [rows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Transaction not found" });
        
        const tx = toCamel(rows[0]);
        const txItems = Array.isArray(tx.items) ? tx.items : [];
        
        // 2. REVERT LOGIC:
        // If it was 'IN' (Added stock), we subtract.
        // If it was 'OUT' (Removed stock), we add back.
        for (const item of txItems) {
            let revertSql = tx.type === 'IN' ? 
                'UPDATE inventory SET stock = stock - ? WHERE id = ?' : 
                'UPDATE inventory SET stock = stock + ? WHERE id = ?';
            
            await connection.query(revertSql, [item.quantity, item.itemId]);
            console.log(`Reverted item ${item.itemId} by ${item.quantity} (${tx.type === 'IN' ? '-' : '+'})`);
        }
        
        // 3. Delete the transaction record
        await connection.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        
        await connection.commit();
        res.json({ success: true, message: "Transaction deleted and inventory balance reverted successfully." });
    } catch (err) {
        await connection.rollback();
        console.error("Failed to delete transaction:", err);
        res.status(500).json({ error: err.message });
    } finally { connection.release(); }
});

// --- REJECT MODULE ---
app.get('/api/reject/master', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_master ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reject/master', async (req, res) => {
    const item = req.body;
    try {
        const sql = `INSERT INTO reject_master (id, name, sku, category, base_unit, conversions) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [item.id, item.name, item.sku, item.category, item.baseUnit, JSON.stringify(item.conversions || [])]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reject/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reject_transactions ORDER BY date DESC, id DESC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reject/transactions', async (req, res) => {
    const tx = req.body;
    try {
        const sql = `INSERT INTO reject_transactions (id, date, items, created_at) VALUES (?, ?, ?, ?)`;
        await pool.query(sql, [tx.id, new Date(tx.date), JSON.stringify(tx.items || []), new Date()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PLAYLIST / MEDIA PLAYER ---
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlists ORDER BY created_at ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/playlists', async (req, res) => {
    const { id, name } = req.body;
    try {
        await pool.query('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)', [id, name, new Date()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/playlists/:id/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY created_at ASC', [req.params.id]);
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/playlists/:id/items', async (req, res) => {
    const { id, title, url, videoId } = req.body;
    try {
        await pool.query('INSERT INTO playlist_items (id, playlist_id, title, url, video_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', 
            [id, req.params.id, title, url, videoId, new Date()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/playlists/items/:itemId', async (req, res) => {
    try {
        await pool.query('DELETE FROM playlist_items WHERE id = ?', [req.params.itemId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- REPORT GENERATION (SERVER SIDE) ---
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
            const reportData = [];
            transactions.forEach(t => {
                const tDate = t.date.split('T')[0];
                if (tDate < startDate || tDate > endDate) return;
                if (filterType !== 'ALL' && t.type !== filterType) return;

                t.items.forEach(item => {
                    if (selectedItemId !== 'ALL' && item.itemId !== selectedItemId) return;

                    // STRICT STRING CONVERSION TO PREVENT PDFKIT CRASHES
                    reportData.push({
                        date: fmtDate(t.date),
                        id: String(t.id || ''),
                        type: String(t.type || ''),
                        ref: t.type === 'IN' ? String(t.supplier || '-') : String(t.referenceNumber || '-'),
                        item: String(item.itemName || 'Unknown'),
                        qty: `${item.quantity || 0} ${item.unit || ''}`,
                        notes: String(t.notes || '')
                    });
                });
            });

            const table = {
                title: "",
                subtitle: "",
                headers: [
                    { label: "Tanggal", property: 'date', width: 70 },
                    { label: "ID TX", property: 'id', width: 80 },
                    { label: "Tipe", property: 'type', width: 40 },
                    { label: "Ref / Supplier", property: 'ref', width: 90 },
                    { label: "Nama Barang", property: 'item', width: 110 },
                    { label: "Qty", property: 'qty', width: 60, align: 'right' },
                    { label: "Ket", property: 'notes', width: 80 }
                ],
                datas: reportData // Already objects, no mapping needed here if pushed correctly
            };

            if (reportData.length === 0) {
                doc.fontSize(12).fillColor('#64748b').text("Tidak ada transaksi pada periode ini.", { align: 'center' });
            } else {
                await doc.table(table, {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor("#1e293b"),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font("Helvetica").fontSize(8).fillColor("#334155");
                        if (indexRow % 2 === 0) doc.addBackground(rectRow, '#f1f5f9', 0.5);
                    },
                });
            }

        } else {
            // --- LOGIC: MONTHLY BALANCE (ACCOUNTING STYLE) ---
            const periodStart = new Date(startDate);
            const periodEnd = new Date(endDate);
            
            const balanceRows = items.map(item => {
                let inAfterStart = 0;
                let outAfterStart = 0;
                
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
            }).filter(Boolean);

            // FIX: Use Property based mapping for Monthly Report to ensure visibility
            const table = {
                headers: [
                    { label: "SKU", property: 'sku', width: 60 },
                    { label: "Nama Barang", property: 'name', width: 140 },
                    { label: "Satuan", property: 'unit', width: 40 },
                    { label: "Saldo Awal", property: 'opening', width: 70, align: 'right' },
                    { label: "Masuk (+)", property: 'in', width: 70, align: 'right' },
                    { label: "Keluar (-)", property: 'out', width: 70, align: 'right' },
                    { label: "Saldo Akhir", property: 'closing', width: 80, align: 'right', headerColor: '#e2e8f0' }
                ],
                datas: balanceRows.map(r => ({
                    sku: String(r.sku || '-'),
                    name: String(r.name || 'Unknown'),
                    unit: String(r.unit || ''),
                    opening: fmtNum(r.opening),
                    in: fmtNum(r.in),
                    out: fmtNum(r.out),
                    closing: fmtNum(r.closing)
                }))
            };

            if (balanceRows.length === 0) {
                 doc.fontSize(12).fillColor('#64748b').text("Tidak ada data inventaris ditemukan.", { align: 'center' });
            } else {
                await doc.table(table, {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor("#1e293b"),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font("Helvetica").fontSize(8).fillColor("#334155");
                        if (indexRow % 2 === 0) doc.addBackground(rectRow, '#f1f5f9', 0.5);
                    },
                });
            }
        }

        // --- FOOTER ---
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.moveTo(30, doc.page.height - 50).lineTo(doc.page.width - 30, doc.page.height - 50).strokeColor('#e2e8f0').stroke();
            doc.fontSize(8).fillColor('#94a3b8').text(
                `Generated by SmartInventory System on ${new Date().toLocaleString('id-ID')}`, 
                30, doc.page.height - 40
            );
            doc.text(
                `Page ${i + 1} of ${pageCount}`, 
                doc.page.width - 100, doc.page.height - 40, { align: 'right' }
            );
        }
        doc.end();

    } catch (err) {
        console.error("PDF Generation Error:", err);
        // Do not send JSON if headers already sent via pipe, but try to log
        if (!res.headersSent) {
             res.status(500).json({ error: "Gagal membuat PDF. " + err.message });
        }
    }
});


// --- SYSTEM RESET ---
app.post('/api/system/reset', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Truncate tables
        await connection.query('TRUNCATE TABLE transactions');
        await connection.query('TRUNCATE TABLE inventory');
        await connection.query('TRUNCATE TABLE reject_transactions');
        await connection.query('TRUNCATE TABLE reject_master');
        
        // Reset users but keep default admin
        await connection.query('DELETE FROM users');
        await connection.query("INSERT INTO users (id, name, username, password, role, email) VALUES ('u1', 'Super Admin', 'admin', '22', 'admin', 'admin@inventory.com')");
        
        await connection.commit();
        res.json({ success: true, message: "Database has been reset to factory settings." });
    } catch (err) {
        await connection.rollback();
        console.error("System Reset Failed:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

// Initialize DB then Start Server
initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`SmartInventory Backend listening on 0.0.0.0:${PORT}`);
    });
});
