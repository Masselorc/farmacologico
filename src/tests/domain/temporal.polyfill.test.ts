import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, it } from 'vitest'
import { civilToInstantIso } from '../../domain/shared/datetime'

// §23: o polyfill é a dependência runtime declarada e é exercitado pelo bundle.
// Nenhum import por CDN; CSP permanece 'self'.

describe('Temporal polyfill bundled', () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8') as string,
  ) as { dependencies: Record<string, string> }

  it('@js-temporal/polyfill está declarado como dependência runtime', () => {
    expect(packageJson.dependencies['@js-temporal/polyfill']).toBeTruthy()
    expect(existsSync(resolve(process.cwd(), 'node_modules', '@js-temporal', 'polyfill'))).toBe(true)
  })

  it('Temporal.ZonedDateTime da política DST está disponível via módulo (sem global do host)', () => {
    expect(typeof Temporal.ZonedDateTime.from).toBe('function')
    expect(typeof Temporal.PlainDate.from).toBe('function')
  })

  it('nenhuma referência externa/CDN introduzida pela dependência no fonte do domínio', () => {
    const datetimeSource = readFileSync(
      resolve(process.cwd(), 'src', 'domain', 'shared', 'datetime.ts'),
      'utf8',
    )
    expect(datetimeSource).not.toMatch(/https?:\/\//)
    expect(datetimeSource).toContain("from '@js-temporal/polyfill'")
  })

  it('conversão civil continua determinística com o polyfill', () => {
    expect(
      civilToInstantIso({ localDate: '2026-08-26', localTime: '11:00', timeZone: 'America/Sao_Paulo' }),
    ).toBe('2026-08-26T14:00:00Z')
  })
})
