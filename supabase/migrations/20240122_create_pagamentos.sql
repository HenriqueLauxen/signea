-- Create pagamentos table
create table if not exists public.pagamentos (
  id uuid default gen_random_uuid() primary key,
  inscricao_id uuid references public.inscricoes(id) on delete cascade,
  valor decimal(10, 2) not null,
  status text check (status in ('pendente', 'aprovado', 'rejeitado')) default 'pendente',
  metodo_pagamento text,
  comprovante_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.pagamentos enable row level security;

create policy "Pagamentos visible to admin and organizer"
  on public.pagamentos for select
  using (true); -- Simplify for now, ideally check event organizer

create policy "Pagamentos editable by admin and organizer"
  on public.pagamentos for all
  using (true); -- Simplify for now

-- Add indexes
create index if not exists pagamentos_inscricao_id_idx on public.pagamentos(inscricao_id);
