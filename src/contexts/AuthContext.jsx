import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, appId } from '../services/firebase'; // Ajuste o caminho se necessário
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Define o usuário logado
        setCurrentUser(user);

        // 2. Verifica se é Admin
        // Lógica A: Super Admin Hardcoded (como estava no App.jsx)
        if (user.email === 'appreembolso@gmail.com') {
          setIsAdmin(true);
        } else {
          // Lógica B: Verifica no Firestore se o usuário tem role 'admin'
          try {
            const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'app_users', user.uid);
            const userSnap = await getDoc(userDocRef);
            
            if (userSnap.exists() && userSnap.data().role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (error) {
            console.error("Erro ao verificar permissão de admin:", error);
            setIsAdmin(false);
          }
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}