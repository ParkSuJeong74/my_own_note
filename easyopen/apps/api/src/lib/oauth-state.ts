import {verifyToken} from './session.ts';

export async function validateOAuthState(state: string | null, saved: string | undefined, secret: string) {
  if (!state || !saved || state !== saved) return null;
  try {
    const payload = await verifyToken(state, secret);
    return typeof payload.nonce === 'string' && payload.nonce.length > 0 ? payload : null;
  } catch {
    return null;
  }
}
