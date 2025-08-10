// Simple, dependency-free embedding stub to keep the app runnable.
// Replace later with a real embedding provider (e.g., OpenAI) and match DIM.

export const EMBEDDING_DIM = 256;

function hashStr(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function embedText(text: string): Promise<Float32Array> {
  // Tokenize by simple whitespace and punctuation
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const vec = new Float32Array(EMBEDDING_DIM);
  if (tokens.length === 0) return vec;

  for (const t of tokens) {
    const h = hashStr(t);
    const idx = h % EMBEDDING_DIM;
    vec[idx] += 1.0;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] /= norm;
  return vec;
}

export function float32ToBuffer(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer);
}
