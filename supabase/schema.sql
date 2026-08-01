-- AI Lead-Gen & Outreach Agent — Database Schema
-- Run this in the Supabase SQL Editor on a fresh project to set up all tables and RLS policies.

-- PROJECTS TABLE
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  icp_industry text,
  icp_company_size text,
  icp_role text,
  icp_region text,
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- LEADS TABLE
create table leads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  name text,
  company text,
  role text,
  source text check (source in ('csv', 'manual')),
  domain text,
  email text,
  enrichment_data jsonb,
  score int,
  score_explanation text,
  score_criteria jsonb,
  created_at timestamptz default now()
);

alter table leads enable row level security;

create policy "Users can view leads on their own projects"
  on leads for select
  using (
    exists (
      select 1 from projects
      where projects.id = leads.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can insert leads on their own projects"
  on leads for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = leads.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update leads on their own projects"
  on leads for update
  using (
    exists (
      select 1 from projects
      where projects.id = leads.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete leads on their own projects"
  on leads for delete
  using (
    exists (
      select 1 from projects
      where projects.id = leads.project_id
      and projects.user_id = auth.uid()
    )
  );

-- OUTREACH DRAFTS TABLE
create table outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade not null,
  channel text check (channel in ('email', 'linkedin')),
  subject text,
  body text,
  tone text,
  created_at timestamptz default now()
);

alter table outreach_drafts enable row level security;

create policy "Users can view drafts on their own leads"
  on outreach_drafts for select
  using (
    exists (
      select 1 from leads
      join projects on projects.id = leads.project_id
      where leads.id = outreach_drafts.lead_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can insert drafts on their own leads"
  on outreach_drafts for insert
  with check (
    exists (
      select 1 from leads
      join projects on projects.id = leads.project_id
      where leads.id = outreach_drafts.lead_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update drafts on their own leads"
  on outreach_drafts for update
  using (
    exists (
      select 1 from leads
      join projects on projects.id = leads.project_id
      where leads.id = outreach_drafts.lead_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete drafts on their own leads"
  on outreach_drafts for delete
  using (
    exists (
      select 1 from leads
      join projects on projects.id = leads.project_id
      where leads.id = outreach_drafts.lead_id
      and projects.user_id = auth.uid()
    )
  );