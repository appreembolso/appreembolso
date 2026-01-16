import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRightLeft, UploadCloud, Search, Calendar, 
  ArrowUpRight, ArrowDownLeft, Link as LinkIcon, 
  Unlink, Building, DollarSign, RefreshCw, 
  Edit2, X, Lock, FileText, CheckSquare, Square,
  CreditCard, Landmark, Filter, Calculator
} from 'lucide-react';
import { collection, query, getDocs, addDoc, updateDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db, appId } from '../services/firebase'; 
import { parseOFX } from '../utils/ofxParser'; 
// parseCSV removido pois faremos localmente para corrigir o erro das aspas
import { formatToBRL } from '../utils/helpers';

const ReconciliationPage = ({ user, expenses, allExpenses = [], companies, onViewReport, currentCompany }) => { 
  const [bankTransactions, setBankTransactions] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString()); 
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [filterValue, setFilterValue] = useState(''); 
  const [filterText, setFilterText] = useState('');
  const [filterSource, setFilterSource] = useState('all'); 
  
  // Estado para Seleção Múltipla
  const [selectedIds, setSelectedIds] = useState([]);

  // --- ESTILO DARK PREMIUM (VISUAL DINÂMICO) ---
  const companyColor = currentCompany?.color || 'text-indigo-600';
  const borderColorClass = companyColor.replace('text-', 'border-').replace('600', '500');

  const [editingId, setEditingId] = useState(null); 
  const [editingField, setEditingField] = useState(null); 
  const [tempValue, setTempValue] = useState(""); 

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- CONTROLE DO MENU DE IMPORTAÇÃO ---
  const [importMenuOpen, setImportMenuOpen] = useState(false);

  // --- CÁLCULO DA SOMA AUTOMÁTICA ---
  const selectedTotal = useMemo(() => {
      if (selectedIds.length === 0) return 0;
      return bankTransactions
          .filter(t => selectedIds.includes(t.id))
          .reduce((acc, curr) => acc + curr.amount, 0);
  }, [selectedIds, bankTransactions]);

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

          if (filterText) {
              const term = filterText.toLowerCase();
              const desc = (t.description || '').toLowerCase();
              const manualDesc = (t.manualDescription || '').toLowerCase();
              if (!desc.includes(term) && !manualDesc.includes(term)) return false;
          }

          if (filterSource !== 'all') {
              const source = t.sourceType || 'banco';
              if (source !== filterSource) return false;
          }

          return true;
      });
  }, [bankTransactions, selectedMonth, selectedYear, filterValue, filterText, filterSource]);

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

  // --- AÇÕES: IMPORTAÇÃO CSV CORRIGIDA (REGEX + INVERSÃO DE SINAL) ---
  const handleFileUpload = async (e, type = 'ofx') => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    setImportMenuOpen(false);
    
    try {
        let parsedData = [];

        if (type === 'ofx') {
            parsedData = await parseOFX(file);
        } else {
            // --- PARSER CSV MANUAL ---
            const text = await file.text();
            const lines = text.split(/\r\n|\n/);
            
            parsedData = lines.map((line, index) => {
                if (!line.trim()) return null;
                
                // REGEX PODEROSA: Separa por vírgula, mas IGNORA vírgulas dentro de aspas (ex: "R$ 5,91")
                const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                
                // Limpa aspas extras das colunas
                const cleanCols = columns.map(c => c.replace(/^"|"$/g, '').trim());

                // Ignora cabeçalho (se última coluna não for número)
                const lastColVal = cleanCols[cleanCols.length - 1];
                // Verifica se é cabeçalho procurando texto 'Valor' ou se não é numérico
                if (index === 0 && (lastColVal.toLowerCase().includes('valor') || isNaN(parseFloat(lastColVal.replace(/[^\d,-]/g, '').replace(',', '.'))))) return null;

                // 1. DATA (DD/MM/YYYY)
                const dateStr = cleanCols.find(c => /\d{2}\/\d{2}\/\d{4}/.test(c));
                if (!dateStr) return null;

                const [d, m, y] = dateStr.split('/');
                const dateObj = new Date(`${y}-${m}-${d}T12:00:00`); 
                if (isNaN(dateObj.getTime())) return null;

                // 2. VALOR (Formato R$ 1.000,00 ou 5,91)
                const valueStr = cleanCols.find(c => c.includes('$') || /-?\d+,\d{2}/.test(c));
                let amount = 0;
                
                if (valueStr) {
                    // Remove tudo que não for dígito, vírgula ou sinal de menos
                    let cleanValue = valueStr.replace(/[^\d,-]/g, ''); 
                    // Troca vírgula por ponto
                    cleanValue = cleanValue.replace(',', '.');
                    
                    amount = parseFloat(cleanValue);
                    
                    // INVERSÃO DE SINAL: Multiplica por -1
                    amount = amount * -1; 
                }

                // 3. DESCRIÇÃO (Pega a coluna de texto mais longa que não seja data/valor)
                const description = cleanCols.find(c => c !== dateStr && c !== valueStr && c.length > 3) || 'Sem descrição';

                return {
                    fitid: `csv-${dateObj.getTime()}-${Math.abs(amount)}-${index}`,
                    date: dateObj,
                    amount: amount,
                    description: description,
                    memo: '',
                    sourceType: 'cartão'
                };
            }).filter(item => item !== null && !isNaN(item.amount));
        }

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
        alert(`Importação concluída! ${parsedData.length} itens processados.`);
        fetchBankTransactions();
    } catch (error) { 
        alert("Erro na importação: " + error.message); 
        console.error(error);
    } finally { 
        setIsImporting(false); 
        e.target.value = null; 
    }
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

  const handleUnlink = async (trans) => {
      if(!confirm("Desvincular? A despesa voltará para 'A Pagar'.")) return;
      try {
        const expenseId = trans.linkedExpenseId;
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'bank_transactions', trans.id), {
            linkedExpenseId: null,
            manualCompanyId: '', 
            manualReportId: '',
            manualDescription: '' 
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

  const renderTransactionRow = (trans) => {
    const isCredit = trans.amount > 0;
    const isLinked = !!trans.linkedExpenseId;
    const isEditing = editingId === trans.id && editingField === 'description';
    const isSelected = selectedIds.includes(trans.id);
    const sourceType = trans.sourceType || 'banco';

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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{sourceType}</span>
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

  const availableCount = filteredTransactions.filter(t => !t.linkedExpenseId).length;
  const isAllSelected = availableCount > 0 && selectedIds.length === availableCount;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 relative">
      
      {/* HEADER DARK PREMIUM COM LAYOUT FLUIDO */}
      <div className={`min-h-20 px-8 py-4 flex flex-col xl:flex-row justify-between xl:items-center gap-4 shrink-0 bg-slate-900 border-b-4 ${borderColorClass} shadow-md z-20`}>
        <div className="flex items-center gap-3 shrink-0">
            {/* ÍCONE COM COR DINÂMICA */}
            <ArrowRightLeft size={24} className={companyColor} />
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Conciliação Bancária</h2>
                <p className="text-xs text-slate-400 font-medium">Vincule o extrato bancário com as despesas</p>
            </div>
        </div>
        
        {/* CONTAINER DA DIREITA: SOMA + FILTROS NA MESMA LINHA */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
            
            {/* PAINEL DE SELEÇÃO E AÇÕES (SÓ APARECE SE SELECIONADO) */}
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-6 mr-2 bg-slate-900 border border-indigo-500/50 px-6 py-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-right-4 z-50">
                    
                    {/* 1. CONTADOR */}
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Itens</span>
                        <span className="text-lg font-bold text-white flex items-center gap-2">
                            <CheckSquare size={16} className="text-indigo-400"/>
                            {selectedIds.length}
                        </span>
                    </div>

                    <div className="w-px h-10 bg-indigo-500/30"></div>

                    {/* 2. VALOR (EM CONTAINER SEPARADO E GRANDE) */}
                    <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 shadow-inner min-w-[140px] text-center">
                        <span className={`text-2xl font-mono font-bold tracking-tight ${selectedTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                           {formatToBRL(selectedTotal)}
                        </span>
                    </div>

                    <div className="w-px h-10 bg-indigo-500/30"></div>

                    {/* 3. BOTÕES DE AÇÃO */}
                    <div className="flex items-center gap-3">
                        {/* BOTÃO DESMARCAR (ESTILO SÓLIDO AZUL) */}
                        <button 
                            onClick={() => setSelectedIds([])} 
                            className="px-6 py-3 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-xs font-bold transition-all uppercase tracking-wider border border-indigo-700"
                        >
                            DESMARCAR
                        </button>
                        {/* BOTÃO EXCLUIR (ESTILO SÓLIDO VERMELHO) */}
                        <button 
                            onClick={handleBatchDelete} 
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md text-xs font-bold transition-all uppercase tracking-wider"
                        >
                            EXCLUIR
                        </button>
                    </div>
                </div>
            )}

            {/* FILTROS (MANTIDOS VISÍVEIS) */}
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
                <input type="text" placeholder="Valor..." value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-white focus:border-slate-500 w-20 placeholder-slate-500 transition-all"/>
            </div>

            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs"><Search size={12}/></div>
                <input type="text" placeholder="Palavras..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-white focus:border-slate-500 w-24 placeholder-slate-500 transition-all"/>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button onClick={() => setFilterSource('all')} className={`px-2 py-1 text-[9px] font-bold rounded transition ${filterSource === 'all' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>TODAS</button>
                <button onClick={() => setFilterSource('banco')} className={`px-2 py-1 text-[9px] font-bold rounded transition ${filterSource === 'banco' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>BANCO</button>
                <button onClick={() => setFilterSource('cartão')} className={`px-2 py-1 text-[9px] font-bold rounded transition ${filterSource === 'cartão' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>CARTÃO</button>
            </div>

            {/* BOTÃO IMPORTAR COM MENU CLICK (E BACKDROP) */}
            <div className="relative">
                <button 
                    onClick={() => setImportMenuOpen(!importMenuOpen)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all cursor-pointer"
                >
                    <UploadCloud size={18}/> IMPORTAR
                </button>
                
                {/* BACKDROP INVISÍVEL PARA FECHAR AO CLICAR FORA */}
                {importMenuOpen && (
                    <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setImportMenuOpen(false)}
                    />
                )}

                {/* MENU DROP DOWN */}
                {importMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-slate-700 cursor-pointer text-xs text-slate-200 font-bold transition-colors">
                            <Landmark size={14} className="text-blue-400"/> EXTRATO OFX (BANCO)
                            <input type="file" accept=".ofx" className="hidden" onChange={(e) => handleFileUpload(e, 'ofx')} disabled={isImporting}/>
                        </label>
                        <label className="flex items-center gap-3 px-4 py-2 hover:bg-slate-700 cursor-pointer text-xs text-slate-200 font-bold transition-colors">
                            <CreditCard size={14} className="text-amber-400"/> FATURA CSV (CARTÃO)
                            <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'csv')} disabled={isImporting}/>
                        </label>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* LISTA DE TRANSAÇÕES */}
      <div className="flex-1 overflow-y-auto p-8 pt-6">
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14}/> Transações de {months.find(m => m.v === selectedMonth)?.l}/{selectedYear}
                    </h3>
                    <button 
                        onClick={toggleSelectAll}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-[10px] font-bold transition-all ${isAllSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                    >
                        {isAllSelected ? <CheckSquare size={12}/> : <Square size={12}/>}
                        Selecionar Disponíveis
                    </button>
                </div>
                <div className="bg-slate-200/50 px-3 py-1 rounded-full">
                    <span className="text-[10px] font-bold text-slate-500">{filteredTransactions.length} Lançamentos</span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <RefreshCw size={40} className="text-indigo-600 animate-spin" />
                    <p className="text-slate-400 font-medium animate-pulse">Buscando lançamentos...</p>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="p-4 bg-slate-50 rounded-full mb-4">
                        <Search size={32} className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium">Nenhum lançamento encontrado para este período.</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {filteredTransactions.map(renderTransactionRow)}
                </div>
            )}
        </div>
      </div>

      {/* MODAL DE VÍNCULO */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2"><LinkIcon size={16} className="text-indigo-600"/> Vincular Lançamento</h3>
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
