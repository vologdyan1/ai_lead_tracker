import { createClient } from '@/lib/supabase/server';
import LeadsClient from '@/components/leads/LeadsClient';
import { Lead } from '@/lib/types';

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
  }

  return (
    <LeadsClient initialLeads={(leads as Lead[]) || []} userId={user?.id || ''} />
  );
}
