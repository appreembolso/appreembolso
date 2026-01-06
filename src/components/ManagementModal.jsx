import React, { useState, useEffect } from 'react';
import { Loader, Camera, User, Building2 } from 'lucide-react';

// --- LISTA DE CORES EXPANDIDA (Novas opções adicionadas) ---
const ALL_COLORS = [
  { value: 'text-indigo-600', label: 'Indigo (Padrão)' },
  { value: 'text-blue-900', label: 'Azul Marinho (Premium)' }, // NOVO
  { value: 'text-blue-600', label: 'Azul' },
  { value: 'text-sky-600', label: 'Azul Céu' },
  { value: 'text-teal-700', label: 'Verde Petróleo' },         // NOVO
  { value: 'text-emerald-600', label: 'Esmeralda' },
  { value: 'text-green-600', label: 'Verde' },
  { value: 'text-lime-600', label: 'Lima' },
  { value: 'text-slate-800', label: 'Cinza Chumbo (Dark)' },    // NOVO
  { value: 'text-slate-600', label: 'Cinza' },
  { value: 'text-slate-500', label: 'Cinza Claro' },           // NOVO
  { value: 'text-red-600', label: 'Vermelho' },
  { value: 'text-rose-600', label: 'Rose' },
  { value: 'text-pink-600', label: 'Rosa' },
  { value: 'text-fuchsia-600', label: 'Fúcsia' },
  { value: 'text-purple-600', label: 'Roxo' },
  { value: 'text-violet-600', label: 'Violeta' },
  { value: 'text-cyan-600', label: 'Ciano' },
  { value: 'text-yellow-600', label: 'Amarelo' },
  { value: 'text-amber-600', label: 'Âmbar' },
  { value: 'text-orange-600', label: 'Laranja' },
];

