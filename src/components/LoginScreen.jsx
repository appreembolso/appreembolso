import React, { useState } from 'react';
import { LogIn, Coins, Loader } from 'lucide-react';

const LoginScreen = ({ onLogin, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="bg-white rounded-3xl p-10 max-w-sm w-full shadow-2xl relative z-10 text-center border border-slate-700/50">
        <div className="mb-6 flex justify-center">
          <div className="bg-blue-50 p-4 rounded-2xl shadow-inner">
            <Coins size={40} className="text-blue-600"/>
          </div>
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">Bem-vindo</h1>
        <p className="text-slate-500 mb-8 text-sm">Insira suas credenciais corporativas.</p>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="usuario@empresa.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-3 font-bold transition-all disabled:opacity-50 mt-6 shadow-lg shadow-indigo-500/30"
          >
            {loading ? <Loader className="animate-spin" size={20}/> : <LogIn size={20}/>}
            <span>Entrar no Sistema</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;