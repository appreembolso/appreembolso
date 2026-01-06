import React, { useState } from 'react';
import { Settings, Users, Building, Tag, Layers, Trash2, Edit, Plus } from 'lucide-react';
import { getHexFromTailwind } from '../utils/helpers'; 

const ManagementPage = ({ 
  companies, costCenters, categories, appUsers, 
  onDeleteItem, onEditItem, currentCompany 
}) => {
  const [activeTab, setActiveTab] = useState('companies');

  const companyColor = currentCompany?.color || 'text-indigo-600';
  
  // Lógica de cor vibrante para a borda do header
  const borderColorClass = companyColor.replace('text-', 'border-').replace('600', '500');

  const tabs = [
    { id: 'companies', label: 'Empresas', icon: Building },
    { id: 'costCenters', label: 'Centros de Custo', icon: Layers },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'users', label: 'Usuários', icon: Users },
  ];

  const renderTable = (data, type, columns) => (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm mt-4 bg-white">
        <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                    {columns.map((col, idx) => <th key={idx} className="p-3">{col.label}</th>)}
                    <th className="p-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {data.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        {columns.map((col, idx) => (
                            <td key={idx} className="p-3 text-slate-700 font-medium">
                                {col.render ? col.render(item) : item[col.key]}
                            </td>
                        ))}
                        <td className="p-3 text-right flex justify-end gap-2">
                            <button onClick={() => onEditItem(type, item)} className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded transition-colors"><Edit size={14}/></button>
                            <button onClick={() => onDeleteItem(type, item.id)} className="text-red-400 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={14}/></button>
                        </td>
                    </tr>
                ))}
                {data.length === 0 && <tr><td colSpan={columns.length + 1} className="p-6 text-center text-slate-400 italic">Nenhum registro.</td></tr>}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      
      {/* HEADER DARK (Apenas Título) */}
      <div 
        className={`px-8 py-6 shrink-0 bg-slate-900 border-b-4 ${borderColorClass} shadow-md z-20`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Settings size={28} className={companyColor}/> 
                    Configurações
                </h2>
                <p className="text-sm text-slate-400 mt-1 pl-10">Gerencie os cadastros do sistema.</p>
            </div>
        </div>
      </div>

      {/* --- NOVA ÁREA DE NAVEGAÇÃO (FORA DO HEADER) --- */}
      <div className="px-8 mt-6 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-bold transition-all whitespace-nowrap border-b-2
                            ${isActive 
                                ? `bg-white text-slate-800 ${borderColorClass} shadow-sm` // Ativo: Fundo branco, texto escuro, borda colorida
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-transparent' // Inativo: Cinza, hover claro
                            }
                        `}
                    >
                        <Icon size={18} className={isActive ? companyColor : 'text-slate-400'}/>
                        {tab.label}
                    </button>
                );
            })}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">{tabs.find(t => t.id === activeTab)?.label}</h3>
                <button 
                    onClick={() => onEditItem(activeTab === 'users' ? 'app_users' : activeTab === 'costCenters' ? 'costCenters' : activeTab === 'categories' ? 'expenseCategories' : 'companies', null)} 
                    className={`text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 transition-all hover:opacity-90 ${companyColor.replace('text-', 'bg-').replace('600', '600')}`}
                >
                    <Plus size={16}/> Adicionar Novo
                </button>
            </div>

            {activeTab === 'companies' && renderTable(companies, 'companies', [
                { label: 'Logo', key: 'logo', render: (i) => i.logoUrl ? <img src={i.logoUrl} className="h-8 w-auto rounded"/> : <div className={`h-8 w-8 rounded bg-slate-200 flex items-center justify-center font-bold ${i.color}`}>{i.logoMain}</div> },
                { label: 'Nome', key: 'name' },
                { label: 'Cor', key: 'color', render: (i) => <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded-full ${i.color.replace('text-', 'bg-')}`}></div><span className="text-[10px] text-slate-400">{i.color}</span></div> }
            ])}

            {activeTab === 'costCenters' && renderTable(costCenters, 'costCenters', [
                { label: 'Nome', key: 'name' },
                { label: 'Empresa', key: 'companyId', render: (i) => {
                    const c = companies.find(x => x.id === i.companyId);
                    return c ? <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600">{c.name}</span> : <span className="text-slate-400 italic">Todas</span>;
                }}
            ])}

            {activeTab === 'categories' && renderTable(categories, 'expenseCategories', [
                { label: 'Nome', key: 'name' }
            ])}

            {activeTab === 'users' && renderTable(appUsers, 'app_users', [
                { label: 'Foto', key: 'photo', render: (i) => i.photoURL ? <img src={i.photoURL} className="h-8 w-8 rounded-full object-cover"/> : <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">{i.name?.[0]}</div> },
                { label: 'Nome', key: 'name' },
                { label: 'Email', key: 'email' },
                { label: 'Função', key: 'role', render: (i) => <span className={`px-2 py-1 rounded text-[10px] font-bold ${i.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{i.role?.toUpperCase()}</span> }
            ])}
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;