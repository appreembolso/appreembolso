import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Loader, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import ReportToPrint from './ReportToPrint'; 

// Configuração do Worker do PDF
// Tenta usar versão compatível globalmente
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const ReportPrintModal = ({ report, items, onClose, company, appUsers = [], currentUser }) => {
  const componentRef = useRef();
  const [loadingImages, setLoadingImages] = useState(true);
  
  // Estrutura: { itemId: [img1, img2, img3...] }
  const [preloadedImages, setPreloadedImages] = useState({});
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState("");

  const companyColor = company?.color || 'text-indigo-600';
  const borderColorClass = companyColor.replace('text-', 'border-');

  useEffect(() => {
    let isMounted = true;
    
    const loadAssets = async () => {
      setLoadingImages(true);
      const imageMap = {};
      const itemsWithAttachments = items.filter(i => i.attachmentUrl);

      if (itemsWithAttachments.length === 0) {
        setLoadingImages(false);
        return;
      }

      const processItem = async (item) => {
        try {
          const isPdf = item.attachmentUrl.toLowerCase().includes('.pdf');
          
          if (isPdf) {
            if (isMounted) setProgress("Processando PDF...");
            const loadingTask = pdfjsLib.getDocument(item.attachmentUrl);
            const pdf = await loadingTask.promise;
            const pages = [];

            // Loop por todas as páginas do PDF
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const scale = 2.0; // Alta qualidade
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport }).promise;
                pages.push(canvas.toDataURL('image/jpeg', 0.85));
            }
            return { id: item.id, images: pages };

          } else {
            // Imagem normal (JPG, PNG)
            if (isMounted) setProgress("Baixando Imagem...");
            const response = await fetch(item.attachmentUrl, { mode: 'cors' });
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            // Retorna array com 1 item para manter padrão
            return { id: item.id, images: [base64] };
          }
        } catch (err) {
          console.error("Erro no anexo:", item.id, err);
          // Em caso de erro, retorna array vazio para não quebrar a tela
          return { id: item.id, images: [] }; 
        }
      };

      try {
        const results = await Promise.all(itemsWithAttachments.map(processItem));
        if (isMounted) {
          results.forEach(res => {
             if (res.images && res.images.length > 0) {
                 imageMap[res.id] = res.images;
             }
          });
          setPreloadedImages(imageMap);
          setLoadingImages(false);
        }
      } catch (err) {
        console.error("Erro geral loadAssets:", err);
        if (isMounted) setLoadingImages(false);
      }
    };

    loadAssets();
    return () => { isMounted = false; };
  }, [items]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Relatorio_${report.reportId || report.id}`,
    onBeforeGetContent: () => {
        if (loadingImages) return Promise.reject("Aguarde imagens...");
        setIsPrinting(true);
        return Promise.resolve();
    },
    onAfterPrint: () => setIsPrinting(false),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200">
      
      {/* HEADER DARK PREMIUM */}
      <div className={`bg-slate-900 min-h-20 border-b-2 ${borderColorClass} px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-xl shrink-0 z-50`}>
        <div className="flex flex-col mb-4 md:mb-0">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <Printer size={20} className="text-slate-400"/> Visualização de Impressão
          </h2>
          <span className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
            <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">ID: {report.reportId || report.id}</span>
            <span>•</span>
            <span>{items.length} Itens</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 justify-center">
          {loadingImages ? (
            <span className="text-xs text-slate-300 flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 shadow-sm">
              <Loader size={14} className="animate-spin text-indigo-400"/> 
              {progress || 'Processando...'}
            </span>
          ) : (
             <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-800 font-bold tracking-wide shadow-sm">
                <CheckCircle size={14}/> Pronto
             </span>
          )}
          
          <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block"></div>

          <button 
            onClick={handlePrint}
            disabled={loadingImages || isPrinting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg shadow-indigo-900/50 transition-all hover:-translate-y-0.5 flex items-center gap-2 border border-indigo-500"
          >
            {isPrinting ? <Loader size={16} className="animate-spin"/> : <Printer size={16} />}
            {isPrinting ? 'Gerando...' : 'Imprimir / Salvar PDF'}
          </button>

          <button 
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 border border-red-500"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* ÁREA DO PAPEL - FUNDO CINZA CLARO */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-50 scroll-smooth">
        <div className="shadow-2xl h-fit mb-10 transition-transform origin-top scale-95 md:scale-100">
          <ReportToPrint 
            ref={componentRef} 
            report={report} 
            items={items} 
            company={company} 
            appUsers={appUsers}
            preloadedImages={preloadedImages} 
          />
        </div>
      </div>
    </div>
  );
};

export default ReportPrintModal;