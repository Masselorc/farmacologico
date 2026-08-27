function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function makeLegacyStableId(prefix: string, ...parts: Array<string | number>): string {
  const material = parts.map(String).join('\u001f')
  return `legacy:${prefix}:${fnv1a(material)}`
}
