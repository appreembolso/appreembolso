// src/utils/csvParser.js

export const parseCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      if (!text) return reject("Arquivo vazio");

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) return resolve([]);

      // Tenta identificar o delimitador (vírgula ou ponto e vírgula)
      const header = lines[0];
      const delimiter = header.includes(';') ? ';' : ',';
      const headers = header.split(delimiter).map(h => h.trim().toLowerCase());

      // Mapeamento de colunas comuns
      const dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
      const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('hist') || h.includes('memo') || h.includes('estabelecimento'));
      const amountIdx = headers.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('quant'));
      const idIdx = headers.findIndex(h => h.includes('id') || h.includes('fitid') || h.includes('ref'));

      const transactions = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (columns.length < 2) continue;

        const rawDate = columns[dateIdx] || '';
        const description = columns[descIdx] || 'Sem descrição';
        const rawAmount = columns[amountIdx] || '0';
        const fitid = columns[idIdx] || `csv-${Date.now()}-${i}`;

        // Tenta converter data (formatos comuns: DD/MM/YYYY ou YYYY-MM-DD)
        let dateObj = new Date();
        if (rawDate) {
            if (rawDate.includes('/')) {
                const parts = rawDate.split('/');
                if (parts.length === 3) {
                    const d = parts[0].padStart(2, '0');
                    const m = parts[1].padStart(2, '0');
                    const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                    dateObj = new Date(`${y}-${m}-${d}T12:00:00`);
                }
            } else if (rawDate.includes('-')) {
                dateObj = new Date(rawDate + 'T12:00:00');
            }
        }

        // Limpa o valor (remove R$, pontos de milhar, troca vírgula por ponto)
        const cleanAmount = parseFloat(rawAmount.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));

        if (!isNaN(cleanAmount)) {
            transactions.push({
                fitid,
                type: cleanAmount > 0 ? 'CREDIT' : 'DEBIT',
                date: dateObj,
                amount: cleanAmount,
                description: description,
                linkedExpenseId: null,
                sourceType: 'cartão' // Identificador de origem
            });
        }
      }
      resolve(transactions);
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};
