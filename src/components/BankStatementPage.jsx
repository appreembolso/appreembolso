import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Search, ArrowUpCircle, ArrowDownCircle, Wallet, 
  TrendingUp, TrendingDown, FileText, ArrowUpRight, ArrowDownLeft,
  Building, Link as LinkIcon, Lock
} from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db, appId } from '../services/firebase'; 
import { formatToBRL } from '../utils/helpers';

const BankStatementPage = ({ user, companies, expenses, allExpenses = [], onViewReport, currentCompany }) => { 
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Mapa para saber quais meses têm dados. Ex: { "2025-0": true, "2025-11": true }
  const [availableDataMap, setAvailableDataMap] = useState({});

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString()); 
  // Garante que o ano selecionado esteja dentro da nova lista (se for < 2025, força 2025)
  const currentYearStr = currentDate.getFullYear().toString();
  const initialYear = parseInt(currentYearStr) < 2025 ? '2025' : currentYearStr;
  const [selectedYear, setSelectedYear] = useState(initialYear);
  
  const [searchTerm, setSearchTerm] = useState('');

  const companyColor = currentCompany?.color || 'text-indigo-600';
  const borderColorClass = companyColor.replace('text-', 'border-').replace('600', '500');

  // --- 1. BUSCA E TRATAMENTO DE DADOS ---
  const fetchTransactions = async () => {
    setLoading(true);
    try {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'bank_transactions'));
        const querySnapshot = await getDocs(q);
        
        const list = querySnapshot.docs.map(doc => {
            const data = doc.data();
            let finalDate = new Date(); 

            // Tratamento robusto de data
            if (data.date) {
                if (data.date.toDate) {
                    finalDate = data.date.toDate();
                } else if (typeof data.date === 'string') {
                    const d = new Date(data.date);
                    if (!isNaN(d.getTime())) {
                        finalDate = d;
                    } else {
                        const parts = data.date.split('-');
                        if (parts.length === 3) {
                            finalDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
                        }
                    }
                }
            }

            return { id: doc.id, ...data, date: finalDate };
        });

        const sortedList = list.sort((a, b) => a.date - b.date);
        setTransactions(sortedList);
        
        // --- PREENCHE O MAPA DE DADOS ---
        const dataMap = {};
        sortedList.forEach(item => {
            if (!item.date || isNaN(item.date.getTime())) return;
            const y = item.date.getFullYear();
            const m = item.date.getMonth(); 
            const key = `${y}-${m}`;
            dataMap[key] = true;
        });
        setAvailableDataMap(dataMap);

    } catch (error) { 
        console.error("Erro:", error); 
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { if (user) fetchTransactions(); }, [user]);

  // --- 2. CÁLCULO DE SALDO ---
  const statementData = useMemo(() => {
      let runningBalance = 0;
      let previousBalance = 0; 
      
      const allWithBalance = transactions.map(t => { 
          runningBalance += Number(t.amount); 
          return { ...t, balanceAfter: runningBalance }; 
      });

      const filtered = allWithBalance.filter(t => {
          const tDate = t.date;
          if (tDate.getMonth().toString() !== selectedMonth || tDate.getFullYear().toString() !== selectedYear) return false;
          
          if (searchTerm) {
              const term = searchTerm.toLowerCase();
              return t.description.toLowerCase().includes(term) || (t.manualDescription && t.manualDescription.toLowerCase().includes(term));
          }
          return true;
      });

      const firstInPeriodIndex = allWithBalance.findIndex(t => { 
          return t.date.getMonth().toString() === selectedMonth && t.date.getFullYear().toString() === selectedYear; 
      });

      if (firstInPeriodIndex > 0) { 
          previousBalance = allWithBalance[firstInPeriodIndex - 1].balanceAfter; 
      } else if (firstInPeriodIndex === -1 && allWithBalance.length > 0) {
          const targetDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
          const previousItems = allWithBalance.filter(t => t.date < targetDate);
          if (previousItems.length > 0) {
              previousBalance = previousItems[previousItems.length - 1].balanceAfter;
          }
      }

      const displayList = [...filtered].sort((a, b) => b.date - a.date);
      const totalIn = filtered.reduce((acc, curr) => acc + (curr.amount > 0 ? curr.amount : 0), 0);
      const totalOut = filtered.reduce((acc, curr) => acc + (curr.amount < 0 ? curr.amount : 0), 0);
      
      return { list: displayList, previousBalance, totalIn, totalOut, finalBalance: previousBalance + totalIn + totalOut };
  }, [transactions, selectedMonth, selectedYear, searchTerm]);

  // --- HELPERS ---
  const getCompanyData = (id) => {
      if (!id || !companies) return null;
      const comp = companies.find(c => c.id === id);
      if (!comp) return null;
      const rawSigla = comp.sigla || comp.Sigla || comp.logoMain;
      return { name: comp.name, color: comp.color || 'text-indigo-600', sigla: rawSigla || comp.name.substring(0, 4).toUpperCase() };
  };

  const months = [
      { v: '0', l: 'Janeiro' }, { v: '1', l: 'Fevereiro' }, { v: '2', l: 'Março' }, 
      { v: '3', l: 'Abril' }, { v: '4', l: 'Maio' }, { v: '5', l: 'Junho' }, 
      { v: '6', l: 'Julho' }, { v: '7', l: 'Agosto' }, { v: '8', l: 'Setembro' }, 
      { v: '9', l: 'Outubro' }, { v: '10', l: 'Novembro' }, { v: '11', l: 'Dezembro' }
  ];
  
  // --- AQUI ESTÁ A ALTERAÇÃO: APENAS 2025 EM DIANTE ---
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  const renderStatementRow = (trans) => {
    const isCredit = trans.amount > 0;
    const isLinked = !!trans.linkedExpenseId;
    const linkedExpense = allExpenses.find(e => e.id === trans.linkedExpenseId);
    const ownerCompanyId = trans.manualCompanyId || linkedExpense?.companyId;
    const companyInfo = getCompanyData(ownerCompanyId);
    const isOtherCompany = isLinked && ownerCompanyId && ownerCompanyId !== currentCompany.id;
    const displayReportId = trans.manualReportId || linkedExpense?.reportId || '';

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
        }
    }

    const cleanDescription = trans.description ? trans.description.replace('</MEMO>', '') : '';

    return (
        <div key={trans.id} className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl shadow-sm border transition-all mb-3 ${isOtherCompany ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
            <div className="flex items-center gap-4 min-w-[140px]">
                <div className={`p-2.5 rounded-full shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{isCredit ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}</div>
                <div className="flex flex-col"><span className="text-sm font-bold text-slate-700">{trans.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span><span className="text-[10px] text-slate-400 font-medium uppercase">{trans.date.getFullYear()}</span></div>
            </div>
            <div className="flex-1 w-full flex flex-col justify-center">
                <span className="text-xs font-bold text-slate-800 line-clamp-1" title={trans.manualDescription || cleanDescription}>{trans.manualDescription || cleanDescription}</span>
                {trans.manualDescription && (<span className="text-[10px] text-slate-400 font-mono truncate max-w-[300px] mt-1" title={cleanDescription}>{cleanDescription}</span>)}
            </div>
            <div className="flex items-center justify-end gap-6 w-full md:w-auto mt-2 md:mt-0">
                {isLinked && (
                    <div className={`flex items-center gap-3 bg-slate-900 border px-3 py-1.5 rounded-lg shadow-md transition-all ${badgeBorderClass} ${isOtherCompany ? 'opacity-80 grayscale-[0.3]' : ''}`}>
                        <div className={`p-1 rounded bg-white/10 ${badgeColorClass}`}>{badgeIcon}</div>
                        <div className="flex flex-col">
                            <span className={`text-[8px] font-black uppercase leading-none tracking-wider mb-0.5 ${badgeColorClass} whitespace-nowrap`}>{badgeSigla}</span>
                            {displayReportId ? (
                                <button onClick={(e) => { e.stopPropagation(); if(displayReportId && onViewReport) onViewReport(displayReportId); }} className={`text-[10px] font-mono font-bold text-white leading-none hover:underline transition-colors cursor-pointer text-left ${isOtherCompany ? 'pointer-events-none' : 'hover:text-indigo-200'}`} title="Visualizar Relatório">{displayReportId}</button>
                            ) : (<span className="text-[10px] font-mono font-bold text-slate-500 leading-none">Sem ID</span>)}
                        </div>
                    </div>
                )}
                <div className="text-right min-w-[100px]">
                    <span className={`block font-mono font-black text-base ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>{formatToBRL(trans.amount)}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Lançamento</span>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      
      <div className={`min-h-20 px-8 py-4 flex flex-col xl:flex-row justify-between xl:items-center gap-4 shrink-0 bg-slate-900 border-b-4 ${borderColorClass} shadow-md z-20`}>
        <div><h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3"><Wallet size={24} className={companyColor}/> Extrato do Caixinha</h2><p className="text-xs text-slate-400 font-medium pl-9">Movimentação consolidada mensal</p></div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)} 
                    className="bg-transparent text-xs font-bold text-white outline-none py-1.5 px-2 cursor-pointer border-r border-slate-700 hover:bg-slate-700 rounded-l"
                >
                    {months.map(m => {
                        const key = `${selectedYear}-${m.v}`;
                        const hasData = !!availableDataMap[key];
                        return (
                            <option key={m.v} value={m.v} className="bg-slate-800 text-slate-200">
                                {m.l} {hasData ? '●' : ''} 
                            </option>
                        );
                    })}
                </select>
                
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-xs font-bold text-white outline-none py-1.5 px-2 cursor-pointer hover:bg-slate-700 rounded-r">
                    {years.map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                </select>
            </div>
            <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-white focus:border-slate-500 w-24 placeholder-slate-500 transition-all"/></div>
        </div>
      </div>
      
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider relative z-10">Saldo Anterior</span>
                <div className="flex items-center gap-2 mt-1 relative z-10"><div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><Wallet size={16}/></div><span className="text-lg font-black text-slate-700">{formatToBRL(statementData.previousBalance)}</span></div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden">
                <div className="absolute right-[-10px] top-[-10px] opacity-10"><ArrowUpCircle size={60} className="text-emerald-500"/></div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider relative z-10">Entradas</span>
                <div className="flex items-center gap-2 mt-1 relative z-10"><div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp size={16}/></div><span className="text-lg font-black text-emerald-700">{formatToBRL(statementData.totalIn)}</span></div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden">
                <div className="absolute right-[-10px] top-[-10px] opacity-10"><ArrowDownCircle size={60} className="text-red-500"/></div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider relative z-10">Saídas</span>
                <div className="flex items-center gap-2 mt-1 relative z-10"><div className="p-1.5 bg-red-50 rounded-lg text-red-600"><TrendingDown size={16}/></div><span className="text-lg font-black text-red-700">{formatToBRL(statementData.totalOut)}</span></div>
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-between h-20 relative overflow-hidden">
                <div className="absolute right-[-10px] top-[-10px] opacity-10"><Wallet size={60} className="text-white"/></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider relative z-10">Saldo Final</span>
                <div className="flex items-center gap-2 mt-1 relative z-10"><div className="p-1.5 bg-slate-700 rounded-lg text-white"><Wallet size={16}/></div><span className={`text-lg font-black ${statementData.finalBalance >= 0 ? 'text-white' : 'text-red-400'}`}>{formatToBRL(statementData.finalBalance)}</span></div>
            </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50">
        <div className="flex justify-between items-center mb-4 px-2"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2"><FileText size={14}/> Movimentações</h3><span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{statementData.list.length} Registros</span></div>
        <div className="space-y-3">
            {statementData.list.length > 0 ? (statementData.list.map(trans => renderStatementRow(trans))) : (!loading && <div className="flex flex-col items-center justify-center py-20 opacity-50"><div className="bg-slate-200 p-4 rounded-full mb-3"><Wallet size={32} className="text-slate-400"/></div><p className="text-sm font-bold text-slate-500">Nenhuma movimentação neste período</p></div>)}
        </div>
      </div>
    </div>
  );
};

export default BankStatementPage;