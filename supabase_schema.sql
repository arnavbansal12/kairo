-- KAIRO: Enterprise SaaS Schema for Supabase
-- Based on "CTO-Level" Architecture: Multi-tenant, RLS, Audit Logs, AI-Ready

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Enable Vector Search for RAG

-- 2. ENUMS (Better Data Integrity)
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'accountant', 'viewer');
CREATE TYPE doc_status AS ENUM ('pending', 'processing', 'reviewed', 'approved', 'rejected');
CREATE TYPE ai_model_type AS ENUM ('ocr', 'logic', 'chat', 'fast_chat');

-- ========================================================================
-- 3. CORE IDENTITY & ORGANIZATION (Multi-Tenancy Root)
-- ========================================================================

-- Profiles: Extends Supabase Auth (One-to-One with auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations: The "Tenant"
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE, -- For URL routing e.g. /org/acme-corp
    subscription_plan TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members: Linking Users to Orgs
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

-- ========================================================================
-- 4. BUSINESS DATA (Scoped by Organization)
-- ========================================================================

-- Clients: Customers of the Organization
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    company_name TEXT NOT NULL,
    gstin TEXT,
    pan TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, company_name) -- Scoped Uniqueness
);

-- Vendors: Suppliers of the Organization
CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    vendor_name TEXT NOT NULL,
    gstin TEXT,
    pan TEXT,
    email TEXT,
    phone TEXT,
    vendor_type TEXT DEFAULT 'supplier',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, vendor_name)
);

-- Documents: Invoices, Receipts, etc.
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    client_id UUID REFERENCES public.clients(id),
    vendor_id UUID REFERENCES public.vendors(id),
    
    -- Metadata
    doc_type TEXT DEFAULT 'invoice',
    file_path TEXT, -- Storage path
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    -- Extracted Data (using correct types)
    invoice_no TEXT,
    invoice_date DATE,
    due_date DATE,
    currency TEXT DEFAULT 'INR',
    taxable_value NUMERIC(18, 2) DEFAULT 0,
    tax_amount NUMERIC(18, 2) DEFAULT 0,
    grand_total NUMERIC(18, 2) DEFAULT 0,
    
    -- Status
    status doc_status DEFAULT 'pending',
    review_status TEXT DEFAULT 'pending', -- compatibility
    confidence_score NUMERIC(5, 2), -- 0.00 to 100.00
    
    -- AI & raw data
    json_data JSONB, -- Full extraction result
    summary TEXT,
    
    -- Audit
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items/Line Items (Granular Data)
CREATE TABLE public.document_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    description TEXT,
    hsn_code TEXT,
    quantity NUMERIC(12, 3),
    unit_price NUMERIC(18, 2),
    tax_rate NUMERIC(5, 2),
    total_amount NUMERIC(18, 2)
);

-- ========================================================================
-- 5. AI & AUDIT SYSTEM
-- ========================================================================

-- AI Usage Logs (Cost Tracking)
CREATE TABLE public.ai_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id),
    document_id UUID REFERENCES public.documents(id),
    model_id TEXT, -- e.g. 'gpt-4o', 'llama-3'
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost NUMERIC(10, 6),
    processing_time_ms INTEGER,
    status TEXT, -- 'success', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (Security & Compliance)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login'
    entity_type TEXT NOT NULL, -- 'document', 'client'
    entity_id UUID,
    changes JSONB, -- { "old": {...}, "new": {...} }
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 6. SECURITY & INDEXES
-- ========================================================================

-- Enable Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_processing_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for Performance
CREATE INDEX idx_docs_org ON public.documents(organization_id);
CREATE INDEX idx_docs_date ON public.documents(invoice_date);
CREATE INDEX idx_docs_status ON public.documents(status);
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_vendors_org ON public.vendors(organization_id);

-- RLS Policies (Basic Starter Policy)
-- "Users can view data belonging to their organization"

-- Helper function to get user's orgs
CREATE OR REPLACE FUNCTION get_user_orgs()
RETURNS SETOF UUID AS $$
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Example Policy for Documents
CREATE POLICY "Users browse docs of their orgs"
ON public.documents
FOR SELECT
USING (
    organization_id IN (SELECT get_user_orgs())
);

CREATE POLICY "Users create docs in their orgs"
ON public.documents
FOR INSERT
WITH CHECK (
    organization_id IN (SELECT get_user_orgs())
);

-- Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER update_orgs_modtime BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER update_docs_modtime BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ========================================================================
-- 7. INITIAL SEED (Optional)
-- ========================================================================
-- Create a default organization for the owner if needed
-- (This usually happens on signup via edge function)
