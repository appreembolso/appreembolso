import React, { useState, useMemo } from 'react';
import { 
  FileText, Calendar, Search, Send, 
  RotateCcw, Pencil, Filter, Package, Eye, 
  AlertTriangle, XCircle, ShieldCheck, User
} from 'lucide-react';
import { formatToBRL } from '../utils/helpers';

// Função de segurança para datas
const parseDate = (value) => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (value.toDate && typeof value.toDate === 'function') return value.toDate();
    return new Date(value);
};

const GeneratedReportsPage = ({ 
  expenses = [], 
  costCenters = [], 
  appUsers = [],    
  onViewReport, 
  onLaunch, 
  onReopen, 
  onEditId, 
  onAudit,  
  currentCompany,
  currentUser, 
  isAdminView 
}) => {
  const currentD = new Date();
  
  const [selectedMonth, setSelectedMonth] = useState(String(currentD.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(currentD.getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState(''); // Novo filtro de usuário
  
  // Estados para o Modal de Reabertura
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reportToReopen, setReportToReopen] = useState(null);
  
  const companyColor = currentCompany?.color || 'text-indigo-600';
  const borderColorClass = companyColor.replace('text-', 'border-').replace('600', '500');

  const months = [
      { v: '0', l: 'Janeiro' }, { v: '1', l: 'Fevereiro' }, { v: '2', l: 'Março' }, 
      { v: '3', l: 'Abril' }, { v: '4', l: 'Maio' }, { v: '5', l: 'Junho' },
      { v: '6', l: 'Julho' }, { v: '7', l: 'Agosto' }, { v: '8', l: 'Setembro' }, 
      { v: '9', l: 'Outubro' }, { v: '10', l: 'Novembro' }, { v: '11', l: 'Dezembro' }
  ];
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  // --- LÓGICA DE DADOS ---
  const reportsList = useMemo(() => {
    const relevantExpenses = expenses.filter(e => {
        // Filtra Status
        if (e.status !== 'Closed' && e.status !== 'Rejected') return false;
        
        // Filtra Data
        const date = parseDate(e.closingDate || e.date);
        if (isNaN(date.getTime())) return false; 
        if (String(date.getMonth()) !== selectedMonth) return false;
        if (String(date.getFullYear()) !== selectedYear) return false;
        return true;
    });

    const grouped = relevantExpenses.reduce((acc, curr) => {
        const rid = curr.reportId;
        if (!acc[rid]) acc[rid] = [];
        acc[rid].push(curr);
        return acc;
    }, {});

    const list = Object.values(grouped).map(items => {
        const first = items[0];
        
        // Identifica o Dono do Relatório
        const owner = appUsers?.find(u => u.id === first.userId) || { name: 'Desconhecido' };

        const totalGenerated = items.reduce((sum, i) => sum + Number(i.value), 0);
        const rejectedItems = items.filter(i => i.status === 'Rejected' || i.isGlosada);
        const hasGlosas = rejectedItems.length > 0;
        const validItems = items.filter(i => !i.isGlosada && i.status !== 'Rejected');
        
        // Verifica se foi totalmente auditado
        const isAudited = items.every(i => i.adminStatus === 'approved');

        const isSubstituteReport = items.some(i => i.substituteType);
        let totalApproved = 0;

        if (isSubstituteReport) {
            const subExpenses = validItems.filter(i => i.substituteType === 'Substituta');
            totalApproved = subExpenses.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
        } else {
            totalApproved = validItems.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
        }

        const dateObj = parseDate(first.closingDate || new Date());

        return {
            id: first.reportId,
            ownerId: first.userId,
            ownerName: owner.name, // Nome do Usuário para a tabela
            costCenter: first.costCenter,
            itemsCount: items.length,
            totalGenerated: totalGenerated,
            totalApproved: totalApproved,
            hasGlosas: hasGlosas,
            isAudited: isAudited,
            rejectedCount: rejectedItems.length,
            date: dateObj,
            sampleItem: first,
            items: items
        };
    });

    // Filtros finais (Busca + Filtro de Usuário)
    const filtered = list.filter(r => {
        const matchesSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              r.costCenter.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = !filterUser || r.ownerId === filterUser;
        
        return matchesSearch && matchesUser;
    });

    return filtered.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));

  }, [expenses, selectedMonth, selectedYear, searchTerm, filterUser, appUsers]);

  const totalApprovedSum = reportsList.reduce((acc, r) => acc + r.totalApproved, 0);

  // --- HANDLERS ---
  const handleClickReopen = (report) => {
      setReportToReopen(report);
      setReopenModalOpen(true);
  };

  const confirmReopen = (mode) => {
      if (reportToReopen && onReopen) {
          onReopen(reportToReopen.id, reportToReopen.ownerId, mode);
      }
      setReopenModalOpen(false);
      setReportToReopen(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* HEADER */}
      <div className={`min-h-20 px-8 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0 bg-slate-900 border-b-4 ${borderColorClass} shadow-md z-20`}>
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <Package size={24} className={companyColor} />
                Relatórios Gerados
            </h2>
            <p className="text-xs text-slate-400 font-medium pl-9">Prontos para conferência, auditoria e envio</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm">
                <div className="pl-2 pr-1 text-slate-400"><Calendar size={14}/></div>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white">
                    {months.map(m => <option key={m.v} value={m.v} className="bg-slate-800">{m.l}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white">
                    {years.map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                </select>
            </div>

            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input type="text" placeholder="Buscar ID ou Centro..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-white focus:border-slate-500 w-40 placeholder-slate-500 transition-all"/>
            </div>

            {/* FILTRO DE USUÁRIO (SÓ APARECE PARA ADMIN) */}
            {isAdminView && (
                <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-slate-300 focus:border-slate-500 cursor-pointer hover:text-white w-40">
                    <option value="" className="bg-slate-800">Usuário (Todos)</option>
                    {appUsers.map(u => <option key={u.id} value={u.id} className="bg-slate-800">{u.name}</option>)}
                </select>
            )}
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 px-8 py-3 flex gap-6 text-xs">
          <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase">Total Aprovado (Previsto):</span>
              <span className="font-black text-emerald-600 text-sm">{formatToBRL(totalApprovedSum)}</span>
          </div>
          <div className="w-px h-4 bg-slate-300"></div>
          <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase">Qtd. Relatórios:</span>
              <span className="font-black text-indigo-600 text-sm">{reportsList.length}</span>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                        <th className="p-4 pl-8">Usuário</th> {/* NOVA COLUNA */}
                        <th className="p-4">ID Relatório</th>
                        <th className="p-4">Data Geração</th>
                        <th className="p-4">Centro Custo</th>
                        <th className="p-4 text-center">Itens</th>
                        <th className="p-4 text-right">Valor Gerado</th>
                        <th className="p-4 text-right">Valor Aprovado</th>
                        <th className="p-4 text-center pr-8">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-600">
                    {reportsList.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                            
                            {/* NOVA COLUNA: USUÁRIO */}
                            <td className="p-4 pl-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
                                        <User size={12}/>
                                    </div>
                                    <span className="font-bold text-slate-700 truncate max-w-[120px]">{report.ownerName}</span>
                                </div>
                            </td>

                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <div className={`font-mono font-bold flex items-center gap-2 ${companyColor} text-sm`}>
                                        <FileText size={16}/> 
                                        {report.id}
                                    </div>
                                    
                                    {(isAdminView || currentUser?.uid === report.ownerId) && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onEditId(report.id); }} 
                                            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                                            title="Editar ID do Relatório"
                                        >
                                            <Pencil size={14}/>
                                        </button>
                                    )}
                                </div>

                                {report.hasGlosas && (
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 w-fit">
                                        <XCircle size={10}/> {report.rejectedCount} GLOSA(S)
                                    </div>
                                )}
                            </td>

                            <td className="p-4 font-medium text-slate-500">{report.date.toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-slate-700">{report.costCenter}</td>
                            <td className="p-4 text-center">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-[10px] font-bold border border-slate-200">
                                    {report.itemsCount} itens
                                </span>
                            </td>
                            
                            {/* VALOR GERADO */}
                            <td className="p-4 text-right font-mono text-slate-500">
                                {formatToBRL(report.totalGenerated)}
                            </td>

                            {/* VALOR APROVADO */}
                            <td className="p-4 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="font-mono font-black text-emerald-700 text-sm">
                                        {formatToBRL(report.totalApproved)}
                                    </span>
                                    {(report.totalGenerated !== report.totalApproved) && (
                                        <span className="text-[9px] text-red-400" title="Diferença">
                                            -{formatToBRL(report.totalGenerated - report.totalApproved)}
                                        </span>
                                    )}
                                </div>
                            </td>

                            <td className="p-4 text-center pr-8">
                                <div className="flex justify-center gap-2 opacity-100">
                                    {/* 1. VISUALIZAR */}
                                    <button 
                                        onClick={() => onViewReport(report)} 
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all"
                                        title="Visualizar Impressão"
                                    >
                                        <Eye size={16}/>
                                    </button>

                                    {/* 2. ADMIN ACTIONS */}
                                    {isAdminView ? (
                                        <>
                                            <button 
                                                onClick={() => onAudit({ reportId: report.id, ownerId: report.ownerId })} 
                                                className={`p-1.5 rounded-lg border border-transparent transition-all ${
                                                    report.hasGlosas 
                                                    ? 'text-amber-600 hover:bg-amber-50 hover:border-amber-100' 
                                                    : report.isAudited
                                                        ? 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100'
                                                        : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100'
                                                }`}
                                                title={report.hasGlosas ? "Auditar (Com Glosas)" : "Auditar Itens"}
                                            >
                                                <ShieldCheck size={16}/>
                                            </button>

                                            <button 
                                                onClick={() => handleClickReopen(report)} 
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-100 transition-all"
                                                title="Devolver Relatório"
                                            >
                                                <RotateCcw size={16}/>
                                            </button>

                                            <button 
                                                onClick={() => onLaunch(report.id, report.ownerId)} 
                                                className={`p-1.5 rounded-lg text-white shadow-md transition-all flex items-center gap-2 px-3 ml-2 ${companyColor.replace('text-', 'bg-').replace('600', '600')} hover:opacity-90`}
                                                title="Enviar Relatório"
                                            >
                                                <Send size={14} /> <span className="text-[10px] font-bold uppercase">Enviar</span>
                                            </button>
                                        </>
                                    ) : (
                                        /* 3. USER ACTIONS */
                                        currentUser?.uid === report.ownerId && (
                                            <button 
                                                onClick={() => handleClickReopen(report)} 
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-100 transition-all"
                                                title="Reabrir para Correção"
                                            >
                                                <RotateCcw size={16}/>
                                            </button>
                                        )
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {reportsList.length === 0 && (
                        <tr>
                            <td colSpan="8" className="p-12 text-center text-slate-400 italic bg-slate-50/50">
                                <div className="flex flex-col items-center gap-2">
                                    <Filter size={32} strokeWidth={1} className="text-slate-300"/>
                                    <span>Nenhum relatório gerado encontrado neste período.</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {reopenModalOpen && reportToReopen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-amber-600">
                        <div className="p-2 bg-amber-50 rounded-full">
                            <AlertTriangle size={24}/>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {isAdminView ? 'Devolver Relatório?' : 'Reabrir Relatório?'}
                        </h3>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-6">
                        O relatório <b>{reportToReopen.id}</b> será {isAdminView ? 'devolvido ao usuário' : 'reaberto'} para edição.
                        <br/>
                        Escolha como deseja prosseguir:
                    </p>

                    <div className="flex flex-col gap-3">
                        {reportToReopen.hasGlosas && (
                            <button 
                                onClick={() => confirmReopen('REJECTED_ONLY')}
                                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 flex items-center justify-center gap-2 transition-all group"
                            >
                                <Pencil size={16} className="group-hover:scale-110 transition-transform"/>
                                {isAdminView ? 'Devolver Apenas Glosas' : 'Corrigir Apenas Glosas'}
                                <span className="text-[10px] font-normal opacity-75">(Mantém aprovados)</span>
                            </button>
                        )}

                        <button 
                            onClick={() => confirmReopen('ALL')}
                            className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg border border-slate-300 flex items-center justify-center gap-2 transition-all"
                        >
                            <RotateCcw size={16}/>
                            {isAdminView ? 'Devolver Relatório Completo' : 'Reabrir Relatório Completo'}
                            <span className="text-[10px] font-normal opacity-75">(Edita tudo)</span>
                        </button>

                        <div className="border-t border-slate-100 my-1"></div>

                        <button 
                            onClick={() => setReopenModalOpen(false)}
                            className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default GeneratedReportsPage;