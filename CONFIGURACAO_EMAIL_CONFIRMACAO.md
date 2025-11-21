# Configuração de E-mail de Confirmação

## 1. Executar o SQL

Execute o arquivo `database_confirmation_tokens.sql` no SQL Editor do Supabase para criar a tabela de tokens.

## 2. Criar Edge Function para Envio de E-mail

Crie uma Edge Function no Supabase para enviar e-mails customizados:

### Estrutura da Function

```
supabase/functions/send-confirmation-email/index.ts
```

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { email, token, nome } = await req.json()
    
    const confirmationLink = `${Deno.env.get('SITE_URL')}/confirmar-email?token=${token}`
    
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Confirme seu Cadastro</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Olá ${nome},</p>
            <p>Obrigado por se cadastrar no SIGNEÁ!</p>
            <p>Para confirmar sua conta, clique no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationLink}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Confirmar E-mail
              </a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 30px;">
              <strong>Importante:</strong> Este link expira em 15 minutos por segurança.
            </p>
            <p style="font-size: 12px; color: #666;">
              Se você não solicitou este cadastro, ignore este e-mail.
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <a href="${confirmationLink}" style="color: #667eea; word-break: break-all;">${confirmationLink}</a>
            </p>
          </div>
        </body>
      </html>
    `
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'SIGNEÁ <noreply@signea.com>',
        to: email,
        subject: 'Confirme seu cadastro no SIGNEÁ',
        html: emailBody
      })
    })
    
    if (!response.ok) {
      throw new Error('Erro ao enviar e-mail')
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
```

### Configurar Variáveis de Ambiente

No Supabase Dashboard > Edge Functions > Settings:
- `RESEND_API_KEY`: Sua chave da API Resend
- `SITE_URL`: URL do seu site (ex: https://signea.com)

## 3. Alternativa: Usar Template do Supabase Auth

Se preferir não usar Edge Function, você pode customizar o template de e-mail no Supabase Dashboard:

1. Vá em Authentication > Email Templates
2. Edite o template "Confirm signup"
3. Adicione o link de confirmação: `{{ .ConfirmationURL }}`
4. Adicione aviso de expiração de 15 minutos

## 4. Atualizar o Código de Cadastro

O código já está preparado para chamar a Edge Function. Se usar a Edge Function, atualize o `handleCadastro` em `src/pages/Cadastro.tsx`:

```typescript
// Chamar Edge Function para enviar e-mail
const { data: emailData, error: emailError } = await supabase.functions.invoke('send-confirmation-email', {
  body: {
    email: formData.email,
    token: confirmationToken,
    nome: formData.nomeCompleto
  }
})
```

