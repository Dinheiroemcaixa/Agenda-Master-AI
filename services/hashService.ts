/**
 * Serviço de Hash de Senhas usando Web Crypto API (SHA-256)
 * 
 * NOTA: SHA-256 não é ideal para senhas (bcrypt/argon2 seriam melhores),
 * mas como a app roda 100% no frontend sem backend, é a melhor opção
 * disponível e infinitamente melhor que texto plano.
 */

/**
 * Gera hash SHA-256 de uma senha
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica se uma senha corresponde a um hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === storedHash;
}

/**
 * Detecta se uma senha armazenada é um hash SHA-256 (64 caracteres hex)
 * ou texto plano (para migração automática)
 */
export function isHashed(storedPassword: string): boolean {
  return /^[a-f0-9]{64}$/.test(storedPassword);
}
