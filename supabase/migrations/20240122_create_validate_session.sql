-- Create validate_session function to bypass RLS for session checks
create or replace function public.validate_session(p_email text, p_token text)
returns table (
  id uuid,
  email text,
  nome_completo text,
  tipo text,
  avatar_url text,
  session_expires_at timestamptz,
  last_activity_at timestamptz,
  email_confirmado boolean
)
security definer
language plpgsql
as $$
begin
  return query
  select
    u.id,
    u.email,
    u.nome_completo,
    u.tipo,
    u.avatar_url,
    u.session_expires_at,
    u.last_activity_at,
    u.email_confirmado
  from public.usuarios u
  where u.email = p_email
  and u.session_token = p_token;
end;
$$;

-- Create update_session_activity function
create or replace function public.update_session_activity(p_email text, p_token text)
returns void
security definer
language plpgsql
as $$
begin
  update public.usuarios
  set 
    last_activity_at = now(),
    session_expires_at = now() + interval '60 minutes'
  where email = p_email
  and session_token = p_token;
end;
$$;

-- Grant execute permission to anon and authenticated
grant execute on function public.validate_session(text, text) to anon, authenticated;
grant execute on function public.update_session_activity(text, text) to anon, authenticated;
