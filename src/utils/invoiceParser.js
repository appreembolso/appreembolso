import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/**
 * Extrai todo o texto de um arquivo PDF.
 */
const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + ' ';
    }
    return fullText;
  } catch (error) {
    console.error("Erro ao ler PDF:", error);
    return '';
  }
};

/**
 * Analisa os dados da fatura (Invoice) a partir de um arquivo PDF.
 * Suporta: NFC-e, NFS-e e DANFE (NFe).
 */
export const parseInvoiceData = async (file) => {
  // Validação básica de tipo de arquivo
  if (file.type !== 'application/pdf') return null;
  
  const rawText = await extractTextFromPDF(file);
  // Limpeza de espaços excessivos para facilitar regex
  const cleanText = rawText.replace(/\s+/g, ' ').trim();
  
  if (!cleanText) return null;

  // Objeto base de retorno
  const data = {
    date: '',
    value: '',
    valueRaw: '',
    supplierName: '',
    supplierDocument: '',
    receiptNumber: '',
    description: '',
    receiptType: 'NF' // Padrão
  };

  // --- IDENTIFICAÇÃO DO TIPO DE DOCUMENTO ---

  // 1. Identificação de DANFE (NFe)
  const isDanfe = cleanText.includes('DANFE') || 
                  cleanText.includes('Documento Auxiliar da Nota Fiscal Eletrônica') ||
                  cleanText.includes('CHAVE DE ACESSO');

  // 2. Identificação de NFC-e / Cupom
  const isNFCe = !isDanfe && (
                  cleanText.includes('NFC') || 
                  cleanText.includes('Cupom') || 
                  cleanText.includes('Consumidor') || 
                  cleanText.includes('VALOR PAGO'));

  // --- LÓGICA DE EXTRAÇÃO POR TIPO ---

  if (isDanfe) {
    data.receiptType = 'NFe'; // Tipo específico para DANFE

    // 1. Número da Nota (ADICIONADO AGORA)
    // Procura por "N°." ou "Nº" seguido de números e pontos
    const numMatch = cleanText.match(/N[º°\.]+\s*([\d\.]+)/i);
    if (numMatch) {
      // Remove os pontos para pegar o número limpo (ex: 000.084.574 -> 84574)
      data.receiptNumber = numMatch[1].replace(/\./g, '');
    }

    // 2. Valor Total da Nota
    const valorMatch = cleanText.match(/V\.\s*TOTAL\s*DA\s*NOTA\s*R\$\s*([\d\.,]+)|V\.\s*TOTAL\s*DA\s*NOTA\s*([\d\.,]+)/i);
    if (valorMatch) {
      const rawValue = valorMatch[1] || valorMatch[2];
      if (rawValue) {
        const valStr = rawValue.replace(/\./g, '').replace(',', '.');
        data.valueRaw = valStr;
        data.value = (parseFloat(valStr) * 100).toFixed(0);
      }
    }

    // 3. Data de Emissão
    const dateMatch = cleanText.match(/DATA\s*DA\s*EMISS[ÃA]O\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) {
      const [dia, mes, ano] = dateMatch[1].split('/');
      data.date = `${ano}-${mes}-${dia}`;
    }

    // 4. CNPJ do Emitente
    const cnpjMatch = cleanText.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) data.supplierDocument = cnpjMatch[0];

    // 5. Razão Social (Nome do Emitente)
    const nameMatch = cleanText.match(/IDENTIFICA[ÇC][ÃA]O\s*DO\s*EMITENTE\s*(.*?)\s*(Avenida|Rua|Av\.|Rodovia|Praça|\d{2}\.\d{3})/i);
    if (nameMatch) {
      data.supplierName = nameMatch[1].trim().toUpperCase();
    } else {
      // Fallback: Tenta pegar a primeira linha significativa se a regex falhar
      const headerLines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      if (headerLines.length > 0) data.supplierName = headerLines[0].substring(0, 50).toUpperCase(); 
    }

    // 6. Descrição
    data.description = `Compra NFe - ${data.supplierName}`;

  } else if (isNFCe) {
    data.receiptType = 'NFCE';

    // 1. CNPJ
    const cnpjMatch = cleanText.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
    if (cnpjMatch) data.supplierDocument = cnpjMatch[1];

    // 2. Razão Social
    let possibleName = cleanText.split(/CNPJ/i)[0].trim();
    possibleName = possibleName.replace(/DATA\/HORA.*?\d{2}:\d{2}:\d{2}/gi, '');
    possibleName = possibleName.replace(/VALOR PAGO.*?[\d,.]+/gi, '');
    possibleName = possibleName.replace(/[\d,]{4,}/g, '');
    const nameParts = possibleName.split(/\s{2,}/);
    data.supplierName = nameParts[nameParts.length - 1].trim().toUpperCase();

    // 3. Valor Total
    const totalMatch = cleanText.match(/VALOR PAGO R\$:\s*([\d\.,]+)/i) || 
                       cleanText.match(/VALOR A PAGAR R\$:\s*([\d\.,]+)/i) ||
                       cleanText.match(/TOTAL R\$:\s*([\d\.,]+)/i);
    
    if (totalMatch) {
      const valStr = totalMatch[1].replace(/\./g, '').replace(',', '.');
      data.valueRaw = valStr;
      data.value = (parseFloat(valStr) * 100).toFixed(0);
    }

    // 4. Número e Data
    const numMatch = cleanText.match(/(?:Número|Extrato\s+Nº|nº)\s*[:\s]*(\d+)/i);
    if (numMatch) data.receiptNumber = numMatch[1];

    const dateMatch = cleanText.match(/(?:Emissão|Data)\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) {
      const [dia, mes, ano] = dateMatch[1].split('/');
      data.date = `${ano}-${mes}-${dia}`;
    }

    // 5. Descrição
    const itemMatch = cleanText.match(/([A-Z\s]{5,})\s+Qtde\.:/i);
    data.description = itemMatch ? itemMatch[1].trim().substring(0, 70) : `Despesa em ${data.supplierName}`;

  } else {
    // === LÓGICA PARA NFS-e (NOTA DE SERVIÇO) ===
    data.receiptType = 'NFSe'; // Identificador ajustado

    // 1. Número da NFS-e
    const numMatch = cleanText.match(/Número\s+da\s+NFS-e\s+(\d+)/i);
    if (numMatch) data.receiptNumber = numMatch[1];

    // 2. Data de Emissão
    const dateMatch = cleanText.match(/emissão\s+da\s+NFS-e\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) {
      const [dia, mes, ano] = dateMatch[1].split('/');
      data.date = `${ano}-${mes}-${dia}`;
    }

    // 3. CNPJ do Emitente
    const cnpjMatch = cleanText.match(/CNPJ\s*\/\s*CPF\s*\/\s*NIF\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
    if (cnpjMatch) data.supplierDocument = cnpjMatch[1];

    // 4. Razão Social
    const nameMatch = cleanText.match(/Nome\s*\/\s*Nome\s*Empresarial\s+(.*?)\s+E-mail/i);
    if (nameMatch) data.supplierName = nameMatch[1].trim().toUpperCase();

    // 5. Descrição do Serviço
    const descMatch = cleanText.match(/Descrição\s+do\s+Serviço\s+(.*?)\s+Dados\s+bancários/i);
    if (descMatch) {
      const rawDesc = descMatch[1].trim();
      data.description = rawDesc.length > 100 ? rawDesc.substring(0, 97) + "..." : rawDesc;
    }

    // 6. Valor Líquido
    const valueMatch = cleanText.match(/Valor\s+Líquido\s+da\s+NFS-e\s+R\$\s+([\d\.,]+)/i);
    if (valueMatch) {
      const valStr = valueMatch[1].replace(/\./g, '').replace(',', '.');
      data.valueRaw = valStr;
      data.value = (parseFloat(valStr) * 100).toFixed(0);
    }
  }

  return data;
};