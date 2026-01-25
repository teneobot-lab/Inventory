import { GoogleGenAI } from "@google/genai";
import { InventoryItem, Transaction } from "../types";

const apiKey = process.env.API_KEY || '';

// Safely initialize the client only if key exists
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateInventoryInsights = async (
  items: InventoryItem[],
  transactions: Transaction[]
): Promise<string> => {
  if (!ai) {
    return "API Key Gemini tidak ditemukan. Harap konfigurasi API_KEY.";
  }

  const inventorySummary = items.map(i => 
    `- ${i.name} (SKU: ${i.sku}): Stok ${i.stock} ${i.unit} (Min: ${i.minStock})`
  ).join('\n');

  // Flatten for analysis
  const recentTransactions = transactions.slice(-10).flatMap(t => 
    t.items.map(item => 
      `- ${t.date.split('T')[0]}: ${t.type} ${item.quantity} ${item.unit} ${item.itemName} (${t.notes})`
    )
  ).join('\n');

  const prompt = `
    Bertindaklah sebagai Ahli Manajemen Rantai Pasokan dan Inventaris.
    Analisis data inventaris dan riwayat transaksi berikut ini.
    
    Data Inventaris:
    ${inventorySummary}
    
    Transaksi Terakhir:
    ${recentTransactions}
    
    Berikan laporan singkat dalam format Markdown yang mencakup:
    1. **Ringkasan Status**: Kondisi kesehatan stok secara umum.
    2. **Peringatan Stok Rendah**: Item mana yang kritis di bawah batas minimum.
    3. **Analisis Pergerakan**: Barang apa yang bergerak cepat atau lambat berdasarkan transaksi.
    4. **Rekomendasi Tindakan**: Apa yang harus dibeli atau dikurangi promosi.
    
    Gunakan Bahasa Indonesia yang profesional namun mudah dipahami.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Tidak ada respons dari AI.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Gagal menghasilkan analisis AI saat ini.";
  }
};