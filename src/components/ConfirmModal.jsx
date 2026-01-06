import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, Check } from 'lucide-react';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, msg, isProcessing, isDanger }) => isOpen ? (
  <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full transform transition-all scale-100 border border-slate-100">
      <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>
        <AlertCircle size={20} className={isDanger ? 'text-red-600' : 'text-indigo-600'}/> {title}
      </h3>
      <p className="mb-6 text-sm text-slate-600 leading-relaxed">{msg}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-bold uppercase transition disabled:opacity-50">Cancelar</button>
        <button onClick={onConfirm} disabled={isProcessing} className={`px-4 py-2 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition shadow-md disabled:opacity-50 ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {isProcessing ? <><Loader size={14} className="animate-spin"/> Processando...</> : 'Confirmar'}
        </button>
      </div>
    </div>
  </div>
) : null;

export const EditReportIdModal = ({ isOpen, onClose, currentId, onSave }) => {
  const [newId, setNewId] = useState(currentId);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => { setNewId(currentId) }, [currentId]);
  
  const handleSave = () => { setSaving(true); onSave(currentId, newId); setSaving(false); onClose(); };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 shadow-2xl max-w-xs w-full">
        <h3 className="text-sm font-bold mb-2 text-slate-700">Editar Número do Relatório</h3>
        <input value={newId} onChange={e => setNewId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg font-mono font-bold text-lg text-indigo-600 focus:border-indigo-500 outline-none mb-4"/>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2">
            {saving ? <Loader size={12} className="animate-spin"/> : <Check size={12}/>} Salvar
          </button>
        </div>
      </div>
    </div>
  );
};