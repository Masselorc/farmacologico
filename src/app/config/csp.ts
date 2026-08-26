// Contrato normativo (§7): CSP e Referrer Policy são controles separados.
// `referrer-policy` NÃO é diretiva CSP e é proibido dentro desta string.
export const CSP_META_CONTENT =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"

export const REFERRER_META_CONTENT = 'no-referrer'
