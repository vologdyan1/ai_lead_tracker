'use client';

import { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { X, Sparkles, Mail, Phone, Globe, Calendar, FileText } from 'lucide-react';

export default function LeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState(lead.ai_summary || '');
  const supabase = createClient();

  useEffect(() => {
    if (!lead.ai_summary) {
      generateAiSummary()
    }
  }, [lead.id])

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as LeadStatus);
    await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await supabase.from('leads').update({ notes }).eq('id', lead.id);
    setIsSavingNotes(false);
  };

  const generateAiSummary = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Ошибка генерации саммари');
      }
      if (!data.summary) {
        throw new Error('Пустой ответ от AI');
      }
      setAiSummary(data.summary);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Не удалось сгенерировать AI саммари');
    } finally {
      setLoadingAI(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'won': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadge(status)}`}>
              {status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Контактные данные</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {lead.email ? (
                  <div className="flex items-center text-sm text-gray-700">
                    <Mail className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                    {lead.email}
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-gray-400 italic">
                    <Mail className="w-4 h-4 mr-3 text-gray-300 shrink-0" />
                    Email не указан
                  </div>
                )}
                {lead.phone ? (
                  <div className="flex items-center text-sm text-gray-700">
                    <Phone className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                    {lead.phone}
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-gray-400 italic">
                    <Phone className="w-4 h-4 mr-3 text-gray-300 shrink-0" />
                    Телефон не указан
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-700 border-t border-gray-200 pt-3">
                  <Globe className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                  Источник: {lead.source || 'Вручную'}
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <Calendar className="w-4 h-4 mr-3 text-gray-400 shrink-0" />
                  Добавлен: {new Date(lead.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Управление статусом</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm text-gray-600 mb-2 font-medium">Текущий статус</label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none bg-white transition-all font-medium"
                >
                  <option value="new">Новый</option>
                  <option value="contacted">В контакте</option>
                  <option value="qualified">Квалифицирован</option>
                  <option value="lost">Проигран</option>
                  <option value="won">Выигран</option>
                </select>
                <p className="text-xs text-gray-500 mt-3">
                  Статус будет немедленно сохранен
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2" /> Заметки менеджера
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all placeholder-gray-400 mb-3"
              placeholder="Опишите договоренности, вопросы или другую информацию..."
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes || notes === lead.notes}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isSavingNotes ? 'Сохранение...' : 'Сохранить заметку'}
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-purple-600 uppercase tracking-widest pl-1 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" /> AI Summary
              </h3>
            </div>
            {loadingAI ? (
              <div className="p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <Sparkles className="w-4 h-4 animate-pulse text-purple-500" />
                  Анализирую лида...
                </div>
              </div>
            ) : aiSummary ? (
              <div className="space-y-3">
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-sm text-purple-900 leading-relaxed whitespace-pre-wrap break-words">
                  {aiSummary}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={generateAiSummary}
                    disabled={loadingAI}
                    className="inline-flex items-center px-4 py-2 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Обновить саммари
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
                  Не удалось сгенерировать саммари. Попробуйте вручную.
                </p>
                <button
                  onClick={generateAiSummary}
                  disabled={loadingAI}
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Сгенерировать AI саммари
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}