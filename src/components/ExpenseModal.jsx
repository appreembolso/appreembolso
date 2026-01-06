import React, { useState } from 'react';
import { X, RefreshCw, Plus, FileText, ImageIcon, Upload, Check, Loader, Sparkles } from 'lucide-react';
import { formatCents, formatToBRL } from '../utils/helpers'; 
import { parseInvoiceData } from '../utils/invoiceParser'; // IMPORTAR O PARSER

const ExpenseModal = ({ onSubmit, expenseToEdit, onClose, costCentersList, categoriesList, isSubstituteMode, currentCompany }) => {
  
  const formatDateForInput = (dateInput) => {
    if (!dateInput) return new Date().toISOString().split('T')[0];
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset*60*1000));
    return localDate.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    costCenter: expenseToEdit?.costCenter || '', 
    category: expenseToEdit?.category || '', 
    value: expenseToEdit?.value ? formatCents(String(Math.round(expenseToEdit.value * 100))) : '',
    date: formatDateForInput(expenseToEdit?.date), 
    description: expenseToEdit?.description || '', 
    substituteType: expenseToEdit?.substituteType || 'Substituta',
    
    // Dados Fiscais
    receiptNumber: expenseToEdit?.receiptNumber || '', 
    receiptType: expenseToEdit?.receiptType || 'NF',
    documentType: expenseToEdit?.documentType || 'CNPJ', 
    supplierDocument: expenseToEdit?.supplierDocument || '',
    supplierName: expenseToEdit?.supplierName || '' 
  });
  
  const [file, setFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false); // Loading do PDF

  // --- NOVA FUNÇÃO: IMPORTAÇÃO INTELIGENTE ---
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile); // Já define o arquivo

    // Se for PDF e estiver criando (não editando), tenta extrair dados
    if (uploadedFile.type === 'application/pdf' && !expenseToEdit) {
        setIsProcessingPdf(true);
        try {
            const data = await parseInvoiceData(uploadedFile);
            
            if (data) {
                setFormData(prev => {
                    let newValue = prev.value;
                    // Se achou valor (ex: 123.45), converte para o formato do input (R$ 123,45 ou similar)
                    if (data.valueRaw) {
                        // Simula o formato que o 'formatCents' espera (apenas digitos, ex: 12345)
                        const cleanVal = (parseFloat(data.valueRaw).toFixed(2)).replace('.', '');
                        newValue = formatCents(cleanVal); 
                    }

                    return {
                        ...prev,
                        date: data.date || prev.date,
                        value: newValue,
                        supplierName: data.supplierName || prev.supplierName,
                        supplierDocument: data.supplierDocument || prev.supplierDocument,
                        receiptNumber: data.receiptNumber || prev.receiptNumber,
                        description: data.description || prev.description,
                        receiptType: 'NF', // Assume NF se importou PDF
                        documentType: 'CNPJ' // Assume CNPJ
                    };
                });
            }
        } catch (err) {
            console.error("Erro auto-preenchimento:", err);
        } finally {
            setIsProcessingPdf(false);
        }
    }
  };
  
  const handleValChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(p => ({...p, value: formatCents(v)}));
  };

  const handleDocumentChange = (e) => {
    let v = e.target.value.replace(/\D/g, ''); 
    const type = formData.documentType;

    if (type === 'CPF') {
      v = v.slice(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else if (type === 'CNPJ') {
      v = v.slice(0, 14);
      v = v.replace(/^(\d{2})(\d)/, '$1.$2');
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    }

    setFormData(p => ({...p, supplierDocument: v}));
  };
  
  // --- AQUI ESTÁ A CORREÇÃO PRINCIPAL ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        // Tenta enviar. Se o App.jsx lançar erro (duplicidade), vai pro catch
        await onSubmit(formData, file, expenseToEdit?.id);
        
        // Se der sucesso, o componente será desmontado pelo pai (setShowForm(false)), 
        // então não precisamos necessariamente fazer nada aqui, mas por segurança:
        // onClose(); 
    } catch (error) {
        console.log("Erro no salvamento (possível duplicidade):", error);
        // Destrava o botão para o usuário poder corrigir ou cancelar
        setIsSaving(false);
    }
  };
  
  const isRequired = !isSubstituteMode && formData.documentType !== 'OUTROS';
  
  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 overflow-hidden flex flex-col max-h-[90vh] text-xs">
        
        {/* --- CABEÇALHO --- */}
        <div className="relative px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-center items-center min-h-[80px]">
          <div className="flex flex-col items-center justify-center w-full">
            {currentCompany?.logoUrl ? (
              <img 
                src={currentCompany.logoUrl} 
                alt="Logo Empresa" 
                className="h-16 w-auto object-contain max-w-[200px]" 
              />
            ) : (
              <div className="flex items-center gap-2 text-xl font-bold text-slate-700">
                <div className={`p-2 rounded-lg ${isSubstituteMode ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                  {isSubstituteMode ? <RefreshCw size={24}/> : <Plus size={24}/>}
                </div>
                <span>{currentCompany?.name || 'Nova Despesa'}</span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {expenseToEdit ? 'Editando Lançamento' : (isSubstituteMode ? 'Lançamento Substituto' : 'Novo Lançamento')}
            </p>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={24}/>
          </button>
        </div>
  
        {/* CORPO DO FORMULÁRIO */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          
          {/* --- NOVA ÁREA DE IMPORTAÇÃO (SÓ NOVO LANÇAMENTO) --- */}
          {!expenseToEdit && !file && (
             <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-300 transition-colors cursor-pointer relative">
                <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm">
                        {isProcessingPdf ? <Loader size={20} className="animate-spin"/> : <Sparkles size={20}/>}
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-900">Preenchimento Automático (BETA)</h4>
                        <p className="text-[10px] text-indigo-600">Arraste ou clique para anexar uma NF (PDF). O sistema tentará ler os dados.</p>
                    </div>
                </div>
                <Upload size={18} className="text-indigo-400 group-hover:text-indigo-600"/>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isSubstituteMode && (
              <div className="col-span-3">
                <label className="text-[9px] font-bold text-amber-700 mb-0.5 block uppercase tracking-wide">Tipo</label>
                <select value={formData.substituteType} onChange={e => setFormData({...formData, substituteType: e.target.value})} className="w-full p-2.5 border-2 border-amber-200 bg-amber-50 rounded-lg font-bold text-amber-900 outline-none text-xs focus:ring-2 focus:ring-amber-500/50">
                  <option value="Substituta">Substituta (Gasto no lugar)</option>
                  <option value="Real Sem NF">Real Sem NF (Perda de cupom)</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block uppercase">Centro de Custo</label>
              <select value={formData.costCenter} onChange={e => setFormData({...formData, costCenter: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" required>
                <option value="">Selecione...</option>
                {costCentersList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block uppercase">Categoria</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" required>
                <option value="">Selecione...</option>
                {categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block uppercase">Data</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" required/>
            </div>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block uppercase">Valor (R$)</label>
              <input type="text" value={formData.value} onChange={handleValChange} className="w-full p-2.5 pl-3 border-2 border-slate-200 rounded-lg font-mono font-bold text-lg text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" required/>
            </div>
            <div className="md:col-span-3">
              <label className="text-[9px] font-bold text-slate-500 mb-0.5 block uppercase">Descrição</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Ex: Almoço com cliente..."/>
            </div>
          </div>
  
          {/* DADOS FISCAIS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-[9px] font-bold text-indigo-600 mb-3 uppercase flex items-center gap-1"><FileText size={12}/> Dados Fiscais {isRequired ? '*' : '(Opcional)'}</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <select value={formData.documentType} onChange={e => setFormData({...formData, documentType: e.target.value, supplierDocument: ''})} className="w-full p-2 border border-slate-200 rounded text-[10px] bg-white outline-none focus:border-indigo-500">
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <input 
                  required={isRequired} 
                  type="text" 
                  value={formData.supplierDocument} 
                  onChange={handleDocumentChange} 
                  maxLength={formData.documentType === 'CNPJ' ? 18 : (formData.documentType === 'CPF' ? 14 : 20)}
                  className="w-full p-2 border border-slate-200 rounded text-[10px] bg-white font-mono outline-none focus:border-indigo-500" 
                  placeholder={formData.documentType === 'CNPJ' ? '00.000.000/0000-00' : 'Documento do Emitente'}
                />
              </div>

              <div className="md:col-span-4">
                <input 
                  type="text" 
                  value={formData.supplierName} 
                  onChange={e => setFormData({...formData, supplierName: e.target.value})} 
                  className="w-full p-2 border border-slate-200 rounded text-[10px] bg-white outline-none focus:border-indigo-500 uppercase" 
                  placeholder="RAZÃO SOCIAL / NOME DO FORNECEDOR"
                />
              </div>

              <div>
                <select value={formData.receiptType} onChange={e => setFormData({...formData, receiptType: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-[10px] bg-white outline-none focus:border-indigo-500">
                  <option value="NF">Nota Fiscal</option>
                  <option value="NFCE">Cupom / NFC-e</option> 
                  <option value="RECIBO">Recibo</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <input required={isRequired} type="text" value={formData.receiptNumber} onChange={e => setFormData({...formData, receiptNumber: e.target.value})} className="w-full p-2 border border-slate-200 rounded text-[10px] bg-white outline-none focus:border-indigo-500" placeholder="Número Nota / Cupom"/>
              </div>
            </div>
          </div>
  
          {/* UPLOAD (Se já anexou via auto-preenchimento, mostra aqui também) */}
          <div className={`border-2 border-dashed p-4 rounded-xl transition-all text-center cursor-pointer relative group ${file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-white hover:border-indigo-400'}`}>
            <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 group-hover:text-indigo-600 transition-colors">
              {file ? (
                <>
                  {file.name.toLowerCase().endsWith('.pdf') ? <FileText size={32} className="text-red-500"/> : <ImageIcon size={32} className="text-emerald-500"/>}
                  <span className="text-xs font-bold text-slate-700">{file.name}</span>
                  <span className="text-[9px] text-emerald-600 font-bold uppercase bg-emerald-100 px-2 py-0.5 rounded">Anexado com sucesso</span>
                </>
              ) : (
                <>
                  <Upload size={24}/>
                  <span className="text-xs font-bold">Clique para anexar comprovante (Img/PDF)</span>
                </>
              )}
            </div>
          </div>
        </div>
  
        {/* RODAPÉ */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-bold text-[10px] uppercase shadow-sm transition" disabled={isSaving}>Cancelar</button>
          <button type="submit" className={`px-5 py-2.5 text-white rounded-lg font-bold shadow-md transition hover:-translate-y-0.5 text-[10px] uppercase flex items-center gap-2 ${isSubstituteMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} ${isSaving ? 'opacity-70 cursor-wait' : ''}`} disabled={isSaving}>
            {isSaving ? <Loader className="animate-spin" size={14}/> : <Check size={14}/>} {isSaving ? 'Salvando...' : 'Confirmar Lançamento'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseModal;