// Fila e mutex assíncrono para serialização global de mutações de storage (§11, E6.3).
// Impede lost updates e condições de corrida entre escritas concorrentes, recovery e hidratação.

let mutationTail: Promise<unknown> = Promise.resolve()

/**
 * Enfileira uma mutação assíncrona na fila serializada global.
 * Garante que apenas uma mutação execute por vez, que a próxima mutação leia o estado mais recente
 * e que uma rejeição propague para o chamador sem bloquear as mutações futuras da fila.
 */
export function enqueueStorageMutation<T>(operation: () => Promise<T>): Promise<T> {
  const run = mutationTail.catch(() => {}).then(operation)
  mutationTail = run.catch(() => {})
  return run
}

/**
 * Helper interno para testes: reinicia a cauda da fila de mutações.
 */
export function resetMutationQueueForTesting(): void {
  mutationTail = Promise.resolve()
}
