import { useState } from 'react';

export const useReports = () => {
  const [reports, setReports] = useState([]); 
  const [sentReports, setSentReports] = useState([
    { id: '2025-0003', user: 'Admin', date: '2025-01-10', costCenter: '00- Administração Central', total: 150.00, status: 'ENVIADO', items: [] }
  ]);

  const generateNextId = (userName) => {
    const currentYear = new Date().getFullYear();
    const prefix = `${currentYear}-`;
    const allReports = [...reports, ...sentReports];
    const userReports = allReports.filter(r => r.id.startsWith(prefix) && r.user === userName);

    if (userReports.length === 0) return `${prefix}0001`;

    const maxSequence = userReports.reduce((max, r) => {
        const parts = r.id.split('-'); 
        const sequence = parseInt(parts[1], 10);
        return sequence > max ? sequence : max;
    }, 0);

    const nextSequence = maxSequence + 1;
    return `${prefix}${String(nextSequence).padStart(4, '0')}`;
  };

  const createReport = (expensesList, totalValue, costCenter, userName) => {
    const newId = generateNextId(userName);
    const newReport = {
      id: newId,
      user: userName,
      date: new Date().toISOString().split('T')[0],
      costCenter: costCenter,
      total: totalValue,
      status: 'AGUARDANDO',
      items: expensesList
    };
    setReports(prev => [newReport, ...prev]);
    return newReport;
  };

  const updateReportId = (oldId, newId) => {
    const conflict = [...reports, ...sentReports].find(r => r.id === newId);
    if (conflict) {
        alert(`O ID ${newId} já existe!`);
        return false;
    }
    setReports(prev => prev.map(r => r.id === oldId ? { ...r, id: newId } : r));
    return true;
  };

  const deleteReport = (id) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  // --- NOVA: ENVIAR RELATÓRIO ---
  const sendToHistory = (report) => {
      // Remove dos gerados
      setReports(prev => prev.filter(r => r.id !== report.id));
      
      // Adiciona aos enviados com status novo
      const sentReport = { ...report, status: 'ENVIADO', sentDate: new Date().toISOString().split('T')[0] };
      setSentReports(prev => [sentReport, ...prev]);
  };

  // --- NOVA: REMOVER ITEM ESPECÍFICO DO RELATÓRIO ---
  const removeItemFromReport = (reportId, itemId) => {
      let removedItem = null;

      setReports(prev => prev.map(report => {
          if (report.id !== reportId) return report;

          // Encontra o item que vai sair
          removedItem = report.items.find(i => i.id === itemId);
          
          // Filtra a lista de itens
          const newItems = report.items.filter(i => i.id !== itemId);
          
          // Recalcula o total
          const newTotal = newItems.reduce((acc, curr) => acc + Number(curr.amount), 0);

          return { ...report, items: newItems, total: newTotal };
      }));

      return removedItem; // Retorna o item para podermos devolvê-lo à lista principal
  };

  return { reports, sentReports, createReport, updateReportId, deleteReport, sendToHistory, removeItemFromReport };
};