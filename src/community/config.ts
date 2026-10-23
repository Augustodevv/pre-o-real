/**
 * Endereço e chave pública (publishable) do Supabase do histórico compartilhado.
 * Vêm do arquivo .env no build (WXT_SUPABASE_URL e WXT_SUPABASE_KEY). A chave é pública
 * por natureza: o banco só permite chamar as funções submit_price e get_price_history.
 */
export const COMMUNITY_URL: string = import.meta.env.WXT_SUPABASE_URL ?? '';
export const COMMUNITY_KEY: string = import.meta.env.WXT_SUPABASE_KEY ?? '';

export function isCommunityConfigured(): boolean {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(COMMUNITY_URL) && COMMUNITY_KEY.length > 20;
}
