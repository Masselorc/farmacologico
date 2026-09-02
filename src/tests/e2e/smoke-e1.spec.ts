// Smoke E1 contra o build de produção via `vite preview` (gate CSP×Chart.js).
// Não é a suíte E2E do produto (pertence a etapas posteriores).
import { expect, test, type Page } from '@playwright/test'
import { CSP_META_CONTENT } from '../../app/config/csp'

const BASE_PATH = '/farmacologico/'

const structuralRoutes = [
  { navLabel: 'Biblioteca', heading: 'Biblioteca', placeholder: /prevista na E10\./ },
  { navLabel: 'Meia-vida', heading: 'Meia-vida', placeholder: /Compare cenários farmacocinéticos/ },
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

test('Comparador E9 renderiza sob CSP sem violacoes nem inline styles', async ({ page }) => {
  const problems = watchProblems(page)

  await page.goto(`${BASE_PATH}#/meia-vida`)

  await expect(page.getByRole('heading', { name: 'Meia-vida' })).toBeVisible()

  // Verifica que não há estilos inline na aba de análise
  const inlineStylesCountAnalysis = await page.evaluate(() => {
    const root = document.querySelector('.comparator-page')
    return root ? root.querySelectorAll('[style]').length : 0
  })
  expect(inlineStylesCountAnalysis).toBe(0)

  // Alterna para aba de edição de cenários
  await page.getByRole('button', { name: /Cenários/i }).click()
  await expect(page.locator('.comparator-edit-panel')).toBeVisible()

  // Verifica ausência de estilos inline na aba de edição
  const inlineStylesCountEdit = await page.evaluate(() => {
    const root = document.querySelector('.comparator-page')
    return root ? root.querySelectorAll('[style]').length : 0
  })
  expect(inlineStylesCountEdit).toBe(0)

  expect(problems).toEqual([])
})

test('Comparador E9 populado renderiza CompareChart real com pintura de pixels sob CSP', async ({ page }) => {
  const problems = watchProblems(page)

  // Congela deterministicamente o relógio no ambiente do navegador antes de carregar a aplicação
  await page.addInitScript(() => {
    const FIXED_TIME = new Date('2026-09-02T18:00:00.000Z').getTime()
    Date.now = () => FIXED_TIME
  })

  // 1. Acessa a página do Comparador
  await page.goto(`${BASE_PATH}#/meia-vida`)
  await expect(page.getByRole('heading', { name: 'Meia-vida' })).toBeVisible()

  // 2. Alterna para a aba de Cenários para cadastrar um cenário com doses
  await page.getByRole('button', { name: /Cenários/i }).click()
  await expect(page.locator('.comparator-edit-panel')).toBeVisible()

  // Clica em "+ Adicionar cenário"
  await page.getByRole('button', { name: /\+ Adicionar cenário/i }).click()
  await expect(page.locator('#scenario-name')).toBeVisible()

  // Preenche dados do cenário
  await page.locator('#scenario-name').fill('Cenário Teste E2E')
  await page.locator('#scenario-halflife').fill('1')
  await page.locator('#scenario-halflife-unit').selectOption('days')
  await page.locator('#scenario-tmax').fill('4')
  await page.locator('#scenario-tmax-unit').selectOption('hours')
  await page.getByRole('button', { name: /Salvar cenário/i }).click()

  // Aguarda aparecer na lista de cenários
  await expect(page.locator('.scenario-items').getByText('Cenário Teste E2E')).toBeVisible()

  // 3. Cadastra duas doses (1 passada e 1 futura)
  // Dose passada
  await page.locator('#dose-amount').fill('100')
  await page.locator('#dose-date').fill('2026-08-25')
  await page.locator('#dose-time').fill('12:00')
  await page.getByRole('button', { name: /\+ Adicionar dose/i }).click()
  await expect(page.getByText('100 mg')).toBeVisible()

  // Dose futura
  await page.locator('#dose-amount').fill('50')
  await page.locator('#dose-date').fill('2026-09-10')
  await page.locator('#dose-time').fill('12:00')
  await page.getByRole('button', { name: /\+ Adicionar dose/i }).click()
  await expect(page.getByText('50 mg')).toBeVisible()

  // 4. Alterna para a aba de Análise e visualização
  await page.getByRole('button', { name: /Análise e visualização/i }).click()
  await expect(page.locator('.comparator-analysis-panel')).toBeVisible()

  // A. Cenário realmente analisado e métricas semânticas comprovadas (1 administrada, 1 planejada)
  await expect(page.locator('.metrics-panel-container').getByText('Cenário Teste E2E')).toBeVisible()
  const administeredItem = page.locator('.metric-item', { hasText: /Administrações realizadas/i })
  await expect(administeredItem).toBeVisible()
  await expect(administeredItem.locator('.metric-value')).toHaveText('1')

  const plannedItem = page.locator('.metric-item', { hasText: /Doses futuras na simulação/i })
  await expect(plannedItem).toBeVisible()
  await expect(plannedItem.locator('.metric-value')).toHaveText('1')

  // B. CompareChart realmente montado e visível
  const canvas = page.locator('.compare-chart-frame canvas')
  await expect(canvas).toBeVisible()

  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(100)
  expect(box!.height).toBeGreaterThan(100)

  // C. Prova pintura real de pixels no canvas
  const getPaintedPixelCount = async () => {
    return page.evaluate(() => {
      const canvasEl = document.querySelector<HTMLCanvasElement>('.compare-chart-frame canvas')
      if (!canvasEl) return -1
      const ctx = canvasEl.getContext('2d')
      if (!ctx) return -1
      const { width, height } = canvasEl
      const data = ctx.getImageData(0, 0, width, height).data
      let count = 0
      for (let i = 3; i < data.length; i += 4 * 17) {
        if (data[i] > 0) count++
      }
      return count
    })
  }

  // Aguarda Chart.js inicializar e desenhar
  await page.waitForTimeout(300)
  const initialPainted = await getPaintedPixelCount()
  expect(initialPainted).toBeGreaterThan(50)

  // D. Alternar escala: Absoluta -> Normalizada e provar que continua pintado
  await page.getByRole('button', { name: /Normalizada/i }).click()
  await page.waitForTimeout(300)
  const normalizedPainted = await getPaintedPixelCount()
  expect(normalizedPainted).toBeGreaterThan(50)

  // E. Alternar eixo: Linear -> Log e provar que continua funcional
  await page.getByRole('button', { name: /Logarítmico/i }).click()
  await page.waitForTimeout(300)
  const logPainted = await getPaintedPixelCount()
  expect(logPainted).toBeGreaterThan(50)

  // G. Inline styles: estritamente zero na árvore React da aplicação (§13 do prompt)
  const inlineStyles = await page.evaluate(() => {
    const root = document.querySelector('.comparator-page')
    if (!root) return []
    // Ignorar elemento canvas do Chart.js que injeta atributos técnicos próprios no DOM do canvas
    const elements = Array.from(root.querySelectorAll('[style]')).filter(
      (el) => el.tagName.toLowerCase() !== 'canvas',
    )
    return elements.map((el) => el.outerHTML)
  })
  expect(inlineStyles).toHaveLength(0)

  // F. CSP: sem erros nem requisições indevidas
  expect(problems).toEqual([])
})
