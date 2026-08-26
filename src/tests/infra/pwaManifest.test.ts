import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { appConfig } from '../../../app.config'

const viteConfigSource = readFileSync(
  resolve(process.cwd(), 'vite.config.ts'),
  'utf8',
)

describe('PWA — fonte única do manifest', () => {
  it('manifest é gerado pelo build consumindo app.config.ts', () => {
    expect(viteConfigSource).toContain('VitePWA(')
    expect(viteConfigSource).toMatch(/registerType:\s*'prompt'/)
    expect(viteConfigSource).toContain('base: appConfig.basePath')
    expect(viteConfigSource).toContain('name: appConfig.productName')
    expect(viteConfigSource).toContain('scope: appConfig.basePath')
    expect(viteConfigSource).toContain('start_url: appConfig.basePath')
  })

  it('nenhum manifest manual concorrente em public/', () => {
    expect(existsSync(resolve(process.cwd(), 'public', 'manifest.webmanifest'))).toBe(false)
  })

  it('valores derivados são coerentes com a fonte única', () => {
    expect(appConfig.basePath.startsWith('/')).toBe(true)
    expect(appConfig.basePath.endsWith('/')).toBe(true)
  })
})
