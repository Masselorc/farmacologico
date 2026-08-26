import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CSP_META_CONTENT,
  REFERRER_META_CONTENT,
} from '../../app/config/csp'

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

function metaTag(html: string, matcher: RegExp): string | undefined {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (matcher.test(match[0])) {
      return match[0]
    }
  }
  return undefined
}

function contentAttribute(tag: string | undefined): string | null {
  if (tag === undefined) return null
  const match = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)
  return match === null ? null : match[1]
}

describe('CSP e Referrer Policy (controles separados)', () => {
  it('index.html contém a meta CSP normativa integral', () => {
    const csp = contentAttribute(
      metaTag(indexHtml, /http-equiv\s*=\s*["']?content-security-policy/i),
    )
    expect(csp).toBe(CSP_META_CONTENT)
  })

  it('meta referrer separada define no-referrer', () => {
    const referrer = contentAttribute(
      metaTag(indexHtml, /name\s*=\s*["']?referrer/i),
    )
    expect(referrer).toBe(REFERRER_META_CONTENT)
  })

  it('a string CSP não contém referrer-policy nem unsafe-*', () => {
    const csp = CSP_META_CONTENT.toLowerCase()
    expect(csp).not.toContain('referrer-policy')
    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toContain('unsafe-eval')
  })

  it('nenhum referrer-policy aparece como diretiva de CSP no HTML', () => {
    expect(/http-equiv\s*=\s*["']?content-security-policy[^>]*referrer-policy/i.test(indexHtml)).toBe(false)
  })
})
