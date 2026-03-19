'use client';

import { Lead } from '@/lib/types';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AddLeadModal from './AddLeadModal';
import LeadModal from './LeadModal';
import { Trash2 } from 'lucide-react';

export default function LeadsClient({ initialLeads, userId }: { initialLeads: Lead[], userId: string }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads(prev => [payload.new as Lead, ...prev])
          }
          if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(l => l.id === payload.new.id ? payload.new as Lead : l))
          }
          if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const handleDelete = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation()
    if (!confirm('Удалить лид? Это действие нельзя отменить.')) return
    setDeletingId(leadId)
    await supabase.from('leads').delete().eq('id', leadId)
    setDeletingId(null)
  }

  const total = leads.length;
  const newCount = leads.filter((l) => l.status === 'new').length;
  const inProgressCount = leads.filter((l) => l.status === 'contacted' || l.status === 'qualified').length;
  const closedCount = leads.filter((l) => l.status === 'won' || l.status === 'lost').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-blue-100 text-blue-800">Новый</span>;
      case 'contacted':
        return <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">В контакте</span>;
      case 'qualified':
        return <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-green-100 text-green-800">Квалифицирован</span>;
      case 'lost':
        return <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-red-100 text-red-800">Проигран</span>;
      case 'won':
        return <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-purple-100 text-purple-800">Выигран</span>;
      default:
        return <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Лиды</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
        >
          Добавить лид
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Всего</h3>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Новые</h3>
          <p className="text-3xl font-bold text-gray-900">{newCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">В работе</h3>
          <p className="text-3xl font-bold text-gray-900">{inProgressCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Закрытые</h3>
          <p className="text-3xl font-bold text-gray-900">{closedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Имя</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Телефон</th>
                <th className="px-6 py-4 font-medium">Источник</th>
                <th className="px-6 py-4 font-medium">Статус</th>
                <th className="px-6 py-4 font-medium">Дата</th>
                <th className="px-6 py-4 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Нет лидов. Создайте своего первого лида!
                  </td>
                </tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
                  <td className="px-6 py-4 text-gray-600">{lead.email || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{lead.phone || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{lead.source || '-'}</td>
                  <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        Подробнее
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, lead.id)}
                        disabled={deletingId === lead.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30"
                        title="Удалить лид"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && <AddLeadModal onClose={() => setIsAddModalOpen(false)} />}
      {selectedLead && <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </div>
  );
}