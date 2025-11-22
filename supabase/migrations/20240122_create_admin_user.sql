-- Create admin user if not exists
insert into public.usuarios (
  email,
  nome_completo,
  matricula,
  tipo,
  email_confirmado,
  created_at,
  updated_at
)
values (
  'admin@iffar.edu.br',
  'Administrador do Sistema',
  'ADMIN001',
  'admin',
  true,
  now(),
  now()
)
on conflict (email) do update
set 
  tipo = 'admin',
  email_confirmado = true;
