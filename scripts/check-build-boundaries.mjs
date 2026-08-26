// Gate E1 — assert de artefatos pós-build.
// Prova que:
//  1. nenhum arquivo de .token-optimizer/ existe em dist/;
//  2. nenhuma referência textual/precache a .token-optimizer sobrevive em dist/;
//  3. não há manifest manual concorrente; manifest derivado de app.config.ts;
//  4. index.html de produção preserva CSP normativa + meta referrer separada;
//  5. sem referências externas (CDN) no artefato HTML.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appConfig } from '../app.config.ts'
import { CSP_META_CONTENT } from '../src/app/config/csp.ts'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const distDir = join(repoRoot, 'dist')

const errors = []
function fail(message) {
  errors.push(message)
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

if (!existsSync(distDir)) {
  console.error('check:build-boundaries — dist/ inexistente. Rode `npm run build` antes.')
  process.exit(1)
}

const files = walk(distDir)

// 1. Nenhum caminho de .token-optimizer em dist/
for (const file of files) {
  const rel = relative(distDir, file)
  if (rel.toLowerCase().includes('token-optimizer')) {
    fail(`arquivo do tooling presente em dist/: ${rel}`)
  }
}

// 2. Nenhuma referência textual a token-optimizer em qualquer artefato
for (const file of files) {
  const content = readFileSync(file, 'latin1')
  if (content.toLowerCase().includes('token-optimizer')) {
    fail(`referência a .token-optimizer encontrada em ${relative(distDir, file)}`)
  }
}

// 3a. Exatamente um manifest, gerado pelo build
const manifests = files.filter((f) => f.endsWith('.webmanifest'))
if (manifests.length !== 1 || !manifests[0].endsWith(join('dist', 'manifest.webmanifest'))) {
  fail(`esperado exatamente dist/manifest.webmanifest; encontrado: ${manifests.map((m) => relative(distDir, m)).join(', ') || 'nenhum'}`)
} else {
  const manifest = JSON.parse(readFileSync(manifests[0], 'utf8'))
  const expectations = [
    ['name', appConfig.productName],
    ['short_name', appConfig.productName],
    ['scope', appConfig.basePath],
    ['start_url', appConfig.basePath],
  ]
  for (const [key, expected] of expectations) {
    if (manifest[key] !== expected) {
      fail(`manifest.${key} = ${JSON.stringify(manifest[key])}; esperado ${JSON.stringify(expected)} (fonte única app.config.ts)`)
    }
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
    fail('manifest.icons insuficiente para instalabilidade mínima')
  }
}

// 3b. Sem manifest manual na fonte (public/)
if (existsSync(join(repoRoot, 'public', 'manifest.webmanifest'))) {
  fail('public/manifest.webmanifest manual existe — proibido (fonte única gerada pelo build)')
}

// 4. index.html de produção: CSP + referrer
const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf8')

function findMetaTag(html, matcher) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (matcher.test(match[0])) {
      return match[0]
    }
  }
  return undefined
}

function contentAttribute(tag) {
  if (tag === undefined) return null
  const match = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)
  return match === null ? null : match[1]
}

const distCsp = contentAttribute(
  findMetaTag(indexHtml, /http-equiv\s*=\s*["']?content-security-policy/i),
)
if (distCsp !== CSP_META_CONTENT) {
  fail(`CSP normativa ausente ou alterada em dist/index.html (encontrado: ${JSON.stringify(distCsp)})`)
}
if (
  contentAttribute(findMetaTag(indexHtml, /name\s*=\s*["']?referrer/i)) !== 'no-referrer'
) {
  fail('meta referrer no-referrer ausente em dist/index.html')
}
if (/http-equiv\s*=\s*["']?content-security-policy[^>]*referrer-policy/i.test(indexHtml)) {
  fail('referrer-policy apareceu dentro da string CSP')
}
if (indexHtml.includes('unsafe-inline') || indexHtml.includes('unsafe-eval')) {
  fail('unsafe-inline/unsafe-eval presentes no artefato')
}

// 5. Sem CDN/URL externa em src/href do HTML final
for (const match of indexHtml.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/gi)) {
  fail(`referência externa no artefato: ${match[1]}`)
}

// Service worker PWA gerado
const swFile = files.find((f) => f.endsWith(join('dist', 'sw.js')))
if (swFile === undefined) {
  fail('sw.js não encontrado — PWA não foi gerada no build')
}

if (errors.length > 0) {
  console.error(`check:build-boundaries — FAIL (${errors.length})`)
  for (const error of errors) {
    console.error(` - ${error}`)
  }
  process.exit(1)
}

console.log('check:build-boundaries — PASS')
console.log(` - ${files.length} arquivos em dist/; zero referências a .token-optimizer`)
console.log(` - manifest único derivado de app.config.ts (scope/start_url=${appConfig.basePath})`)
console.log(' - CSP normativa + meta referrer separadas preservadas em dist/index.html')
