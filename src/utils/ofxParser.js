// src/utils/ofxParser.js

export const parseOFX = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      if (!text) return reject("Arquivo vazio");

      // Regex simples para extrair transações (STMTTRN)
      // Nota: Para produção pesada, recomenda-se bibliotecas como 'ofx-js', 
      // mas isso aqui resolve 99% dos casos sem instalar nada extra.
      const transactions = [];
      const transBlockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
      
      let match;
      while ((match = transBlockRegex.exec(text)) !== null) {
        const block = match[1];
        
        const type = (/<TRNTYPE>(.*)/.exec(block) || [])[1]?.trim();
        const dateRaw = (/<DTPOSTED>(.*)/.exec(block) || [])[1]?.trim();
        const amount = (/<TRNAMT>(.*)/.exec(block) || [])[1]?.trim();
        const fitid = (/<FITID>(.*)/.exec(block) || [])[1]?.trim();
        const memo = (/<MEMO>(.*)/.exec(block) || [])[1]?.trim();
        
        // Formata data (OFX geralmente é YYYYMMDD...)
        let dateObj = new Date();
        if (dateRaw && dateRaw.length >= 8) {
            const y = dateRaw.substring(0,4);
            const m = dateRaw.substring(4,6);
            const d = dateRaw.substring(6,8);
            dateObj = new Date(`${y}-${m}-${d}T12:00:00`);
        }

        if (fitid && amount) {
            transactions.push({
                fitid, // A CHAVE PARA NÃO DUPLICAR
                type,
                date: dateObj,
                amount: parseFloat(amount.replace(',', '.')),
                description: memo || 'Sem descrição',
                linkedExpenseId: null // Campo para vincular ao sistema
            });
        }
      }
      resolve(transactions);
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};