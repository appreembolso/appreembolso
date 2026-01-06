import React, { useState, useMemo } from 'react';
import { 
  Plus, FileText, Trash2, Search, Filter, 
  Paperclip, Pencil, Upload, FilePenLine,
  AlertTriangle, RefreshCw, Scale, DollarSign, Tag, Calendar
} from 'lucide-react';
import { formatToBRL, getHexFromTailwind } from '../utils/helpers';

const ExpensesPage = ({ 
  activeTab, 
  expenses, 
  costCenters, 
  categories, 
  onNewExpense, 
  onEditExpense, 
  onDeleteExpense, 
  onGenerateReport, 
  onDeleteBatch,
  user,
  currentCompany 
}) => {
  const [filterCC, setFilterCC] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterVal, setFilterVal] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // --- ESTILO DINÂMICO (CORRIGIDO PARA COR VIBRANTE) ---
  const companyColor = currentCompany?.color || 'text-indigo-600';
  const borderColorClass = companyColor.replace('text-', 'border-').replace('600', '500');

  // Reset de seleção ao trocar de aba
  React.useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  // --- 1. LÓGICA DE FILTRAGEM (COMPLETA) ---
  const filteredList = useMemo(() => {
    const targetStatus = activeTab === 'substitutes' ? 'Substitute' : 'Active';
    let list = expenses.filter(e => e.status === targetStatus);

    return list.filter(item => {
      const matchCC = !filterCC || item.costCenter === filterCC;
      const matchCat = !filterCat || item.category === filterCat;
      let matchVal = true;
      if (filterVal) {
        const inputVal = parseFloat(filterVal.replace(',', '.'));
        if (!isNaN(inputVal)) matchVal = item.value.toFixed(2) === inputVal.toFixed(2);
      }
      return matchCC && matchCat && matchVal;
    }).sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : a.date.toDate();
        const dateB = b.date instanceof Date ? b.date : b.date.toDate();
        return dateB - dateA;
    });
  }, [expenses, activeTab, filterCC, filterCat, filterVal]);

  // --- 2. CÁLCULO DE TOTAIS (SUBSTITUTAS) ---
  const totalsSubstitute = useMemo(() => {
    if (activeTab !== 'substitutes') return null;
    const items = selectedIds.length > 0 
        ? filteredList.filter(e => selectedIds.includes(e.id)) 
        : []; 
    const r = items.filter(e => e.substituteType === 'Real Sem NF').reduce((acc, curr) => acc + curr.value, 0);
    const s = items.filter(e => e.substituteType === 'Substituta').reduce((acc, curr) => acc + curr.value, 0);
    return { r, s, d: s - r };
  }, [filteredList, selectedIds, activeTab]);

  // --- 3. SELEÇÃO ---
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedIds.length === filteredList.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(filteredList.map(i => i.id));
      }
  };

  const handleBatchAction = (action) => {
    if (action === 'report') onGenerateReport(selectedIds);
    if (action === 'delete') {
        onDeleteBatch(selectedIds);
        setSelectedIds([]); 
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      
      {/* --- HEADER DARK PREMIUM (VISUAL CORRIGIDO) --- */}
      <div 
        className={`min-h-20 px-8 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0 bg-slate-900 border-b-4 ${borderColorClass} shadow-md z-20`}
      >
        
        {/* TÍTULO */}
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                {activeTab === 'substitutes' ? (
                    <RefreshCw size={24} className={companyColor} />
                ) : (
                    <DollarSign size={24} className={companyColor} />
                )}
                {activeTab === 'substitutes' ? 'Despesas Substitutas' : 'Lançamento de Despesas'}
            </h2>
            <p className="text-xs text-slate-400 font-medium pl-9">
                {activeTab === 'substitutes' ? 'Gerencie substituições e adiantamentos' : 'Registre novas despesas para reembolso'}
            </p>
        </div>

        {/* BARRA DE FERRAMENTAS ESCURA */}
        <div className="flex flex-wrap items-center gap-3 justify-end">
            
            {/* FILTROS INTEGRADOS */}
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm">
                <select 
                    value={filterCC} 
                    onChange={e => setFilterCC(e.target.value)} 
                    className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1.5 px-2 cursor-pointer hover:text-white border-r border-slate-600 max-w-[140px]"
                >
                    <option value="" className="bg-slate-800">C. Custo (Todos)</option>
                    {costCenters.map(c => <option key={c.id} value={c.name} className="bg-slate-800">{c.name}</option>)}
                </select>

                <select 
                    value={filterCat} 
                    onChange={e => setFilterCat(e.target.value)} 
                    className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1.5 px-2 cursor-pointer hover:text-white border-r border-slate-600 max-w-[140px]"
                >
                    <option value="" className="bg-slate-800">Categoria (Todas)</option>
                    {categories.map(c => <option key={c.id} value={c.name} className="bg-slate-800">{c.name}</option>)}
                </select>

                <div className="flex items-center px-2">
                    <span className="text-slate-500 mr-1 text-[10px]">R$</span>
                    <input 
                        type="text" 
                        placeholder="Valor..." 
                        value={filterVal} 
                        onChange={e => setFilterVal(e.target.value)} 
                        className="bg-transparent text-xs font-bold text-white outline-none w-16 placeholder-slate-600"
                    />
                </div>
            </div>

            {/* BOTÕES DE AÇÃO EM LOTE */}
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <button 
                        onClick={() => handleBatchAction('report')} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 transition-all border border-emerald-500"
                    >
                        <FileText size={14} /> <span className="hidden md:inline">RELATÓRIO ({selectedIds.length})</span>
                    </button>
                    <button 
                        onClick={() => handleBatchAction('delete')} 
                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 transition-all border border-red-500"
                    >
                        <Trash2 size={14} /> <span className="hidden md:inline">EXCLUIR</span>
                    </button>
                </div>
            )}
            
            {/* BOTÃO NOVO */}
            <button 
                onClick={() => onNewExpense(activeTab === 'substitutes')} 
                className={`px-5 py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border ${companyColor.replace('text-', 'bg-').replace('600', '600')} text-white border-transparent hover:opacity-90`}
            >
                <Plus size={16}/><span>NOVO</span>
            </button>
        </div>
      </div>

      {/* --- KPIS (APENAS SUBSTITUTAS) --- */}
      {activeTab === 'substitutes' && totalsSubstitute && (
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* CARD 1: REAL S/ NF (CINZA) */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-slate-300 transition">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Real s/ NF (Sel.)</span>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><AlertTriangle size={16}/></div>
                        <span className="text-lg font-black text-slate-700">{formatToBRL(totalsSubstitute.r)}</span>
                    </div>
                </div>

                {/* CARD 2: SUBSTITUTA */}
                <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between group hover:border-amber-200 transition">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Substituta (Sel.)</span>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600"><RefreshCw size={16}/></div>
                        <span className="text-lg font-black text-amber-700">{formatToBRL(totalsSubstitute.s)}</span>
                    </div>
                </div>

                {/* CARD 3: DIFERENÇA (DARK) */}
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute right-[-5px] top-[-5px] opacity-10 text-white"><Scale size={48}/></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide relative z-10">Diferença</span>
                    <div className="flex items-center gap-2 mt-1 relative z-10">
                        <div className="p-1.5 bg-slate-700 rounded-lg text-white"><Scale size={16}/></div>
                        <span className={`text-lg font-black ${totalsSubstitute.d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatToBRL(totalsSubstitute.d)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- LISTAGEM (TABELA CLEAN) --- */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-slate-200">
                    <tr>
                        <th className="p-4 pl-6 w-12 text-center">
                            <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                                checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                                onChange={toggleSelectAll}
                            />
                        </th>
                        <th className="p-4">Centro Custo</th>
                        <th className="p-4">Data</th>
                        <th className="p-4">Fornecedor</th>
                        <th className="p-4">Descrição</th>
                        {activeTab === 'substitutes' && <th className="p-4 w-32">Tipo</th>}
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-center w-24">Anexo</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-center pr-6">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-slate-600">
                    {filteredList.map(item => (
                        <tr key={item.id} className={`hover:bg-blue-50/30 transition-colors group ${selectedIds.includes(item.id) ? 'bg-indigo-50/40' : ''}`}>
                            
                            {/* CHECKBOX */}
                            <td className="p-4 pl-6 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.includes(item.id)} 
                                    onChange={() => toggleSelect(item.id)} 
                                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                            </td>

                            {/* CC */}
                            <td className="p-4 font-bold text-slate-700">{item.costCenter}</td>

                            {/* DATA */}
                            <td className="p-4 font-medium whitespace-nowrap">
                                {item.date instanceof Date ? item.date.toLocaleDateString() : new Date(item.date.seconds * 1000).toLocaleDateString()}
                            </td>

                            {/* FORNECEDOR */}
                            <td className="p-4 font-bold text-slate-400 uppercase text-[10px] truncate max-w-[120px]">
                                {item.supplierName || '-'}
                            </td>

                            {/* DESCRIÇÃO */}
                            <td className="p-4 font-medium text-slate-800 truncate max-w-xs" title={item.description}>
                                {item.description}
                            </td>
                            
                            {/* TIPO (SUBSTITUTAS) - CINZA PARA REAL S/ NF */}
                            {activeTab === 'substitutes' && (
                                <td className="p-4">
                                    <span className={`text-[9px] font-bold px-2 py-1 rounded border ${
                                        item.substituteType === 'Real Sem NF' 
                                            ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                        {item.substituteType}
                                    </span>
                                </td>
                            )}

                            {/* CATEGORIA */}
                            <td className="p-4">
                                <div className="inline-flex items-center gap-1 bg-white text-slate-600 px-2 py-1 rounded-full border border-slate-200 whitespace-nowrap font-bold text-[9px] shadow-sm">
                                    <Tag size={10}/> {item.category}
                                </div>
                            </td>

                            {/* ANEXO */}
                            <td className="p-4 text-center">
                                {item.attachmentUrl ? (
                                    <div className="flex justify-center items-center gap-1">
                                        <a href={item.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-slate-100 rounded transition-colors" title="Ver">
                                            <Paperclip size={14} />
                                        </a>
                                        <button onClick={() => onEditExpense(item)} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-slate-100 rounded transition-colors" title="Alterar">
                                            <Pencil size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => onEditExpense(item)} className="text-slate-300 hover:text-slate-500 flex justify-center w-full transition-colors" title="Upload">
                                        <Upload size={14} />
                                    </button>
                                )}
                            </td>

                            {/* VALOR */}
                            <td className="p-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap text-sm">
                                {formatToBRL(item.value)}
                            </td>

                            {/* AÇÕES */}
                            <td className="p-4 pr-6 flex justify-center gap-2">
                                <button onClick={() => onEditExpense(item)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors" title="Editar">
                                    <FilePenLine size={16}/>
                                </button>
                                <button 
                                    onClick={() => onDeleteExpense(item.id, item.userId)} 
                                    disabled={item.isReconciled}
                                    className={`p-1.5 rounded transition-colors ${item.isReconciled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`} 
                                    title={item.isReconciled ? "Bloqueado (Conciliado)" : "Excluir"}
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                    
                    {filteredList.length === 0 && (
                        <tr><td colSpan={activeTab === 'substitutes' ? 11 : 10} className="p-12 text-center text-slate-400 italic bg-slate-50/50">Nenhum lançamento encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ExpensesPage;