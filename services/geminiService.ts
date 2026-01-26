
import { GoogleGenAI } from "@google/genai";
import { InventoryItem, Transaction } from "../types";

// Senior Tip: Always follow Gemini API best practices - create a new instance right before use
export const generateInventoryInsights = async (
  items: InventoryItem[],
  transactions: Transaction[]
): Promise<string> => {
  // Use the API key exclusively from process.env.API_KEY
  if (!process.env.API_KEY) {
    return "AI Assistant tidak tersedia karena API Key tidak ditemukan.";
  }

  // Guidelines: Create a new GoogleGenAI instance right before making an API call to ensure the latest key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const inventorySummary = items.map(i => 
    `- ${i.name} (SKU: ${i.sku}): Stok ${i.stock} ${i.unit} (Min: ${i.minStock})`
  ).join('\n');

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
    // Extracting Text Output from GenerateContentResponse: Access .text property directly (not a method)
    return response.text || "Tidak ada respons dari AI.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Gagal menghasilkan analisis AI saat ini.";
  }
};
