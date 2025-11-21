-- ============================================
-- ALTERAÇÕES PARA EVENTOS
-- ============================================

-- 1. Adicionar campo para data de encerramento de inscrições
ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS data_encerramento_inscricoes TIMESTAMP WITH TIME ZONE;

-- 2. Adicionar campo para público-alvo (aluno, organizador)
ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS publico_alvo_perfil VARCHAR(20) DEFAULT 'aluno' CHECK (publico_alvo_perfil IN ('aluno', 'organizador'));

-- 3. Adicionar campo para indicar se não requer validação de localização
ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS nao_requer_validacao_localizacao BOOLEAN DEFAULT FALSE;

-- 4. Tornar certificado obrigatório (gera_certificado sempre true)
-- Primeiro, atualizar eventos existentes sem certificado
UPDATE eventos
SET gera_certificado = TRUE
WHERE gera_certificado IS NULL OR gera_certificado = FALSE;

-- Depois, alterar a coluna para NOT NULL com default TRUE
ALTER TABLE eventos
ALTER COLUMN gera_certificado SET DEFAULT TRUE,
ALTER COLUMN gera_certificado SET NOT NULL;

-- 5. Remover coluna requisitos (se existir)
ALTER TABLE eventos
DROP COLUMN IF EXISTS requisitos;

-- 6. Atualizar coluna publico_alvo existente (se houver dados antigos)
-- Converter valores antigos de publico_alvo para publico_alvo_perfil se necessário
UPDATE eventos
SET publico_alvo_perfil = 'aluno'
WHERE publico_alvo_perfil IS NULL;

