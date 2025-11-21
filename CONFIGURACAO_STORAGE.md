# Configuração do Supabase Storage para PDFs

## Passo a Passo para Configurar o Bucket

### 1. Acesse o Supabase Dashboard
- Vá para: https://app.supabase.com
- Selecione seu projeto

### 2. Criar o Bucket
1. No menu lateral, clique em **Storage**
2. Clique em **New bucket**
3. Configure o bucket:
   - **Name**: `certificados-validacao`
   - **Public bucket**: ❌ Desmarque (deixe privado)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `application/pdf`
4. Clique em **Create bucket**

### 3. Configurar Políticas RLS

Vá em **Storage** > **Policies** > Selecione o bucket `certificados-validacao`

#### Política 1: Permitir Upload
- Clique em **New Policy**
- Selecione **Custom Policy**
- **Policy name**: `Permitir upload de PDFs para validação`
- **Allowed operation**: `INSERT`
- **Policy definition**:
```sql
true
```
- Clique em **Save**

#### Política 2: Permitir Leitura
- Clique em **New Policy**
- Selecione **Custom Policy**
- **Policy name**: `Permitir leitura de PDFs`
- **Allowed operation**: `SELECT`
- **Policy definition**:
```sql
true
```
- Clique em **Save**

### 4. Testar o Upload
Após configurar, teste fazendo upload de um PDF na página de validação de certificados.

## Como Funciona

1. **Upload**: Usuário faz upload do PDF
2. **Storage**: PDF é salvo no bucket `certificados-validacao`
3. **Extração**: Sistema extrai o código de validação do PDF
4. **Validação**: Busca o código no banco de dados
5. **Resultado**: Mostra se o certificado é válido

## Padrões de Código Suportados

O sistema procura por:
- `CERT-XXXXXXXXXXXXXXXX` (formato padrão)
- Sequências de 20-30 caracteres alfanuméricos

## Troubleshooting

### Erro: "Bucket not found"
- Verifique se o bucket `certificados-validacao` foi criado
- Confirme o nome exato do bucket

### Erro: "Permission denied"
- Verifique se as políticas RLS foram criadas
- Confirme que ambas políticas (INSERT e SELECT) estão ativas

### Código não encontrado no PDF
- Use o campo manual de código
- Verifique se o PDF contém o código de validação

## Segurança

- PDFs são armazenados de forma privada
- Apenas leitura por URL assinada (quando necessário)
- Não salvamos o conteúdo do PDF no banco de dados
- Apenas o file_path é salvo como referência

