import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAWIHaHjnSMVBjZUmaL41TC3wdLfYkoLco",
  authDomain: "sistema-reembolso.firebaseapp.com",
  projectId: "sistema-reembolso",
  storageBucket: "sistema-reembolso.firebasestorage.app",
  messagingSenderId: "347122409224",
  appId: "1:347122409224:web:0d8d4bb6becdf83a2b56bd",
  measurementId: "G-3C31ZF7MX1"
};

let app, auth, db, storage;

try {
  // Verifica se já existe uma app inicializada para evitar erro de duplicidade
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Erro crítico no Firebase:", error);
}

// --- AQUI ESTAVA O ERRO: Exportar TODAS as funções que o App.jsx usa ---
export { 
  app, 
  auth, 
  db, 
  storage, 
  deleteApp, 
  initializeApp, 
  getApp, 
  getApps, // <--- Faltava isto
  getAuth  // <--- Faltava isto
};

export const appId = 'sistema-reembolso-prod';