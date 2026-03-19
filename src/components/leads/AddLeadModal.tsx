'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

export default function AddLeadModal({ onClose }: { onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const leadData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      source: formData.get('source') as string,
      notes: formData.get('notes') as string,
      status: 'new',
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('leads').insert({
      ...leadData,
      user_id: user.id,
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Error adding lead:', error);
      alert('Ошибка при добавлении лида');
    } else {
      onClose();
    }
  };

  const inputClass = "w-full px-4 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all placeholder-gray-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Добавить лида</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="add-lead-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя *</label>
              <input required name="name" type="text" className={inputClass} placeholder="Иван Иванов" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input name="email" type="email" className={inputClass} placeholder="ivan@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
              <input name="phone" type="tel" className={inputClass} placeholder="+7 999 000 00 00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Источник</label>
              <select name="source" className={`${inputClass} bg-white`}>
                <option value="manual">Вручную</option>
                <option value="website">Сайт</option>
                <option value="referral">Реферал</option>
                <option value="other">Другое</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Заметки</label>
              <textarea name="notes" rows={3} className={inputClass} placeholder="Дополнительная информация о клиенте..." />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Отмена
          </button>
          <button type="submit" form="add-lead-form" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm">
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