const ManagementModal = ({ isOpen, onClose, onSave, type, itemToEdit, allCompanies = [] }) => {
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState(''); 
  const [role, setRole] = useState('user');
  const [logoMain, setLogoMain] = useState(''); 
  const [logoSub, setLogoSub] = useState(''); 
  const [color, setColor] = useState('text-indigo-600');
  const [allowedCompanies, setAllowedCompanies] = useState([]);
  const [password, setPassword] = useState(''); 
  
  // --- NOVO ESTADO: Vínculo com Empresa (Para Centros de Custo) ---
  const [companyId, setCompanyId] = useState(''); 

  // Estados para Upload
  const [file, setFile] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => { 
    if (itemToEdit) { 
      setName(itemToEdit.name || ''); 
      setEmail(itemToEdit.email || ''); 
      setRole(itemToEdit.role || 'user'); 
      setLogoMain(itemToEdit.logoMain || ''); 
      setLogoSub(itemToEdit.logoSub || ''); 
      setColor(itemToEdit.color || 'text-indigo-600');
      setAllowedCompanies(itemToEdit.allowedCompanies || []);
      
      // Carrega a empresa vinculada, se houver
      setCompanyId(itemToEdit.companyId || '');

      // Se tiver foto já salva, mostra no preview
      setPreviewUrl(itemToEdit.photoURL || itemToEdit.logoUrl || '');
    } else {
      setName(''); setEmail(''); setRole('user'); setAllowedCompanies([]); setPassword('');
      setLogoMain(''); setLogoSub(''); setColor('text-indigo-600');
      setCompanyId(''); // Reset
      setPreviewUrl('');
    }
    setFile(null);
  }, [itemToEdit, isOpen]);

  // Cria preview local quando o usuário seleciona um arquivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };
    
  if (!isOpen) return null;
  
  const toggleCompany = (cId) => {
    setAllowedCompanies(prev => {
      const current = prev || []; 
      return current.includes(cId) 
        ? current.filter(id => id !== cId) 
        : [...current, cId];
    });
  };
    
  const handleSave = () => { 
    if (!name) return alert("O nome é obrigatório.");
    if (type === 'app_users') {
      if(!email) return alert("O email é obrigatório.");
      if(!itemToEdit && (!password || password.length < 6)) return alert("A senha deve ter no mínimo 6 caracteres.");
    }
  
    setIsSaving(true);
    let data = { name };
      
    if (type === 'app_users') {
      data.email = email.toLowerCase().trim();
      data.role = role;
      data.allowedCompanies = allowedCompanies; 
      if (!itemToEdit && password) data.password = password;
    } else if (type === 'companies') {
      data.logoMain = logoMain;
      data.logoSub = logoSub;
      data.color = color;
    } else if (type === 'costCenters') {
      // --- SALVA O VÍNCULO ---
      data.companyId = companyId;
    }
      
    onClose();
    onSave(type, data, itemToEdit?.id, file).finally(() => setIsSaving(false));
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-6 text-slate-800 border-b border-slate-100 pb-4">{itemToEdit ? 'Editar' : 'Novo'}</h3>
        <div className="space-y-5">
          
          {/* UPLOAD DE FOTO (Apenas para Empresas e Usuários) */}
          {(type === 'app_users' || type === 'companies') && (
            <div className="flex justify-center mb-4">
               <div className="relative group cursor-pointer">
                  <div className={`overflow-hidden border-2 border-slate-200 flex items-center justify-center bg-slate-50 ${type === 'app_users' ? 'w-24 h-24 rounded-full' : 'w-full h-24 rounded-lg'}`}>
                      {previewUrl ? (
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                          type === 'app_users' ? <User size={40} className="text-slate-300"/> : <span className="text-xs text-slate-400 font-bold">SEM LOGO</span>
                      )}
                  </div>
                  {/* Overlay de Upload */}
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${type === 'app_users' ? 'rounded-full' : 'rounded-lg'}`}>
                      <Camera className="text-white" size={24} />
                  </div>
                  <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
               </div>
               {type === 'app_users' && <p className="text-center text-[10px] text-slate-400 font-bold mt-2 uppercase w-full absolute top-24">Foto do Perfil</p>}
            </div>
          )}

          <div>
             <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase">Nome</label>
             <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"/>
          </div>
            
          {/* --- SEÇÃO ESPECÍFICA: CENTROS DE CUSTO --- */}
          {type === 'costCenters' && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 mb-2 block uppercase flex items-center gap-2">
                    <Building2 size={12}/> Vincular à Empresa (Opcional)
                </label>
                <select 
                    value={companyId} 
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500"
                >
                    <option value="">-- Todas (Global) --</option>
                    {allCompanies.map(comp => (
                        <option key={comp.id} value={comp.id}>
                            {comp.name}
                        </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                    Se você selecionar uma empresa, este Centro de Custo aparecerá <strong>apenas</strong> para usuários logados nela. Se deixar em "Todas", aparecerá para todos.
                </p>
            </div>
          )}

          {/* --- SEÇÃO ESPECÍFICA: EMPRESAS --- */}
          {type === 'companies' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                  <label className="text-[10px] font-bold">Sigla</label>
                  <input className="w-full p-2 border" value={logoMain} onChange={e=>setLogoMain(e.target.value)}/>
              </div>
              <div>
                  <label className="text-[10px] font-bold">Cor</label>
                  {/* AQUI: Usando a nova lista ALL_COLORS */}
                  <select className="w-full p-2 border" value={color} onChange={e=>setColor(e.target.value)}>
                      {ALL_COLORS.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                  </select>
              </div>
            </div>
          )}
  
          {/* --- SEÇÃO ESPECÍFICA: USUÁRIOS --- */}
          {type === 'app_users' && (
            <>
              <div><label className="text-[10px] font-bold">Email</label><input className="w-full p-2 border" type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={!!itemToEdit} /></div>
              {!itemToEdit && (<div><label className="text-[10px] font-bold">Senha Inicial</label><input className="w-full p-2 border" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></div>)}
              <div><label className="text-[10px] font-bold">Perfil</label><select className="w-full p-2 border" value={role} onChange={e=>setRole(e.target.value)}><option value="user">Usuário Comum</option><option value="admin">Administrador</option></select></div>
                
              <div className="pt-2">
                <label className="text-[10px] font-bold block mb-2 text-indigo-600 uppercase">
                  Empresas Permitidas ({allowedCompanies.length})
                </label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-40 overflow-y-auto">
                  {allCompanies.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={allowedCompanies.includes(c.id)} 
                        onChange={() => toggleCompany(c.id)} 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-slate-700">{c.name}</span>
                    </label>
                  ))}
                  {allCompanies.length === 0 && <p className="text-xs text-slate-400">Nenhuma empresa cadastrada.</p>}
                </div>
              </div>
            </>
          )}
            
          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button onClick={onClose} disabled={isSaving} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
               {isSaving ? <Loader className="animate-spin" size={16}/> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementModal;