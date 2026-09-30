type ReadResult = { error: { code?: string; message?: string } | null; status?: number }

export function transientRead(result: ReadResult) {
  if (!result.error) return false
  // These are server credential/connection errors, after the caller has been authorized.
  return ['PGRST303', 'PGRST301', 'PGRST000', 'PGRST001', 'PGRST002'].includes(result.error.code ?? '') ||
    (result.status ?? 0) >= 500
}

export async function readWithRetry<T extends ReadResult>(read: () => PromiseLike<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const result = await read()
    if (!transientRead(result) || attempt >= 2) return result
    await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 500 : 1500))
  }
}
