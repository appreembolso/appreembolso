import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  collectionGroup, 
  where,
  orderBy,   
  Timestamp  
} from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { useAuth } from './AuthContext';
import { DEFAULT_COMPANIES } from '../data/constants';

// Criação do Contexto
const DataContext = createContext();

export function DataProvider({ children }) {
  const { currentUser, isAdmin } = useAuth();
  
  // --- ESTADOS GLOBAIS ---
  const [expenses, setExpenses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  
  // Estado da Empresa Atual
  const [currentCompany, setCurrentCompany] = useState(null);
  
  const [loading, setLoading] = useState(true);

  // --- 1. CARREGAR CONFIGURAÇÕES ---
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    
    const unsubs = [];

    // Função auxiliar para simplificar os listeners
    const createListener = (collectionName, setter) => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', collectionName));
      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ordenação simples por nome, se existir
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setter(list);
      }, (error) => console.warn(`Erro ao buscar ${collectionName}:`, error));
    };

    unsubs.push(createListener('companies', setCompanies));
    unsubs.push(createListener('costCenters', setCostCenters));
    unsubs.push(createListener('expenseCategories', setCategories));
    unsubs.push(createListener('app_users', setAppUsers));

    return () => unsubs.forEach(u => u());
  }, []);

  // --- 2. LÓGICA DE EMPRESAS DISPONÍVEIS ---
  const availableCompanies = useMemo(() => {
    if (!currentUser || companies.length === 0) return [];
    
    if (isAdmin) return companies;

    const userData = appUsers.find(u => u.id === currentUser.uid);
    if (userData && userData.allowedCompanies && userData.allowedCompanies.length > 0) {
      return companies.filter(c => userData.allowedCompanies.includes(c.id));
    }
    
    return [];
  }, [companies, isAdmin, currentUser, appUsers]);

  // Define a empresa inicial automaticamente
  useEffect(() => {
    if (availableCompanies.length > 0 && !currentCompany) {
      setCurrentCompany(availableCompanies[0]);
    } else if (availableCompanies.length > 0 && currentCompany) {
        const isValid = availableCompanies.find(c => c.id === currentCompany.id);
        if (!isValid) setCurrentCompany(availableCompanies[0]);
    }
  }, [availableCompanies, currentCompany]);

  // --- 3. CARREGAR DESPESAS (CORRIGIDO PARA ADMIN) ---
  useEffect(() => {
    if (!currentUser) {
      setExpenses([]);
      return;
    }

    let q;
    try {
      if (isAdmin) {
        // --- LÓGICA DE ADMIN CORRIGIDA ---
        // Removido o filtro de data restritivo (startPeriod) que escondia relatórios antigos.
        // Agora busca tudo, ordenado do mais recente para o mais antigo.
        
        console.log("Admin: Buscando todas as despesas (CollectionGroup)...");

        q = query(
          collectionGroup(db, 'expenses'),
          // Se tiver muitas despesas no futuro, você pode colocar um filtro de data mais amplo, ex: '2024-01-01'
          orderBy('date', 'desc') 
        );
      } else {
        // --- LÓGICA DE USUÁRIO COMUM ---
        q = query(
          collection(db, 'artifacts', appId, 'users', currentUser.uid, 'expenses')
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // --- TRATAMENTO DE DATAS ---
          let dateObj = new Date();
          if (data.date) {
             if (data.date.toDate) dateObj = data.date.toDate();
             else dateObj = new Date(data.date);
          }

          let closingDateObj = null;
          if (data.closingDate) {
             if (data.closingDate.toDate) closingDateObj = data.closingDate.toDate();
             else closingDateObj = new Date(data.closingDate);
          }

          return {
            id: doc.id,
            ...data,
            date: dateObj,
            closingDate: closingDateObj
          };
        });

        // Ordenação final no cliente (garantia extra)
        setExpenses(list.sort((a, b) => b.date - a.date));
        setLoading(false); 
      }, (error) => {
        console.error("Erro crítico ao buscar despesas:", error);
        
        // Alerta visual para criação de índice (CollectionGroup exige índice)
        if (error.message.includes('requires an index') || error.code === 'failed-precondition') {
            const msg = "ADMIN: É necessário criar um índice 'CollectionGroup' no Firebase para 'expenses' ordenado por 'date' DESC. Abra o Console do navegador (F12) e clique no link fornecido pelo erro do Firebase.";
            console.error(msg);
            alert(msg);
        }
        
        setLoading(false);
      });

      return () => unsubscribe();

    } catch (err) {
      console.error("Erro na query de despesas:", err);
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  const value = {
    expenses,
    costCenters: costCenters.length ? costCenters : [{id:'def', name:'Geral'}],
    categories: categories.length ? categories : [{id:'def', name:'Geral'}],
    appUsers,
    companies,
    currentCompany,
    setCurrentCompany,
    availableCompanies,
    loading
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}