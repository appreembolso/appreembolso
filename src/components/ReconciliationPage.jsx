import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRightLeft, UploadCloud, Search, Calendar, 
  ArrowUpRight, ArrowDownLeft, Link as LinkIcon, 
  Unlink, Building, DollarSign, RefreshCw, Trash2, 
  Edit2, X, Lock, FileText, AlertTriangle, CheckSquare, Square
} from 'lucide-react';
import { collection, query, getDocs, addDoc, updateDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db, appId } from '../services/firebase'; 
import { parseOFX } from '../utils/ofxParser'; 
import { formatToBRL, getHexFromTailwind } from '../utils/helpers';

// RECEBE 'allExpenses' DO APP.JSX
const ReconciliationPage = ({ user, expenses, allExpenses = [], companies, onViewReport, currentCompany }) => { 
  const [bankTransactions, setBankTransactions] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString()); 
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [filterValue, setFilterValue] = useState(''); 
  
  // Estado para Seleção Múltipla
  const [selectedIds, setSelectedIds] = useState([]);

  // --- ESTILO DARK PREMIUM (VISUAL CORRIGIDO) ---
  const companyColor = currentCompany?.color || 'text-indigo-600';
  const borderColorClass = companyColor.replace('text-', 'border-').replace('600', '500');

  const [editingId, setEditingId] = useState(null); 
  const [editingField, setEditingField] = useState(null); 
  const [tempValue, setTempValue] = useState(""); 

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- BUSCAR DADOS ---
  const fetchBankTransactions = async () => {
    setLoading(true);
    try {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'bank_transactions'));
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            date: doc.data().date.toDate() 
        }));
        setBankTransactions(list.sort((a, b) => b.date - a.date));
        setSelectedIds([]); 
    } catch (error) {
        console.error("Erro ao buscar extrato:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchBankTransactions(); }, [user]);

  // --- FILTRAGEM ---
  const filteredTransactions = useMemo(() => {
      return bankTransactions.filter(t => {
          const transDate = new Date(t.date);
          const matchDate = transDate.getMonth().toString() === selectedMonth && transDate.getFullYear().toString() === selectedYear;
          if (!matchDate) return false;
          
          if (filterValue) {
              const cleanFilter = filterValue.replace(',', '.');
              if (!Math.abs(t.amount).toFixed(2).includes(cleanFilter)) return false;
          }
          return true;
      });
  }, [bankTransactions, selectedMonth, selectedYear, filterValue]);

  // --- LÓGICA DE SELEÇÃO ---
  const toggleSelectAll = () => {
      const availableIds = filteredTransactions
          .filter(t => !t.linkedExpenseId)
          .map(t => t.id);

      if (selectedIds.length > 0 && selectedIds.length === availableIds.length) {
          setSelectedIds([]); 
      } else {
          setSelectedIds(availableIds); 
      }
  };

  const toggleSelectOne = (id, isLinked) => {
      if (isLinked) return; 
      setSelectedIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  // --- AÇÕES ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    try {
        const parsedData = await parseOFX(file);
        const collectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'bank_transactions');
        const existingIds = bankTransactions.map(t => t.fitid);
        const batchPromises = parsedData.map(async (item) => {
            if (existingIds.includes(item.fitid)) return; 
            await addDoc(collectionRef, {
                ...item, date: Timestamp.fromDate(item.date), importedAt: Timestamp.now(),
                manualDescription: '', manualReportId: '', manualCompanyId: '' 
            });
        });
        await Promise.all(batchPromises);
        alert(`Importação concluída!`);
        fetchBankTransactions();
    } catch (error) { alert("Erro na importação: " + error.message); } finally { setIsImporting(false); e.target.value = null; }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} transações selecionadas?`)) return;

    setLoading(true);
    try {
        const batch = writeBatch(db);
        const itemsToDelete = bankTransactions.filter(t => selectedIds.includes(t.id));
        const hasLinkedItems = itemsToDelete.some(t => t.linkedExpenseId);

        if (hasLinkedItems) {
            alert("Atenção: Algumas transações selecionadas possuem vínculo e não podem ser excluídas.");
            setLoading(false);
            return;
        }

        selectedIds.forEach(id => {
            batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'bank_transactions', id));
        });

        await batch.commit();
        setBankTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
        setSelectedIds([]);
        alert("Transações excluídas com sucesso!");
    } catch (error) {
        alert("Erro ao excluir: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const startEditing = (trans, field, initialValue) => {
      setEditingId(trans.id);
      setEditingField(field);
      setTempValue(initialValue || "");
  };

  const saveEdit = async () => {
      if (!editingId || !editingField) return;
      let dbField = editingField === 'description' ? 'manualDescription' : 'manualReportId';
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'bank_transactions', editingId), { [dbField]: tempValue });
          setBankTransactions(prev => prev.map(t => t.id === editingId ? { ...t, [dbField]: tempValue } : t));
          setEditingId(null); setEditingField(null);
      } catch (err) { alert("Erro ao salvar."); }
  };

  const handleLinkExpense = async (expenseId) => {
    if (!selectedTransaction) return;
    const expense = expenses.find(e => e.id === expenseId);
    
    const companyIdToSave = expense?.companyId || currentCompany.id;
    const reportIdToSave = expense?.reportId || '';

    try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'bank_transactions', selectedTransaction.id), {
            linkedExpenseId: expenseId,
            manualDescription: expense?.description || selectedTransaction.manualDescription, 
            manualCompanyId: companyIdToSave,
            manualReportId: reportIdToSave
        });
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', expenseId), {
            isPaid: true, reconciledTransactionId: selectedTransaction.id, reconciledDate: new Date()
        });
        alert("Vinculado!");
        setLinkModalOpen(false);
        fetchBankTransactions();
    } catch (error) { alert("Erro: " + error.message); }
  };

  // --- CORREÇÃO AQUI: LIMPANDO manualDescription ---
  const handleUnlink = async (trans) => {
      if(!confirm("Desvincular? A despesa voltará para 'A Pagar'.")) return;
      try {
        const expenseId = trans.linkedExpenseId;
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'bank_transactions', trans.id), {
            linkedExpenseId: null,
            manualCompanyId: '', 
            manualReportId: '',
            manualDescription: '' // <--- AGORA LIMPA A DESCRIÇÃO TAMBÉM
        });
        
        if (expenseId) {
            try {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', expenseId), {
                    isPaid: false, reconciledTransactionId: null, reconciledDate: null
                });
            } catch (innerErr) { console.warn("Aviso: Despesa de origem não encontrada no contexto atual."); }
        }
        fetchBankTransactions();
      } catch (err) { alert(err.message); }
  }

  // --- HELPER DE EMPRESA ---
  const getCompanyData = (id) => {
      if (!companies || companies.length === 0) return null;
      let comp = companies.find(c => c.id === id);
      if (!comp) return null;
      
      const rawSigla = comp.sigla || comp.Sigla || comp.logoMain;
      const finalSigla = rawSigla ? rawSigla : (comp.name ? comp.name.substring(0, 4).toUpperCase() : 'EMP');
      
      return {
          name: comp.name,
          color: comp.color || 'text-indigo-600',
          sigla: finalSigla
      };
  };

  const modalFilteredExpenses = expenses.filter(exp => {
      if (exp.companyId !== currentCompany.id) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return exp.description.toLowerCase().includes(term) || exp.value.toString().includes(term);
  });

  const months = [{ v: '0', l: 'Janeiro' }, { v: '1', l: 'Fevereiro' }, { v: '2', l: 'Março' }, { v: '3', l: 'Abril' }, { v: '4', l: 'Maio' }, { v: '5', l: 'Junho' }, { v: '6', l: 'Julho' }, { v: '7', l: 'Agosto' }, { v: '8', l: 'Setembro' }, { v: '9', l: 'Outubro' }, { v: '10', l: 'Novembro' }, { v: '11', l: 'Dezembro' }];
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  // --- RENDERIZAÇÃO DA LINHA ---
  const renderTransactionRow = (trans) => {
    const isCredit = trans.amount > 0;
    const isLinked = !!trans.linkedExpenseId;
    const isEditing = editingId === trans.id && editingField === 'description';
    const isSelected = selectedIds.includes(trans.id);

    const linkedExpense = allExpenses.find(e => e.id === trans.linkedExpenseId);
    const ownerCompanyId = trans.manualCompanyId || linkedExpense?.companyId;
    const companyInfo = getCompanyData(ownerCompanyId);
    
    const isOtherCompany = isLinked && ownerCompanyId && ownerCompanyId !== currentCompany.id;
    const displayReportId = trans.manualReportId || linkedExpense?.reportId || '';

    // Estilos do Badge
    let badgeColorClass = 'text-slate-400';
    let badgeBorderClass = 'border-slate-700';
    let badgeSigla = 'VINCULADO';
    let badgeIcon = isOtherCompany ? <Lock size={12} strokeWidth={3}/> : <LinkIcon size={12} strokeWidth={3}/>;

    if (isLinked) {
        if (companyInfo) {
            badgeColorClass = companyInfo.color;
            badgeBorderClass = companyInfo.color.replace('text-', 'border-').replace('600', '500');
            badgeSigla = companyInfo.sigla;
            badgeIcon = <Building size={12} strokeWidth={3}/>;
        } else if (isOtherCompany) {
            badgeColorClass = 'text-amber-500';
            badgeBorderClass = 'border-amber-700';
            badgeSigla = 'EXTERNO';
            badgeIcon = <Lock size={12} strokeWidth={3}/>;
        }
    }

    return (
      <div 
        key={trans.id} 
        className={`group flex items-center gap-4 p-4 rounded-xl shadow-sm border transition-all mb-3 relative 
        ${isSelected ? 'bg-indigo-50 border-indigo-200' : (isOtherCompany ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200 hover:border-indigo-300')}`}
      >
        
        {/* CHECKBOX DE SELEÇÃO */}
        <div className="shrink-0 pl-1">
            <input 
                type="checkbox"
                checked={isSelected}
                disabled={isLinked} 
                onChange={() => toggleSelectOne(trans.id, isLinked)}
                className={`w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all ${isLinked ? 'opacity-20 cursor-not-allowed bg-slate-100' : 'cursor-pointer'}`}
                title={isLinked ? "Item vinculado não pode ser excluído" : "Selecionar para excluir"}
            />
        </div>

        {/* 1. ÍCONE E DATA */}
        <div className="flex items-center gap-4 min-w-[140px]">
            <div className={`p-2.5 rounded-full shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {isCredit ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700">
                    {trans.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase">
                    {trans.date.getFullYear()}
                </span>
            </div>
        </div>

        {/* 2. DESCRIÇÕES */}
        <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Banco</span>
                <p className="text-xs font-bold text-slate-700 line-clamp-2" title={trans.description}>
                    {trans.description.replace('</MEMO>', '')}
                </p>
            </div>

            <div className="flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    Interno {isOtherCompany && <span className="text-[9px] text-amber-600 font-bold bg-amber-100 px-1 rounded flex items-center gap-0.5"><Lock size={8}/> Bloqueado</span>}
                </span>
                {isEditing && !isOtherCompany ? (
                    <div className="flex gap-1">
                        <input 
                            autoFocus 
                            type="text" 
                            className="w-full bg-white border border-indigo-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-100 outline-none"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                            onBlur={() => setTimeout(saveEdit, 200)} 
                        />
                    </div>
                ) : (
                    <div 
                        onClick={() => !isOtherCompany && startEditing(trans, 'description', trans.manualDescription)}
                        className={`w-full border rounded-lg px-3 py-1.5 text-xs transition-colors truncate min-h-[28px] flex items-center ${isOtherCompany ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-700 cursor-pointer hover:bg-slate-100'}`}
                    >
                        {trans.manualDescription || <span className="text-slate-400 italic">Adicionar nota...</span>}
                    </div>
                )}
            </div>
        </div>

        {/* 3. VALOR E AÇÃO */}
        <div className="flex items-center justify-between md:justify-end gap-6 min-w-[250px] w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 mt-2 md:mt-0">
            <div className="text-right">
                <span className={`block font-mono font-bold text-sm ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatToBRL(trans.amount)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Valor Líquido</span>
            </div>

            <div className="flex items-center gap-2">
                {isLinked ? (
                    // --- CARD VINCULADO DARK PREMIUM (FIXO) ---
                    <div className={`flex items-center gap-3 bg-slate-900 border px-3 py-1.5 rounded-lg shadow-sm transition-all ${badgeBorderClass} ${isOtherCompany ? 'opacity-80 grayscale-[0.3]' : ''}`}>
                        <div className={`p-1 rounded bg-white/10 ${badgeColorClass}`}>
                            {badgeIcon}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[8px] font-black uppercase leading-none tracking-wider mb-0.5 ${badgeColorClass} whitespace-nowrap`}>
                                {badgeSigla}
                            </span>
                            
                            {displayReportId ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (displayReportId && onViewReport) onViewReport(displayReportId);
                                    }}
                                    className={`text-[10px] font-mono font-bold text-white leading-none hover:underline transition-colors cursor-pointer text-left ${isOtherCompany ? 'pointer-events-none' : 'hover:text-indigo-200'}`}
                                    title={isOtherCompany ? "Visualização bloqueada nesta empresa" : "Visualizar Relatório"}
                                >
                                    {displayReportId || 'SEM ID'}
                                </button>
                            ) : (
                                <span className="text-[10px] font-mono font-bold text-slate-500 leading-none">Sem Relatório</span>
                            )}
                        </div>
                        
                        {!isOtherCompany && (
                            <>
                                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                                <button 
                                    onClick={() => handleUnlink(trans)} 
                                    className="text-slate-500 hover:text-red-500 transition-colors p-1" 
                                    title="Desvincular"
                                >
                                    <Unlink size={14} />
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <button 
                        onClick={() => { setSelectedTransaction(trans); setSearchTerm(''); setLinkModalOpen(true); }}
                        className="flex items-center gap-2 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-500 px-4 py-2 rounded-lg transition-all shadow-sm group/btn"
                    >
                        <LinkIcon size={14} className="group-hover/btn:scale-110 transition-transform"/>
                        <span className="text-xs font-bold">Vincular</span>
                    </button>
                )}
            </div>
        </div>
      </div>
    );
  };

  // Calcula quantos itens disponíveis (não vinculados) existem
  const availableCount = filteredTransactions.filter(t => !t.linkedExpenseId).length;
  // Calcula se todos os disponíveis estão selecionados
  const isAllSelected = availableCount > 0 && selectedIds.length === availableCount;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      
      {/* HEADER DARK PREMIUM - ATUALIZADO */}
      <div className={`min-h-20 px-8 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0 bg-slate-900 border-b-4 ${borderColorClass} shadow-md z-20`}>
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <ArrowRightLeft size={24} className={companyColor} />
                Conciliação Bancária
            </h2>
            <p className="text-xs text-slate-400 font-medium pl-9">Vincule o extrato bancário com as despesas</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm">
                <div className="flex items-center px-2 text-slate-400"><Calendar size={14}/></div>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="text-xs font-bold text-slate-200 bg-transparent outline-none py-1 cursor-pointer hover:text-white">
                    {months.map(m => <option key={m.v} value={m.v} className="bg-slate-800">{m.l}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-600"></div>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="text-xs font-bold text-slate-200 bg-transparent outline-none py-1 cursor-pointer pr-1 hover:text-white">
                    {years.map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                </select>
            </div>

            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs"><DollarSign size={12}/></div>
                <input type="text" placeholder="Valor..." value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-white focus:border-slate-500 w-24 placeholder-slate-500 transition-all"/>
            </div>

            {/* BOTÃO EXCLUIR */}
            {selectedIds.length > 0 && (
                <button 
                    onClick={handleBatchDelete} 
                    className="px-4 py-1.5 rounded-lg border border-red-600 bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-all shadow-lg shadow-red-900/20 flex items-center gap-2 animate-in fade-in zoom-in" 
                    title="Excluir itens selecionados"
                >
                    <Trash2 size={14}/> Excluir ({selectedIds.length})
                </button>
            )}

            <label className={`flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                {isImporting ? <RefreshCw className="animate-spin" size={14}/> : <UploadCloud size={14} />}
                {isImporting ? 'LENDO...' : 'IMPORTAR OFX'}
                <input type="file" accept=".ofx" onChange={handleFileUpload} className="hidden" />
            </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="flex justify-between items-center mb-4 px-2">
            <div className="flex items-center gap-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    <FileText size={14}/> Transações de {months.find(m => m.v === selectedMonth)?.l}/{selectedYear}
                </h3>
                
                {/* --- BOTÃO SELECIONAR (CORRIGIDO PARA CINZA) --- */}
                {availableCount > 0 && (
                    <div 
                        onClick={toggleSelectAll} 
                        className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors select-none bg-slate-100 px-2 py-1 rounded border border-slate-200"
                    >
                        {isAllSelected ? <CheckSquare size={14}/> : <Square size={14}/>}
                        {isAllSelected ? 'Desmarcar Todos' : 'Selecionar Disponíveis'}
                    </div>
                )}
            </div>
            
            <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                {filteredTransactions.length} Lançamentos
            </span>
        </div>

        <div className="space-y-3">
            {filteredTransactions.length > 0 ? (
                filteredTransactions.map(trans => renderTransactionRow(trans))
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="bg-slate-200 p-4 rounded-full mb-3">
                        <UploadCloud size={32} className="text-slate-400"/>
                    </div>
                    <p className="text-sm font-bold text-slate-500">Nenhum lançamento encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">Verifique os filtros ou importe um arquivo OFX.</p>
                </div>
            )}
        </div>
      </div>

      {/* MODAL MANTIDO IGUAL */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2"><LinkIcon size={16} className="text-indigo-600"/> Vincular Lançamento Bancário</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono truncate max-w-[300px]">
                                {selectedTransaction?.description.replace('</MEMO>', '')}
                            </span>
                            <span className={`text-xs font-bold ${selectedTransaction?.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatToBRL(selectedTransaction?.amount)}</span>
                        </div>
                    </div>
                    <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200"><X size={20}/></button>
                </div>
                <div className="p-3 bg-white border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input type="text" placeholder="Buscar despesa..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus/>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                    {modalFilteredExpenses.sort((a,b) => Math.abs(a.value - Math.abs(selectedTransaction?.amount || 0)) - Math.abs(b.value - Math.abs(selectedTransaction?.amount || 0))).map(exp => { 
                        const isExactMatch = Math.abs(exp.value - Math.abs(selectedTransaction?.amount)).toFixed(2) === '0.00'; 
                        return (
                            <div key={exp.id} onClick={() => handleLinkExpense(exp.id)} className={`p-3 rounded-lg border cursor-pointer transition flex justify-between items-center group ${isExactMatch ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-slate-700 text-sm">{exp.description}</span>
                                        {isExactMatch && <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold uppercase shadow-sm">Valor Exato</span>}
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{exp.category}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span>{exp.date instanceof Date ? exp.date.toLocaleDateString() : 'Data n/d'}</span>
                                        {exp.reportId && <><span>•</span><span className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">{exp.reportId}</span></>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-slate-800 text-sm">{formatToBRL(exp.value)}</span>
                                    <span className="text-[9px] text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition">VINCULAR</span>
                                </div>
                            </div>
                        ); 
                    })}
                    {modalFilteredExpenses.length === 0 && <div className="text-center p-8 text-slate-400 italic text-sm">Nenhuma despesa desta empresa encontrada.</div>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationPage;