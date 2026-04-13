-- Run this in Supabase SQL editor after supabase.sql.
-- Creates supplier_reports with RLS so users only access their own rows.

create table if not exists public.supplier_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  company_name text not null,
  country text not null,
  platform text,
  category text not null,

  risk_score integer not null check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null check (risk_level in ('LOW','MEDIUM','HIGH')),
  summary text not null,

  flags jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,

  verdict_class text not null check (verdict_class in ('proceed','caution','avoid')),
  verdict_headline text not null,
  verdict_detail text not null
);

create index if not exists supplier_reports_user_created_at_idx
  on public.supplier_reports (user_id, created_at desc);

create index if not exists supplier_reports_user_risk_level_idx
  on public.supplier_reports (user_id, risk_level);

alter table public.supplier_reports enable row level security;

drop policy if exists "supplier_reports_select_own" on public.supplier_reports;
create policy "supplier_reports_select_own"
on public.supplier_reports
for select
using (auth.uid() = user_id);

drop policy if exists "supplier_reports_insert_own" on public.supplier_reports;
create policy "supplier_reports_insert_own"
on public.supplier_reports
for insert
with check (auth.uid() = user_id);

