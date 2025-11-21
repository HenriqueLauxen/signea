-- ============================================
-- ALTERAÇÕES PARA SISTEMA DE PRESENÇA COM QRCODE
-- ============================================

-- 1. Adicionar código QRCode (6 dígitos) na tabela eventos
ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS codigo_qrcode VARCHAR(6) UNIQUE;

-- Gerar códigos QRCode para eventos existentes que não têm código
-- (Códigos serão gerados aleatoriamente de 6 caracteres alfanuméricos)
UPDATE eventos 
SET codigo_qrcode = UPPER(
  SUBSTRING(
    MD5(RANDOM()::TEXT || id::TEXT || NOW()::TEXT), 
    1, 6
  )
)
WHERE codigo_qrcode IS NULL;

-- Criar função para gerar código QRCode único (será usada ao criar novos eventos)
CREATE OR REPLACE FUNCTION gerar_codigo_qrcode()
RETURNS VARCHAR(6) AS $$
DECLARE
  codigo VARCHAR(6);
  existe BOOLEAN;
BEGIN
  LOOP
    -- Gera código de 6 caracteres alfanuméricos (A-Z, 0-9)
    codigo := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || NOW()::TEXT || GEN_RANDOM_UUID()::TEXT), 
        1, 6
      )
    );
    
    -- Verifica se o código já existe
    SELECT EXISTS(SELECT 1 FROM eventos WHERE codigo_qrcode = codigo) INTO existe;
    
    -- Se não existe, retorna o código
    IF NOT existe THEN
      RETURN codigo;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar tabela para palavras-chave dos dias do evento
CREATE TABLE IF NOT EXISTS evento_palavras_chave (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  data_evento DATE NOT NULL,
  palavra_chave VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(evento_id, data_evento)
);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_evento_palavras_chave_evento_id 
ON evento_palavras_chave(evento_id);

CREATE INDEX IF NOT EXISTS idx_evento_palavras_chave_palavra_chave 
ON evento_palavras_chave(palavra_chave);

-- 3. Adicionar campo para permitir presença remota (qualquer lugar)
ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS permite_presenca_remota BOOLEAN DEFAULT FALSE;

-- 4. Adicionar campos na tabela presencas para suportar usuários não logados
ALTER TABLE presencas 
ADD COLUMN IF NOT EXISTS matricula VARCHAR(50);

ALTER TABLE presencas 
ADD COLUMN IF NOT EXISTS usuario_logado BOOLEAN DEFAULT TRUE;

ALTER TABLE presencas 
ADD COLUMN IF NOT EXISTS latitude_capturada DOUBLE PRECISION;

ALTER TABLE presencas 
ADD COLUMN IF NOT EXISTS longitude_capturada DOUBLE PRECISION;

ALTER TABLE presencas 
ADD COLUMN IF NOT EXISTS distancia_validada BOOLEAN DEFAULT FALSE;

ALTER TABLE presencas 
ADD COLUMN IF NOT EXISTS palavra_chave_usada VARCHAR(50);

-- 5. Criar função para validar distância entre duas coordenadas (Haversine)
CREATE OR REPLACE FUNCTION calcular_distancia_km(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371; -- Raio da Terra em km
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  -- Converter graus para radianos
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  
  -- Fórmula de Haversine
  a := SIN(dlat/2) * SIN(dlat/2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon/2) * SIN(dlon/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função para gerar palavra-chave aleatória
CREATE OR REPLACE FUNCTION gerar_palavra_chave()
RETURNS VARCHAR(50) AS $$
DECLARE
  palavras TEXT[] := ARRAY[
    'AURORA', 'BRILHO', 'CÉU', 'DESTINO', 'ESTRELA', 'FAROL', 'GALÁXIA', 
    'HARMONIA', 'INFINITO', 'JORNADA', 'KALEIDOSCÓPIO', 'LUMINOSO', 
    'MISTÉRIO', 'NEBULOSA', 'OCEANO', 'PALÁCIO', 'QUASAR', 'RAIO', 
    'SABEDORIA', 'TEMPESTADE', 'UNIVERSO', 'VENTO', 'XENON', 'YIN', 'ZÊNITE',
    'ALPHA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON', 'ZETA', 'ETA', 'THETA',
    'IOTA', 'KAPPA', 'LAMBDA', 'MU', 'NU', 'XI', 'OMICRON', 'PI', 'RHO',
    'SIGMA', 'TAU', 'UPSILON', 'PHI', 'CHI', 'PSI', 'OMEGA'
  ];
  palavra VARCHAR(50);
BEGIN
  -- Seleciona uma palavra aleatória do array
  palavra := palavras[1 + FLOOR(RANDOM() * ARRAY_LENGTH(palavras, 1))];
  
  -- Adiciona um número aleatório de 2 dígitos
  palavra := palavra || LPAD(FLOOR(RANDOM() * 100)::TEXT, 2, '0');
  
  RETURN palavra;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para atualizar updated_at na tabela evento_palavras_chave
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_updated_at_palavras_chave
BEFORE UPDATE ON evento_palavras_chave
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();

-- 8. Comentários para documentação
COMMENT ON COLUMN eventos.codigo_qrcode IS 'Código único de 6 caracteres alfanuméricos para identificação do evento via QRCode';
COMMENT ON COLUMN eventos.permite_presenca_remota IS 'Se TRUE, permite registrar presença de qualquer localização, ignorando validação de distância';
COMMENT ON COLUMN presencas.matricula IS 'Matrícula do usuário (usado quando usuário não está logado)';
COMMENT ON COLUMN presencas.usuario_logado IS 'Indica se a presença foi registrada por um usuário logado (TRUE) ou não logado (FALSE)';
COMMENT ON COLUMN presencas.latitude_capturada IS 'Latitude capturada no momento do registro de presença';
COMMENT ON COLUMN presencas.longitude_capturada IS 'Longitude capturada no momento do registro de presença';
COMMENT ON COLUMN presencas.distancia_validada IS 'Indica se a distância foi validada com sucesso (dentro do raio permitido)';
COMMENT ON COLUMN presencas.palavra_chave_usada IS 'Palavra-chave usada para validar a presença no dia específico';

-- ============================================
-- FIM DAS ALTERAÇÕES
-- ============================================

