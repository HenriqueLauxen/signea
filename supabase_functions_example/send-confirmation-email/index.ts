import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173'

serve(async (req) => {
  try {
    const { email, token, nome, link } = await req.json()
    
    if (!email || !token || !nome) {
      return new Response(
        JSON.stringify({ error: 'Email, token e nome são obrigatórios' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const confirmationLink = link || `${SITE_URL}/confirmar-email?token=${token}`
    
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Confirme seu Cadastro</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; margin-bottom: 20px;">Olá <strong>${nome}</strong>,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">Obrigado por se cadastrar no <strong>SIGNEÁ</strong>!</p>
            <p style="font-size: 16px; margin-bottom: 30px;">Para confirmar sua conta e começar a usar o sistema, clique no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationLink}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                Confirmar E-mail
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <strong>⚠️ Importante:</strong> Este link expira em <strong>15 minutos</strong> por segurança.
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 15px;">
              Se você não solicitou este cadastro, ignore este e-mail.
            </p>
            <p style="font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <a href="${confirmationLink}" style="color: #667eea; word-break: break-all;">${confirmationLink}</a>
            </p>
          </div>
        </body>
      </html>
    `
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY não configurada')
      return new Response(
        JSON.stringify({ error: 'Configuração de e-mail não encontrada' }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
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
      const errorData = await response.text()
      console.error('Erro ao enviar e-mail:', errorData)
      throw new Error('Erro ao enviar e-mail')
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Erro na função:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar requisição' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

