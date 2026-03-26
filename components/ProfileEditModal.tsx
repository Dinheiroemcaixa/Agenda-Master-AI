
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { X, User as UserIcon, Lock, Palette, Save, Loader2, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { hashPassword } from '../services/hashService';

interface ProfileEditModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

const PROFILE_COLORS = [
  'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 
  'bg-amber-600', 'bg-purple-600', 'bg-sky-600',
  'bg-slate-700', 'bg-teal-600', 'bg-violet-600',
  'bg-pink-600', 'bg-cyan-600', 'bg-orange-600'
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
  const [name, setName] = useState(user.name);
  const [selectedColor, setSelectedColor] = useState(user.profile_color || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const updates: any = { name };
      if (selectedColor) updates.profile_color = selectedColor;
      
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setMessage({ text: 'As senhas não coincidem.', type: 'error' });
          setIsLoading(false);
          return;
        }
        updates.password = await hashPassword(newPassword);
      }

      let { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      // Fallback: Se der erro de coluna não encontrada (profile_color), tentamos de novo sem ela
      if (error && (error.message?.includes('profile_color') || error.code === 'PGRST204')) {
        console.warn("Coluna profile_color não encontrada, tentando sem ela...");
        const { profile_color, ...fallbackUpdates } = updates;
        const retry = await supabase
          .from('users')
          .update(fallbackUpdates)
          .eq('id', user.id);
        error = retry.error;
      }

      if (error) throw error;

      onUpdate({ ...user, ...updates });
      setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
      setTimeout(() => {
        onClose();
        setMessage(null);
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Erro ao atualizar perfil.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0F111A] border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-800/60 flex items-center justify-between bg-[#1A1D2B]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
              <UserIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Editar Perfil</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personalize sua conta</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-800 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scroll">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full h-12 pl-12 pr-4 bg-[#1A1D2B] border border-slate-700/50 rounded-2xl text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Cor do Perfil */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Palette size={12} /> Cor do Perfil
            </label>
            <div className="grid grid-cols-6 gap-3 p-4 bg-[#1A1D2B]/50 rounded-2xl border border-slate-700/30">
              {PROFILE_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-full aspect-square rounded-full ${color} transition-all duration-300 flex items-center justify-center hover:scale-110 shadow-lg ${selectedColor === color ? 'ring-2 ring-white ring-offset-4 ring-offset-[#0F111A] scale-110' : 'opacity-60 hover:opacity-100'}`}
                >
                  {selectedColor === color && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-800/60 my-2" />

          {/* Senha */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Lock size={12} /> Alterar Senha
            </label>
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (deixe vazio para não alterar)"
                  className="w-full h-12 pl-12 pr-4 bg-[#1A1D2B] border border-slate-700/50 rounded-2xl text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar nova senha"
                  className="w-full h-12 pl-12 pr-4 bg-[#1A1D2B] border border-slate-700/50 rounded-2xl text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="p-8 pt-0">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>
  );
};
