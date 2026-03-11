
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, Attachment } from '../types';
// Fix: Added missing MessageSquare and CheckCircle2 imports
import { Send, User as UserIcon, MoreVertical, Paperclip, FileText, X, Download, Image as ImageIcon, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { supabase } from '../services/supabaseClient';

interface ChatViewProps {
  currentUser: User;
  targetUser: User;
  messages: Message[];
  onSendMessage: (text: string, attachment?: Attachment) => Promise<void>;
  roleLabels: Record<string, string>;
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUser, targetUser, messages, onSendMessage, roleLabels }) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, { url: string, expiry: number }>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversation = messages.filter(m => 
    (m.fromUserId === currentUser.id && m.toUserId === targetUser.id) ||
    (m.fromUserId === targetUser.id && m.toUserId === currentUser.id)
  ).sort((a, b) => {
    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.length]);

  // Função para obter ou renovar Signed URL por segurança
  const getFileUrl = async (path: string) => {
    const now = Date.now();
    const cached = signedUrls[path];
    
    // Se temos cache e falta mais de 5 min para expirar, usamos ele
    if (cached && cached.expiry > now + 300000) return cached.url;

    const { data, error } = await supabase.storage
      .from('chat_attachments')
      .createSignedUrl(path, 3600); // URL válida por 1 hora

    if (error) {
      console.error("Erro ao gerar URL assinada:", error);
      return null;
    }

    if (data) {
      const urlInfo = { url: data.signedUrl, expiry: now + 3600000 };
      setSignedUrls(prev => ({ ...prev, [path]: urlInfo }));
      return data.signedUrl;
    }
    return null;
  };

  // Preload de URLs para imagens
  useEffect(() => {
    const preload = async () => {
      const attachments = conversation.filter(m => m.type === 'file' && m.attachment);
      for (const msg of attachments) {
        if (msg.attachment) await getFileUrl(msg.attachment.data);
      }
    };
    preload();
  }, [conversation.length]);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validação de tamanho (25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert("O arquivo é muito grande. O limite é de 25MB.");
      return;
    }
    
    setSelectedFile(file);
  };

  const processUpload = async (file: File): Promise<Attachment | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, file, { 
          cacheControl: '3600', 
          upsert: false 
        });

      if (uploadError) throw uploadError;

      return {
        name: file.name,
        type: file.type,
        size: file.size,
        data: data.path
      };
    } catch (err: any) {
      console.error('Erro detalhado no upload:', err);
      if (err.message?.includes('bucket_not_found') || err.error === 'bucket_not_found') {
        alert('Erro: O bucket "chat_attachments" não foi encontrado no Supabase. Por favor, crie o bucket no painel do Supabase.');
      } else {
        alert(`Falha ao subir o arquivo: ${err.message || 'Erro desconhecido'}. Tente novamente.`);
      }
      return null;
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const textTrimmed = (newMessage ?? '').trim();
    const hasText = textTrimmed.length > 0;
    const hasFile = !!selectedFile;
    
    if (!hasText && !hasFile) return;
    if (isSending) return;

    setIsSending(true);

    try {
      let attachmentToSave: Attachment | undefined = undefined;

      // 1. Upload do arquivo se existir
      if (hasFile && selectedFile) {
        const uploaded = await processUpload(selectedFile);
        if (uploaded) {
          attachmentToSave = uploaded;
        } else {
          // Se falhou o upload e NÃO tem texto, cancela
          if (!hasText) {
            setIsSending(false);
            return;
          }
        }
      }

      // 2. Envio da mensagem via App.tsx
      await onSendMessage(textTrimmed, attachmentToSave);

      // 3. Reset do estado
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error) {
      console.error('Erro crítico no envio:', error);
      // Mantém o arquivo selecionado para retry se o erro for no banco e não no upload
    } finally {
      setIsSending(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon size={18} />;
    if (type.includes('pdf')) return <FileText size={18} className="text-rose-500" />;
    return <FileText size={18} className="text-indigo-500" />;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Header do Chat */}
      <div className="h-20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <UserAvatar user={targetUser} className="w-12 h-12" showStatus={true} />
          <div>
            <h2 className="font-black text-slate-800 dark:text-white leading-tight">{targetUser.name}</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {roleLabels[targetUser.role] || targetUser.role} • {targetUser.is_online ? 'Ativo agora' : 'Offline'}
            </p>
          </div>
        </div>
        <button className="p-3 text-slate-300 hover:text-indigo-600 transition-all"><MoreVertical size={20} /></button>
      </div>

      {/* Listagem de Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/10 custom-scroll">
        {conversation.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30 select-none">
            <MessageSquare size={48} className="mb-4" />
            <p className="font-bold text-sm">Nenhuma mensagem ainda.<br/>Comece uma conversa agora!</p>
          </div>
        ) : (
          conversation.map((msg) => {
            const isMe = msg.fromUserId === currentUser.id;
            const msgDate = new Date(msg.timestamp);
            const isImage = msg.attachment?.type.startsWith('image/');
            const cachedUrl = msg.attachment ? signedUrls[msg.attachment.data]?.url : null;
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[80%] md:max-w-[65%] space-y-1`}>
                  <div className={`relative rounded-[24px] px-5 py-3.5 shadow-sm text-sm 
                    ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700/50'}
                  `}>
                    {msg.text && <p className="leading-relaxed font-medium mb-1 whitespace-pre-wrap">{msg.text}</p>}
                    
                    {msg.attachment && (
                      <div className={`p-3 rounded-2xl flex flex-col gap-3 border ${isMe ? 'bg-white/10 border-white/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700'} ${msg.text ? 'mt-3' : ''}`}>
                        {isImage && cachedUrl ? (
                          <div className="relative group/img overflow-hidden rounded-xl bg-black/5">
                            <img src={cachedUrl} alt="Anexo" className="max-h-80 object-contain w-full transition-transform group-hover/img:scale-105" />
                            <a href={cachedUrl} target="_blank" rel="noopener" className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-xs uppercase tracking-widest">
                               Ver em tela cheia
                            </a>
                          </div>
                        ) : isImage ? (
                          <div className="w-full h-40 flex flex-col items-center justify-center bg-slate-200/20 rounded-xl animate-pulse">
                            <ImageIcon className="text-slate-400 mb-2" size={32} />
                            <span className="text-[10px] uppercase font-black text-slate-400">Carregando preview...</span>
                          </div>
                        ) : null}

                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${isMe ? 'bg-white/20' : 'bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700'}`}>
                            {getFileIcon(msg.attachment.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-black truncate ${isMe ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{msg.attachment.name}</p>
                            <p className={`text-[10px] font-bold opacity-60 ${isMe ? 'text-indigo-100' : 'text-slate-400'}`}>{formatSize(msg.attachment.size)}</p>
                          </div>
                          {cachedUrl && (
                            <a 
                              href={`${cachedUrl}&download=${msg.attachment.name}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={`p-2 rounded-xl hover:bg-black/10 transition-colors ${isMe ? 'text-white' : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'}`}
                            >
                              <Download size={18} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {new Intl.DateTimeFormat('pt-BR', {hour: '2-digit', minute: '2-digit'}).format(msgDate)}
                    </p>
                    {isMe && <CheckCircle2 size={10} className="text-indigo-400" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer de Mensagem */}
      <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/50">
        <form onSubmit={handleSend} className="space-y-4">
          {selectedFile && (
            <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-[24px] animate-in slide-in-from-bottom-4 group">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                {selectedFile.type.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-white truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-indigo-500 font-black uppercase">{formatSize(selectedFile.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                {isSending ? (
                   <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-sm">
                      <Loader2 className="animate-spin text-indigo-600" size={14} />
                      <span className="text-[10px] font-black uppercase text-indigo-600">Subindo...</span>
                   </div>
                ) : (
                  <button type="button" onClick={() => setSelectedFile(null)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all">
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelection} 
              className="hidden" 
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            />
            <button 
              type="button" 
              disabled={isSending} 
              onClick={() => fileInputRef.current?.click()} 
              className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-2xl transition-all disabled:opacity-50"
              title="Anexar arquivo"
            >
              <Paperclip size={24} />
            </button>
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isSending ? "Enviando arquivo..." : "Escreva sua mensagem..."}
                disabled={isSending}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-[24px] px-6 py-4.5 text-sm focus:bg-white dark:focus:bg-slate-950 focus:ring-4 ring-indigo-500/10 outline-none transition-all dark:text-white font-medium"
              />
            </div>
            <button 
              type="submit"
              disabled={isSending || (!newMessage.trim() && !selectedFile)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-4.5 rounded-[24px] transition-all disabled:opacity-40 shadow-xl shadow-indigo-600/30 active:scale-95"
            >
              {isSending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
