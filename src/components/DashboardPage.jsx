import React, { useState, useMemo } from 'react';
import { 
  PieChart, Building, CalendarClock, TrendingUp, 
  SendHorizontal, CheckCircle, Calendar, LayoutDashboard, FileText, User
} from 'lucide-react';
import { formatToBRL, getHexFromTailwind } from '../utils/helpers';

const DashboardPage = ({ 
  expenses, 
  costCenters, 
  appUsers, 
  onViewReport, 
  currentCompany,
  currentUser,   
  isAdminView    
}) => {
  const currentD = new Date();
  const [selectedCostCenter, setSelectedCostCenter] = useState('Todos'); 
  const [selectedUser, setSelectedUser] = useState('Todos'); 
  const [dashMonth, setDashMonth] = useState(String(currentD.getMonth())); 
  const [dashYear, setDashYear] = useState(String(currentD.getFullYear()));

  // --- ESTILO DARK PREMIUM ---
  const companyColor = currentCompany?.color || 'text-indigo-600';
  
  // CORREÇÃO VISUAL:
  // 1. Substituímos a lógica antiga para garantir que pegue a cor 500 (mais vibrante)
  // 2. Isso remove o aspecto "lavado" ou escuro demais da linha
  const borderColorClass = companyColor.replace('text-', 'border-').replace('600', '500');

  const months = [
      { v: '0', l: 'Janeiro' }, { v: '1', l: 'Fevereiro' }, { v: '2', l: 'Março' }, 
      { v: '3', l: 'Abril' }, { v: '4', l: 'Maio' }, { v: '5', l: 'Junho' },
      { v: '6', l: 'Julho' }, { v: '7', l: 'Agosto' }, { v: '8', l: 'Setembro' }, 
      { v: '9', l: 'Outubro' }, { v: '10', l: 'Novembro' }, { v: '11', l: 'Dezembro' }
  ];
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  // =================================================================================
  // 1. LISTA FINANCEIRA (Lógica Original Completa)
  // =================================================================================
  const payableList = useMemo(() => {
      return expenses.filter(e => {
          if (e.status !== 'Submitted') return false;
          
          if (isAdminView) {
             if (selectedUser !== 'Todos' && e.userId !== selectedUser) return false;
          } else {
             if (e.userId !== currentUser?.uid) return false;
          }

          if (e.substituteType === 'Real Sem NF') return false;

          const refDate = e.closingDate 
            ? (e.closingDate instanceof Date ? e.closingDate : e.closingDate.toDate())
            : (e.date instanceof Date ? e.date : e.date.toDate());
            
          if (!refDate) return false;

          const matchDate = String(refDate.getMonth()) === dashMonth && String(refDate.getFullYear()) === dashYear;
          const matchCC = (selectedCostCenter && selectedCostCenter !== 'Todos') ? e.costCenter === selectedCostCenter : true;
          
          return matchDate && matchCC;
      });
  }, [expenses, selectedCostCenter, selectedUser, dashMonth, dashYear, isAdminView, currentUser]);

  // =================================================================================
  // 2. LISTA ANALÍTICA (Lógica Original Completa)
  // =================================================================================
  const categoryAnalysisList = useMemo(() => {
    return expenses.filter(e => {
        if (e.status !== 'Submitted') return false;
        
        if (isAdminView) {
            if (selectedUser !== 'Todos' && e.userId !== selectedUser) return false;
        } else {
            if (e.userId !== currentUser?.uid) return false;
        }
        
        if (e.substituteType === 'Substituta') return false;
        if (e.category === '*Substituta') return false; 

        const refDate = e.closingDate 
          ? (e.closingDate instanceof Date ? e.closingDate : e.closingDate.toDate())
          : (e.date instanceof Date ? e.date : e.date.toDate());
          
        if (!refDate) return false;

        const matchDate = String(refDate.getMonth()) === dashMonth && String(refDate.getFullYear()) === dashYear;
        const matchCC = (selectedCostCenter && selectedCostCenter !== 'Todos') ? e.costCenter === selectedCostCenter : true;
        
        return matchDate && matchCC;
    });
  }, [expenses, selectedCostCenter, selectedUser, dashMonth, dashYear, isAdminView, currentUser]);


  // --- 3. DADOS PARA TABELA (Agrupamento por Relatório - Lógica Original Completa) ---
  const dashboardReports = useMemo(() => {
      const grouped = payableList.reduce((acc, curr) => {
          const k = curr.reportId;
          if (!k) return acc;
          if (!acc[k]) acc[k] = [];
          acc[k].push(curr);
          return acc;
      }, {});

      return Object.values(grouped).map(items => {
          const first = items[0];
          const totalToPay = items.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
          const isFullyPaid = items.every(i => i.isPaid);
          const refDate = first.closingDate 
            ? (first.closingDate instanceof Date ? first.closingDate : first.closingDate.toDate())
            : (first.date instanceof Date ? first.date : first.date.toDate());

          return {
              uniqueKey: first.reportId,
              reportId: first.reportId,
              userId: first.userId,
              ownerName: (appUsers || []).find(u => u.id === first.userId)?.name || 'Usuário',
              costCenter: first.costCenter,
              date: refDate,
              total: totalToPay,
              isPaid: isFullyPaid,
              itemCount: items.length
          };
      }).sort((a, b) => {
          // Ordenação por ID Decrescente
          const idA = a.reportId || '';
          const idB = b.reportId || '';
          return idB.localeCompare(idA, undefined, { numeric: true });
      });
  }, [payableList, appUsers]);

  // --- 4. KPIs E GRÁFICOS (Lógica Original Completa) ---
  const dashboardStats = useMemo(() => {
    const totalValue = payableList.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const totalApprovedVal = payableList.reduce((acc, curr) => acc + (curr.isPaid ? (Number(curr.value) || 0) : 0), 0);

    const centerTotals = payableList.reduce((acc, curr) => {
        const cc = curr.costCenter || 'N/D';
        acc[cc] = (acc[cc] || 0) + (Number(curr.value) || 0);
        return acc;
    }, {});
    const topCenters = Object.entries(centerTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

    const categoryTotals = categoryAnalysisList.reduce((acc, curr) => {
        const cat = curr.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + (Number(curr.value) || 0);
        return acc;
    }, {});
    
    const topCats = Object.entries(categoryTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return { total: totalValue, totalApproved: totalApprovedVal, categories: topCats, topCenters };
  }, [payableList, categoryAnalysisList]);

  // --- 5. HISTÓRICO 5 MESES (Lógica Original Completa) ---
  const last5MonthsStats = useMemo(() => {
    const baseDate = new Date(parseInt(dashYear), parseInt(dashMonth), 1);
    const chartMonths = [];
    
    for(let i=4; i>=0; i--) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
        let label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        label = label.replace(' de ', ' ').replace('.', '');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        chartMonths.push({
            dateObj: d,
            label: label, 
            key: `${d.getFullYear()}-${d.getMonth()}`,
            total: 0
        });
    }

    const historyExpenses = expenses.filter(e => {
        if (e.status !== 'Submitted') return false;
        
        if (isAdminView) {
            if (selectedUser !== 'Todos' && e.userId !== selectedUser) return false;
        } else {
            if (e.userId !== currentUser?.uid) return false;
        }

        if (e.substituteType === 'Real Sem NF') return false; 
        if (selectedCostCenter && selectedCostCenter !== 'Todos' && e.costCenter !== selectedCostCenter) return false;
        return true;
    });

    historyExpenses.forEach(exp => {
        const d = exp.closingDate || exp.date;
        if(!d) return;
        const expDate = d instanceof Date ? d : d.toDate();
        const key = `${expDate.getFullYear()}-${expDate.getMonth()}`;
        const monthData = chartMonths.find(m => m.key === key);
        if (monthData) {
            monthData.total += (Number(exp.value) || 0);
        }
    });

    const maxVal = Math.max(...chartMonths.map(m => m.total), 1); 
    return chartMonths.map(m => ({ ...m, percent: (m.total / maxVal) * 100 }));
  }, [expenses, selectedCostCenter, selectedUser, dashMonth, dashYear, isAdminView, currentUser]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      
      {/* HEADER DARK PREMIUM - ATUALIZADO */}
      <div 
        // 1. Mudamos para border-b-4 (mais espesso)
        // 2. Adicionamos borderColorClass (que agora usa a cor 500, mais viva)
        // 3. Removemos o 'style={{ borderBottomColor... }}' para deixar a classe do Tailwind comandar a cor exata
        className={`min-h-20 px-8 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0 bg-slate-900 border-b-4 ${borderColorClass} shadow-md z-20`}
      >
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <LayoutDashboard size={24} className={companyColor} />
                Dashboard Financeiro
            </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
            
            {/* SELETOR DE MÊS/ANO */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm">
                <div className="pl-2 pr-1 text-slate-400"><Calendar size={14}/></div>
                <select value={dashMonth} onChange={(e) => setDashMonth(e.target.value)} className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white">
                    {months.map(m => <option key={m.v} value={m.v} className="bg-slate-800">{m.l}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                <select value={dashYear} onChange={(e) => setDashYear(e.target.value)} className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white border-l border-slate-600 pl-2">
                    {years.map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                </select>
            </div>

            {/* SELETOR DE USUÁRIO (APENAS ADMIN) */}
            {isAdminView && (
                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm px-2">
                    <User size={14} className="text-slate-400"/>
                    <select 
                        value={selectedUser} 
                        onChange={(e) => setSelectedUser(e.target.value)} 
                        className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 cursor-pointer hover:text-white max-w-[120px]"
                    >
                        <option value="Todos" className="bg-slate-800">Todos</option>
                        {appUsers.map(u => <option key={u.id} value={u.id} className="bg-slate-800">{u.name}</option>)}
                    </select>
                </div>
            )}

            {/* SELETOR DE CENTRO DE CUSTO */}
            <select 
                className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-white/20 hover:border-slate-500 transition-colors" 
                value={selectedCostCenter} 
                onChange={e => setSelectedCostCenter(e.target.value)}
            >
                <option value="Todos" className="bg-slate-800">Todos Centros</option>
                {costCenters.map(c => <option key={c.id} value={c.name} className="bg-slate-800">{c.name}</option>)}
            </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        
        {/* CARDS SUPERIORES E GRÁFICOS */}
        <div className="flex flex-col xl:flex-row gap-4 mb-6">
            
            {/* GRÁFICOS ESQUERDA */}
            <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
                {/* TOP CATEGORIAS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 min-w-[280px] max-w-sm flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <PieChart size={14} className={companyColor}/> Top Categorias
                        </h3>
                    </div>
                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[140px] pr-1 custom-scrollbar">
                        {dashboardStats.categories.length > 0 ? (
                            dashboardStats.categories.map((cat, idx) => (
                                <div key={idx} className="flex items-center gap-2 w-full">
                                    <span className="text-[10px] font-bold text-slate-400 w-4">#{idx + 1}</span>
                                    <div className="flex-1 w-full min-w-0">
                                        <div className="flex justify-between items-center mb-0.5 gap-2 w-full">
                                            <span className="text-[10px] font-bold text-slate-700 truncate flex-1 block" title={cat.name}>{cat.name}</span>
                                            <span className="text-[10px] font-bold text-slate-900 whitespace-nowrap">{formatToBRL(cat.total)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                            <div className={`h-1 rounded-full ${companyColor.replace('text-', 'bg-').replace('600', '500')}`} style={{ width: `${(cat.total / (dashboardStats.categories[0].total || 1)) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (<p className="text-[10px] text-slate-400 italic">Nenhum dado.</p>)}
                    </div>
                </div>

                {/* TOP CENTROS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 min-w-[280px] max-w-sm flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <Building size={14} className="text-emerald-500"/> Top Centros
                        </h3>
                    </div>
                    <div className="space-y-2 flex-1">
                        {dashboardStats.topCenters.length > 0 ? (
                            dashboardStats.topCenters.map((center, idx) => (
                                <div key={idx} className="flex items-center gap-2 w-full">
                                    <span className="text-[10px] font-bold text-slate-400 w-4">#{idx + 1}</span>
                                    <div className="flex-1 w-full min-w-0">
                                        <div className="flex justify-between items-center mb-0.5 gap-2 w-full">
                                            <span className="text-[10px] font-bold text-slate-700 truncate flex-1 block" title={center.name}>{center.name}</span>
                                            <span className="text-[10px] font-bold text-slate-900 whitespace-nowrap">{formatToBRL(center.total)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(center.total / (dashboardStats.topCenters[0].total || 1)) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (<p className="text-[10px] text-slate-400 italic">Nenhum dado.</p>)}
                    </div>
                </div>

                {/* HISTÓRICO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 min-w-[280px] max-w-sm flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <CalendarClock size={14} className="text-amber-500"/> Últimos 5 Meses
                        </h3>
                        <div className="bg-amber-50 rounded-lg p-1"><TrendingUp size={14} className="text-amber-500"/></div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                        {last5MonthsStats.map((month) => (
                            <div key={month.key} className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-500 w-12 text-right whitespace-nowrap">{month.label}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex-1 mr-2">
                                            <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${month.percent}%` }}></div>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-800">{formatToBRL(month.total)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SIDE KPIS (CLEAN LAYOUT) */}
            <div className="flex flex-col gap-3 min-w-[200px] shrink-0">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center h-full relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Enviado</span>
                        <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500"><SendHorizontal size={16}/></div>
                    </div>
                    <span className="text-2xl font-black text-slate-800 relative z-10">{formatToBRL(dashboardStats.total)}</span>
                    <div className="absolute right-0 top-0 w-16 h-16 bg-slate-50 rounded-bl-full opacity-50 transition-transform group-hover:scale-110"></div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center h-full relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Aprovado</span>
                        <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600"><CheckCircle size={16}/></div>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 relative z-10">{formatToBRL(dashboardStats.totalApproved)}</span>
                    <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-50 rounded-bl-full opacity-50 transition-transform group-hover:scale-110"></div>
                </div>
            </div>
        </div>

        {/* LISTA DE RELATÓRIOS (Lógica de Tabela Original Completa) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <FileText size={16} className="text-slate-400"/> Relatórios Recentes
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">
              Ordenado por ID Relatório (Decrescente)
            </span>
          </div>
          
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                    <th className="px-6 py-3 pl-8">Usuário</th>
                    <th className="px-6 py-3">Centro Custo</th>
                    <th className="px-6 py-3">Data Envio</th>
                    <th className="px-6 py-3">ID Relatório</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-center">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {dashboardReports.map(item => (
                    <tr key={item.uniqueKey} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-3 pl-8">
                            <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 whitespace-nowrap">
                                {item.ownerName}
                            </span>
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-700">{item.costCenter}</td>
                        <td className="px-6 py-3 font-medium text-slate-500">
                            {item.date ? item.date.toLocaleDateString() : 'n/d'}
                        </td>
                        <td className="px-6 py-3">
                            <button 
                                onClick={() => onViewReport && onViewReport(item.reportId)}
                                className={`font-mono font-bold hover:underline cursor-pointer transition-colors flex items-center gap-1 ${companyColor}`}
                                title="Visualizar Relatório"
                            >
                                <FileText size={12} />
                                {item.reportId}
                            </button>
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-slate-800">{formatToBRL(item.total)}</td>
                        <td className="px-6 py-3 text-center">
                            {item.isPaid 
                                ? <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 shadow-sm">PAGO</span> 
                                : <span className="text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100 shadow-sm">AGUARDANDO</span>
                            }
                        </td>
                    </tr>
                ))}
                {dashboardReports.length === 0 && (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic bg-slate-50/30">Nenhum relatório neste período.</td></tr>
                )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;