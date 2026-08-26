# FARMakit — Diário de bordo

Registro factual, cronológico e append-only do projeto. A especificação normativa prevalece em caso de divergência. Este diário não contém raciocínio privado, credenciais, dumps extensos nem conteúdo integral de arquivos.

## 2026-08-26 — Pré-E1 — Fechamento dos contratos transversais da especificação

### Objetivo

Corrigir nove lacunas contratuais identificadas na revisão profunda do documento no commit-base `d0cc0e26fbe33d3deed0e5a05964cb477b397933`, sem iniciar scaffold ou implementação.

### Alterações realizadas

- Separados os fluxos do Comparador e de Protocolos; o Comparador filtra doses explícitas pela CalculationWindow/cutoff.
- Congeladas as três ações históricas específicas da Reconstituição.
- Definidas validação tolerante das proporções, positividade individual e máximo de 20 componentes por protocolo.
- Definidos `weeks` inteiro e recorrência em intervalo semiaberto.
- Adicionado o fuso de exibição ao snapshot visual do Comparador.
- Unificada a normalização em `seriesPeakMg = SimulationOutput.peak.amountMg`.
- Definida a pós-condição representável do solver de absorção.
- Definidos conteúdo compacto, limites em bytes e poda da quarentena.
- Definida a resolução versionada dos favoritos oficiais por ID estável, deprecated e cadeia de migrations.
- Atualizados modelo de dados, motores, UX, persistência, migrações, testes, aceite, roadmap, riscos, decisões congeladas e checklist.

### Arquivos principais

- `FARMakit-especificacao-final.md`
- `docs/DIARIO-DE-BORDO.md`

### Decisões tomadas

- `PROPORTION_SUM_ATOL=1e-12` adimensional.
- `PROTOCOL_COMPONENTS_MAX=20`.
- `generateOccurrences` usa `[rangeStartMs,rangeEndMs)`.
- `ka` não representável quando `Tmax>0` retorna `ABSORPTION_SOLVER_FAILURE`.
- Quarentena: 256 KiB por item, 1 MiB total e cinco itens; payload bruto integral não é persistido.

### Validações executadas

- `git diff --check -- FARMakit-especificacao-final.md`: PASS; apenas aviso informativo de normalização LF→CRLF do Git.
- Asserções de presença/ausência dos contratos e termos obsoletos: PASS.
- Caso extremo `T½=1 ms` e `Tmax=3650 d` em double: `exp(y)=0` e `ka=0`, confirmando a necessidade de `ABSORPTION_SOLVER_FAILURE`: PASS.
- Renderização CommonMark com `markdown-it-py`: PASS; UTF-8 íntegro, 48 headings, oito tabelas e sete blocos de código renderizados.
- Validação conjunta de whitespace e renderização da especificação e do diário: PASS.
- Estado greenfield: HEAD preservado, README sem diff e ausência de `package.json`/`src/`: PASS.

### Problemas encontrados

- A primeira checagem de renderização esperava dez tabelas, embora o documento possua oito; foi falso negativo do verificador, não erro do Markdown.

### Solução adotada

- Ajustado o critério do verificador aos elementos efetivamente renderizados e repetida a validação com sucesso.

### Pendências

- E1–E15 continuam não iniciadas.
- Nome público, slug/repositório e GitHub Pages continuam pendentes apenas para deploy.

### Commit

- Não criado nesta revisão.

## 2026-08-26 — E1 — Scaffold e infraestrutura

### Objetivo

Iniciar a implementação greenfield da FARMakit executando somente a E1: scaffold React 19 + TypeScript strict + Vite, infraestrutura de build/PWA e o gate CSP×Chart.js/referrer, sem iniciar qualquer etapa posterior.

### Alterações realizadas

- Scaffold npm criado diretamente na raiz (sem projeto aninhado): `package.json`/`package-lock.json`, `vite.config.ts`, `tsconfig.app.json`/`tsconfig.node.json`, `eslint.config.js`.
- `app.config.ts` na raiz como FONTE ÚNICA `{productName, basePath}`; consumido por `vite.config.ts` (base + `VitePWA({manifest})`) e reexportado ao runtime por `src/app/config/basePath.ts`.
- Shell mínimo com React Router Hash (`createHashRouter`) e as seis rotas estruturais placeholders: `/biblioteca`, `/meia-vida`, `/reconstituir`, `/protocolos`, `/historico`, `/ajustes`; redirect raiz→`/biblioteca`; página 404 mínima.
- CSP meta normativa + meta referrer `no-referrer` separadas em `index.html`; constante compartilhada em `src/app/config/csp.ts`.
- PWA com `vite-plugin-pwa` (`registerType: 'prompt'`), manifest GERADO no build a partir de `app.config.ts`; nenhum `public/manifest.webmanifest` manual; ícones PNG 192/512 determinísticos gerados por `scripts/generate-icons.mjs`.
- Spike CSP×Chart.js: rota `#/dev/spike-csp` (`src/tools/spike-csp/SpikeCspPage.tsx`) com Chart.js 4 bundled, responsivo, dados fictícios; documentação em `tools/spike-csp/README.md`.
- Fundação visual mínima em `src/styles/tokens.css` (reset, tokens, paleta inicial provisória, shell responsivo).
- Testes baseline Vitest (config/basePath, rotas/shell, meta CSP/referrer, fonte única do manifest) e smoke Playwright contra `vite preview` do build de produção.
- Gate de artefatos `scripts/check-build-boundaries.mjs` (`.token-optimizer/` fora de dist/precache/runtime, manifest único coerente, CSP/referrer preservados, zero referência externa no HTML final).
- CI baseline `.github/workflows/ci.yml` (lint → typecheck → test → build → boundary → smoke Playwright; sem Pages/deploy).

### Arquivos principais

- `app.config.ts`, `vite.config.ts`, `index.html`, `package.json`
- `src/main.tsx`, `src/app/{AppRoot,AppShell,router,providers}.tsx`, `src/app/config/{basePath,csp}.ts`, `src/app/i18n/pt-BR.messages.ts`
- `src/features/*/pages/*Page.tsx` (seis placeholders), `src/tools/spike-csp/SpikeCspPage.tsx`
- `src/styles/tokens.css`, `public/icons/`
- `src/tests/infra/*.test.{ts,tsx}`, `src/tests/e2e/smoke-e1.spec.ts`
- `scripts/{check-build-boundaries,generate-icons}.mjs`, `.github/workflows/ci.yml`

### Decisões tomadas

- Valores provisionais mantidos centralizados: `productName='FARMakit'`, `basePath='/farmacologico/'` até fechamento da E0.
- Manifest derivado dentro de `vite.config.ts` a partir dos campos de `appConfig` (literal da §7), com coerência garantida pós-build pelo script de boundary.
- Constantes CSP/referrer extraídas para `src/app/config/csp.ts` para teste unitário e assert de artefato sem duplicação de string nos testes.
- Banner de atualização fica na UX final (E13); nesta etapa apenas `registerSW({onNeedRefresh})` dispara evento interno, provando a integração prompt-update.
- Componente do spike colocado em `src/tools/spike-csp/` (para bundling pela rota) com documentação espelho em `tools/spike-csp/` da árvore da §12.
- Modo dev pode registrar avisos de CSP (HMR inline do Vite); o gate normativo é o build de produção via `vite preview`.

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS (TS strict)
- `npm test`: PASS (13 testes / 4 arquivos)
- `npm run build`: PASS (PWA generateSW, 10 entradas de precache)
- `npm run check:build-boundaries`: PASS (zero `.token-optimizer` em dist/precache/texto; manifest único; CSP+referrer preservados; zero URL externa)
- `npm run test:e1`: PASS (2 smoke contra preview Chromium: shell+CSP+navegação+SW sem violações/diretivas desconhecidas/requisições externas; Chart.js renderiza canvas pintado sob CSP)

### Problemas encontrados

- Ícones iniciais gerados em local errado (bug de base de URL no gerador); corrigido e regenerado em `public/icons/`.
- Teste de pixel do spike com limiar/amostragem inadequados para curvas finas sobre canvas transparente; amostragem densificada antes de aprovar.

### Solução adotada

- Correções pontuais nos próprios artefatos da E1 e repetição integral dos gates até PASS.

### Pendências

- Deploy/GitHub Pages permanecem bloqueados até E0 (CI não publica).
- Congelamento de paleta definitiva ocorre nas etapas de dataset/paleta; `tokens.css` é fundação provisória.
- Remoção futura do spike após janela de validação (temporário).

### Commit

- Criado após aprovação integral dos gates desta etapa (scaffold E1).

## 2026-08-26 — E2 — Unidades, tempo e decimal

### Objetivo

Criar as primitivas fundamentais de unidades de tempo/massa, tipos temporais, Temporal API/polyfill, conversão civil↔instante com política DST e parsing/formatação pt-BR, com testes unitários sólidos — sem iniciar qualquer motor científico da E3.

### Alterações realizadas

- Instalado `@js-temporal/polyfill` como dependência runtime (bundled; sem moment/luxon/date-fns/Day.js/CDN).
- `src/domain/shared/types.datetime.ts`: aliases `LocalDate`/`LocalTime`/`InstantIso`/`TimeZoneId`, `TimeUnit`, `MassUnit`, `DurationValue`, `DurationRange`, `Duration` conforme §6.
- `src/domain/units/convert.ts`: constantes normativas (min=60.000 ms; h=3.600.000 ms; d=86.400.000 ms; 1000 mcg=1 mg; 1000 mg=1 g); `toMilliseconds`, `millisecondsToMinutes/Hours/Days`, `toMilligrams`, `fromMilligrams`; `durationValueToMs`, `compareDurationValues`, `normalizeDurationRange`.
- `src/domain/shared/datetime.ts`: camada central Temporal — `civilToInstantIso` (`LocalDate+LocalTime+TimeZoneId → InstantIso` canônico em Z), `instantToZonedParts`, `canonicalizeInstantIso`, predicados `isValidLocalDate/LocalTime/TimeZoneId/InstantIso` e erro controlado local `DateTimeError` (códigos INVALID_LOCAL_DATE/LOCAL_TIME/TIME_ZONE/INSTANT).
- `src/domain/units/decimal.ts`: `parseLocaleDecimal` restritivo ({ok:true,value}|{ok:false}); gramática `[+-]?d+([.,]d+)?`; sem parseFloat permissivo; rejeita múltiplos separadores, mistura vírgula+ponto ("1,2.3"), agrupamento de milhares ("1.234,56"), prefixos com lixo e NaN/Infinity.
- `src/domain/units/format.ts`: locale normativo `pt-BR` fixo; `formatMassMg` (até 3 casas), `formatDuration` ("X d Y h Z min"; "0 min"; resíduo <1 min truncado só na apresentação), `formatShortDateTime` (dd/mm/aaaa hh:mm), `formatLongDateTime` (por extenso para tooltip), todos dependentes de TimeZoneId explícito.
- Testes: `src/tests/domain/{units.convert,units.decimal,units.format,shared.datetime,temporal.polyfill}.test.ts` — fixtures DST normativas America/New_York 2024-03-10 02:30 (GAP→03:30) e 2024-11-03 01:30 (OVERLAP→primeira ocorrência -04:00), round-trips, TZ A≠TZ B, entradas inválidas, equivalências de unidades e casos do parser.
- Nenhum arquivo E3 criado (`domain/pk|recurrence|reconstitution` não existem).

### Arquivos principais

- `package.json`/`package-lock.json` (+@js-temporal/polyfill)
- `src/domain/shared/{types.datetime,datetime}.ts`
- `src/domain/units/{convert,decimal,format}.ts`
- `src/tests/domain/*.test.ts`

### Decisões tomadas

- Política DST implementada por tentativa `disambiguation:'reject'`: se resolver, horário normal; se falhar, OVERLAP quando a ocorrência 'earlier' preserva o horário civil pedido, caso contrário GAP ⇒ 'later' (deslocado para frente pela duração do gap). Determinístico em qualquer host.
- `LocalTime` aceita 'HH:mm' e 'HH:mm[:ss[.frac]]'; apresentação de edição retorna 'HH:mm'.
- Parser decimal exige parte inteira (".5"/"5." rejeitados) e trata "1.234" como decimal 1,234 (regra única de separador); apenas a forma mista "1.234,56" é ambígua e rejeitada, conforme contrato.
- Duração negativa é exibida como "0 min" (clamp somente na apresentação).
- Assert do polyfill (§23): teste unitário prova dependência declarada, módulo exercitado e zero URL externa no fonte; o código ainda não é consumido por features, portanto não entra no bundle nesta etapa — passará a entrar quando as features o importarem.
- Validações de domínio (LIMITS/Zod, >0, máximos) permanecem na E5; conversões são matemática pura IEEE-754.

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS (92 testes / 9 arquivos — 79 novos)
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS (`.token-optimizer` ausente de dist/precache/texto; CSP+referrer preservados)
- `npm run test:e1`: PASS (smoke CSP×Chart.js contra preview)
- Varredura `new Date(`/`Date.parse(`/moment/luxon/date-fns/dayjs/CDN em src+scripts: limpa (apenas comentários)

### Problemas encontrados

- Typing do polyfill: `PlainDateTime.toZonedDateTime(tzLike, options?)` difere da forma `{timeZone, disambiguation}` documentada no rascunho; ajustado para a assinatura real.
- Profundidade incorreta dos imports nos testes iniciais; corrigida para `../../domain/*`.

### Solução adotada

- Correção pontual das chamadas/imports e repetição integral dos gates até PASS.

### Pendências

- LIMITS/Zod, catálogo normativo de erros e tolerâncias pertencem à E5.
- Engine de recorrência, PK, simulação e dataset pertencem à E3+ (não iniciados).
- Polyfill entrará no bundle quando features consumirem a camada datetime.

### Commit

- Criado após aprovação integral dos gates desta etapa (E2).


