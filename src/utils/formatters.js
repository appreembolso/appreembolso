// src/utils/formatters.js

export const generateUUID = () => crypto.randomUUID();

export const formatToBRL = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

export const formatCents = (s) => s ? `${s.replace(/\D/g, '').padStart(3, '0').slice(0, -2).replace(/^0+/, '') || '0'},${s.replace(/\D/g, '').slice(-2)}` : '';

export const parseCurrency = (v) => v ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0;

export const sortByName = (a, b) => {
  const nameA = a.name ? a.name.toUpperCase() : '';
  const nameB = b.name ? b.name.toUpperCase() : '';
  return nameA.localeCompare(nameB);
};

export const safePromise = (promise, timeoutMs = 25000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo limite excedido')), timeoutMs))
  ]);
};