import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Plus, RefreshCw, FileText, SendHorizontal, 
  Database, ArrowRightLeft, Wallet, Settings, ChevronDown, 
  LogOut, Check, Building2
} from 'lucide-react';

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  isAdminView, 
  currentCompany, 
  availableCompanies, 
  setCurrentCompany, 
  currentUser, 
  appUsers, 
  onLogout 
}) => {
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // --- LÓGICA DO USUÁRIO ---
  const userProfile = useMemo(() => {
    if (!currentUser) return null;
    const dbUser = appUsers?.find(u => u.id === currentUser.uid);
    
    // Prioridade: Dados do Banco > Dados do Auth > Fallback
    const rawName = dbUser?.name || dbUser?.displayName || currentUser.displayName || currentUser.email.split('@')[0];
    const photo = dbUser?.photoURL || currentUser.photoURL;

    const formattedName = rawName.toLowerCase().split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      name: formattedName,
      email: currentUser.email,
      photo: photo,
      initials: rawName.charAt(0).toUpperCase()
    };
  }, [currentUser, appUsers]);

  // --- ESTILOS DINÂMICOS ---
  const activeColorClass = currentCompany?.color || 'text-indigo-500';
  
  // --- MAPEAMENTO DE BORDAS (Cores do traço lateral e do avatar) ---
  const borderMap = {
    'text-indigo-600': 'border-indigo-500',
    'text-blue-600':   'border-blue-500',
    'text-sky-600':    'border-sky-500',
    'text-emerald-600':'border-emerald-500',
    'text-green-600':  'border-green-500',
    'text-lime-600':   'border-lime-500',
    'text-red-600':    'border-red-500',
    'text-rose-600':   'border-rose-500',
    'text-pink-600':   'border-pink-500',
    'text-fuchsia-600':'border-fuchsia-500',
    'text-purple-600': 'border-purple-500',
    'text-violet-600': 'border-violet-500',
    'text-cyan-600':   'border-cyan-500',
    'text-teal-600':   'border-teal-500',
    'text-yellow-600': 'border-yellow-500',
    'text-amber-600':  'border-amber-500',
    'text-orange-600': 'border-orange-500',
    'text-slate-600':  'border-slate-500',
    'text-slate-500':  'border-slate-400',
    'text-slate-800':  'border-slate-600',
    'text-gray-600':   'border-gray-500',
    'text-zinc-600':   'border-zinc-500',
    'text-neutral-600':'border-neutral-500',
    'text-stone-600':  'border-stone-500',
    'text-blue-900':   'border-blue-700',
    'text-teal-700':   'border-teal-500',
  };

  // --- MAPEAMENTO DE BACKGROUND (Cor da bolinha e detalhes) ---
  // Isso garante que o Tailwind gere essas classes, pois elas estão escritas aqui.
  const bgMap = {
    'text-indigo-600': 'bg-indigo-500',
    'text-blue-600':   'bg-blue-500',
    'text-sky-600':    'bg-sky-500',
    'text-emerald-600':'bg-emerald-500',
    'text-green-600':  'bg-green-500',
    'text-lime-600':   'bg-lime-500',
    'text-red-600':    'bg-red-500',
    'text-rose-600':   'bg-rose-500',
    'text-pink-600':   'bg-pink-500',
    'text-fuchsia-600':'bg-fuchsia-500',
    'text-purple-600': 'bg-purple-500',
    'text-violet-600': 'bg-violet-500',
    'text-cyan-600':   'bg-cyan-500',
    'text-teal-600':   'bg-teal-500',
    'text-yellow-600': 'bg-yellow-500', // AQUI ESTÁ A CORREÇÃO PARA O AMARELO
    'text-amber-600':  'bg-amber-500',
    'text-orange-600': 'bg-orange-500',
    'text-slate-600':  'bg-slate-500',
    'text-slate-500':  'bg-slate-400',
    'text-slate-800':  'bg-slate-600',
    'text-gray-600':   'bg-gray-500',
    'text-zinc-600':   'bg-zinc-500',
    'text-neutral-600':'bg-neutral-500',
    'text-stone-600':  'bg-stone-500',
    'text-blue-900':   'bg-blue-700',
    'text-teal-700':   'bg-teal-500',
  };

  // Fallback seguro: usa os mapas ou tenta gerar dinamicamente se não encontrar
  const activeBorderClass = borderMap[activeColorClass] || activeColorClass.replace('text-', 'border-').replace('600', '500') || 'border-indigo-500';
  
  // Usamos o bgMap agora, muito mais seguro que o replace simples
  const activeBgClass = bgMap[activeColorClass] || activeColorClass.replace('text-', 'bg-').replace('600', '500') || 'bg-indigo-500';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'active_expenses', label: 'Lançar Despesa', icon: Plus },
    { id: 'substitutes', label: 'Despesas Substitutas', icon: RefreshCw },
    { id: 'generated_reports', label: 'Relatórios Gerados', icon: FileText },
    { id: 'submitted_reports', label: 'Relatórios Enviados', icon: SendHorizontal },
    { id: 'expense_repository', label: 'Repositório', icon: Database },
    { id: 'reconciliation', label: 'Conciliação', icon: ArrowRightLeft },
    { id: 'bank_statement', label: 'Extrato Caixinha', icon: Wallet },
  ];

  if (isAdminView) {
    menuItems.push({ id: 'management', label: 'Configurações', icon: Settings });
  }

  return (
    <aside className="w-72 bg-slate-950 h-full flex flex-col shrink-0 transition-all duration-300 border-r border-slate-800 shadow-2xl z-20 hidden md:flex font-sans">
      
      {/* --- TOPO: LOGO DA EMPRESA --- */}
      <div className="pt-6 px-5">
        <div className="relative">
          <button 
            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
            className={`
              w-full h-16 rounded-2xl border border-slate-700 
              bg-white hover:border-slate-500 transition-all duration-300 
              flex items-center justify-center group shadow-lg relative overflow-hidden cursor-pointer
              ${isCompanyDropdownOpen ? 'ring-2 ring-indigo-500' : ''}
            `}
          >
            {/* Container da Logo */}
            <div className="h-full w-full flex items-center justify-center p-2">
              {currentCompany?.logoUrl ? (
                <img 
                  src={currentCompany.logoUrl} 
                  alt="Company Logo" 
                  className="h-full w-full object-contain" 
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-800">
                  <Building2 size={24} className={activeColorClass} />
                  <span className="text-xs font-bold uppercase tracking-widest">Selecionar</span>
                </div>
              )}
            </div>

            {/* Seta */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-100 transition-opacity">
               <ChevronDown size={14} className={`text-slate-800 transition-transform duration-300 ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* DROPDOWN MENU */}
          {isCompanyDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
               <div className="p-2 bg-slate-950/50 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                  Selecionar Ambiente
               </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {availableCompanies.map(comp => (
                  <button
                    key={comp.id}
                    onClick={() => { setCurrentCompany(comp); setIsCompanyDropdownOpen(false); }}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0 group cursor-pointer"
                  >
                    <div className="h-6 w-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center p-0.5 shrink-0 group-hover:bg-white transition-colors">
                      {comp.logoUrl ? (
                         <img src={comp.logoUrl} className="h-full w-full object-contain"/>
                      ) : (
                         <div className={`h-2 w-2 rounded-full ${comp.color?.replace('text-', 'bg-')}`}></div>
                      )}
                    </div>
                    <span className={`text-xs font-bold flex-1 uppercase tracking-wide ${currentCompany?.id === comp.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {comp.name}
                    </span>
                    {currentCompany?.id === comp.id && <Check size={14} className={activeColorClass} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- LINHA DIVISÓRIA --- */}
      <div className="px-5 mt-4 mb-2">
         <div className={`h-[2px] w-full rounded-full ${activeBgClass} shadow-[0_0_8px_rgba(255,255,255,0.2)]`}></div>
      </div>

      {/* --- NAVEGAÇÃO --- */}
      <nav className="flex-1 overflow-y-auto py-2 px-4 space-y-1 custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 font-bold rounded-xl transition-all duration-200 group relative cursor-pointer
                text-sm
                ${isActive 
                  ? `bg-slate-800 text-white shadow-lg border-l-4 ${activeBorderClass}` 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-l-4 border-transparent'
                }
              `}
            >
              <Icon size={18} className={`transition-colors flex-shrink-0 ${isActive ? activeColorClass : 'text-slate-600 group-hover:text-slate-400'}`} />
              <span className="tracking-wide truncate">{item.label}</span>
              {isActive && (
                <div className={`absolute right-3 w-1.5 h-1.5 rounded-full ${activeBgClass} shadow-[0_0_8px_rgba(255,255,255,0.3)]`}></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* --- RODAPÉ: PERFIL DO USUÁRIO --- */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="bg-slate-900 rounded-2xl p-3 flex items-center gap-3 shadow-lg border border-slate-800 relative group transition-colors hover:border-slate-700">
          
          {/* FOTO / AVATAR */}
          <div className={`
             h-10 w-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden 
             border-2 ${activeBorderClass} 
             p-0.5 bg-slate-800
          `}>
            {userProfile?.photo ? (
              <img src={userProfile.photo} alt="User" className="h-full w-full object-cover rounded-full" />
            ) : (
              <span className={`font-black text-sm ${activeColorClass}`}>{userProfile?.initials}</span>
            )}
          </div>

          {/* DADOS DE TEXTO */}
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">
              {userProfile?.name}
            </h4>
            <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-400" title={userProfile?.email}>
              {userProfile?.email}
            </p>
          </div>

          {/* BOTÃO LOGOUT */}
          <button 
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-red-950 hover:text-red-500 text-slate-600 transition-colors cursor-pointer"
            title="Sair do Sistema"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;