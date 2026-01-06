import React, { useState, useMemo } from 'react';
import { 
  Search, Calendar, Download, FileText, 
  Trash2, Paperclip, Filter, Database, Eye, Pencil, FilePenLine
} from 'lucide-react';
import { formatToBRL, getHexFromTailwind } from '../utils/helpers';

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030];
const MONTHS = [
  { value: 0, label: 'Janeiro' }, { value: 1, label: 'Fevereiro' }, { value: 2, label: 'Março' },
  { value: 3, label: 'Abril' }, { value: 4, label: 'Maio' }, { value: 5, label: 'Junho' },
  { value: 6, label: 'Julho' }, { value: 7, label: 'Agosto' }, { value: 8, label: 'Setembro' },
  { value: 9, label: 'Outubro' }, { value: 10, label: 'Novembro' }, { value: 11, label: 'Dezembro' },
];

const RepositoryPage = ({ 
  expenses, 
  costCenters, 
  companies, 
  appUsers, 
  isAdminView, 
  onViewReport, 
  onDeleteExpense, 
  onEditExpense, 
  currentCompany 
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear() < 2025 ? 2025 : now.getFullYear());
  const [searchText, setSearchText] = useState('');
  const [filterCC, setFilterCC] = useState('');

  // --- ESTILO DARK PREMIUM (VISUAL CORRIGIDO) ---
  const companyColor = currentCompany?.color || 'text-indigo-600';
  const borderColorClass = companyColor.replace('text-', 'border-').replace('600', '500');

  // Lógica de Filtragem (MANTIDA)
  const filteredData = useMemo(() => {
    return expenses.filter(item => {
      const itemDate = item.date instanceof Date ? item.date : item.date.toDate();
      
      const matchMonth = itemDate.getMonth() === parseInt(selectedMonth);
      const matchYear = itemDate.getFullYear() === parseInt(selectedYear);

      if (!matchMonth || !matchYear) return false;

      const searchLower = searchText.toLowerCase();
      const matchText = !searchText || 
        item.description.toLowerCase().includes(searchLower) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(searchLower)) ||
        (item.reportId && item.reportId.toLowerCase().includes(searchLower)) ||
        formatToBRL(item.value).includes(searchLower);

      const matchCC = !filterCC || item.costCenter === filterCC;
      
      return matchText && matchCC;
    }).sort((a, b) => b.date - a.date);
  }, [expenses, selectedMonth, selectedYear, searchText, filterCC]);

  const totalValue = useMemo(() => filteredData.reduce((acc, cur) => acc + cur.value, 0), [filteredData]);

  const getCompanyName = (id) => {
    const comp = companies.find(c => c.id === id);
    return comp ? comp.name : '-';
  };

  const getUserName = (uid) => {
    const u = appUsers.find(user => user.id === uid);
    return u ? (u.name || u.email) : 'Usuário';
  };

  const formatDocument = (doc) => {
    if (!doc) return '';
    const cleanDoc = doc.toString().replace(/\D/g, '');
    if (cleanDoc.length === 11) return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (cleanDoc.length === 14) return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return doc;
  };

  const handleExport = () => {
    if (filteredData.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    const headers = ["Data", "Descricao", "Fornecedor", "Valor", "Categoria", "Centro de Custo", "Report ID", "Usuario"];
    const csvRows = [headers.join(";")];

    filteredData.forEach(e => {
        const date = e.date instanceof Date ? e.date.toLocaleDateString() : new Date(e.date.seconds * 1000).toLocaleDateString();
        const row = [
            date,
            `"${e.description.replace(/"/g, '""')}"`,
            `"${(e.supplierName || '').replace(/"/g, '""')}"`,
            e.value.toFixed(2).replace('.', ','),
            e.category,
            e.costCenter,
            e.reportId || '-',
            appUsers.find(u => u.id === e.userId)?.name || e.userId
        ];
        csvRows.push(row.join(";"));
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `despesas_${MONTHS[selectedMonth].label}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      
      {/* HEADER DARK PREMIUM - ATUALIZADO */}
      <div 
        className={`min-h-20 px-8 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0 bg-slate-900 border-b-4 ${borderColorClass} shadow-md z-20`}
      >
        
        {/* TÍTULO E TOTAL */}
        <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <Database className={companyColor} size={24}/>
                Repositório de Despesas
            </h2>
            <div className="flex items-center gap-2 mt-1 pl-9">
                <span className="text-xs text-slate-400 font-medium">Total em {MONTHS[selectedMonth].label}/{selectedYear}:</span>
                <span className="text-sm font-black text-emerald-400">{formatToBRL(totalValue)}</span>
            </div>
        </div>

        {/* BARRA DE FERRAMENTAS ESCURA */}
        <div className="flex flex-wrap items-center gap-3">
            
            {/* SELETOR DE DATA */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm">
                <div className="pl-2 pr-1 text-slate-400"><Calendar size={14}/></div>
                <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white"
                >
                    {MONTHS.map(m => <option key={m.value} value={m.value} className="bg-slate-800">{m.label}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                <select 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white"
                >
                    {YEARS.map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                </select>
            </div>

            {/* BUSCA */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)} 
                    className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-white focus:border-slate-500 w-32 placeholder-slate-500 transition-all"
                />
            </div>

            {/* FILTRO CC */}
            <select 
                value={filterCC} 
                onChange={e => setFilterCC(e.target.value)} 
                className="py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-slate-300 focus:border-slate-500 cursor-pointer hover:text-white"
            >
                <option value="" className="bg-slate-800">Centro de Custo (Todos)</option>
                {costCenters.map(cc => <option key={cc.id} value={cc.name} className="bg-slate-800">{cc.name}</option>)}
            </select>

            {/* EXPORTAR */}
            <button 
                onClick={handleExport}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg transition-colors shadow-sm border border-indigo-500 flex items-center gap-2 px-3" 
                title="Exportar CSV"
            >
                <Download size={14}/> <span className="text-xs font-bold uppercase hidden md:inline">CSV</span>
            </button>
        </div>
      </div>

      {/* TABELA CLEAN */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-slate-200">
                    <tr>
                        <th className="p-4 pl-8">Data</th>
                        {isAdminView && <th className="p-4 w-48">Usuário / Empresa</th>}
                        <th className="p-4">Report ID</th>
                        <th className="p-4">Descrição / Fornecedor</th>
                        <th className="p-4">Centro Custo</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right pr-8">Valor</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-600">
                    {filteredData.length > 0 ? filteredData.map(item => (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                            
                            {/* DATA */}
                            <td className="p-4 pl-8 font-medium text-slate-600 whitespace-nowrap">
                                {item.date instanceof Date ? item.date.toLocaleDateString() : new Date(item.date.seconds * 1000).toLocaleDateString()}
                            </td>
                            
                            {/* USUÁRIO (ADMIN) */}
                            {isAdminView && (
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-indigo-600 uppercase truncate max-w-[200px]" title={getCompanyName(item.companyId)}>
                                            {getCompanyName(item.companyId)}
                                        </span>
                                        <span className="text-[10px] text-slate-500">{getUserName(item.userId)}</span>
                                    </div>
                                </td>
                            )}

                            {/* REPORT ID */}
                            <td className="p-4">
                                {item.reportId ? (
                                    <button 
                                        onClick={() => onViewReport(item.reportId)} 
                                        className="font-mono text-xs font-bold text-emerald-600 bg-transparent px-0 py-0 rounded whitespace-nowrap hover:underline transition-colors cursor-pointer flex items-center gap-1"
                                        title="Ver Relatório"
                                    >
                                        <FileText size={12}/> {item.reportId}
                                    </button>
                                ) : <span className="text-slate-300">-</span>}
                            </td>

                            {/* DESCRIÇÃO */}
                            <td className="p-4 max-w-xs">
                                <div className="font-medium text-slate-800 truncate" title={item.description}>{item.description}</div>
                                {item.supplierName && (
                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">
                                        {item.supplierName} 
                                        {item.supplierDocument && <span className="font-mono ml-1 font-normal">({formatDocument(item.supplierDocument)})</span>}
                                    </div>
                                )}
                            </td>

                            {/* CENTRO DE CUSTO */}
                            <td className="p-4 font-bold text-slate-600">{item.costCenter}</td>
                            
                            {/* CATEGORIA */}
                            <td className="p-4">
                                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold border border-slate-200 whitespace-nowrap">
                                    {item.category}
                                </span>
                            </td>

                            {/* STATUS */}
                            <td className="p-4 text-center">
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold border ${
                                    item.isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    item.status === 'Closed' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                                    item.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                    {item.isPaid ? 'PAGO' : (
                                        item.status === 'Closed' ? 'FECHADO' : 
                                        item.status === 'Submitted' ? 'ENVIADO' : 'ABERTO'
                                    )}
                                </div>
                            </td>

                            {/* VALOR */}
                            <td className="p-4 text-right pr-8 font-mono font-bold text-slate-700">
                                {formatToBRL(item.value)}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={isAdminView ? 8 : 7} className="p-12 text-center">
                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                    <Filter size={48} strokeWidth={1}/>
                                    <p className="text-sm font-medium text-slate-400">Nenhum registro encontrado em {MONTHS[selectedMonth].label}/{selectedYear}.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default RepositoryPage;