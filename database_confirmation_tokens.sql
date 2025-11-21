-- ============================================
-- TABELA DE TOKENS DE CONFIRMAÇÃO DE EMAIL
-- ============================================

CREATE TABLE IF NOT EXISTS email_confirmation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL REFERENCES usuarios(email) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_confirmation_token ON email_confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_confirmation_email ON email_confirmation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_confirmation_expires ON email_confirmation_tokens(expires_at);

-- Adicionar campo email_confirmado na tabela usuarios se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'email_confirmado'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN email_confirmado BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Função para limpar tokens expirados
CREATE OR REPLACE FUNCTION limpar_tokens_expirados()
RETURNS void AS $$
BEGIN
    DELETE FROM email_confirmation_tokens
    WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql;

-- Políticas RLS
ALTER TABLE email_confirmation_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tokens são públicos para criação" ON email_confirmation_tokens;
DROP POLICY IF EXISTS "Tokens são públicos para validação" ON email_confirmation_tokens;

CREATE POLICY "Tokens são públicos para criação" ON email_confirmation_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Tokens são públicos para validação" ON email_confirmation_tokens
    FOR SELECT USING (true);

CREATE POLICY "Tokens podem ser atualizados para marcar como usado" ON email_confirmation_tokens
    FOR UPDATE USING (true);

