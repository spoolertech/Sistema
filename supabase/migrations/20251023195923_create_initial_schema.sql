/*
  # Sistema de Gestión de Soporte Técnico - Schema Inicial

  ## 1. Tablas Principales
  
  ### `tenants` - Multi-tenant support
    - `id` (uuid, primary key)
    - `name` (text) - Nombre de la empresa/oficina
    - `owner_id` (uuid) - Usuario propietario
    - `created_at` (timestamp)
  
  ### `users` - Usuarios del sistema
    - Se usa la tabla auth.users de Supabase
    - Extendemos con un perfil
  
  ### `profiles` - Perfil de usuarios
    - `id` (uuid, primary key, references auth.users)
    - `tenant_id` (uuid, references tenants)
    - `full_name` (text)
    - `email` (text)
    - `role` (text) - admin, tecnico, consulta
    - `created_at` (timestamp)
  
  ### `clients` - Clientes abonados
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, references tenants)
    - `client_number` (text, unique per tenant)
    - `name` (text) - Razón social / Nombre
    - `cuit` (text)
    - `email` (text)
    - `phone` (text)
    - `address` (text)
    - `status` (text) - activo, inactivo, moroso
    - `subscription_type` (text) - mensual, bimestral, trimestral, etc
    - `subscription_value` (decimal)
    - `included_hours` (decimal)
    - `consumed_hours` (decimal)
    - `ipc_adjustment_period` (text) - trimestral, cuatrimestral, semestral
    - `last_value_update` (date)
    - `next_value_update` (date)
    - `notes` (text)
    - `created_at` (timestamp)
  
  ### `occasional_clients` - Clientes eventuales
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, references tenants)
    - `client_number` (text, unique per tenant)
    - `name` (text)
    - `cuit` (text, nullable)
    - `email` (text)
    - `phone` (text)
    - `notes` (text)
    - `created_at` (timestamp)
  
  ### `services` - Trabajos/Servicios realizados
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, references tenants)
    - `client_id` (uuid, references clients, nullable)
    - `occasional_client_id` (uuid, references occasional_clients, nullable)
    - `request_date` (date)
    - `completion_date` (date, nullable)
    - `description` (text)
    - `service_type` (text) - abono, eventual, urgencia, remoto, presencial
    - `status` (text) - pendiente, en_proceso, terminado, facturado, cobrado
    - `hours_spent` (decimal)
    - `value` (decimal)
    - `budget_id` (uuid, nullable)
    - `invoice_id` (uuid, nullable)
    - `notes` (text)
    - `created_at` (timestamp)
  
  ### `invoices` - Facturas
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, references tenants)
    - `client_id` (uuid, references clients, nullable)
    - `occasional_client_id` (uuid, references occasional_clients, nullable)
    - `invoice_number` (text)
    - `issue_date` (date)
    - `period` (text) - Período facturado
    - `subtotal` (decimal)
    - `iva` (decimal)
    - `total` (decimal)
    - `pdf_url` (text, nullable)
    - `status` (text) - emitida, enviada, cobrada, vencida
    - `payment_date` (date, nullable)
    - `notes` (text)
    - `created_at` (timestamp)
  
  ### `invoice_items` - Items de factura
    - `id` (uuid, primary key)
    - `invoice_id` (uuid, references invoices)
    - `description` (text)
    - `quantity` (decimal)
    - `unit_price` (decimal)
    - `total` (decimal)
  
  ### `account_movements` - Movimientos de cuenta corriente
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, references tenants)
    - `client_id` (uuid, references clients, nullable)
    - `occasional_client_id` (uuid, references occasional_clients, nullable)
    - `movement_date` (date)
    - `type` (text) - factura, pago, nota_credito, nota_debito
    - `description` (text)
    - `debit` (decimal, default 0)
    - `credit` (decimal, default 0)
    - `balance` (decimal)
    - `invoice_id` (uuid, references invoices, nullable)
    - `created_at` (timestamp)
  
  ### `ipc_history` - Historial de IPC
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, references tenants)
    - `period` (text) - YYYY-MM
    - `ipc_value` (decimal)
    - `accumulated` (decimal)
    - `fetched_at` (timestamp)
  
  ### `value_adjustments` - Historial de ajustes de valores
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, references tenants)
    - `client_id` (uuid, references clients)
    - `adjustment_date` (date)
    - `old_value` (decimal)
    - `new_value` (decimal)
    - `ipc_percentage` (decimal)
    - `notes` (text)
    - `created_at` (timestamp)
  
  ### `calendar_events` - Eventos de agenda
    - `id` (uuid, primary key)
    - `tenant_id` (uuid, references tenants)
    - `client_id` (uuid, references clients, nullable)
    - `occasional_client_id` (uuid, references occasional_clients, nullable)
    - `event_date` (timestamp)
    - `end_date` (timestamp)
    - `title` (text)
    - `description` (text)
    - `event_type` (text) - visita, llamada, reunion, otro
    - `status` (text) - pendiente, confirmado, realizado, cancelado
    - `google_calendar_id` (text, nullable)
    - `created_at` (timestamp)

  ## 2. Security
    - Habilitar RLS en todas las tablas
    - Políticas restrictivas por tenant_id
    - Solo usuarios autenticados pueden acceder
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'tecnico', 'consulta')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_number text NOT NULL,
  name text NOT NULL,
  cuit text,
  email text,
  phone text,
  address text,
  status text DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo', 'moroso')),
  subscription_type text,
  subscription_value decimal(10,2) DEFAULT 0,
  included_hours decimal(10,2) DEFAULT 0,
  consumed_hours decimal(10,2) DEFAULT 0,
  ipc_adjustment_period text CHECK (ipc_adjustment_period IN ('trimestral', 'cuatrimestral', 'semestral')),
  last_value_update date,
  next_value_update date,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, client_number)
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create occasional_clients table
CREATE TABLE IF NOT EXISTS occasional_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_number text NOT NULL,
  name text NOT NULL,
  cuit text,
  email text,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, client_number)
);

ALTER TABLE occasional_clients ENABLE ROW LEVEL SECURITY;

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  occasional_client_id uuid REFERENCES occasional_clients(id) ON DELETE SET NULL,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  completion_date date,
  description text NOT NULL,
  service_type text CHECK (service_type IN ('abono', 'eventual', 'urgencia', 'remoto', 'presencial')),
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'terminado', 'facturado', 'cobrado')),
  hours_spent decimal(10,2) DEFAULT 0,
  value decimal(10,2) DEFAULT 0,
  budget_id uuid,
  invoice_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  occasional_client_id uuid REFERENCES occasional_clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  period text,
  subtotal decimal(10,2) DEFAULT 0,
  iva decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  pdf_url text,
  status text DEFAULT 'emitida' CHECK (status IN ('emitida', 'enviada', 'cobrada', 'vencida')),
  payment_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity decimal(10,2) DEFAULT 1,
  unit_price decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create account_movements table
CREATE TABLE IF NOT EXISTS account_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  occasional_client_id uuid REFERENCES occasional_clients(id) ON DELETE SET NULL,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  type text CHECK (type IN ('factura', 'pago', 'nota_credito', 'nota_debito')),
  description text NOT NULL,
  debit decimal(10,2) DEFAULT 0,
  credit decimal(10,2) DEFAULT 0,
  balance decimal(10,2) DEFAULT 0,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;

-- Create ipc_history table
CREATE TABLE IF NOT EXISTS ipc_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  period text NOT NULL,
  ipc_value decimal(10,4) DEFAULT 0,
  accumulated decimal(10,4) DEFAULT 0,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, period)
);

ALTER TABLE ipc_history ENABLE ROW LEVEL SECURITY;

-- Create value_adjustments table
CREATE TABLE IF NOT EXISTS value_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  adjustment_date date NOT NULL DEFAULT CURRENT_DATE,
  old_value decimal(10,2) DEFAULT 0,
  new_value decimal(10,2) DEFAULT 0,
  ipc_percentage decimal(10,4) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE value_adjustments ENABLE ROW LEVEL SECURITY;

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  occasional_client_id uuid REFERENCES occasional_clients(id) ON DELETE SET NULL,
  event_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  title text NOT NULL,
  description text,
  event_type text DEFAULT 'visita' CHECK (event_type IN ('visita', 'llamada', 'reunion', 'otro')),
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'realizado', 'cancelado')),
  google_calendar_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create own tenant"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for clients (restrictive by tenant)
CREATE POLICY "Users can view clients in their tenant"
  ON clients FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert clients in their tenant"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update clients in their tenant"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete clients in their tenant"
  ON clients FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for occasional_clients
CREATE POLICY "Users can view occasional clients in their tenant"
  ON occasional_clients FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert occasional clients in their tenant"
  ON occasional_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update occasional clients in their tenant"
  ON occasional_clients FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete occasional clients in their tenant"
  ON occasional_clients FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for services
CREATE POLICY "Users can view services in their tenant"
  ON services FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert services in their tenant"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update services in their tenant"
  ON services FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete services in their tenant"
  ON services FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices in their tenant"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert invoices in their tenant"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update invoices in their tenant"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete invoices in their tenant"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for invoice_items
CREATE POLICY "Users can view invoice items in their tenant"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert invoice items in their tenant"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update invoice items in their tenant"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete invoice items in their tenant"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for account_movements
CREATE POLICY "Users can view account movements in their tenant"
  ON account_movements FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert account movements in their tenant"
  ON account_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update account movements in their tenant"
  ON account_movements FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete account movements in their tenant"
  ON account_movements FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for ipc_history
CREATE POLICY "Users can view IPC history in their tenant"
  ON ipc_history FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert IPC history in their tenant"
  ON ipc_history FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for value_adjustments
CREATE POLICY "Users can view value adjustments in their tenant"
  ON value_adjustments FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert value adjustments in their tenant"
  ON value_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for calendar_events
CREATE POLICY "Users can view calendar events in their tenant"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert calendar events in their tenant"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update calendar events in their tenant"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete calendar events in their tenant"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_occasional_clients_tenant ON occasional_clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_client ON services(client_id);
CREATE INDEX IF NOT EXISTS idx_services_occasional_client ON services(occasional_client_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_account_movements_tenant ON account_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_client ON account_movements(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);