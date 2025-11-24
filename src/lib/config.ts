/**
 * Configuração de ambiente
 * Detecta automaticamente se está rodando em produção, homologação ou desenvolvimento
 */

/**
 * Detecta o ambiente atual baseado no hostname
 */
export function getEnvironment(): 'production' | 'staging' | 'development' {
  // Se estiver no servidor (SSR), usar variável de ambiente
  if (typeof window === 'undefined') {
    const env = import.meta.env.MODE || import.meta.env.NODE_ENV;
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  // No cliente, verificar hostname
  const hostname = window.location.hostname;

  // Produção - vercel.app ou domínio customizado de produção
  if (
    hostname.includes('vercel.app') ||
    hostname === 'signea-brown.vercel.app' ||
    hostname === 'signea.com.br' ||
    hostname === 'www.signea.com.br'
  ) {
    return 'production';
  }

  // Homologação - pode ser um subdomínio ou outro domínio
  if (
    hostname.includes('staging') ||
    hostname.includes('homolog') ||
    hostname.includes('preview')
  ) {
    return 'staging';
  }

  // Desenvolvimento local
  return 'development';
}

/**
 * Retorna a URL base da aplicação baseada no ambiente
 */
export function getBaseUrl(): string {
  // Permitir override via variável de ambiente
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl) {
    return envUrl;
  }

  // Se estiver no servidor, usar variável de ambiente ou fallback
  if (typeof window === 'undefined') {
    return envUrl || 'https://signea-brown.vercel.app';
  }

  // No cliente, usar window.location.origin que já detecta automaticamente
  // Isso funciona tanto em desenvolvimento quanto em produção
  return window.location.origin;
}

/**
 * Retorna a URL completa para uma rota específica
 */
export function getRouteUrl(path: string): string {
  const baseUrl = getBaseUrl();
  // Garantir que o path comece com /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Configurações por ambiente
 */
export const config = {
  environment: getEnvironment(),
  baseUrl: getBaseUrl(),
  isProduction: getEnvironment() === 'production',
  isStaging: getEnvironment() === 'staging',
  isDevelopment: getEnvironment() === 'development',
} as const;

