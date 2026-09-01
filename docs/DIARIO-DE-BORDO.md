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

## 2026-08-27 — E6 — Persistência, Exports, Budgets e Quarentena

### Objetivo

Implementar a camada completa de persistência, exportação/importação, orçamentos em bytes UTF-8, histórico com FIFO determinístico e quarentena compacta, conforme as §§ 5, 6, 11, 12, 13, 14, 16, 18 e 20 de `FARMakit-especificacao-final.md`.

### Alterações realizadas

- **Consentimento de Persistência (Opt-in)** (`src/storage/consent.ts`):
  - Inicia desativado (`false`) por padrão; nenhuma gravação ocorre sem ativação explícita.
  - Armazenado em chave técnica de localStorage (`fk:v1:persistence-consent`).
  - Nunca exportado nem restaurado por import (import não ativa persistência).
  - Fluxo `disablePersistenceAndClear` para revogação e purga segura de dados.
- **Medição de Bytes & Truncamento Seguro** (`src/storage/bytes.ts`):
  - Medição canônica `serializedUtf8Bytes` via `new TextEncoder().encode(JSON.stringify(value)).byteLength`.
  - `truncateUtf8Bytes` truncando de modo byte-aware sem quebrar code points Unicode multibyte.
- **Motor IndexedDB Resiliente & Degradação em Memória** (`src/storage/idb.ts`):
  - Banco `farmakit_v1` com stores `scenarios`, `protocols`, `history`, `custom`, `quarantine`.
  - Fallback automático para modo em memória quando IndexedDB estiver indisponível ou falhar.
  - Estado observável de degradação (`isStorageDegraded()`, `getLastStorageError()`, `retryStorageOpen()`).
  - Proibição estrita de descarregar payloads volumosos em `localStorage`.
- **Validação de Orçamento de ConfigPayload** (`src/storage/config.ts`):
  - Limite normativo de 15 MiB (`SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX`).
  - Mutações atômicas via `mutateConfigPayload`: se exceder 15 MiB, aborta com `CONFIG_STORAGE_LIMIT_EXCEEDED` sem alterar o storage.
- **Histórico & FIFO Determinístico** (`src/storage/history.ts`):
  - Validação individual de CalculationRecord até 8 MiB (`CALCULATION_RECORD_BYTES_MAX`); excesso rejeita com `CALCULATION_RECORD_TOO_LARGE` sem podar histórico existente.
  - Inserção do novo registro como mais novo e poda FIFO dos mais antigos enquanto: records > 500 (`HISTORY_RECORDS_MAX`), total > 47 MiB (`HISTORY_TOTAL_BYTES_MAX`), ou FullBackup projetado > 64 MiB (`FULL_BACKUP_IMPORT_BYTES_MAX`).
  - Rebalanceamento do histórico `pruneHistoryForConfigMutation` caso mutações no ConfigPayload aumentem o tamanho do FullBackup.
- **Quarentena Compacta** (`src/storage/quarantine.ts`):
  - Store local isolado para diagnósticos compactos e excertos UTF-8 truncados.
  - Limites simultâneos: máx. 5 itens (`QUARANTINE_ITEMS_MAX`), máx. 256 KiB por item (`QUARANTINE_ITEM_BYTES_MAX`), máx. 1 MiB total no store (`QUARANTINE_TOTAL_BYTES_MAX`).
  - Poda determinística FIFO após inserção.
- **Construtores de Exportação** (`src/storage/export.ts`):
  - `buildConfigExport` (bundleKind: 'config') e `buildFullBackup` (bundleKind: 'full-backup').
  - JSON UTF-8 não comprimido, versionado, sem consentimento e sem dados de quarentena.
  - Defesa contra limites de arquivo (`EXPORT_SIZE_LIMIT_EXCEEDED`).
- **Pipeline de Importação em 2 Fases** (`src/storage/import.ts`):
  - Guarda pré-leitura de `File.size` contra 16 MiB (Config) ou 64 MiB (FullBackup): se exceder, rejeita imediatamente com `IMPORT_FILE_TOO_LARGE` sem chamar `.text()` e sem quarentenar.
  - Validação de correspondência de `bundleKind` contra ação pretendida (`IMPORT_KIND_MISMATCH`).
  - Validação Zod runtime estrita via `src/validation/schemas/data-management.ts`.
  - Validação de invariantes históricas (bijeção ciência↔visual em PK, razões em [0,1], chaves de protocolo).
  - Preview estruturada (`ImportPreview`) para confirmação explícita antes de aplicar.
- **Scripts & Suíte de Testes** (`package.json`, `src/tests/storage/`):
  - Adicionado script `npm run test:e6`.
  - Suíte completa com 9 arquivos e 37 testes cobrindo bytes, consentimento, IDB, histórico, quarentena, orçamentos, export, import e round-trip same-version.

### Arquivos principais

- `src/domain/version.ts`
- `src/domain/data-management/types.ts`
- `src/domain/types.ts`
- `src/validation/schemas/data-management.ts`
- `src/validation/schemas/primitives.ts`
- `src/validation/schemas/reconstitution.ts`
- `src/validation/index.ts`
- `src/storage/bytes.ts`
- `src/storage/consent.ts`
- `src/storage/idb.ts`
- `src/storage/config.ts`
- `src/storage/history.ts`
- `src/storage/quarantine.ts`
- `src/storage/export.ts`
- `src/storage/import.ts`
- `src/storage/index.ts`
- `package.json`
- `src/tests/storage/bytes.test.ts`
- `src/tests/storage/consent.test.ts`
- `src/tests/storage/idb.test.ts`
- `src/tests/storage/config.test.ts`
- `src/tests/storage/history.test.ts`
- `src/tests/storage/quarantine.test.ts`
- `src/tests/storage/export.test.ts`
- `src/tests/storage/import.test.ts`
- `src/tests/storage/roundtrip.test.ts`
- `docs/DIARIO-DE-BORDO.md`

### Decisões tomadas

- Implementado mock IDBFactory para garantir determinismo e isolamento nos testes unitários e de integração em ambiente Node/jsdom.
- Medição exata via `TextEncoder` sobre `JSON.stringify`, com captura defensiva de `RangeError` para objetos patológicos.
- Truncamento byte-aware iterando por code points de string JavaScript para preservar surrogate pairs e caracteres multibyte sem corromper Unicode.
- Preservação estrita da guarda pré-leitura de `File.size` antes de alocar memória em streams ou chamadas a `text()`.

### Validações executadas

- `npm run lint`: PASS (0 erros, 0 warnings)
- `npm run typecheck`: PASS
- `npm run type-tests`: PASS
- `npm run test:e6`: PASS (9 arquivos, 37 testes)
- `npm test`: PASS (46 arquivos, 407 testes)
- `npm run test:e5`: PASS (9 arquivos, 99 testes)
- `npm run test:e4`: PASS (11 arquivos, 81 testes)
- `npm run build`: PASS (PWA generateSW, 10 precache entries)
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS (2 testes Playwright)
- `git diff --check`: PASS (0 violações de whitespace)

### Pendências

- E7 (migrações legadas), E8 (UI Reconstituição), E9 (UI Comparador), E10 (dataset oficial), E11 (UI Protocolos), E12 (UI Histórico), E13, E14, E15 continuam não iniciadas.

### Commit

- Mensagem: `feat(farmakit): implementar persistencia e exports da E6`

## 2026-08-27 — E6.1 — Correções pós-auditoria da persistência

### Objetivo

Corrigir a implementação da camada de persistência, histórico, exports, budgets e quarentena (E6.1) após auditoria externa rigorosa, cobrindo:
1. Purge real no opt-out (limpeza física incondicional de todos os stores do IndexedDB antes de desligar a flag de consentimento).
2. `StorageMode` formal (`persistent-ok` | `degraded-memory` | `memory-only-consent-off` | `recovering`), marcação de alterações dirty não sincronizadas (`hasUnsyncedMemoryChanges`) e sincronização obrigatória em `retryStorageOpen()`.
3. Poda determinística FIFO automática do histórico em `mutateConfigPayload` caso o FullBackupBundle projetado ultrapasse 64 MiB (retornando `evictedHistoryCount` e `evictedHistoryBytes`).
4. FIFO ordenado estritamente por `insertionOrder` sequencial interna crescente (nunca por `createdAt`), e imutabilidade por ID no histórico (ID duplicado é rejeitado sem sobrescrever nem podar).
5. Validação completa de invariantes de `protocol-analysis` (chaves compostas livres de colisão `JSON.stringify([protocolId, componentId])`, bijeção 1:1 contra `protocolsSnapshot[].components[]`, suporte a IDs contendo dois pontos `:` e independência de ordem).
6. Validador de integridade referencial `validateConfigReferences` em `src/storage/references.ts` (unicidade de IDs, `customProfile.owner` contra `customSubstances`, `scenario.source` contra `customProfiles`, `protocol.components.source` contra `customProfiles`, `favorites` contra `customSubstances`/`recipes`, e fronteira com `datasetVersion <= CURRENT_DATASET_VERSION`).
7. Read-validation no IndexedDB com schemas Zod e quarentena de itens corrompidos com `source: 'idb_corruption'` (com tratamento especial sem recursão para corrupção no store `quarantine`).
8. Detecção do fuso horário inicial via `Intl.DateTimeFormat().resolvedOptions().timeZone` com fallback seguro para `UTC`.
9. Cap de 1200 pontos por série (`DISPLAY_POINTS_PER_SERIES_MAX`) em `ChartViewScenarioSnapshot` e `ProtocolAnalysisSeriesSnapshot`.
10. Validação exata da escala `scaleMode` em `chartViewSnapshotSchema` (`normalized` exige `normalized_ratio` em $[0, 1]$ exato).
11. Export builders com validação profunda de schemas e integridade referencial antes de emitir o JSON.
12. Restauração atômica de FullBackup (`restoreFullBackup`) com transação única e rollback em caso de erro.
13. Guarda pré-leitura de `File.size` sem chamar `.text()` nem `.arrayBuffer()` e sem enviar para quarentena.
14. Adoção de `fake-indexeddb` para execução determinística de testes de transação, abort, concorrência e sincronização de IDB.

### Alterações realizadas

- Adicionada biblioteca `fake-indexeddb` em `devDependencies` do `package.json`.
- Atualizado `src/validation/limits.ts` com `DISPLAY_POINTS_PER_SERIES_MAX: 1200`.
- Atualizados `src/domain/data-management/types.ts` e `src/domain/types.ts` com `StorageMode`, `StoredHistoryEntry`, `ConfigMutationResult`.
- Atualizado `src/validation/schemas/data-management.ts` com `storedHistoryEntrySchema`, cap de 1200 pontos por série e superRefine estrito de `scaleMode`.
- Criado `src/storage/references.ts` implementando `validateConfigReferences`.
- Atualizado `src/storage/consent.ts` com `detectInitialCalendarTimeZone()` e `disablePersistenceAndPurge()`.
- Reescrito `src/storage/idb.ts` com suporte completo a modos degradados, dirty tracking, read validation, quarentena de corrupção, sincronização no retry e transação atômica em `restoreFullBackup()`.
- Atualizado `src/storage/history.ts` com ordenação por `insertionOrder`, envelope `StoredHistoryEntry` e imutabilidade por ID.
- Atualizado `src/storage/config.ts` com validação de integridade referencial e poda automática de histórico quando FullBackup projetado $> 64$ MiB.
- Atualizado `src/storage/quarantine.ts` com FIFO por sequência de inserção e limites estritos.
- Atualizado `src/storage/export.ts` com validação prévia integral.
- Atualizado `src/storage/import.ts` com codificação de chaves compostas por array JSON, validação de invariantes e restauração atômica.
- Criados/atualizados testes em `src/tests/storage/`: `bounds.test.ts`, `bytes.test.ts`, `config.test.ts`, `consent.test.ts`, `corruption.test.ts`, `export.test.ts`, `history.test.ts`, `idb.test.ts`, `import.test.ts`, `quarantine.test.ts`, `references.test.ts`, `roundtrip.test.ts`.

### Arquivos principais

- `package.json`
- `src/validation/limits.ts`
- `src/domain/data-management/types.ts`
- `src/domain/types.ts`
- `src/validation/schemas/data-management.ts`
- `src/storage/references.ts`
- `src/storage/consent.ts`
- `src/storage/idb.ts`
- `src/storage/history.ts`
- `src/storage/config.ts`
- `src/storage/quarantine.ts`
- `src/storage/export.ts`
- `src/storage/import.ts`
- `src/storage/index.ts`
- `src/tests/storage/bounds.test.ts`
- `src/tests/storage/bytes.test.ts`
- `src/tests/storage/config.test.ts`
- `src/tests/storage/consent.test.ts`
- `src/tests/storage/corruption.test.ts`
- `src/tests/storage/export.test.ts`
- `src/tests/storage/history.test.ts`
- `src/tests/storage/idb.test.ts`
- `src/tests/storage/import.test.ts`
- `src/tests/storage/quarantine.test.ts`
- `src/tests/storage/references.test.ts`
- `src/tests/storage/roundtrip.test.ts`
- `docs/DIARIO-DE-BORDO.md`

### Decisões tomadas

- Chaves compostas de componentes de protocolos usam `JSON.stringify([protocolId, componentId])` para evitar colisões entre IDs contendo caracteres delimitadores como `:` ou `/`.
- Inserção no histórico gera `insertionOrder` monotonicamente crescente; em `restoreFullBackup`, preserva-se a ordem idêntica atribuindo `insertionOrder: history.length - i`.
- Ao desativar consentimento com `disablePersistenceAndPurge`, os stores `scenarios`, `protocols`, `history`, `custom` e `quarantine` são limpos fisicamente no IndexedDB antes de persistir o flag de consentimento como `false`.
- Validações de limites e referências são executadas em memória antes de disparar operações de I/O, garantindo rollback sem estado intermediário em caso de falha.

### Validações executadas

- `npm run lint`: PASS (0 erros, 0 warnings)
- `npm run typecheck`: PASS (0 erros)
- `npm run type-tests`: PASS (0 erros)
- `npm run test:e6`: PASS (12 arquivos, 52 testes)
- `npm test`: PASS (49 arquivos, 422 testes)
- `npm run test:e5`: PASS (9 arquivos, 99 testes)
- `npm run test:e4`: PASS (11 arquivos, 81 testes)
- `npm run build`: PASS (PWA generateSW, 10 precache entries)
- `npm run check:build-boundaries`: PASS
- `npm run test:e1`: PASS (2 testes Playwright)
- `git diff --check`: PASS (0 violações de whitespace)

### Pendências

- E7 (migrações legadas) continua NÃO iniciada.
- UI de E8–E12 continua NÃO iniciada.

### Commit

- Mensagem: `fix(farmakit): corrigir persistencia e invariantes da E6`

## 2026-08-27 — E6.2 — Fechamento corretivo da persistência

### Fundamento e problemas remanescentes da E6.1

- Fonte normativa relida: `FARMakit-especificacao-final.md`, especialmente os contratos de `PersistedStateV1`, `ConfigPayload`, `CalculationRecord`, `FullBackup`, consentimento, IndexedDB, fallback em memória, budgets, FIFO, quarentena, imports e round-trip same-version.
- Base confirmada antes da edição: branch `main`, SHA `3a59bf08ebf5a78a31240e6e5d35c1a9cf330da3`, pai direto `7c4aac198415e93c2b1f2966045a381b4bac3d7f`, igual a `origin/main` após `git fetch origin --prune`.
- A E6.1 ainda permitia purge silencioso quando o IDB não abria, leitura de dado stale durante degradação, recovery destrutivo por `clear-all`, mutação não atômica de Config + history, split-brain de memória no restore, casts sem validação nas coleções custom, versão do bundle como autoridade, quarentena de corrupção fora dos budgets e FIFO não persistido.
- O fallback de histórico direto ainda convertia `createdAt` em ordem FIFO, o que contrariava a ordem de inserção persistida.

### Arquitetura de recovery adotada

- Implementado journal de mutações dirty em `src/storage/idb.ts`, formado por operações `put`, `delete` e `clear`, agrupadas por mutação lógica.
- Antes da primeira operação persistente da sessão, todos os stores são hidratados em uma única transação readonly. Isso garante snapshot coerente caso a operação seguinte provoque degradação; readers normais nunca misturam IDB e memória durante `degraded-memory`.
- Em degradação, a memória é autoritativa e as mutações são registradas no journal. `retryStorageOpen()` é a única operação que reabre o IDB, reaplica exclusivamente o journal em uma transação e só limpa dirty state em `transaction.oncomplete`.
- O recovery não executa mais `clear-all + memória`. Registros físicos não participantes da mutação permanecem no IDB; o teste de recovery preserva Scenario B e history não consultado pela aplicação ao alterar somente Scenario A.
- Depois do retry concluído, a sessão é reidratada e o IDB volta a ser a fonte persistente; falha/abort mantém `degraded-memory`, journal e erro observável.

### Correções implementadas

1. **Purge:** `purgePersistentData()` não altera memória nem dirty state antes do commit físico; ausência, erro, bloqueio ou abort de abertura/transação rejeitam. `disablePersistenceAndPurge()` só desliga o consentimento após sucesso.
2. **Degraded reads:** `getFromStore`, `getAllFromStore`, `loadConfigPayload`, history, exports e quarentena usam exclusivamente a memória autoritativa durante degradação.
3. **Request/transaction failures:** sucesso persistente é reconhecido somente em `transaction.oncomplete`; request error e `transaction.onabort` tornam o estado observavelmente degradado. Writes simples mantêm a mudança lógica da sessão e a registram no journal; Config/restore com transação iniciada preservam o estado anterior em rollback.
4. **Config + history:** `mutateConfigPayload()` projeta Config e FIFO sem tocar no storage e envia Config final + deleções de history para uma única transação sobre `scenarios`, `protocols`, `custom` e `history`.
5. **Restore:** `restoreFullBackup()` valida Config, referências, invariantes e budgets, constrói o estado seguinte fora da memória ativa e só o publica após commit. Em degradação, registra a substituição completa como operação dirty atômica.
6. **Validação histórica única:** criado `src/storage/history-validation.ts`, usado por `addCalculationRecord`, `buildFullBackup`, import e restore. A validação cobre schema estrito, versões futuras, PK ciência↔display, escalas/valores, protocol keys/bijeção e IDs duplicados.
7. **Custom read-validation:** `settings`, `favorites`, `customSubstances`, `customProfiles` e `recipes` são validados como coleções completas. O `ConfigPayload` montado também passa por validação cruzada de referências; corrupção recebe fallback seguro e quarentena.
8. **Dataset version:** `CURRENT_DATASET_VERSION` é a autoridade do runtime para bundle, favorites, Scenario library, ProtocolComponent library e CalculationRecord.
9. **Quarentena unificada:** imports e `idb_corruption` usam `addQuarantineItem()`, com limite individual, total, quantidade, preservação do newest e truncamento UTF-8/JSON byte-aware. O truncamento limita o trabalho ao máximo possível de 256 KiB mesmo diante de arquivo inválido de 64 MiB.
10. **FIFO persistido da quarentena:** cada item usa envelope interno `{id,insertionOrder,item}`. Entradas diretas E6.1 são reconhecidas, recebem ordem determinística pela sequência de normalização e são regravadas como envelope; `createdAt` não participa do FIFO.
11. **Envelope legado do histórico:** `CalculationRecord` direto é normalizado deterministicamente conforme a ordem de leitura do store, recebe `insertionOrder` monotônica e é persistido como `StoredHistoryEntry`; `Date.parse(createdAt)` foi removido.
12. **Bytes canônicos:** history e FullBackup são medidos pela serialização real do array/objeto com `JSON.stringify` + `TextEncoder`, incluindo colchetes, vírgulas e envelope.
13. **Semântica de erros:** causas estruturais, referenciais, duplicidade, versão futura, contagens e invariantes usam `internalReason`/`validationDetails`; `IMPORT_KIND_MISMATCH` ficou restrito à divergência real de ação versus `bundleKind`.
14. **Round-trip:** Config e FullBackup passam export → preview → apply → export com igualdade estrutural; o FullBackup cobre reconstitution, PK absolute, PK normalized, fuso, log, clipping, versions, IDs com `:`, ProtocolComponentKey e arrays protocol-analysis em ordens distintas.

### Nota normativa sobre 15 + 47 + 64 MiB

- A fixture solicitada com `ConfigPayload <= 15 MiB`, `history <= 47 MiB` e `FullBackup > 64 MiB` é matematicamente impossível sob a serialização canônica: os subcaps somam 62 MiB e o envelope é muito menor que a margem restante de 2 MiB.
- A própria especificação declara essa margem. O teste antigo de ~13 MiB + ~4,5 MiB foi removido como falsa premissa.
- O teste substituto materializa Config em 15 MiB exatos e history em 47 MiB exatos, confirma FullBackup abaixo de 64 MiB e mede margem superior a 2.000.000 bytes. O código de poda por FullBackup permanece defensivo para estados físicos anômalos/corrompidos, e sua atomicidade é testada com rollback de Config + deleção de history na mesma transação.

### Testes adicionados ou ampliados

- Purge happy path, falha de abertura e abort de transaction.
- Put request error real, put com request sucedido + transaction abort, delete failure e clear failure.
- Degraded read sem retorno ao IDB stale; recovery preservando Scenario B e history não consultado pela aplicação.
- Recovery round-trip antes/depois de retry e restore dirty em modo degradado.
- Rollback de `saveConfigPayload`, `mutateConfigPayload`, Config + history e `restoreFullBackup`, validando memória e leitura física do fake-indexeddb.
- Rejeição pré-storage de CalculationRecord inválido e duplicidade com `internalReason='DUPLICATE_HISTORY_ID'`.
- Rejeição de export com invariantes históricas inválidas e round-trip dos três tipos de CalculationRecord.
- Corrupção de `customSubstances`, `customProfiles`, `recipes` e referências cruzadas.
- Rejeição de versões futuras no bundle, favorite, Scenario, ProtocolComponent e CalculationRecord.
- Dez corrupções IDB passando pela mesma política global de quarentena.
- Reload de FIFO da quarentena e normalização dos envelopes E6.1 de quarantine/history sem `createdAt`.
- Fronteiras exatas e +1 para ConfigPayload 15 MiB, CalculationRecord 8 MiB, history 47 MiB, files Config 16 MiB/FullBackup 64 MiB, 500/501 registros, QuarantineItem 256 KiB e quarantine total 1 MiB; 1200/1201 pontos já permanecem cobertos.

### Validações executadas

- `npm ci`: PASS em cópia temporária limpa da árvore atual (511 pacotes; 0 vulnerabilidades). No diretório OneDrive original, três tentativas falharam antes da instalação por placeholder/reparse point corrompido em `node_modules/json-stable-stringify-without-jsonify/test`; `npm install` restaurou as dependências do checkout (0 vulnerabilidades), mas reportou a mesma limitação apenas na limpeza dos placeholders temporários.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run type-tests`: PASS.
- `npm run test:e6`: PASS (16 arquivos, 86 testes).
- `npm test`: PASS (53 arquivos, 456 testes).
- `npm run test:e5`: PASS (9 arquivos, 99 testes).
- `npm run test:e4`: PASS (11 arquivos, 81 testes).
- `npm run build`: PASS (PWA generateSW; 10 precache entries).
- `npm run check:build-boundaries`: PASS (9 arquivos em `dist`; zero referências a `.token-optimizer`).
- `npm run test:e1`: PASS (2 testes Playwright).
- `git diff --check`: PASS.

### Escopo preservado

- E7 não iniciada; nenhuma migration de produto legado criada.
- E8–E15 não iniciadas.
- Nenhum dataset oficial criado.
- Nenhuma matemática de PK, Bateman, cutoff, recurrence, DST, reconstitution, solver, sampling científico ou tolerância de proporções foi alterada.
- `README.md` permaneceu exatamente no placeholder existente.
- `.token-optimizer` não foi importada em runtime, movida, apagada, ignorada nem incluída em `dist`/precache; arquivos internos de métricas já modificados no checkout foram mantidos fora do escopo do commit.

### Commit previsto

- Mensagem: `fix(farmakit): fechar atomicidade e recovery da E6`

## 2026-08-27 — E6.3 — Hardening final da persistência: concorrência, consentimento, encapsulamento, imutabilidade e invariantes de hidratação

### Objetivo

Executar o hardening corretivo definitivo da E6 (§6, §10, §11, §12, §13, §14, §18) no commit-base `36bd0ffa6af28de111cc220d35f3aa2e839e6046`, consolidando:
1. Mutex assíncrono / fila serializada global para todas as mutações de storage.
2. Coordenação atômica de recovery com journal de mutações concorrentes.
3. Consentimento selado e persistência transacional de memória para IndexedDB (`enablePersistence` e `disablePersistenceAndPurge`).
4. Prevenção estrita de aliasing através de copy-in e copy-out defensivos (`structuredClone`).
5. Normalização monotônica de envelopes e podas imediatas na hidratação de histórico e quarentena.
6. IDs compactos e serialização segura de diagnósticos para corrupções físicas de IDB.
7. Encapsulamento estrito do barrel público `src/storage/index.ts` e isolamento de test hooks em `src/storage/testing.ts`.

### Alterações realizadas

- **Fila Global de Mutações (`src/storage/queue.ts`):** criada fila assíncrona serializada `enqueueStorageMutation()`, garantindo que escritas concorrentes, restaurações, mutações de configuração, adições de cálculo e retries operem em sequência estrita, com desimpedimento automático da fila em caso de rejeição/erro.
- **Isolamento de Recovery (`src/storage/idb.ts`):** `retryStorageOpen()` integrado à fila serializada, drenando atomicamente apenas as mutações processadas na transação e preservando entradas adicionadas durante a recuperação.
- **Copy-in / Copy-out Defensivo (`src/storage/clone.ts`):** implementado `clonePersistedValue<T>()` usando `structuredClone` com fallback JSON-safe. Aplicado na recepção de registros (`addCalculationRecord`, `mutateConfigPayload`, `putToStore`, `restoreFullBackup`) e em todas as consultas públicas (`loadConfigPayload`, `getCalculationRecords`, `getCalculationRecordById`, `getQuarantineItems`, `getAllFromStore`, `getFromStore`).
- **Consentimento Selado e Purge Seguro (`src/storage/consent.ts`):** `enablePersistence()` migra atomicamente todo o estado em memória para o IndexedDB em transação única antes de persistir a flag no `localStorage`. `disablePersistenceAndPurge()` executa o purge físico incondicional em todos os 5 object stores sem callbacks externos arbitrários. Suporte a detecção segura de `localStorage` em ambientes Node e browser.
- **Hydration Hardening & Invariantes (`src/storage/idb.ts`):** hidratação re-indexa e normaliza `insertionOrder` para sequência inteira única $1, 2, \dots, N$ eliminando duplicatas físicas; aplica podas imediatas de caps globais (quarentena $\le 5$ e $\le 1$ MiB; histórico $\le 500$ e $\le 47$ MiB) e persiste a normalização no IndexedDB.
- **Diagnóstico Seguro de Quarentena (`src/storage/idb.ts`, `src/storage/quarantine.ts`):** criado `safeDiagnosticString()` que previne exceções e limita o excerpt; `recordIdbCorruption()` garante geração de IDs compactos próprios novos para registros corrompidos com IDs excessivos/gigantescos.
- **Fronteira Pública Encapsulada (`src/storage/index.ts`, `src/storage/testing.ts`):** removidos do barrel público todos os métodos CRUD raw de baixo nível e test hooks (`commitStorageOperations`, `putToStore`, `deleteFromStore`, `clearStore`, `clearAllStores`, `purgePersistentData`, `saveConfigPayload`, `restoreFullBackup`, `setCustomIDBFactoryForTesting`, `simulateIDBFailure`, `resetStorageForTesting`, `resetStorageSessionForTesting`, `setPersistenceConsentForTesting`, `resetPersistenceConsentForTesting`), centralizados exclusivamente em `src/storage/testing.ts`.
- **Nova Bateria de Testes (`src/tests/storage/`):** criadas 5 novas suítes de testes cobrindo concorrência, ausência de lost update, 20 mutações simultâneas, aliasing defensivo, ativação atômica de consentimento com falhas de localStorage, podas e normalização de hidratação, e fronteiras de exportação estáticas e em runtime.

### Arquivos principais

- `src/storage/queue.ts`, `src/storage/clone.ts`, `src/storage/testing.ts` (novos)
- `src/storage/consent.ts`, `src/storage/idb.ts`, `src/storage/history.ts`, `src/storage/config.ts`, `src/storage/quarantine.ts`, `src/storage/import.ts`, `src/storage/index.ts` (modificados)
- `src/tests/storage/concurrency.test.ts`, `src/tests/storage/aliasing.test.ts`, `src/tests/storage/enable-persistence.test.ts`, `src/tests/storage/hydration-hardening.test.ts`, `src/tests/storage/api-boundary.test.ts` (novos)
- `src/tests/storage/consent.test.ts` (atualizado)
- `docs/DIARIO-DE-BORDO.md`

### Validações executadas

- `npm run lint`: PASS (0 erros, 0 avisos).
- `npm run typecheck`: PASS (0 erros).
- `npm run type-tests`: PASS.
- `npm run test:e6`: PASS (21 arquivos, 107 testes).
- `npm test`: PASS (58 arquivos, 477 testes).
- `npm run test:e5`: PASS (9 arquivos, 99 testes).
- `npm run test:e4`: PASS (11 arquivos, 81 testes).
- `npm run build`: PASS (PWA generateSW, 10 precache entries).
- `npm run check:build-boundaries`: PASS (9 arquivos em dist, 0 referências externas ou .token-optimizer).
- `npm run test:e1`: PASS (2 testes Playwright).
- `git diff --check`: PASS.

### Escopo preservado

- E7 não iniciada; nenhuma migration de produto legado criada.
- E8–E15 não iniciadas.
- Nenhum dataset oficial criado.
- Nenhuma matemática de PK, Bateman, cutoff, recurrence, DST, reconstitution, solver, sampling científico ou tolerância de proporções foi alterada.
- `README.md` permaneceu intacto.
- `.token-optimizer` permaneceu intacto e isolado fora de dist/runtime.

### Commit previsto

- Mensagem: `fix(farmakit): endurecer fronteiras da persistencia E6`

## 2026-08-27 — E6.4 — Fechamento final da persistência após auditoria da E6.3

### Objetivo

Executar o fechamento corretivo definitivo da E6 (§6, §10, §11, §12, §13, §14, §18, §20) no commit-base `f7a16a8ef831e5834aff77fd245efdd5ae34c5df`, sanando todos os apontamentos da auditoria externa pós-E6.3:
1. Eliminar risco de reentrância / deadlock da fila global durante a hidratação com corrupção de dados via `addQuarantineItemUnlocked`.
2. Validar limites de tamanho individuais e agregados durante a hidratação (`CalculationRecord` $\le 8$ MiB, `QuarantineItem` $\le 256$ KiB, `ConfigPayload` $\le 15$ MiB com fallback seguro).
3. Implementar compensação atômica com `purgePhysicalIDBOnly()` caso `localStorage.setItem` falhe durante `enablePersistence()`, e garantir fallback `removeItem` em `disablePersistenceAndPurge()`.
4. Garantir chaves primárias únicas geradas para todas as corrupções do IndexedDB, eliminando colisões entre stores.
5. Garantir snapshot síncrono imediato (`copy-in` antes do enqueue assíncrono) na recepção de dados em `addCalculationRecord` e `addQuarantineItem`.
6. Alinhar tipagem e semântica de erros com `StorageOperationError`, eliminando falsos positivos de códigos normativos (`CALCULATION_RECORD_TOO_LARGE` / `CONFIG_STORAGE_LIMIT_EXCEEDED`) em falhas estruturais ou de duplicidade de ID.
7. Comprovação física de invariantes e normalização estrita de `insertionOrder` no IndexedDB.

### Alterações realizadas

- **Prevenção de Deadlock / Reentrância (`src/storage/quarantine.ts`, `src/storage/idb.ts`):** implementado `addQuarantineItemUnlocked()`, que realiza a inserção de itens de quarentena sem re-enfileirar na fila global `enqueueStorageMutation`. `recordIdbCorruption()` consome a versão unlocked durante o ciclo de vida da hidratação.
- **Caps e Invariantes na Hidratação (`src/storage/idb.ts`):**
  - Histórico: `storedHistoryEntrySchema` e registros legados validam individualmente `serializedUtf8Bytes(record) <= SAFETY_LIMITS.CALCULATION_RECORD_BYTES_MAX` (8 MiB).
  - Quarentena: entradas raw e legadas validam `serializedUtf8Bytes(item) <= SAFETY_LIMITS.QUARANTINE_ITEM_BYTES_MAX` (256 KiB).
  - ConfigPayload: validação combinada de schema, integridade referencial e `serializedUtf8Bytes(payload) <= SAFETY_LIMITS.CONFIG_PAYLOAD_BYTES_MAX` (15 MiB). Em caso de violação, reverte para defaults seguros e gera item de corrupção na quarentena.
- **Compensação Atômica de Consentimento (`src/storage/consent.ts`, `src/storage/idb.ts`):**
  - `enablePersistence()`: se a gravação de consentimento no `localStorage` lançar exceção, executa `purgePhysicalIDBOnly()` para limpar os stores físicos do IndexedDB sem afetar a memória da sessão ativa, mantém `inMemoryConsent = false` e propaga o erro.
  - `disablePersistenceAndPurge()`: define `inMemoryConsent = false` imediatamente; se `localStorage.setItem` falhar, executa fallback com `localStorage.removeItem`. Se ambos falharem, lança erro observável preservando `inMemoryConsent = false`.
- **IDs Únicos para Corrupções no IDB (`src/storage/idb.ts`):** `recordIdbCorruption()` gera identificador exclusivo via `generateCompactId('idb-corrupt')`, evitando colisões mesmo que stores diferentes contenham chaves corrompidas idênticas.
- **Copy-in Síncrono Imediato (`src/storage/history.ts`, `src/storage/quarantine.ts`):** `clonedRecord = clonePersistedValue(record)` e `snapshot = clonePersistedValue(options)` são executados de forma síncrona antes de chamar `enqueueStorageMutation()`, blindando contra modificações imediatas do objeto de entrada pelo chamador.
- **Semântica e Tipagem de Erros (`src/domain/shared/errors.ts`, `src/domain/data-management/types.ts`, `src/storage/history.ts`, `src/storage/config.ts`):**
  - Criado `InternalStorageError` (`{ code?: never; internalReason: string; validationDetails?: string }`) e união discriminada `StorageOperationError`.
  - `addCalculationRecord` retorna `{ internalReason: 'DUPLICATE_HISTORY_ID' | 'STRUCTURAL_VALIDATION_FAILED' }` (sem código de tamanho).
  - `validateProjectedConfigPayload` retorna `{ internalReason: 'REFERENCE_VALIDATION_FAILED' | 'STRUCTURAL_VALIDATION_FAILED' }` (sem código de tamanho).
  - Códigos normativos públicos restritos estritamente para estouro real de capacidade em bytes.
- **Suíte de Testes da E6.4 (`src/tests/storage/`):**
  - `concurrency.test.ts`: deadlock prevention na primeira mutation com corrupção no IDB; integridade física e unicidade de `insertionOrder` no IDB.
  - `hydration-hardening.test.ts`: caps individuais de 8 MiB (histórico), 256 KiB (quarentena), 15 MiB (config) e prevenção de colisão de IDs de corrupção.
  - `enable-persistence.test.ts`: compensação atômica com purge físico e fallbacks em falha de localStorage.
  - `aliasing.test.ts`: copy-in síncrono imediato na entrada pública.
  - `history.test.ts` e `config.test.ts`: asserções de semântica de erros.

### Arquivos principais

- `src/domain/shared/errors.ts`
- `src/domain/data-management/types.ts`
- `src/domain/types.ts`
- `src/storage/quarantine.ts`
- `src/storage/idb.ts`
- `src/storage/history.ts`
- `src/storage/config.ts`
- `src/storage/consent.ts`
- `src/storage/testing.ts`
- `src/tests/storage/concurrency.test.ts`
- `src/tests/storage/hydration-hardening.test.ts`
- `src/tests/storage/enable-persistence.test.ts`
- `src/tests/storage/aliasing.test.ts`
- `src/tests/storage/history.test.ts`
- `src/tests/storage/config.test.ts`
- `src/tests/storage/corruption.test.ts`
- `docs/DIARIO-DE-BORDO.md`

### Validações executadas

- `npm run lint`: PASS (0 erros, 0 avisos).
- `npm run typecheck`: PASS (0 erros).
- `npm run type-tests`: PASS (0 erros).
- `npm run test:e6`: PASS (21 arquivos, 116 testes).
- `npm test`: PASS (58 arquivos, 486 testes).
- `npm run test:e5`: PASS (9 arquivos, 99 testes).
- `npm run test:e4`: PASS (11 arquivos, 81 testes).
- `npm run build`: PASS (Vite + PWA generateSW, 10 precache entries).
- `npm run check:build-boundaries`: PASS (9 arquivos em dist, 0 referências externas).
- `npm run test:e1`: PASS (2 testes Playwright).
- `git diff --check`: PASS (0 avisos de whitespace/EOF).

### Escopo preservado

- E7 não iniciada; nenhuma migration de produto legado criada.
- E8–E15 não iniciadas.
- Nenhum dataset oficial criado.
- Nenhuma matemática científica alterada (PK, Bateman, cutoff, recurrence, DST, reconstitution, solvers, amostragem).
- `README.md` permaneceu intacto.
- `.token-optimizer` permaneceu intacto e isolado fora de dist/runtime.

### Commit previsto

- Mensagem: `fix(farmakit): fechar reentrancia e consentimento da E6`

## 2026-08-27 — E6.5 — Fechamento de compensação, snapshots e normalização de corrupção

### Objetivo

Executar o fechamento corretivo final da E6 (§6, §10, §11, §12, §13, §14, §15, §18) no commit-base `a1c94f1c3cac3fc6108e7e60a6a0bb75ce0c7cad`, resolvendo todas as arestas residuais de robustez:
1. Tornar o rollback de `enablePersistence()` fail-closed e propagar falhas simultâneas via `AggregateError`.
2. Garantir snapshot síncrono (`clonePersistedValue`) em `applyImport(preview)` antes do enfileiramento assíncrono na fila global de mutações.
3. Eliminar retenção de alias de entrada nos construtores de export (`buildConfigExport` e `buildFullBackup`).
4. Implementar medição e serialização de diagnóstico seguro em `safeDiagnosticSnapshot` com `originalUtf8Bytes` representando o tamanho integral mensurável antes do truncamento byte-aware.
5. Normalização física automática de corrupções nos object stores do Config (`scenarios`, `protocols`, `custom`), garantindo que corrupções sanitizadas não reapareçam a cada reload.
6. Testes exatos de limites de tamanho na hidratação (15 MiB ConfigPayload, 8 MiB CalculationRecord, 256 KiB QuarantineItem).

### Alterações realizadas

- **Compensação de Consentimento Fail-Closed (`src/storage/idb.ts`, `src/storage/consent.ts`):**
  - `purgePhysicalIDBOnly()` atualizado para lançar erro caso `openIDB()` retorne `null` ou caso a transação de limpeza física falhe.
  - `enablePersistence()` atualizado para capturar falha no rollback físico e propagar `AggregateError` com ambas as falhas (`localStorageError` e `compensationError`), mantendo `inMemoryConsent = false` e preservando a memória ativa.
- **Snapshot Síncrono em `applyImport` (`src/storage/import.ts`):**
  - `const snapshot = clonePersistedValue(preview)` é executado síncrona e imediatamente na chamada pública antes de passar o controle para `enqueueStorageMutation`.
- **Isolamento de Alias em Exports (`src/storage/export.ts`):**
  - `buildConfigExport` e `buildFullBackup` clonam defensivamente o payload e o histórico com `clonePersistedValue`, garantindo que mutações posteriores do chamador não afetem o bundle gerado nem o JSON.
- **Diagnóstico Seguro e `originalUtf8Bytes` (`src/storage/idb.ts`):**
  - Implementada a função `safeDiagnosticSnapshot(value, maxBytes)` que calcula `originalUtf8Bytes` sobre a representação integral do dado corrompido antes de truncar em `truncateUtf8Bytes`.
  - `recordIdbCorruption` consome `safeDiagnosticSnapshot`, permitindo que `QuarantineItem` registre o tamanho original integral com flag `truncated: true`.
- **Normalização Física de Corrupções de Config (`src/storage/idb.ts`):**
  - `hydrateMemory()` rastreia `configNeedsPhysicalNormalization = true` sempre que encontra entradas inválidas em `scenarios`, `protocols`, `custom` ou no `ConfigPayload` completo.
  - Emite operações físicas de `configOperations(activeConfig)` na transação de normalização da hidratação, sobrescrevendo o IDB físico com o estado sanitizado ativo e eliminando reincidência de quarentena em reloads subsequentes.
- **Testes da E6.5 (`src/tests/storage/`):**
  - `enable-persistence.test.ts`: teste de falha dupla no localStorage e na compensação com asserção de `AggregateError`, modo degraded e integridade da memória.
  - `import.test.ts`: testes de TOCTOU para Config e FullBackup provando isolamento contra mutações síncronas imediatas do preview.
  - `export.test.ts`: testes de isolamento de alias nos builders de export.
  - `corruption.test.ts`: teste de `originalUtf8Bytes` em objeto corrompido grande (>256 KiB) provando cálculo anterior ao truncamento.
  - `hydration-hardening.test.ts`: testes exatos de caps (15 MiB exact/+1, 8 MiB exact/+1, 256 KiB exact/+1) e testes de normalização física idempotente em reload.

### Arquivos principais

- `src/storage/consent.ts`
- `src/storage/import.ts`
- `src/storage/export.ts`
- `src/storage/idb.ts`
- `src/tests/storage/enable-persistence.test.ts`
- `src/tests/storage/import.test.ts`
- `src/tests/storage/export.test.ts`
- `src/tests/storage/corruption.test.ts`
- `src/tests/storage/hydration-hardening.test.ts`
- `docs/DIARIO-DE-BORDO.md`

### Validações executadas

- `npm run lint`: PASS (0 erros, 0 avisos).
- `npm run typecheck`: PASS (0 erros).
- `npm run type-tests`: PASS (0 erros).
- `npm run test:e6`: PASS (21 arquivos, 125 testes).
- `npm test`: PASS (58 arquivos, 495 testes).
- `npm run test:e5`: PASS (9 arquivos, 99 testes).
- `npm run test:e4`: PASS (11 arquivos, 81 testes).
- `npm run build`: PASS (Vite + PWA generateSW, 10 precache entries).
- `npm run check:build-boundaries`: PASS (9 arquivos em dist, 0 referências a .token-optimizer).
- `npm run test:e1`: PASS (2 testes Playwright).
- `git diff --check`: PASS (0 avisos de whitespace/EOF).

### Escopo preservado

- E7 não iniciada; nenhuma migration de produto legado criada.
- E8–E15 não iniciadas.
- Nenhum dataset oficial criado.
- Nenhuma matemática científica alterada.
- `README.md` permaneceu intacto.
- `.token-optimizer` permaneceu intacto e isolado fora de dist/runtime.

### Status

- A E6.5 foi implementada e validada nos gates automatizados; aprovação externa permanece pendente.
- Commit previsto: `fix(farmakit): fechar compensacao e snapshots da E6`

## 2026-08-27 — E7 — Migrações legadas assistidas

### Objetivo

Implementar migrações assistidas, explícitas e não destrutivas do HormoTracker e do Comparador Meia-vida para os contratos canônicos `Protocol[]` e `Scenario[]` do FARMakit.

### Alterações realizadas

- Criados parsers puros com sanitização campo a campo para o envelope HormoTracker v2, array legado direto e envelope Meia-vida v2.
- Implementada canonicalização de doses, parâmetros PK, snapshots, agendas, grupos, componentes e cenários, sempre validada pelos schemas atuais.
- Implementado o mapeamento de weekday JavaScript para ISO (`0→7`, `1→1`, `6→6`), com deduplicação e ordenação sem deslocar `startDate`.
- Implementado agrupamento canônico por `groupId`, remoção prévia de siblings com dose inválida, recálculo de proporções e expansão determinística do formato antigo `isBlend/esters`.
- Criado catálogo de compatibilidade de cores com preservação de cores conhecidas, vizinho mais próximo em sRGB quadrático, desempate lexicográfico e relatório de remaps válidos.
- Implementada conversão de `datetime-local` do Meia-vida por `civilToInstantIso`, com `assumedTimeZone` explícito e políticas centrais de GAP/OVERLAP.
- Adicionados os contratos normativos `ColorRemapEntry` e `MigrationReport`, sem campos adicionais.
- Criadas APIs separadas de leitura, preview pura e aplicação explícita; a aplicação usa somente `mutateConfigPayload()` e `addQuarantineItem()` da fronteira pública E6.
- Implementados markers duráveis somente com consentimento ativo, marker de sessão, IDs determinísticos, detecção de igualdade/conflito e preservação integral das três chaves legadas.
- Implementada quarentena compacta para fonte estruturalmente corrompida, grupo Hormo inválido e conflito de ID, sem transportar o conteúdo bruto integral.

### Arquivos principais

- `src/migrations/index.ts`
- `src/migrations/types.ts`
- `src/migrations/fromHormoTracker.ts`
- `src/migrations/fromMeiavida.ts`
- `src/migrations/registry.ts`
- `src/migrations/legacyStorage.ts`
- `src/migrations/colors.ts`
- `src/migrations/ids.ts`
- `src/migrations/fixtures/*.json`
- `src/domain/data-management/types.ts`
- `src/domain/types.ts`
- `src/tests/migrations/*.test.ts`
- `src/tests/types/types.test-d.ts`
- `package.json`

### Decisões tomadas

- A E7 não possui dataset oficial e não antecipa a E10.
- A associação com perfil oficial usa resolver opcional e injetável.
- Zero matches, múltiplos matches, retorno inválido ou falha do resolver resultam em `source: manual`.
- Nenhum `substanceId`, `profileId`, `datasetVersion` ou outro ID científico é inventado.
- `tmaxValue: null` do Meia-vida é dado incompleto e descarta o cenário; somente zero explícito representa absorção instantânea.
- A aplicação não cria uma fila externa à E6, evitando reentrância e deadlock nas APIs públicas de persistência e quarentena.

### Validações executadas

- `npm ci` no workspace OneDrive: FALHA ambiental reproduzida por erro Windows `UNKNOWN/-4094` em ponto de nova análise dentro de `node_modules`.
- `npm ci` em snapshot integral temporário fora do OneDrive: PASS (511 pacotes, 0 vulnerabilidades reportadas pelo npm).
- `npm run lint`: PASS (0 erros, 0 avisos).
- `npm run typecheck`: PASS (0 erros).
- `npm run type-tests`: PASS (0 erros).
- `npm run test:e7`: PASS (7 arquivos, 28 testes).
- `npm run test:e6`: PASS (21 arquivos, 125 testes).
- `npm run test:e5`: PASS (9 arquivos, 99 testes).
- `npm run test:e4`: PASS isolado (11 arquivos, 81 testes); uma execução paralela inicial excedeu o timeout de 5 s em propriedade E4 por contenção e foi repetida isoladamente com sucesso.
- `npm test`: PASS (65 arquivos, 523 testes).
- `npm run build`: PASS (Vite + PWA generateSW, 10 entradas no precache).
- `npm run check:build-boundaries`: PASS após o build (9 arquivos em `dist`, zero referências a `.token-optimizer`).
- `npm run test:e1`: PASS (2 testes Playwright).

### Problemas encontrados

- O OneDrive manteve um ponto de nova análise inválido/bloqueado em diretórios temporários do npm sob `node_modules`, impedindo `unlink`, `mkdir`, remoção e movimentação desses diretórios no workspace.
- A primeira execução paralela de quatro suites Vitest causou contenção suficiente para um teste de propriedade E4 exceder o timeout, sem falha lógica reproduzível.

### Solução adotada

- Foi criado um snapshot integral e verificável do workspace em diretório temporário local fora do OneDrive; nele, `npm ci` e todos os gates foram executados com as mesmas fontes e lockfile.
- A suite E4 foi repetida isoladamente e passou integralmente.
- Mudanças automáticas da ferramenta `.token-optimizer` permanecerão fora do staging e do commit E7.

### Pendências

- A integração de UI para descoberta, preview, confirmação e orientação ao usuário permanece em etapa posterior.
- A integração com dataset oficial permanece reservada à E10.
- O ponto de nova análise inválido em `node_modules` do workspace OneDrive é uma pendência ambiental local e não integra o produto nem o commit.

### Commit

- Mensagem prevista: `feat(farmakit): implementar migracoes legadas E7`.

## 2026-08-27 — E7.1 — Compatibilidade cirúrgica das migrações legadas

### Objetivo

Corrigir a reconstrução histórica do LANDERGOLD em arrays diretos sem `groupId`, aceitar a estrutura real `key + suffix` dos ésteres em `isBlend/esters` e garantir que `MigrationReport.colorRemaps` cite somente Protocols efetivamente aceitos pela aplicação.

### Alterações realizadas

- Criado catálogo local e isolado de compatibilidade do HormoTracker, sem integrar ou antecipar o dataset oficial da E10.
- Implementada pré-normalização exclusiva do array legado direto por nomes históricos exatos, preservando envelopes v2 sem heurísticas adicionais.
- Reproduzida a assinatura histórica de agrupamento do LANDERGOLD por agenda e base numérica `id - índice do componente`, com fallback determinístico por data para IDs não numéricos.
- Preservados dose, half-life, Tmax e cor efetivamente persistidos no legado; o catálogo é usado somente para reconstruir identidade, grupo e labels.
- Atualizada a expansão `isBlend/esters` para aceitar ésteres com `key`, `suffix`, `proportion`, parâmetros PK e cor, sem exigir `name`.
- Corrigido o rastreamento do grupo observado após expansão de blend, eliminando falso `LEGACY_GROUP_EMPTY`.
- Remaps de cor passaram a ser acumulados por grupo e publicados no preview somente depois de o Protocol passar por `protocolSchema`.
- `MigrationReport.colorRemaps` passou a exigir explicitamente o conjunto de IDs adicionados; marker pré-existente, falha de mutação e `nothing_to_apply` retornam lista vazia.

### Arquivos principais

- `src/migrations/hormoTrackerLegacyCompatibility.ts`
- `src/migrations/fromHormoTracker.ts`
- `src/migrations/registry.ts`
- `src/migrations/fixtures/hormotracker-legacy-landergold.json`
- `src/migrations/fixtures/hormotracker-legacy-isblend.json`
- `src/tests/migrations/hormoTracker.test.ts`
- `src/tests/migrations/colors.test.ts`
- `src/tests/migrations/idempotency.test.ts`

### Decisões tomadas

- O reconhecimento histórico é nominal e exato; não foi adicionada inferência farmacológica aproximada.
- A heurística é aplicada somente ao array direto realmente legado. O envelope v2 continua dependendo de agrupamento já materializado.
- O preset histórico identifica a estrutura, mas nunca substitui os valores PK, doses ou cores encontrados no storage legado.
- A implementação permanece autocontida no FARMakit e não possui dependência runtime do repositório HormoTracker antigo.
- Meia-vida e as fronteiras públicas E6 permaneceram inalteradas.

### Validações executadas

- `npm ci` em snapshot integral fora do OneDrive: PASS (511 pacotes, 0 vulnerabilidades reportadas pelo npm).
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run type-tests`: PASS.
- `npm run test:e7`: PASS (7 arquivos, 34 testes).
- `npm run test:e6`: PASS (21 arquivos, 125 testes).
- `npm run test:e5`: PASS (9 arquivos, 99 testes).
- `npm run test:e4`: PASS (11 arquivos, 81 testes).
- `npm test`: PASS (65 arquivos, 529 testes).
- `npm run build`: PASS (Vite + PWA generateSW, 10 entradas no precache).
- `npm run check:build-boundaries`: PASS (9 arquivos em `dist`, zero referências a `.token-optimizer`).
- `npm run test:e1`: PASS (2 testes Playwright).

### Problemas encontrados

- O anexo da E7.1 termina ao final do catálogo conceitual da seção 7.1 e não contém as seções posteriores, inclusive eventual instrução de commit/push.
- Fixtures lidas inicialmente por `new URL(..., import.meta.url)` receberam URL HTTP do transformador Vitest; a leitura de arquivo exigia caminho local explícito.

### Solução adotada

- As decisões de formato foram confrontadas com a especificação vigente e com o código histórico local do HormoTracker, que confirmou o reconhecimento `base + suffix`, a base numérica do agrupamento e a estrutura real dos ésteres.
- As fixtures passaram a ser carregadas em teste por caminho resolvido a partir de `process.cwd()`.

### Pendências

- UI, E8, E9, E10 e dataset oficial permanecem fora do escopo.
- Commit e push aguardam a parte ausente da instrução ou autorização explícita do usuário.

### Commit

- Não realizado nesta execução: a mensagem e a autorização de publicação não constam no anexo recebido, que termina na seção 7.1.

### Retomada e fechamento em 2026-08-28

- O workspace foi retomado em `main`, com `HEAD` e `origin/main` em `899ae99cfe18671b367542e31526ee37b1ae74bc`, sem staging prévio e com as alterações E7.1 preservadas.
- A revisão identificou uma lacuna adicional: uma rejeição real de `mutateConfigPayload()` escapava do contrato controlado da migração. `applyLegacyMigration()` passou a capturar o aborto transacional e retornar `status: failed`, `importedCount: 0`, `colorRemaps: []`, `addedCount: 0`, `persisted: false` e `markerPersisted: false`.
- Adicionado teste regressivo com aborto real da transação IndexedDB, confirmando rollback do Config e ausência de remap fantasma.
- Preservadas as regressões já presentes no trabalho interrompido para limites do Meia-vida e shapes integralmente incompatíveis das duas fontes legadas.

### Validações da retomada

- `npm ci` no workspace OneDrive: PASS (511 pacotes, 0 vulnerabilidades reportadas pelo npm); os workers Vitest não iniciaram nesse caminho e a validação funcional foi transferida para snapshot integral fora do OneDrive.
- Runtime dos gates: Node.js `24.19.0`, compatível com o workflow `node-version: 24`; o Node.js global `25.9.0` foi descartado por incompatibilidade com `jsdom@30.0.1`.
- `npm ci` no snapshot fora do OneDrive: PASS (511 pacotes, 0 vulnerabilidades reportadas pelo npm).
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run type-tests`: PASS.
- `npm run test:e7`: PASS (7 arquivos, 44 testes).
- `npm run test:e6 -- --maxWorkers=1`: PASS (21 arquivos, 125 testes); execução serial usada para evitar contenção nos casos de budget de 8–47 MiB.
- `npm run test:e5 -- --maxWorkers=1`: PASS (9 arquivos, 99 testes).
- `npm run test:e4 -- --maxWorkers=1`: PASS (11 arquivos, 81 testes).
- `npm test -- --maxWorkers=1`: PASS (65 arquivos, 539 testes).
- `npm run build`: PASS (Vite + PWA generateSW, 10 entradas no precache).
- `npm run check:build-boundaries`: PASS (9 arquivos em `dist`, zero referências a `.token-optimizer`).
- `npm run test:e1`: PASS (2 testes Playwright em Chromium).
- `git diff --check`: PASS.

### Escopo da retomada

- E8, E9 e E10 não foram iniciadas; nenhum dataset oficial foi criado e nenhum engine matemático foi alterado.
- A E6 não foi alterada; sua infraestrutura de fault injection foi apenas reutilizada pelo teste E7.1.
- `README.md` e `FARMakit-especificacao-final.md` permaneceram sem diff.
- Alterações automáticas em `.token-optimizer/` foram preservadas no workspace e excluídas do staging.
- Commit autorizado: `fix(farmakit): fechar compatibilidade legada E7`.

## 2026-08-28 — E7.2 — Identidade numérica no isBlend legado

### Problema

Um parent `isBlend/esters` com `id` ou `groupId` numérico mantinha esse valor como number no record intermediário. Como `optionalIdentity()` aceita somente texto, os três esters perdiam a identidade comum e eram fragmentados em três Protocols.

### Correção

- Criado `legacyIdentity()`, específico da compatibilidade HormoTracker, que preserva as regras textuais existentes e converte somente números finitos para string.
- `expandOldBlend()` passou a normalizar parent, group e ester antes de criar records intermediários; `groupId` intermediário é sempre string.
- Os demais pontos internos de identidade do parser HormoTracker passaram a usar a mesma normalização, sem alterar `optionalIdentity()` globalmente.
- A pré-normalização LANDERGOLD, PK individual, `key + suffix`, `colorRemaps`, registry, Meia-vida, E6, schemas e engines permaneceram inalterados.

### Regressão

- Teste criado antes da correção: `normaliza parent, groupId e ester ids numéricos no isBlend legado`.
- Resultado na base `17f17a38e12d4c418ec6cbadfa0d0197684ef87d`: FAIL, três Protocols recebidos em vez de um.
- Resultado após a correção: PASS, um Protocol, três components, `totalDoseMg = 100`, proporções `0.2/0.4/0.4`, PK individual preservada e IDs determinísticos.
- Cobertos parent ID numérico, `groupId` numérico explícito, ester IDs numéricos e mudança determinística dos component IDs quando os IDs dos esters mudam.
- Coberto o helper com string válida, números finitos, zero, negativo e rejeição de NaN, infinidades, null, objeto, array e boolean.

### Gates

- Runtime: Node.js `24.19.0`, compatível com o workflow `node-version: 24`.
- `npm ci` em snapshot integral fora do OneDrive: PASS (511 pacotes, 0 vulnerabilidades reportadas pelo npm).
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run type-tests`: PASS.
- `npm run test:e7 -- --maxWorkers=1`: PASS (7 arquivos, 46 testes).
- `npm run test:e6 -- --maxWorkers=1`: PASS (21 arquivos, 125 testes).
- `npm run test:e5 -- --maxWorkers=1`: PASS (9 arquivos, 99 testes).
- `npm run test:e4 -- --maxWorkers=1`: PASS (11 arquivos, 81 testes).
- `npm test -- --maxWorkers=1`: PASS (65 arquivos, 541 testes).
- `npm run build`: PASS (PWA generateSW, 10 entradas no precache).
- `npm run check:build-boundaries`: PASS (9 arquivos em `dist`, zero referências a `.token-optimizer`).
- `npm run test:e1`: PASS (2 testes Playwright em Chromium).
- `git diff --check`: PASS.

### Commit

- Mensagem autorizada: `fix(farmakit): normalizar ids numericos na migracao E7`.

## 2026-08-28 — E8 — Reconstituição

### Objetivo

Implementar a tela funcional de reconstituição prevista na especificação, sem iniciar as etapas E9 em diante.

- Base SHA: `00beef0589572adf8cdaeb4a21fced2bf21811b0` em `main`.

### Alterações realizadas

- Substituído o placeholder da rota `#/reconstituir` por fluxo automático de draft textual, parsing pt-BR, schema Zod, engine existente e apresentação.
- Criados `ResultPanel`, `SyringeGauge`, `CopyButton`, `SaveToHistoryButton`, helpers de formulário/apresentação/snapshot e CSS responsivo.
- Adicionadas as âncoras de 10/120/240 U, aviso de graduação 9/10 U, bloqueio `DOSE_EXCEEDS_VIAL_CONTENT`, remoção de resultado stale, copy descritivo e salvamento explícito.
- Corrigido somente o parâmetro do erro do engine de `vialContentMcg` para `vialTotalMcg`.
- O registro usa `input`, `resultSnapshot`, `reconstitutionEngineVersion`, `CURRENT_DATASET_VERSION`, ID criptograficamente seguro e `createdAt` no salvamento.
- O consentimento desligado informa sessão; o consentimento ligado diferencia persistência confirmada de modo degradado; falhas e eviction não são mascaradas.
- Atualizada somente a expectativa estrutural da rota no smoke E1; o spike Chart.js/CSP permaneceu inalterado.

### Arquivos principais

- `src/features/reconstitution/pages/ReconstitutePage.tsx`
- `src/features/reconstitution/components/{ResultPanel,SyringeGauge,CopyButton,SaveToHistoryButton}.tsx`
- `src/features/reconstitution/lib/{form,presentation,historyRecord}.ts`
- `src/features/reconstitution/reconstitution.css`
- `src/app/i18n/pt-BR.messages.ts`
- `src/domain/reconstitution/calculate.ts`
- `src/tests/features/reconstitution/reconstitution-page.test.tsx`
- `src/tests/domain/reconstitution.test.ts`
- `src/tests/e2e/smoke-e1.spec.ts`
- `package.json`

### Decisões tomadas

- A UI não duplica fórmulas nem warning; chama `calculateReconstitution()` e renderiza o contrato retornado.
- Valores científicos permanecem numéricos e não formatados no histórico; a formatação pt-BR ocorre somente na apresentação/copy.
- O medidor usa `<meter>` com valor limitado à capacidade, `aria-valuetext` com o valor real e `data-overflow` para excedentes.
- Nenhuma alteração foi feita em `src/storage/*`, limites, schemas, dataset, PK, recurrence, simulation, migrações E7, README ou especificação.

### Validações executadas

- Red phase antes da implementação: 19 falhas (18 de UI do placeholder e 1 regressão do parâmetro `vialTotalMcg`); contratos existentes permaneceram verdes.
- Runtime usado nos gates: Node.js `24.19.0` bundled; npm `11.12.1`; `npm ci` instalou 511 pacotes e reportou 0 vulnerabilidades.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run type-tests`: PASS.
- `npm run test:e8`: PASS (3 arquivos, 42 testes).
- `npm run test:e7`: PASS (7 arquivos, 46 testes).
- `npm run test:e6 -- --no-file-parallelism --maxWorkers=1`: PASS (21 arquivos, 125 testes).
- `npm run test:e5`: PASS (9 arquivos, 99 testes).
- `npm run test:e4`: PASS (11 arquivos, 81 testes).
- `npm test -- --no-file-parallelism --maxWorkers=1`: PASS (66 arquivos, 563 testes).
- `npm run build`: PASS (Vite + PWA generateSW, 10 entradas no precache).
- `npm run check:build-boundaries`: PASS (9 arquivos em `dist`, sem `.token-optimizer`, manifest único, CSP/referrer preservados).
- `npm run test:e1`: PASS (2 testes Playwright em Chromium).
- `git diff --check`: PASS.

### Problemas encontrados

- O Node global `25.9.0` expõe Web Storage experimental sem métodos quando executado sem arquivo de localStorage; isso provoca falhas preexistentes nos testes E6. A execução foi transferida para o Node bundled `24.19.0`, compatível com o workflow, e os testes de storage foram serializados para evitar contenção entre workers.
- O smoke estrutural E1 ainda esperava o placeholder removido da E8; a asserção dessa rota foi atualizada, sem modificar o spike Chart.js.

### Solução adotada

- Uso exclusivo das APIs públicas de storage e do parser/schema/engine existentes; nenhum novo storage, dependência ou endpoint foi criado.
- Staging previsto de forma explícita somente para os arquivos da E8; `.token-optimizer/wiki/evidence.jsonl` e `.token-optimizer/wiki/metrics.jsonl` permanecem fora do commit.

### Pendências

- Commit autorizado e push para `main` serão realizados após a conferência final do staged diff.
- Validação do GitHub Actions no SHA final ainda pendente.

### Commit

- Mensagem autorizada: `feat(farmakit): implementar reconstituicao E8`.
- SHA e CI serão registrados após o commit e a publicação.

## 2026-08-28 — E8.1 — Formatação numérica pt-BR da Reconstituição

### Objetivo

Corrigir a apresentação numérica localizada em pt-BR da funcionalidade de Reconstituição (E8), eliminando o ponto decimal e caudas binárias IEEE-754 em avisos dinâmicos e mensagens de erro de domínio, além de fechar gaps e regressões de teste.

- Base SHA: `6ea7df998c6f6ebc903bc3bd8f4f58cb629770f6` em `main`.

### Alterações realizadas

- Em `src/features/reconstitution/lib/presentation.ts`, `formatReconstitutionWarningText()` passou a formatar os parâmetros dinâmicos de `CAPACITY_EXCEEDED` (`result.syringeUnits` e `input.syringe.capacityUnits`) via `formatReconstitutionNumber(..., 3, false)` antes de repassá-los ao catálogo de mensagens, garantindo vírgula pt-BR e até 3 casas decimais sem caudas IEEE-754.
- Em `src/app/i18n/pt-BR.messages.ts`, criado o helper puro `formatMessageNumber()` (Intl pt-BR, max 3 casas, sem grouping) para interpolar números de forma localizada em mensagens de erro de domínio como `DOSE_EXCEEDS_VIAL_CONTENT` (`desiredDoseMcg` e `vialTotalMcg`), evitando dependência circular com o módulo de Reconstituição.
- Em `src/tests/features/reconstitution/reconstitution-page.test.tsx`, corrigido o teste da capacidade de 30 U para usar a entrada 5 mg / 2 mL / 3000 mcg (gerando 120 U), validando resultado 120 U, warning 120 U / 30 U, meter now = 30, meter max = 30, `aria-valuetext` e overflow textual "120 U calculadas".
- Adicionados testes de unidade dedicados em `src/tests/features/reconstitution/presentation.test.ts` e em `src/tests/validation/i18n.test.ts` cobrindo a formatação pt-BR dos warnings, números com decimais, caudas IEEE-754 e texto estruturado de cópia.

### Arquivos principais

- `src/features/reconstitution/lib/presentation.ts`
- `src/app/i18n/pt-BR.messages.ts`
- `src/tests/features/reconstitution/reconstitution-page.test.tsx`
- `src/tests/features/reconstitution/presentation.test.ts`
- `src/tests/validation/i18n.test.ts`
- `docs/DIARIO-DE-BORDO.md`

### Decisões tomadas

- A matemática e o motor científico (`src/domain/reconstitution/calculate.ts`) permaneceram 100% intocados e puros.
- Nenhum snapshot de histórico, schema, storage E6 ou migração E7 foi modificado.
- O helper `formatMessageNumber` em `src/app/i18n/pt-BR.messages.ts` opera de forma pura e desacoplada, preservando a fronteira arquitetural.

### Validações executadas

- `npm run lint`: PASS (0 erros).
- `npm run typecheck`: PASS (0 erros).
- `npm run type-tests`: PASS (0 erros).
- `npm run test:e8`: PASS (4 arquivos, 50 testes).
- `npm test`: PASS (67 arquivos, 574 testes).
- `npm run test:e7`: PASS (7 arquivos, 46 testes).
- `npm run test:e6`: PASS (21 arquivos, 125 testes).
- `npm run test:e5`: PASS (9 arquivos, 102 testes).
- `npm run test:e4`: PASS (11 arquivos, 81 testes).
- `npm run build`: PASS (Vite + PWA generateSW, 10 entradas no precache).
- `npm run check:build-boundaries`: PASS (9 arquivos em `dist`, 0 referências a `.token-optimizer`).
- `npm run test:e1`: PASS (2 testes Playwright em Chromium).
- `git diff --check`: PASS.

### Commit

- Mensagem autorizada: `fix(farmakit): fechar apresentacao numerica da E8`.
- SHA base: `83ff7cac1487afd85627c72ddbb1377515ce8b18`.

## 2026-09-01 — E9 — Comparador / Meia-vida

### Objetivo

Implementar integralmente a funcionalidade do Comparador / Meia-vida (E9) da FARMakit: edição e análise de múltiplos cenários farmacocinéticos manuais ou migrados, gerenciamento de doses com datas/horas civis interpretadas estritamente via Temporal no fuso da aplicação, cálculo de janelas individuais (`CalculationWindow`), amostragem visual reamostrada (`sampleForDisplay` ≤ 1200 pontos), visualização com Chart.js 4 em escalas Absoluta/Normalizada e eixos Linear/Logarítmico (com `LOG_REL_EPSILON = 1e-12`), métricas monocompartimentais, heurística determinística de fase (`phaseHint`), tabela de marcos, detalhes educacionais do modelo e salvamento explícito de snapshots no histórico de cálculos.

### Alterações realizadas

- Em `src/domain/pk/sampling.ts`, implementada a função pura e determinística `sampleForDisplay(analysisCurve, constraints)` filtrando pela `DisplayWindow` e limitando a ≤ 1200 pontos sem interpolações ou mutações, preservando o primeiro ponto, o último ponto e o ponto de pico.
- Em `src/features/comparator/lib/`, criados os módulos de suporte:
  - `phaseHint.ts`: heurística determinística de 4 estados (`awaiting_first_dose`, `absorbing_latest`, `awaiting_next_planned`, `terminal_decline`);
  - `colors.ts`: paleta padrão de 6 cores seguras e sanitização;
  - `presentation.ts`: formatadores de UI para massa (`fromMilligrams`), percentuais e datas no fuso;
  - `chartView.ts`: preparação determinística de pontos para gráficos e snapshots (`createChartSnapshotPoints`) com suporte a modos Absolute/Normalized × Linear/Log e clipping de log relativo;
  - `form.ts`: parsing, validação e conversão de drafts de cenários e doses com Temporal (`civilToInstantIso` e `instantToZonedParts`);
  - `historyRecord.ts`: builder puro de `CalculationRecord` (`createComparatorCalculationRecord`) preservando cardinalidade 1:1, snapshots completos de cenários e inputs filtrados;
  - `analysis.ts`: orquestração do pipeline científico por cenário (`deriveCalculationWindow` → `selectRelevantScenarioDoses` → `assembleScenarioInputs` → `analyze` → `sampleForDisplay`).
- Em `src/features/charts/CompareChart.tsx`, implementado componente de visualização gráfica responsivo com Chart.js 4 (bundled, CSP-safe, destroy no cleanup, eixo temporal ms formatado em `calendarTimeZone`, omissão de pontos clipped em log via `y: null`).
- Em `src/features/comparator/components/`, criados: `ScenarioList`, `ScenarioForm`, `QuickDose`, `DoseEditor`, `MetricsPanel`, `MilestonesTable`, `ModelDetails` e `SaveAnalysisButton`.
- Em `src/features/comparator/pages/`, criados: `EditPage`, `AnalysisPage` e `ComparatorPage` com relógio vivo de 1 segundo (com cleanup de `setInterval`) e gerenciamento de estado desacoplado do armazenamento.
- Em `src/features/comparator/comparator.css`, definida a estilização completa do comparador baseada nos design tokens do projeto.
- Em `src/app/i18n/pt-BR.messages.ts`, adicionado o catálogo de mensagens `messages.comparator`.
- Adicionada suíte de testes com 8 arquivos e 28 testes específicos da E9 cobrindo amostragem, heurísticas, chart view, formulários, pipeline científico, snapshots de histórico e ciclo de vida de componentes.

### Arquivos principais

- `src/domain/pk/sampling.ts`
- `src/features/comparator/` (pages, components, lib, comparator.css)
- `src/features/charts/CompareChart.tsx`
- `src/app/i18n/pt-BR.messages.ts`
- `src/tests/domain/pk.sampling.test.ts`
- `src/tests/features/comparator/`
- `src/tests/features/charts/`
- `docs/DIARIO-DE-BORDO.md`

### Decisões tomadas

- O motor matemático (`src/domain/pk/analysis.ts`, `bateman.ts`, `rates.ts`, `state.ts`, `cutoff.ts`) permaneceu 100% puro e inalterado.
- Nenhum dataset fictício foi criado; novos cenários operam exclusivamente com `source.type = 'manual'`.
- O denominator de normalização é exclusivamente o pico global científico do resultado (`result.peak.amountMg`).
- O relógio vivo de 1s e as alterações de escala na UI não provocam escritas automáticas na persistência.
- O salvamento no histórico é uma ação estritamente explícita do usuário, respeitando consentimento e limites de capacidade.

### Validações executadas

- `npm run lint`: PASS (0 erros, 0 warnings).
- `npm run typecheck`: PASS (0 erros).
- `npm run type-tests`: PASS (0 erros).
- `npm run test:e9`: PASS (8 arquivos, 28 testes).
- `npm test`: PASS (75 arquivos, 602 testes).
- `npm run test:e8`: PASS (4 arquivos, 50 testes).
- `npm run test:e7`: PASS (7 arquivos, 46 testes).
- `npm run test:e6`: PASS (21 arquivos, 125 testes).
- `npm run test:e5`: PASS (9 arquivos, 102 testes).
- `npm run test:e4`: PASS (11 arquivos, 81 testes).
- `npm run build`: PASS (Vite + PWA generateSW).
- `npm run check:build-boundaries`: PASS (9 arquivos em dist, 0 referências a `.token-optimizer`).
- `npm run test:e1`: PASS (2 testes Playwright em Chromium).
- `git diff --check`: PASS.

### Commit

- Mensagem autorizada: `feat(farmakit): implementar comparador E9`.


