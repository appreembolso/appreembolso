import { doc, runTransaction } from 'firebase/firestore';
import { appId } from '../services/firebase';

export const generateUUID = () => crypto.randomUUID();

export const formatToBRL = (v) => 
  v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

export const formatCents = (s) => 
  s ? `${s.replace(/\D/g, '').padStart(3, '0').slice(0, -2).replace(/^0+/, '') || '0'},${s.replace(/\D/g, '').slice(-2)}` : '';

export const parseCurrency = (v) => 
  v ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0;

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

// --- LISTA DE CORES EXPANDIDA E COMPLETA ---
export const getHexFromTailwind = (twClass) => {
  const colors = {
    // Cores Originais
    'text-blue-600': '#2563eb',
    'text-emerald-600': '#059669',
    'text-green-800': '#166534',
    'text-lime-700': '#4d7c0f',
    'text-purple-600': '#9333ea',
    'text-orange-600': '#ea580c',
    'text-amber-600': '#d97706',
    'text-red-600': '#dc2626',
    'text-slate-600': '#475569',
    'text-slate-700': '#334155',
    'text-indigo-600': '#4f46e5',
    'text-black': '#000000',

    // Novas Cores Adicionadas (Para cobrir o seletor)
    'text-yellow-600': '#ca8a04',
    'text-pink-600': '#db2777',
    'text-rose-600': '#e11d48',
    'text-cyan-600': '#0891b2',
    'text-teal-600': '#0d9488',
    'text-sky-600': '#0284c7',
    'text-violet-600': '#7c3aed',
    'text-fuchsia-600': '#c026d3',
    'text-zinc-600': '#52525b',
    'text-gray-600': '#4b5563',
    'text-stone-600': '#57534e',
    'text-neutral-600': '#525252'
  };
  // Fallback para Indigo se a cor não for encontrada
  return colors[twClass] || '#4f46e5';
};

export const generateSequentialId = async (db, userId) => {
  const year = new Date().getFullYear().toString();
  if (!db || !userId) return `OFF-${Date.now().toString().slice(-4)}`;
  
  const counterRef = doc(db, 'artifacts', appId, 'users', userId, 'counters', year);
  
  try {
    return await runTransaction(db, async (t) => {
      const docSnap = await t.get(counterRef);
      const count = (docSnap.exists() ? docSnap.data().count : 0) + 1;
      t.set(counterRef, { count }, { merge: true });
      return `${year}-${count.toString().padStart(4, '0')}`;
    });
  } catch (e) { 
    return `${year}-${Date.now().toString().slice(-4)}`; 
  }
};