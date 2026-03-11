import React, { useState } from 'react';
import { User, Lock, User as UserIcon, ShieldAlert, X } from 'lucide-react';
import { User as UserType } from '../types';

interface ChangeCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onSave: (name: string, login: string, pass: string) => Promise<void>;
}

export const ChangeCredentialsModal: React.FC<ChangeCredentialsModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [name, setName] = useState(user.name);
  const [login, setLogin] = useState(user.login || '');
  const [password, setPassword] = useState(user.password || '');
  const [loading, setLoading] = useState(false);

  // Determine if this is a forced update for the default admin
  const isForcedUpdate = user.login === 'admin' && user.password === '123';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !login.trim() || !password.trim()) return;

    setLoading(true);
    await onSave(name, login, password);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 border border-indigo-100 dark:border-slate-700">
        
        {isForcedUpdate ? (
            <div className="bg-indigo-600 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <ShieldAlert size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Configuração Obrigatória</h2>
                <p className="text-indigo-100 text-sm">Detectamos que você está usando o login padrão de Administrador.</p>
            </div>
        ) : (
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-gray-800 dark:text-white">Editar Perfil</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 p-1 rounded-full shadow-sm hover:shadow">
                    <X size={18} />
                </button>
            </div>
        )}

        <div className="p-8">
            {isForcedUpdate && (
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 text-center">
                    Para garantir a segurança do seu espaço, defina seu nome, um novo login e uma senha pessoal.
                </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Seu Nome</label>
                    <div className="relative">
                        <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                            placeholder="Ex: Carlos Gerente"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{isForcedUpdate ? 'Novo Login' : 'Login'}</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            required
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                            placeholder="Ex: carlos.admin"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{isForcedUpdate ? 'Nova Senha' : 'Senha'}</label>
                    <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                            placeholder="Digite sua senha"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    {!isForcedUpdate && (
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    <button 
                        type="submit"
                        disabled={loading || !name || !login || !password}
                        className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${isForcedUpdate ? 'w-full mt-4' : 'flex-1'}`}
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};