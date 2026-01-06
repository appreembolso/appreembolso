import React from 'react';
import { X, CornerDownLeft, FileText } from 'lucide-react';

const ReportDetailsModal = ({ isOpen, onClose, report, onReturnItem, settings }) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Detalhes do Relatório</h2>
            <p className="text-sm text-indigo-600 font-bold">{report.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Lista de Itens */}
        <div className="overflow-y-auto p-6 flex-1">
            <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-center">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {report.items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3">{item.date}</td>
                            <td className="px-4 py-3 font-medium text-slate-700">{item.description}</td>
                            <td className="px-4 py-3">{item.category}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">
                                {settings.currency} {Number(item.amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <button 
                                    onClick={() => onReturnItem(report.id, item.id)}
                                    className="text-amber-500 hover:text-amber-700 flex items-center gap-1 text-xs font-bold justify-center border border-amber-200 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                                    title="Remover deste relatório e voltar para Despesas Ativas"
                                >
                                    <CornerDownLeft size={14} /> Devolver
                                </button>
                            </td>
                        </tr>
                    ))}
                    {report.items.length === 0 && (
                        <tr>
                            <td colSpan="5" className="text-center py-8 text-slate-400">
                                <div className="flex flex-col items-center">
                                    <FileText size={32} />
                                    <span>Este relatório está vazio.</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Rodapé Total */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Total do Relatório</span>
            <span className="text-xl font-black text-slate-800">{settings.currency} {Number(report.total).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal;