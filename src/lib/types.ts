export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'won';

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: LeadStatus;
  notes?: string;
  ai_summary?: string;
  raw_payload?: string | object;
  created_at: string;
  updated_at: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string;
  user_id?: string;
  type: string;
  payload?: string | object;
  created_at: string;
}
