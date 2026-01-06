import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Importe os Provedores
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext'; // <--- Importe o novo arquivo

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      {/* O DataProvider deve estar DENTRO do AuthProvider 
          porque ele precisa do 'currentUser' para buscar os dados */}
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);