import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          full_name: string;
          email: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          full_name: string;
          email: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          full_name?: string;
          email?: string;
          role?: string;
          created_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          tenant_id: string;
          client_number: string;
          name: string;
          cuit: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          status: string;
          subscription_type: string | null;
          subscription_value: number;
          included_hours: number;
          consumed_hours: number;
          ipc_adjustment_period: string | null;
          last_value_update: string | null;
          next_value_update: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_number: string;
          name: string;
          cuit?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          status?: string;
          subscription_type?: string | null;
          subscription_value?: number;
          included_hours?: number;
          consumed_hours?: number;
          ipc_adjustment_period?: string | null;
          last_value_update?: string | null;
          next_value_update?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_number?: string;
          name?: string;
          cuit?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          status?: string;
          subscription_type?: string | null;
          subscription_value?: number;
          included_hours?: number;
          consumed_hours?: number;
          ipc_adjustment_period?: string | null;
          last_value_update?: string | null;
          next_value_update?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      occasional_clients: {
        Row: {
          id: string;
          tenant_id: string;
          client_number: string;
          name: string;
          cuit: string | null;
          email: string | null;
          phone: string | null;
          notes: string | null;
          created_at: string;
        };
      };
      services: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string | null;
          occasional_client_id: string | null;
          request_date: string;
          completion_date: string | null;
          description: string;
          service_type: string | null;
          status: string;
          hours_spent: number;
          value: number;
          budget_id: string | null;
          invoice_id: string | null;
          notes: string | null;
          created_at: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string | null;
          occasional_client_id: string | null;
          invoice_number: string;
          issue_date: string;
          period: string | null;
          subtotal: number;
          iva: number;
          total: number;
          pdf_url: string | null;
          status: string;
          payment_date: string | null;
          notes: string | null;
          created_at: string;
        };
      };
      account_movements: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string | null;
          occasional_client_id: string | null;
          movement_date: string;
          type: string | null;
          description: string;
          debit: number;
          credit: number;
          balance: number;
          invoice_id: string | null;
          created_at: string;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string | null;
          occasional_client_id: string | null;
          event_date: string;
          end_date: string;
          title: string;
          description: string | null;
          event_type: string;
          status: string;
          google_calendar_id: string | null;
          created_at: string;
        };
      };
    };
  };
};
