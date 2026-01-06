import React, { useState, useEffect } from 'react';
import { Loader, Check, X, CheckCircle } from 'lucide-react';
import { formatToBRL } from '../utils/helpers';

const AuditReportModal = ({ isOpen, onClose, reportId, ownerId, items, onSave }) => {
  const [auditState, setAuditState] = useState({});
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    const initial = {};
    if (items && items.length > 0) {
      items.forEach(i => { initial[i.id] = i.adminStatus || 'approved'; });
      setAuditState(initial);
    }
  }, [items]);
  
  const toggleItemStatus = (itemId) => {
    setAuditState(prev => ({ ...prev, [itemId]: prev[itemId] === 'approved' ? 'rejected' : 'approved' }));
  };
  
  const handleSave = () => { setSaving(true); onSave(auditState); };
  
  if(!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div><h3 className="text-xl font-bold text-slate-800">Auditoria de Despesas</h3><p className="text-xs text-slate-500">Relatório: <span className="font-mono font-bold text-indigo-600">{reportId}</span></p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="space-y-3">
            {items && items.length > 0 ? items.map(item => (
              <div key={item.id} className={`p-4 rounded-lg border-2 transition-all flex justify-between items-center bg-white ${auditState[item.id] === 'rejected' ? 'border-red-200 shadow-sm' : 'border-emerald-100 shadow-sm'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.category}</span>
                    <span className="text-xs font-mono text-slate-400">{item.date instanceof Date ? item.date.toLocaleDateString() : 'Data n/d'}</span>
                  </div>
                  <p className={`text-sm font-bold ${auditState[item.id] === 'rejected' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.description}</p>
                  <p className="text-xs font-mono font-bold text-slate-600 mt-1">{formatToBRL(item.value)}</p>
                </div>
                <button onClick={() => toggleItemStatus(item.id)} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition-all ${auditState[item.id] === 'rejected' ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}>
                  {auditState[item.id] === 'rejected' ? <><X size={16}/> Glosado</> : <><CheckCircle size={16}/> Aprovado</>}
                </button>
              </div>
            )) : <div className="text-center text-slate-400 py-10">Nenhuma despesa encontrada para auditar.</div>}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold uppercase">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-2 shadow-lg shadow-indigo-500/30">
            {saving ? <Loader size={14} className="animate-spin"/> : <Check size={14}/>} Confirmar Auditoria
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditReportModal;