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

## 2026-08-26 — E3 — Motores de domínio

### Objetivo

Implementar o núcleo de domínio da FARMakit: PK Engine (eliminação, solver de ka, Bateman estável, estado/superposição, análise/pico/marcos, cutoff), Recurrence Engine, Reconstitution Engine e a cola de simulação (Comparador × Protocolos), com testes unitários fundamentais — sem executar E4 e sem UI.

### Alterações realizadas

- Fundação: `src/domain/version.ts` (PK/RECURRENCE/RECONSTITUTION = '1.0.0', independentes do package.json), `shared/errors.ts` ({code,params}), `shared/result.ts`, `shared/tolerances.ts` (valores normativos + `amountClose`/`conservationClose`/`proportionSumClose`/`cutoffClose` com invariante budget 0 ⇒ amountClose), `src/validation/limits.ts` (DOMAIN/SAFETY/UX_LIMITS literais da §6) e `src/domain/types.ts` (subconjunto §6 necessário aos motores).
- PK: `pk/rates.ts` (`eliminationRate`; solver `g(y)=y/expm1(y)=c` com Taylor |y|<1e-8, bracket normativo c=1⇒y=0 / duplicação de hi|lo, bisseção 180, pós-condição finite>0 ⇒ senão ABSORPTION_SOLVER_FAILURE; Tmax null/0⇒ka=null; <0⇒TMAX_NEGATIVE); `pk/bateman.ts` (`phi(z)=−expm1(−z)/z` com phi(0)=1, forma estável única dose·ka·Δt·exp(−slow·Δt)·phi, depot, contribuição central+depot, NUMERIC_FAILURE em não-finito inesperado, clamp pós-finitude); `pk/state.ts` (superposição linear, doses futuras ⇒ plannedCount, eliminated=max(0,adm−central−depot), conservação por conservationClose, percentuais como frações); `pk/cutoff.ts` (CONTRIBUTION_CUTOFF_HALF_LIVES=44; effectiveTmax=tmaxMs??0; cutoffAge=max(44·T½term+effTmax, effTmax+86_400_000)); `pk/analysis.ts` (analyze: validações NO_DOSES/INVALID_DOSE_AMOUNT/TIME/HORIZON, horizonte última dose+max(10,5·T½term, 2·Tmax_eff, 2·T½), curva CENTRAL com 1600 intervalos+doses+dose+Tmax ordenados/dedup, pico varredura+ternária 80, marcos [50..0,1]% via última travessia reversa+bisseção 80 com MILESTONE_NOT_REACHED/null, warnings FLIP_FLOP_ABSORPTION e NEAR_DEGENERATE_RATES separados do algoritmo).
- Recurrence: `validate.ts` (weekdays 1..7 não vazio ascendente sem duplicatas; weeks inteiro 1..WEEKS_MAX; forma do Schedule via camada E2), `generate.ts` (janela SEMIABERTA [start,end), single e weekly com vigência civil inclusiva weeks·7−1 dias, iteração proporcional à janela ±2 dias civis, civil→instante pela política GAP later/OVERLAP earlier da E2, ascendente sem duplicatas), `shift.ts` (deltaDays inteiro civil; rotação ISO rotate(d)=1+mod((d−1)+Δ,7); localTime/timeZone preservados; entrada nunca mutada).
- Reconstitution: `calculate.ts` (validações finite>0 dentro de SAFETY_LIMITS e U-100 unitsPerMl=100; DOSE_EXCEEDS_VIAL_CONTENT bloqueante antes de qualquer resultado; matemática exata mcg/mL, mL, U, floor teórico; CAPACITY_EXCEEDED numérico retornado; LOW_SYRINGE_PRECISION estrito >0,05; THEORETICAL_YIELD anexo; metadata reconstitutionEngineVersion).
- Simulation: `windows.ts` (`requiredPkLookback === max cutoffAgeFor`; `deriveCalculationWindow`) e `assemble.ts` (`selectRelevantScenarioDoses` [start,end) sem mutar Scenario; `assembleScenarioInputs` sem Recurrence/dataset; `assembleProtocolInputs` EXATAMENTE um input por componente com componentDoseMg derivado finite>0≤SIMULATION_DOSE_MG_MAX, IDs determinísticos `protocolId:componentId:instantMs`, erros normativos COMPONENT_*/PROTOCOL_*).

### Arquivos principais

- `src/domain/{version,types}.ts`
- `src/domain/shared/{errors,result,tolerances}.ts`
- `src/domain/pk/{rates,bateman,state,cutoff,analysis}.ts`
- `src/domain/recurrence/{validate,generate,shift}.ts`
- `src/domain/reconstitution/calculate.ts`
- `src/domain/simulation/{windows,assemble}.ts`
- `src/validation/limits.ts`
- `src/tests/domain/*.test.ts` (8 arquivos novos)

### Decisões tomadas

- analysisCurve é a quantidade do compartimento CENTRAL (§4 "Central por dose"); depot integra o estado e a contribuição de cutoff, não a curva plotada.
- Milestones usam semântica de ÚLTIMA travessia descendente após o pico (conjunto {f≥alvo menor ⊆ maior} ⇒ tempos não decrescentes garantidos).
- nowMs de assembleProtocolInputs deriva do máximo dos occurrences (determinístico); occurrences vazio ⇒ input vazio que o PK rejeita com NO_DOSES.
- Validações de forma do recurrence retornam motivos locais tipados (não DomainErrorCode): o catálogo pt-BR completo permanece da E5; generateOccurrences lança RangeError defensivo em argumentos inválidos.
- EXTREME_PARAMETERS reservado (sem gatilho emitido nesta etapa); NUMERIC_FAILURE cobre não-finito inesperado.
- Percentuais do estado como frações [0,1]; UI converterá para % (convenção normalizedRatio da §6).
- sampleForDisplay fica para E9+ (geometria de apresentação consumida pelas features).

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS (187 testes / 17 arquivos — 95 novos)
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS (CSP×Chart.js contra preview)
- Verificações numéricas §39: 6d/2d ⇒ ka≈1,34159/dia rtol≤1e-4 ✓ · Tmax 4,649224 d ⇒ ka≈0,36/dia ✓ · Tmax crítico T½/ln2 ⇒ ka=ke EXATO ✓ · 1 T½ instantâneo ≈50% ✓ · ka=ke ≡ dose·k·t·exp(−kt) ✓ · âncoras 10U/120U/240U + 20 teóricas ✓ · 9U alerta / 10U sem alerta ✓
- Varredura: zero toFixed/Math.round/new Date/Date.parse/random/randomUUID no domínio (Math.round apenas em fixture de teste); cutoff=44 em todo o código.

### Problemas encontrados

- Polyfill Temporal proíbe operadores `<`/`>` em PlainDate (valueOf lança): comparações de datas civis migradas para `Temporal.PlainDate.compare`.
- Primeira versão montava analysisCurve com central+depot ⇒ pico caía em t=0 (depot cheio) no flip-flop; corrigida para curva CENTRAL normativa, pico passou a coincidir com Tmax.
- Cenário de MILESTONE_NOT_REACHED mal construído (regimes de doses iguais sempre cruzam 0,1% em 10,5 T½): substituído por flip-flop longo (ka=0,75·ke) cujo horizonte termina em ≈9,26 halvings pós-pico.

### Solução adotada

- Correções pontuais no motor/teste conforme acima; nenhum contrato normativo alterado; gates repetidos integralmente até PASS.

### Pendências

- E4 (property tests, red-team matemático, equivalência de cutoff, extremos sistemáticos, fast-check) EXPLICITAMENTE pendente.
- EXTREME_PARAMETERS sem gatilho definido (definir critério na E4/E5).
- sampleForDisplay, Zod/LIMITS→schemas, catálogo pt-BR, dataset oficial, persistência: etapas posteriores.

### Commit

- Criado após aprovação integral dos gates desta etapa (E3).

## 2026-08-26 — E4 — Gate matemático e property tests

### Objetivo

Atacar os motores E3 com testes unitários, property-based tests, oráculos independentes e fixtures, sem iniciar E5 ou novas features.

### Alterações realizadas

- Adicionados `fast-check@4.9.0` e `decimal.js@10.6.0` como devDependencies.
- Criado o comando focal `npm run test:e4`.
- Adicionados 11 arquivos de testes E4: solver, Bateman, conservação, cutoff, equivalência, análise, recurrence, reconstituição, simulation, extremos e regressões.
- Corrigidos percentuais de estado para doses subnormais, evitando `Infinity×subnormal ⇒ NaN`.
- Corrigido `cutoffAgeFor` para rejeitar `Infinity` derivado de `44·T½terminal` com `NUMERIC_FAILURE`.

### Arquivos principais

- `package.json` e `package-lock.json`
- `src/domain/pk/analysis.ts`
- `src/domain/pk/state.ts`
- `src/domain/pk/cutoff.ts`
- `src/tests/domain/property/`
- `src/tests/domain/regression/regression.e4.test.ts`
- `docs/DIARIO-DE-BORDO.md`

### Decisões tomadas

- Seeds canônicas: `1`, `42`, `20260826`, `0x5A17`; shrinking permaneceu habilitado.
- Oráculo Bateman: Decimal.js com 60 dígitos; solver: identidade independente em espaço-y; recurrence: brute-force civil independente.
- `EXTREME_PARAMETERS` permaneceu sem novo threshold arbitrário.
- Soluções, cutoffs e timestamps não representáveis foram classificados por erro normativo, sem reduzir runs nem aumentar tolerâncias.

### Validações executadas

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS — 28 arquivos, 258 testes.
- `npm run test:e4`: PASS — 11 arquivos, 71 testes; 24 chamadas `forAllSeeds`, aproximadamente 21.520 execuções por seed/conjunto.
- `npm run build`: PASS.
- `npm run check:build-boundaries`: PASS — 9 arquivos em `dist/`, sem `.token-optimizer`, manifest único e CSP/referrer preservados.
- `npm run test:e1`: PASS — 2 testes Chromium.
- Varredura estática de hazards, ramos `ka≈ke`, cutoff/44 e marcadores desativados: PASS.

### Problemas encontrados

- Percentuais por fator recíproco falhavam com dose `Number.MIN_VALUE`.
- `cutoffAgeFor` podia retornar `Infinity` quando o produto de 44 meias-vidas terminais transbordava.
- Alguns testes iniciais tinham oráculo/expectativa incorretos: contribuição confundida com central, igualdade IEEE em razão 100, `fc.float` fora da faixa, reordenação que alterava proporções, timeout da referência civil e warning de milestone indevidamente obrigatório.

### Solução adotada

- Criadas regressões mínimas antes das correções de motor.
- Percentuais passaram a usar divisão direta por massa administrada.
- Cutoff não representável passou a lançar `NUMERIC_FAILURE`.
- Testes foram corrigidos para refletir os contratos normativos sem enfraquecer tolerâncias, seeds ou cobertura.

### Pendências

- E4 fechada no commit `f53c37701bbeb8171984916cbc2c9bee88a2c2a6`.
- Não foram adicionados UI, dataset, persistência, migração ou alterações no README.

### Commit

- `f53c37701bbeb8171984916cbc2c9bee88a2c2a6`

## 2026-08-26 — E4.1 — Correções de fechamento do gate matemático

### Objetivo

Fechar as lacunas residuais do gate matemático E4 identificadas na revisão externa: corrigir o counterexample funcional de `shiftSchedule` (weekdays canônicos ascendentes), assertar a aditividade linear nos compartimentos primários, reduzir execuções vazias na property de recorrência com ancoragem na vigência do schedule, cobrir recorrência semanal atravessando GAP/OVERLAP (DST), eliminar escape de divisão no teste do solver e fortalecer a recomposição de $k_a$ extremo muito pequeno normal representável, tornar a equivalência de cutoff adversarial junto à fronteira imediata do corte, e instrumentar a métrica de erro relativo máximo de Bateman.

### Alterações realizadas

- Recurrence (`src/domain/recurrence/shift.ts`): ordenação ascendente numérica dos weekdays após a rotação ISO (`.sort((a, b) => a - b)`), assegurando que todo schedule resultante seja canônico e passe em `validateRecurrence` e `validateScheduleShape`.
- Regressões (`src/tests/domain/regression/regression.e4.test.ts`, `src/tests/domain/recurrence.test.ts`): testes explícitos para `[1,7] + 1 ⇒ [1,2]` e `[1,6,7] + 1 ⇒ [1,2,7]`, provando preservação de ordem ascendente e shape válido.
- Propriedade de shift (`src/tests/domain/property/recurrence.property.test.ts`): property garantindo `validateRecurrence(shifted.recurrence).ok === true` e `validateScheduleShape(shifted).ok === true` sob qualquer delta inteiro (+1, -1, +7, -7, inteiros positivos e negativos).
- Linearidade PK (`src/tests/domain/property/pk.conservation.property.test.ts`): assertada aditividade matemática `stateAB.administeredMg ≈ stateA.administeredMg + stateB.administeredMg`, `stateAB.centralMg ≈ stateA.centralMg + stateB.centralMg` e `stateAB.depotMg ≈ stateA.depotMg + stateB.depotMg` via `amountClose`.
- Recorrência não-vazia (`src/tests/domain/property/recurrence.property.test.ts`): property com janelas derivadas da vigência de `schedule.startDate` com verificação estrutural de geração de ocorrências não vazias (>60% dos runs).
- DST semanal (`src/tests/domain/recurrence.test.ts`, `src/tests/domain/property/recurrence.property.test.ts`): testes de recorrência semanal em `America/New_York` atravessando GAP (2024-03-10, resolvendo para 03:30 local via 'later') e OVERLAP (2024-11-03, resolvendo para offset -04:00 via 'earlier').
- Solver e recomposição (`src/tests/domain/property/pk.solver.property.test.ts`, `src/tests/domain/property/helpers.ts`): removido escape artificial `ka/ke < 1e-300`, recomposição em espaço-$y$ por `Math.log(ka) - Math.log(ke)`, `oracleG` estabilizado para $|y|$ grande; caso extremo muito pequeno normal representável $T_{1/2}=1\text{ ms}, T_{max}=1000\text{ ms}$ recomposto pela equação dentro de `TMAX_RECOMPOSITION_RTOL`.
- Cutoff adversarial e caso $D=\emptyset$ (`src/tests/domain/property/pk.cutoff-equivalence.property.test.ts`): adicionados testes de descarte imediatamente antes da fronteira do corte (-1 ms, -10 ms, -1000 ms) avaliados em todos os timestamps comuns (incluindo `displayStart`); caso $D=\emptyset$ provando `cutoffClose(a,b,0) === amountClose(a,b)`.
- Bateman (`src/tests/domain/property/pk.bateman.property.test.ts`): acumulado `maxRelativeError` observado na matriz determinística contra oráculo Decimal (60 dígitos) com emissão de log `[e4-bateman] maxRelativeError=...`.
- Diário (`docs/DIARIO-DE-BORDO.md`): restaurada a ordem cronológica movendo E4 para após E3 e adicionada esta entrada E4.1.

### Arquivos principais

- `src/domain/recurrence/shift.ts`
- `src/tests/domain/recurrence.test.ts`
- `src/tests/domain/regression/regression.e4.test.ts`
- `src/tests/domain/property/recurrence.property.test.ts`
- `src/tests/domain/property/pk.conservation.property.test.ts`
- `src/tests/domain/property/pk.solver.property.test.ts`
- `src/tests/domain/property/pk.cutoff-equivalence.property.test.ts`
- `src/tests/domain/property/pk.bateman.property.test.ts`
- `src/tests/domain/property/helpers.ts`
- `docs/DIARIO-DE-BORDO.md`

### Bugs/counterexamples

- Counterexample `shiftSchedule([1,7], +1) → [2,1]`: gerava weekdays fora de ordem ascendente, violando a forma canônica e sendo rejeitado por `validateRecurrence`. Corrigido para `[1,2]`.
- Linearidade PK: antes não assertava `base = stateA + stateB`; agora verifica aditividade física nos compartimentos primários via `amountClose`.
- Recurrence property vazia: janelas antigas em 2024 criavam execuções vacuamente vazias para schedules em 2025–2027; corrigido para janelas ancoradas em `schedule.startDate`.
- DST semanal: adicionada cobertura de recorrência semanal atravessando transições de GAP e OVERLAP em `America/New_York`.
- Recomposição de $k_a$ extremo muito pequeno normal: evitado subflow na razão $k_a/k_e$ usando $\ln(k_a) - \ln(k_e)$ e `oracleG` estável; validado caso $T_{1/2}=1\text{ ms}, T_{max}=1000\text{ ms}$.
- Cutoff adversarial: coberta fronteira imediata do corte ($t_{calcStart} - 1\text{ ms}$) com `cutoffClose`.
- Resultado final dos gates: todos os gates locais aprovados (PASS).

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS
- `npm run test:e4`: PASS
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS

### Pendências

- E5 ainda não iniciada (Zod, schemas de validação, catálogo pt-BR de erros).
- E4.1 fecha definitivamente o gate matemático E4.

### Commit

- `b256a0adbdfe0f7eb47ed1cf9709313ec1e34dc8`

## 2026-08-26 — E4.2 — Validação de solução PK subnormal

### Objetivo

Corrigir a classificação IEEE-754 do fixture anterior (1 ms / 1000 ms, cujo $k_a \approx 6,47 \times 10^{-302}\text{ ms}^{-1} \ge 2^{-1022}$ é normal) e adicionar um caso genuinamente subnormal representável (1 ms / 1025 ms, cujo $k_a \approx 1,93 \times 10^{-309}\text{ ms}^{-1} < 2^{-1022}$) com prova de recomposição pela equação em espaço-$y$, consolidando a distinção entre as três regiões numéricas do solver antes do início da E5.

### Alterações realizadas

- Reclassificação IEEE-754 (`src/tests/domain/property/pk.solver.property.test.ts`, `src/tests/domain/property/extremes.property.test.ts`): caso $T_{1/2}=1\text{ ms}, T_{max}=1000\text{ ms}$ reclassificado como normal representável com assert explícito `ka >= 2^-1022` ($MIN\_NORMAL\_DOUBLE$).
- Novo fixture subnormal (`src/tests/domain/property/pk.solver.property.test.ts`, `src/tests/domain/property/extremes.property.test.ts`): caso $T_{1/2}=1\text{ ms}, T_{max}=1025\text{ ms}$ produz $k_a \approx 1,93 \times 10^{-309}\text{ ms}^{-1}$, provando `0 < ka < 2^-1022` e `ka >= Number.MIN_VALUE`.
- Recomposição subnormal em espaço-$y$: $y = \ln(k_a) - \ln(k_e)$ e $g(y) \approx k_e \cdot T_{max}$ via `oracleG` estável verificado dentro de `TMAX_RECOMPOSITION_RTOL` ($10^{-9}$) para $1000\text{ ms}$ e $1025\text{ ms}$.
- Teste explícito de 3 regiões: normal ($1000\text{ ms}$), subnormal ($1025\text{ ms}$) e não representável ($3650\text{ d} \Rightarrow ABSORPTION\_SOLVER\_FAILURE$).
- Correção factual de comentários no diário de bordo e nas suítes de testes.

### Problemas encontrados

- Não foi identificado novo bug no solver; o algoritmo de bisseção e cálculo de $k_a$ já operava corretamente no domínio subnormal, restando apenas a classificação e cobertura explícita do fixture subnormal nos testes.

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS (28 arquivos, 270 testes)
- `npm run test:e4`: PASS (11 arquivos, 80 testes)
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS

### Pendências

- E5 ainda não iniciada.
- E4.2 fecha em definitivo o gate matemático E4.

### Commit

- `b208ea486b25ca464fdc545484cc88307e72d446`

## 2026-08-26 — E4.3 — Fechamento documental e CI

### Objetivo

Corrigir a última imprecisão numérica de documentação do fixture de 1000 ms e confirmar o gate remoto do GitHub Actions antes de iniciar E5.

### Alterações realizadas

- Comentário `y ≈ −697.75` corrigido para aproximadamente `y ≈ −693.147` em `src/tests/domain/property/pk.solver.property.test.ts`.
- Nenhuma alteração no solver/motor matemático de produção.
- Fixtures 1000 ms (normal), 1025 ms (subnormal) e 3650 d (não representável) integralmente preservados.
- Validação dos gates locais e acompanhamento da execução remota do CI no GitHub Actions.

### Problemas encontrados

- Nenhuma falha funcional; ajuste restrito à precisão de anotação em comentário de teste.

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS (28 arquivos, 270 testes)
- `npm run test:e4`: PASS (11 arquivos, 80 testes)
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS

### Pendências

- E4 encerrada definitivamente com todos os gates matemáticos, de engenharia e CI aprovados.
- E5 pronta para início.

### Commit

- `30c236707756e99a56d0ae2fd8f58f559d4189c4`

## 2026-08-26 — E5 — LIMITS, Zod, i18n e tipos

### Objetivo

Implementar a camada centralizada e tipada de validação estrutural (Zod), limites (LIMITS), bounds para controles HTML (`boundsFromLimits`), catálogo pt-BR de erros e warnings com formatadores puros, tipos de domínio e type-tests formais, congelando os contratos de entrada e saída da FARMakit sem iniciar persistência/UI.

### Alterações realizadas

- **Dependência Zod**: instalado `zod` como dependência de runtime.
- **LIMITS (`src/validation/limits.ts`)**: verificado e mantido como fonte única de bounds normativos (`DOMAIN_LIMITS`, `SAFETY_LIMITS`, `UX_LIMITS`), adicionando constantes derivadas em ms (`MS_PER_DAY`, `HALF_LIFE_MS_MAX`, `TMAX_MS_MAX`) sem duplicação de magic numbers.
- **Bounds HTML (`src/validation/bounds.ts`)**: implementado `boundsFromLimits()` puro, derivando atributos min/max/step/maxLength para formulários HTML diretamente a partir dos limites normativos.
- **Schemas Zod (`src/validation/schemas/`)**:
  - `primitives.ts`: schemas para números finitos, positivos, não negativos, inteiros positivos, strings não vazias, nomes (1..100 chars), ISO Instant (`isValidInstantIso`), LocalDate (`isValidLocalDate`), LocalTime (`isValidLocalTime`), TimeZoneId (`isValidTimeZoneId`), IsoWeekday (1..7), MassUnit, TimeUnit, DurationValue, DurationRange.
  - `pk.ts`: `selectedPkParametersSchema` ($T_{1/2} \in [1\text{ ms}, 3650\text{ d}]$; $T_{max} \in [\text{null}, 0\dots 3650\text{ d}]$) e `pkParametersSnapshotSchema`.
  - `recurrence.ts`: `recurrenceSchema` (single vs weekly com weekdays 1..7 ordenados ascendentes únicos e weeks inteiro 1..520) e `scheduleSchema`.
  - `scenario.ts`: `doseSchema` (amountMg $>0 \le 1.000.000\text{ mg}$), `doseDraftSchema`, `scenarioSourceSchema` e `scenarioSchema` (name não vazio $\le 100$, doses $\le 2000$).
  - `protocol.ts`: `protocolComponentSourceSchema`, `protocolComponentSchema` e `protocolSchema` (1..20 componentes com IDs únicos, proporções $>0$ somando $1 \pm 10^{-12}$ via `proportionSumClose` e doses derivadas $\le 1.000.000\text{ mg}$).
  - `reconstitution.ts`: `syringeSchema` (U-100, 100 U/mL, graduação $>0 \le 100\text{ U}$) e `reconstitutionInputSchema` (vial $\le 100.000\text{ mg}$, diluente $\le 1000\text{ mL}$, dose $\le 1.000.000\text{ mcg}$).
  - `index.ts`: exportação unificada de todos os limites, bounds e schemas.
- **Erros e Warnings de Domínio (`src/domain/shared/errors.ts`)**:
  - `DomainErrorCode`: todos os 15 códigos normativos presentes, incluindo `SCENARIO_NAME_REQUIRED`.
  - `DataManagementErrorCode` & `DataManagementError`: adicionados os 5 tipos normativos (`CONFIG_STORAGE_LIMIT_EXCEEDED`, `CALCULATION_RECORD_TOO_LARGE`, `EXPORT_SIZE_LIMIT_EXCEEDED`, `IMPORT_FILE_TOO_LARGE`, `IMPORT_KIND_MISMATCH`).
- **Catálogo pt-BR e Formatadores (`src/app/i18n/pt-BR.errors.ts`, `pt-BR.messages.ts`)**:
  - Catálogo exaustivo tipado `domainErrorMessages`, `dataManagementErrorMessages`, `pkWarningMessages`, `reconstitutionWarningMessages`, `recurrenceReasonMessages`.
  - Formatadores puros `formatDomainError`, `formatDataManagementError`, `formatPkWarning`, `formatReconstitutionWarning`, `formatRecurrenceReason`.
  - Preservação literal das mensagens herdadas e parâmetros dinâmicos.
- **Tipos de Domínio (`src/domain/types.ts`)**: alinhados rigorosamente com os schemas Zod (`PkParametersSnapshot`, `DoseDraft`, `ScenarioSource`, `ProtocolComponentSource`, etc.).
- **Type-Tests (`tsconfig.type-tests.json`, `src/tests/types/types.test-d.ts`)**:
  - Script `"type-tests": "tsc -p tsconfig.type-tests.json"`.
  - Validação estática de compatibilidade bidirecional de schemas com tipos de domínio, exaustividade dos catálogos de mensagens pt-BR e rejeição em tempo de compilação de shapes inválidos via `@ts-expect-error`.
- **CI (`.github/workflows/ci.yml`)**: adicionado o gate `npm run type-tests`.
- **Testes Unitários E5 (`src/tests/validation/`)**:
  - 9 arquivos de teste com 74 testes unitários cobrindo exaustivamente limites, bounds, primitivos, PK, recorrência, cenários, protocolos, reconstituição e i18n.
  - Script `"test:e5": "vitest run src/tests/validation"`.

### Problemas encontrados

- No primeiro teste de lint, uma variável importada em arquivo de teste estava sem uso direto; corrigida com adição de bloco de teste dedicado.
- Na tipagem inicial de `formatDataManagementError`, `dataManagementErrorMessages` foi inferido como literal string puro inviabilizando o narrowing de função; corrigido tipando explicitamente o dicionário com `Record<DataManagementErrorCode, ErrorMessageTemplate>`.

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run type-tests`: PASS
- `npm test`: PASS (37 arquivos, 345 testes)
- `npm run test:e5`: PASS (9 arquivos, 74 testes)
- `npm run test:e4`: PASS (11 arquivos, 80 testes)
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS

### Pendências

- E5 concluída integralmente (retificação factual: a suíte `test:e5` continha 75 testes e não 74).
- E6+ (Persistência / IndexedDB / Quarentena / Migração) NÃO iniciada.

### Commit

- `daa1bd066eb000e526c6deff8fdd508a56af099a`

## 2026-08-26 — E5.1 — Correções de aderência contratual

### Objetivo

Corrigir divergências pontuais de conformidade entre tipos/schemas da E5 e a especificação normativa da FARMakit (§6): restaurar obrigatoriedade de campos em entidades persistíveis (`Scenario`, `ProtocolComponent`, `Protocol`), adicionar `selectionNote` em `SelectedPkParameters`, tornar schemas Zod estritos (rejeição de chaves desconhecidas), validar semântica de unidades em `DurationRange`, remover limite inventado de `syringeCapacityUnits`, eliminar duplicação de `MS_PER_DAY`, centralizar mensagens pt-BR de validação e fortalecer os type-tests com testes negativos.

### Alterações realizadas

- **Entidades e Tipos de Domínio (`src/domain/types.ts`)**:
  - `SelectedPkParameters`: restaurado campo `selectionNote?: { range: { halfLife?: DurationRange; tmaxRange?: DurationRange }; chosenBy: 'user' }`.
  - `PaletteColorId`: adicionado tipo canônico `export type PaletteColorId = string`.
  - `DisplayColor`: adicionada interface `export interface DisplayColor { paletteColor: PaletteColorId; legacyOriginalHex?: string }`.
  - `Scenario`: `source: ScenarioSource` e `color: PaletteColorId` tornados obrigatórios.
  - `ProtocolComponent`: `source: ProtocolComponentSource`, `pkParametersSnapshot: PkParametersSnapshot` e `displayColor: DisplayColor` tornados obrigatórios.
  - `Protocol`: `createdAt: InstantIso` e `updatedAt: InstantIso` tornados obrigatórios.
- **LIMITS (`src/validation/limits.ts`)**:
  - Importado `MS_PER_DAY` de `src/domain/units/convert.ts` e reexportado, eliminando redeclaração de literal numérico.
- **Bounds HTML (`src/validation/bounds.ts`)**:
  - `HtmlNumberBounds`: `min` e `max` tornados opcionais (`min?: number; max?: number`).
  - `syringeCapacityUnits`: removido `max: 1000` (sem limite superior inventado na especificação).
- **Centralização pt-BR de Validação (`src/app/i18n/pt-BR.validation.ts`, `pt-BR.messages.ts`, `pt-BR.errors.ts`)**:
  - Criado `src/app/i18n/pt-BR.validation.ts` com o catálogo `validationMessages` e reexportado em `src/app/i18n/pt-BR.messages.ts`.
  - Eliminadas todas as mensagens literais pt-BR hardcoded nos arquivos de `src/validation/schemas/`.
  - Substituída a expressão "limite seguro" por "limite técnico permitido" na mensagem de `PROTOCOL_TOTAL_DOSE_INVALID`.
- **Schemas Zod Estritos e Semântica (`src/validation/schemas/`)**:
  - `primitives.ts`: `durationValueSchema`, `durationRangeSchema`, `displayColorSchema` definidos com `z.strictObject(...)`.
  - `durationRangeSchema`: validação semântica com conversão de unidades via `compareDurationValues(range.min, range.max) <= 0`.
  - `pk.ts`: `selectedPkParametersSchema` e `pkParametersSnapshotSchema` definidos com `z.strictObject(...)`.
  - `recurrence.ts`: `recurrenceSchema` (variantes single e weekly) e `scheduleSchema` definidos com `z.strictObject(...)`.
  - `scenario.ts`: `doseSchema`, `doseDraftSchema`, `scenarioSourceSchema` e `scenarioSchema` com `source: scenarioSourceSchema` obrigatório e `z.strictObject(...)`.
  - `protocol.ts`: `protocolComponentSourceSchema`, `protocolComponentSchema` (campos obrigatórios) e `protocolSchema` (`createdAt` e `updatedAt` obrigatórios) com `z.strictObject(...)`.
  - `reconstitution.ts`: `syringeSchema` (capacityUnits sem teto 1000) e `reconstitutionInputSchema` com `z.strictObject(...)`.
- **Type-Tests Fortalecidos (`src/tests/types/types.test-d.ts`)**:
  - Validada igualdade exata (`Equal`) de `Scenario`, `ProtocolComponent`, `Protocol`, `DisplayColor`, `ScenarioSource`, `ProtocolComponentSource`, `SelectedPkParameters`, `Recurrence`, `Schedule`, `Dose`, `DoseDraft`, `Syringe`, `ReconstitutionInput`.
  - Adicionados testes negativos em tempo de compilação via `@ts-expect-error` para entidades incompletas ou tipos inválidos (Scenario sem source, ProtocolComponent sem source / snapshot / displayColor, DisplayColor como string, Protocol sem createdAt / updatedAt).
- **Testes e Fixtures Atualizados (`src/tests/validation/`, `src/tests/domain/`)**:
  - Fixtures de teste de simulação atualizadas para preencher todos os campos obrigatórios.
  - Novos testes unitários para: `DurationRange` com conversão de unidades cruzadas (ex: 24h..2d válido, 3d..48h inválido), rejeição de unknown keys em todos os schemas estruturados, `capacityUnits = 1500` sem teto artificial, rejeição isolada de cada campo obrigatório faltante.
  - Total de testes da suíte E5 (`test:e5`) expandido de 75 para 94 testes. Total geral do projeto: 365 testes unitários e de propriedade.

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run type-tests`: PASS
- `npm test`: PASS (37 arquivos, 365 testes)
- `npm run test:e5`: PASS (9 arquivos, 94 testes)
- `npm run test:e4`: PASS (11 arquivos, 81 testes)
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS

### Pendências

- E5.1 concluída integralmente.
- E6+ (Persistência / IndexedDB / Quarentena / Migração) NÃO iniciada.

## 2026-08-26 — E5.2 — Fechamento contratual final da E5

### Objetivo

Fechar as pendências contratuais residuais da E5 identificadas em revisão independente (regra indevida de proporção individual <= 1, consolidação física de pt-BR em arquivo único, contratos de tipo de provenance e union de export com type-tests), sem iniciar E6.

### Pendências residuais encontradas

- `ProtocolComponent.proportion`: validação individual estava restringindo indevidamente `p <= 1`, quando o contrato normativo exige apenas `finite > 0` individualmente e reserva a validação da soma para `proportionSumClose` (com `PROPORTION_SUM_ATOL = 1e-12`).
- Arquitetura i18n pt-BR: a especificação determina "pt-BR só em `src/app/i18n/pt-BR.messages.ts`", mas haviam sido criados arquivos secundários `pt-BR.errors.ts` e `pt-BR.validation.ts`.
- Contratos de tipo E5: roadmap normativo da E5 atribui contratos de tipo e `.test-d.ts` para union de export e provenance (`ProfileOrigin`), ainda não formalizados em type-tests.
- Documentação: a entrada E5.1 omitiu a subseção `### Commit` com o SHA e mensagem correspondentes.

### Correções realizadas

- **Proporção Individual (`src/validation/schemas/protocol.ts`)**:
  - Removida a restrição `p <= 1` de `protocolComponentSchema`. Proporções individuais exigem exclusivamente `Number.isFinite(p) && p > 0`.
  - A autoridade sobre a soma das proporções permanece unicamente em `proportionSumClose(components.map(c => c.proportion))` com `PROPORTION_SUM_ATOL = 1e-12`.
  - Testes unitários atualizados: componente único com proporção `1 + 5e-13` é aceito pelo `protocolSchema`; `1 + 2e-12` é aceito no componente individual mas rejeitado no protocolo pela soma; proporções `<= 0`, `NaN` e `Infinity` continuam rejeitadas.
- **Consolidação em Arquivo Único pt-BR (`src/app/i18n/pt-BR.messages.ts`)**:
  - Consolidados fisicamente todos os textos humanos, catálogos de erro/warning de domínio/gerenciamento de dados/PK/reconstituição/recorrência, validações estruturais e formatadores no arquivo normativo `src/app/i18n/pt-BR.messages.ts`.
  - Removidos os arquivos secundários `src/app/i18n/pt-BR.errors.ts` e `src/app/i18n/pt-BR.validation.ts`.
  - Atualizados todos os imports do projeto para `pt-BR.messages`.
- **Contratos de Provenance e Export Union (`src/domain/types.ts`, `src/domain/data-management/types.ts`)**:
  - Implementado tipo canônico discriminado `ProfileOrigin` (`legacy_unattributed`, `literature`, `user_defined`) com invariantes de `reviewStatus` e `sourceIds` conforme §6 da especificação.
  - Criado `src/domain/data-management/types.ts` com os contratos de tipo de exportação (`ExportBundleBase`, `EngineVersions`, `BackupCounts`, `ConfigPayload`, `ConfigExportBundle`, `FullBackupBundle`, `ExportBundle`) e tipos de persistência de apoio (`AppSettings`, `Favorites`, `CustomSubstance`, `CustomProfile`, `ReconstitutionRecipe`, `CalculationRecord`).
  - Nenhuma lógica funcional de persistência, IndexedDB, serialização, import/export ou quarentena foi implementada (escopo preservado para E6).
- **Type-Tests Fortalecidos (`src/tests/types/types.test-d.ts`)**:
  - Adicionados testes positivos e narrowing para todas as variantes válidas de `ProfileOrigin` e `ExportBundle`.
  - Adicionados testes negativos em tempo de compilação via `@ts-expect-error` para combinações impossíveis de `ProfileOrigin` (`user_defined` com status `reviewed`, `legacy_unattributed` com `not_applicable`, `literature` sem `sourceIds` ou com `not_applicable`, kind desconhecido) e de `ExportBundle` (`bundleKind` desconhecido, `ConfigExportBundle` contendo `history`, etc.).
- **Suíte de Testes Expandida (`src/tests/validation/`)**:
  - `protocol.schemas.test.ts`: 19 testes unitários cobrindo fronteiras numéricas exatas de tolerância e componentes.
  - `i18n.test.ts`: 11 testes unitários cobrindo todos os catálogos, formatadores, `validationMessages` e mensagens de navegação do App Shell.
  - Total da suíte E5 (`test:e5`): 99 testes (todos PASS). Total geral: 370 testes em 37 arquivos (todos PASS).

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run type-tests`: PASS
- `npm test`: PASS (37 arquivos, 370 testes)
- `npm run test:e5`: PASS (9 arquivos, 99 testes)
- `npm run test:e4`: PASS (11 arquivos, 81 testes)
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS

### Retificação documental E5.1

- A etapa E5.1 foi formalizada e enviada no commit `b8981705f6f4e83f5502caedf3d1271b729d0f4a` com a mensagem `fix(farmakit): alinhar contratos e schemas da E5`, tendo obtido CI remoto verde (Run ID: `32995715282`, status: `completed`, conclusion: `success`).

### Pendências

- Nenhuma pendência técnica conhecida da E5.
- E5 concluída e fechada com conformidade contratual estrita.
- Próxima etapa: E6 (Persistência + Exports + Budgets + Quarantine).
- E0 continua não bloqueante.

### Commit

- Mensagem: `fix(farmakit): fechar contratos residuais da E5`

## 2026-08-27 — E5.3 — Contrato tipado completo de histórico

### Objetivo

Substituir o placeholder permissivo `[key:string]: unknown` de `CalculationRecord` pela discriminated union estrita e completa da §6 da especificação, assegurando que `FullBackupBundle.history` exija contratos normativos sem permitir registros incompletos, sem implementar runtime de E6 ou E12.

### Problema encontrado

- Na E5.2, `CalculationRecord` havia sido declarado com assinatura de índice aberta `[key: string]: unknown`, permitindo que objetos incompletos compilassem como registros válidos de histórico.
- Isso enfraquecia o contrato de `FullBackupBundle.history: CalculationRecord[]`, permitindo backups com payloads parciais.
- Faltavam contratos de tipo formais para os snapshots históricos (`ComparatorScenarioResultSnapshot`, `ChartViewSnapshot`, `ProtocolAnalysisSnapshot`, etc.).

### Correção realizada

- **Remoção do Placeholder Permissivo (`src/domain/data-management/types.ts`)**:
  - Eliminada qualquer assinatura de índice indexada `[key: string]: unknown`.
  - Implementada a discriminated union estrita de `CalculationRecord` com as três variantes normativas:
    1. `pharmacokinetics`: exige `versions: { pkEngineVersion, recurrenceEngineVersion?, datasetVersion }`, `scenarios: ComparatorScenarioResultSnapshot[]`, `chartViewSnapshot: ChartViewSnapshot`.
    2. `reconstitution`: exige `versions: { reconstitutionEngineVersion, datasetVersion }`, `input: ReconstitutionInput`, `resultSnapshot: ReconstitutionResult`.
    3. `protocol-analysis`: exige `versions: ProtocolAnalysisVersions`, `timeZone: TimeZoneId`, `snapshot: ProtocolAnalysisSnapshot`, `simulationInputs: ProtocolSimulationInputSnapshot[]`, `protocolsSnapshot: Protocol[]`.
- **Contratos de Snapshots e Visualização Histórica**:
  - `RecordDisplayMeta`: `{ title: string; color: PaletteColorId; note?: string }`.
  - `CalculationRecordBase`: `{ id: string; createdAt: InstantIso; display: RecordDisplayMeta }` com `display` obrigatório.
  - `ComparatorScenarioResultSnapshot`: `{ scenarioId, scenarioSnapshot, simulationInput, resultSnapshot }`.
  - `ChartViewSnapshot`: `{ displayWindow, calendarTimeZone, scaleMode, yAxisMode, displayPointsByScenario }` com `calendarTimeZone` obrigatório para reprodução exata.
  - `ChartSnapshotPoint`: `{ timeMs, value, valueKind: 'mg' | 'normalized_ratio', clippedBelowLogEpsilon? }`.
  - `ProtocolComponentKey`: chave composta `{ protocolId, componentId }`.
  - `ProtocolSimulationInputSnapshot`: `{ key, input }`.
  - `ProtocolAnalysisSeriesSnapshot`: `{ key, label, color, displayPoints, state, peak, milestones, warnings }`.
  - `ProtocolAnalysisSnapshot`: `{ displayWindow, calculationWindow, series }`.
  - `ProtocolAnalysisVersions`: `{ pkEngineVersion, recurrenceEngineVersion, datasetVersion }`.
  - `DisplayPoint`: `{ timeMs, amountMg, clippedBelowLogEpsilon? }` adicionado em `src/domain/types.ts`.
- **Rastreabilidade Derivada Preservada**:
  - Nenhum `profileRefs` ou `HistoricalProfileRef` foi adicionado aos contratos persistidos; a rastreabilidade deriva unicamente de `scenarioSnapshot.source` / `protocolsSnapshot[].components[].source`.

### Type-tests

- Adicionados testes positivos de compatibilidade estrutural para todos os tipos de snapshot.
- Adicionadas fixtures válidas para as três variantes de `CalculationRecord` e para `FullBackupBundle`.
- Adicionada função de narrowing exaustivo `narrowCalculationRecord(record: CalculationRecord)` sem casts.
- Adicionados testes negativos em tempo de compilação via `@ts-expect-error` para:
  - `CalculationRecord` sem `display`.
  - `pharmacokinetics` incompleto, sem `versions`, sem `scenarios`, ou sem `chartViewSnapshot`.
  - `reconstitution` sem `versions`, sem `input`, ou sem `resultSnapshot`.
  - `protocol-analysis` sem `versions`, sem `timeZone`, sem `snapshot`, sem `simulationInputs`, ou sem `protocolsSnapshot`.
  - Campos cruzados incompatíveis (ex.: `reconstitution` com `scenarios`, `protocol-analysis` com `chartViewSnapshot`).
  - `FullBackupBundle` com item de histórico incompleto rejeitado em tempo de compilação.
  - `ChartViewSnapshot` sem `calendarTimeZone`.
  - `ProtocolComponentKey` sem `protocolId` ou sem `componentId`.

### Escopo

- Zero lógica de persistência, storage, orçamentos, IndexedDB ou import/export runtime da E6.
- Zero runtime de histórico (save/load/reopen/recalculate) da E12.
- Apenas contratos e tipos TypeScript estritos e compiláveis.

### Validações executadas

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run type-tests`: PASS
- `npm test`: PASS (37 arquivos, 370 testes)
- `npm run test:e5`: PASS (9 arquivos, 99 testes)
- `npm run test:e4`: PASS (11 arquivos, 81 testes)
- `npm run build`: PASS
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS
- `git diff --check`: PASS

### Pendências

- Nenhuma pendência técnica ou contratual remanescente na E5.
- E5 concluída com conformidade estrita definitiva.
- Próxima etapa: E6 (Persistência + Exports + Budgets + Quarantine).
- E0 continua não bloqueante.

### Commit

- Mensagem: `fix(farmakit): tipar historico e full backup da E5`
