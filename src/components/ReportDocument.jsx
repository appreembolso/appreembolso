import React from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';

const ReportDocument = ({ isOpen, onClose, report, company, settings }) => {
  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  // --- LÓGICA INTELIGENTE DE EXIBIÇÃO (PDF vs IMAGEM) ---
  const getProofUrl = (proof) => {
    if (!proof) return null;
    if (typeof proof === 'string') return proof; // URL do Firebase/Banco
    if (proof instanceof File) return URL.createObjectURL(proof); // Upload Local
    return null;
  };

  const isPdf = (proof) => {
    if (!proof) return false;
    if (proof instanceof File) return proof.type === 'application/pdf';
    if (typeof proof === 'string') return proof.toLowerCase().endsWith('.pdf');
    return false;
  };

  const renderProof = (proof, idx) => {
    const src = getProofUrl(proof);
    if (!src) return null;

    if (isPdf(proof)) {
        // Se for PDF, usamos <embed> ou <iframe>
        return (
            <div className="w-full h-[500px] bg-slate-100 border border-slate-300 flex flex-col">
                <embed src={src} type="application/pdf" className="w-full h-full" />
                <div className="bg-slate-200 p-2 text-center text-xs print:hidden">
                    <a href={src} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">
                        Abrir PDF em nova aba (Melhor para impressão)
                    </a>
                </div>
            </div>
        );
    }

    // Se for Imagem
    return (
        <img 
            src={src} 
            alt={`Comprovante ${idx + 1}`} 
            className="max-w-full max-h-[600px] object-contain mx-auto"
        />
    );
  };

  return (
    // Fundo (Overlay)
    <div className="fixed inset-0 bg-slate-900/90 z-50 overflow-y-auto print:bg-white print:p-0">
      
      {/* Container Principal */}
      <div className="min-h-screen flex flex-col items-center print:block print:w-full">
        
        {/* BARRA DE AÇÕES (FIXA NO TOPO - Não imprime) */}
        <div className="w-full bg-slate-800 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md print:hidden">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <FileText size={20} className="text-indigo-400"/> 
            Visualizar Relatório
          </h2>
          <div className="flex gap-3">
            <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
            >
              <Printer size={18} /> IMPRIMIR / PDF
            </button>
            <button 
                onClick={onClose} 
                className="bg-slate-700 hover:bg-slate-600 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* --- A FOLHA A4 (O DOCUMENTO) --- */}
        <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[10mm] my-8 shadow-2xl print:shadow-none print:m-0 print:w-full print:max-w-none box-border text-slate-800">
          
          {/* 1. CABEÇALHO */}
          <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
            <div>
               <h1 className="text-xl font-black uppercase tracking-wide text-slate-900 mb-2">Relatório de Reembolso</h1>
               <div className="flex items-center gap-3">
                  {/* Logo com fallback */}
                  {company?.logo ? (
                      <img src={company.logo} alt="Logo" className="h-12 w-auto object-contain" />
                  ) : (
                      <div className="h-12 w-32 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 border border-dashed border-slate-300">SEM LOGO</div>
                  )}
                  <span className="font-bold text-lg text-slate-700">{company?.name || 'Empresa'}</span>
               </div>
            </div>
            <div className="text-right">
                <div className="bg-indigo-50 px-4 py-2 rounded border border-indigo-100 print:bg-white print:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase">Relatório Nº</p>
                    <p className="text-xl font-black text-indigo-600 print:text-black">{report.id}</p>
                </div>
                <div className="mt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Data Fechamento</p>
                    <p className="text-sm font-bold">{report.date.split('-').reverse().join('/')}</p>
                </div>
            </div>
          </div>

          {/* 2. INFORMAÇÕES GERAIS */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8 grid grid-cols-2 gap-8 print:bg-white print:border-slate-300">
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Solicitante</p>
                <p className="font-bold text-slate-800">{report.user}</p>
             </div>
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Centro de Custo</p>
                <p className="font-bold text-slate-800">{report.costCenter}</p>
             </div>
          </div>

          {/* 3. TABELA DE DESPESAS */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-200 pb-1">Despesas a Reembolsar</h3>
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-100 text-slate-600 print:bg-slate-200 print:text-black">
                        <th className="py-2 px-2 text-left font-bold text-xs uppercase">Data</th>
                        <th className="py-2 px-2 text-left font-bold text-xs uppercase">Categoria</th>
                        <th className="py-2 px-2 text-left font-bold text-xs uppercase">Descrição</th>
                        <th className="py-2 px-2 text-right font-bold text-xs uppercase">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {report.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="py-3 px-2 text-slate-600">{item.date.split('-').reverse().join('/')}</td>
                            <td className="py-3 px-2 text-slate-600">{item.category}</td>
                            <td className="py-3 px-2 font-medium text-slate-800">
                                {item.description}
                                <div className="text-[10px] text-slate-400">
                                    {item.docType}: {item.docNumber || 'N/D'}
                                </div>
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-slate-800">
                                {settings.currency} {Number(item.amount).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-slate-800">
                        <td colSpan="3" className="py-4 text-right font-bold text-slate-600 uppercase text-xs">Total Geral a Pagar</td>
                        <td className="py-4 px-2 text-right font-black text-xl text-slate-900">
                             {settings.currency} {Number(report.total).toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            </table>
          </div>

          {/* 4. ASSINATURAS */}
          <div className="mt-16 grid grid-cols-2 gap-12 break-inside-avoid">
            <div className="border-t border-slate-300 pt-2 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase">Assinatura Colaborador</p>
                <p className="h-8"></p>
            </div>
            <div className="border-t border-slate-300 pt-2 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase">Aprovação Financeiro</p>
                <p className="h-8"></p>
            </div>
          </div>

          {/* --- ÁREA DE ANEXOS --- */}
          <div className="print:break-before-page mt-12 pt-12 border-t-4 border-dashed border-slate-200">
             <h3 className="text-lg font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                 <span className="text-slate-300">📎</span> Anexos Comprobatórios
             </h3>

             <div className="space-y-12">
                 {report.items.map((item, idx) => (
                     // 'break-inside-avoid' impede que o comprovante seja cortado ao meio na impressão
                     <div key={idx} className="break-inside-avoid border border-slate-200 rounded-lg overflow-hidden mb-8">
                         
                         {/* Cabeçalho do Anexo */}
                         <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center print:bg-slate-100">
                             <div>
                                 <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded mr-2 print:text-black print:border print:border-black print:bg-white">ITEM #{idx + 1}</span>
                                 <span className="font-bold text-slate-700 text-sm">{item.category}</span>
                             </div>
                             <div className="text-right">
                                 <span className="font-bold text-slate-800">{settings.currency} {Number(item.amount).toFixed(2)}</span>
                             </div>
                         </div>
                         
                         {/* O Comprovante em si */}
                         <div className="p-4 bg-white flex justify-center min-h-[200px]">
                            {item.proof ? (
                                renderProof(item.proof, idx)
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-300 py-12">
                                    <span className="text-4xl mb-2">🚫</span>
                                    <span className="text-sm font-bold uppercase">Sem Comprovante Anexado</span>
                                </div>
                            )}
                         </div>

                         {/* Rodapé do Anexo */}
                         <div className="bg-slate-50 p-2 border-t border-slate-200 text-xs text-slate-500 font-medium">
                            Descrição: {item.description}
                         </div>
                     </div>
                 ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportDocument;