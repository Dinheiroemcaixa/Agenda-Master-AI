
import React, { useState } from 'react';
import { X, Download, Upload, ShieldCheck, AlertTriangle, Loader2, FileJson } from 'lucide-react';
import { Task, User } from '../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  users: User[];
  onRestore: (data: { tasks: any[], users: any[] }) => Promise<void>;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose, tasks, users, onRestore }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const data = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      users,
      tasks
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agenda_master_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.users || !json.tasks) throw new Error("Arquivo de backup inválido.");
        
        if (confirm("ATENÇÃO: Restaurar um backup irá sobrescrever todos os dados atuais. Deseja continuar?")) {
          await onRestore({ tasks: json.tasks, users: json.users });
          onClose();
        }
      } catch (err) {
        setError("Falha ao ler o arquivo. Verifique se é um backup válido.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-indigo-100 dark:border-slate-800">
        <div className="bg-indigo-600 p-6 text-center text-white">
          <ShieldCheck size={40} className="mx-auto mb-3 opacity-90" />
          <h2 className="text-xl font-bold">Segurança & Restauração</h2>
          <p className="text-indigo-100 text-xs mt-1">Crie pontos de segurança para seus dados.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
              Recomendamos baixar um backup sempre que fizer grandes alterações na estrutura da sua equipe.
            </p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleExport}
              className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all group border border-transparent hover:border-indigo-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-indigo-600">
                  <Download size={18} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-800 dark:text-white">Criar Backup</div>
                  <div className="text-[10px] text-slate-500">Baixar arquivo .json atual</div>
                </div>
              </div>
            </button>

            <label className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all group border border-transparent hover:border-emerald-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-emerald-600">
                  {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-800 dark:text-white">Restaurar Ponto</div>
                  <div className="text-[10px] text-slate-500">Carregar de um arquivo salvo</div>
                </div>
              </div>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={isImporting} />
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs rounded-xl text-center font-bold">
              {error}
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
