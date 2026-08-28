// Smoke E1 contra o build de produção via `vite preview` (gate CSP×Chart.js).
// Não é a suíte E2E do produto (pertence a etapas posteriores).
import { expect, test, type Page } from '@playwright/test'
import { CSP_META_CONTENT } from '../../app/config/csp'

const BASE_PATH = '/farmacologico/'

const structuralRoutes = [
  { navLabel: 'Biblioteca', heading: 'Biblioteca', placeholder: /prevista na E10\./ },
  { navLabel: 'Meia-vida', heading: 'Meia-vida', placeholder: /prevista na E9\./ },
  {
    navLabel: 'Reconstituir',
    heading: 'Reconstituir',
    placeholder: /Preencha os valores para visualizar o cálculo automaticamente\./,
  },
  { navLabel: 'Protocolos', heading: 'Protocolos', placeholder: /prevista na E11\./ },
  { navLabel: 'Histórico', heading: 'Histórico', placeholder: /prevista na E12\./ },
  { navLabel: 'Ajustes', heading: 'Ajustes', placeholder: /prevista na E6\/E13\./ },
]

function watchProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (
      (msg.type() === 'error' || msg.type() === 'warning') &&
      /content.?security|violat|refused|unrecognized|failed to load resource|error/i.test(
        msg.text(),
      )
    ) {
      problems.push(`console:${msg.text()}`)
    }
  })
  page.on('pageerror', (err) => {
    problems.push(`pageerror:${err.message}`)
  })
  page.on('requestfailed', (req) => {
    problems.push(`requestfailed:${req.url()} ${req.failure()?.errorText ?? ''}`)
  })
  page.on('request', (req) => {
    const url = req.url()
    if (/token-optimizer/i.test(url)) {
      problems.push(`tooling-request:${url}`)
    } else if (/^https?:/i.test(url) && !url.startsWith('http://localhost:4173')) {
      problems.push(`external-request:${url}`)
    }
  })
  return problems
}

test('shell carrega sob a CSP final, sem violações nem requisições indevidas', async ({ page }) => {
  const problems = watchProblems(page)

  await page.goto(BASE_PATH)

  // Metas de segurança presentes e separadas no documento servido.
  const csp = await page.getAttribute(
    'meta[http-equiv="Content-Security-Policy"]',
    'content',
  )
  expect(csp).toBe(CSP_META_CONTENT)
  expect(await page.getAttribute('meta[name="referrer"]', 'content')).toBe(
    'no-referrer',
  )

  // Navegação estrutural pelas seis rotas obrigatórias.
  for (const route of structuralRoutes) {
    await page.getByRole('link', { name: route.navLabel }).click()
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
    await expect(page.getByText(route.placeholder)).toBeVisible()
    expect(new URL(page.url()).hash.length).toBeGreaterThan(0)
  }

  // PWA registrada (registerType prompt; integração mínima da E1).
  await expect
    .poll(
      async () =>
        page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0)

  expect(problems).toEqual([])
})

test('spike Chart.js renderiza gráfico real sob CSP no build de produção', async ({ page }) => {
  const problems = watchProblems(page)

  await page.goto(`${BASE_PATH}#/dev/spike-csp`)

  const canvas = page.locator('.chart-frame canvas')
  await expect(canvas).toBeVisible()

  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(100)
  expect(box!.height).toBeGreaterThan(100)

  // Prova pintura real: amostra de pixels não transparentes no bitmap do canvas.
  const painted = await page.evaluate(() => {
    const canvasEl = document.querySelector<HTMLCanvasElement>('.chart-frame canvas')
    if (canvasEl === null) return -1
    const ctx = canvasEl.getContext('2d')
    if (ctx === null) return -1
    const { width, height } = canvasEl
    const data = ctx.getImageData(0, 0, width, height).data
    let count = 0
    for (let i = 3; i < data.length; i += 4 * 17) {
      if (data[i] > 0) count++
    }
    return count
  })
  expect(painted).toBeGreaterThan(400)

  expect(problems).toEqual([])
})
