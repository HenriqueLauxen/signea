-- ============================================
-- SISTEMA DE COORDENADORES E CERTIFICADOS
-- ============================================

-- 1. Criar tabela de coordenadores
CREATE TABLE IF NOT EXISTS coordenadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nome, descricao)
);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_coordenadores_ativo 
ON coordenadores(ativo);

-- 2. Adicionar campo coordenador_id na tabela eventos
ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS coordenador_id UUID REFERENCES coordenadores(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_eventos_coordenador_id 
ON eventos(coordenador_id);

-- 3. Adicionar campo hash_sha256 na tabela certificados (se não existir)
-- O hash será usado na URL do certificado
ALTER TABLE certificados 
ADD COLUMN IF NOT EXISTS hash_sha256 VARCHAR(64) UNIQUE;

-- Criar índice para melhorar performance na busca por hash
CREATE INDEX IF NOT EXISTS idx_certificados_hash_sha256 
ON certificados(hash_sha256);

-- 4. Atualizar certificados existentes que não têm hash_sha256
-- Usar codigo_validacao como base se já existir, senão gerar novo hash
UPDATE certificados 
SET hash_sha256 = ENCODE(
  DIGEST(
    id::TEXT || evento_id::TEXT || usuario_email::TEXT || data_emissao::TEXT,
    'sha256'
  ),
  'hex'
)
WHERE hash_sha256 IS NULL;

-- 5. Criar função para gerar hash SHA256 para certificado
CREATE OR REPLACE FUNCTION gerar_hash_certificado(
  cert_id UUID,
  evento_id UUID,
  usuario_email TEXT,
  data_emissao TIMESTAMP WITH TIME ZONE
)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN ENCODE(
    DIGEST(
      cert_id::TEXT || evento_id::TEXT || usuario_email::TEXT || data_emissao::TEXT,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para atualizar updated_at na tabela coordenadores
CREATE OR REPLACE FUNCTION atualizar_updated_at_coordenadores()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_updated_at_coordenadores
BEFORE UPDATE ON coordenadores
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at_coordenadores();

-- 7. Inserir alguns coordenadores de exemplo (ajustar conforme necessário)
INSERT INTO coordenadores (nome, descricao) VALUES
  ('Coordenador de Sistemas para Internet', 'Coordenador do curso de Sistemas para Internet'),
  ('Coordenador de Análise e Desenvolvimento de Sistemas', 'Coordenador do curso de ADS'),
  ('Coordenador de Engenharia de Software', 'Coordenador do curso de Engenharia de Software'),
  ('Coordenador Geral de Tecnologia', 'Coordenador Geral da área de Tecnologia')
ON CONFLICT (nome, descricao) DO NOTHING;

-- 8. Comentários para documentação
COMMENT ON TABLE coordenadores IS 'Tabela de coordenadores de cursos que podem assinar certificados';
COMMENT ON COLUMN eventos.coordenador_id IS 'ID do coordenador responsável por assinar os certificados deste evento';
COMMENT ON COLUMN certificados.hash_sha256 IS 'Hash SHA256 único do certificado, usado na URL pública de visualização';

-- ============================================
-- FIM DAS ALTERAÇÕES
-- ============================================

