# FARMakit — ESPECIFICAÇÃO FINAL PARA IMPLEMENTAÇÃO
### Consolidação definitiva (micro-errata sobre a v4) | Substitui integralmente todas as versões anteriores

**STATUS: ESPECIFICAÇÃO PRONTA PARA IMPLEMENTAÇÃO.**

**PENDÊNCIA NÃO BLOQUEADORA DE DEPLOY:** confirmar nome público, permanência do slug/repositório `farmacologico` e configuração do GitHub Pages antes da publicação. Essa pendência NÃO bloqueia scaffold, domínio, testes, UI, persistência nem migrações — bloqueia apenas a configuração/publicação final.

**Regra normativa:** este documento, após esta micro-errata, **substitui integralmente** todas as versões anteriores (v1–v4) e é a **ÚNICA fonte normativa** para implementação da FARMakit. Versões anteriores podem existir no histórico Git exclusivamente como registro de auditoria; NÃO são fontes normativas e NÃO devem ser consultadas pelo agente implementador para preencher lacunas.

**Contexto de workspace:** projeto **GREENFIELD** no repositório existente `Masselorc/farmacologico` (branch `main`), contendo este documento e um README placeholder. **Não existe código FARMakit.** As aplicações `Masselorc/tabela-farmacos`, `Masselorc/meiavida` e `Masselorc/calculadora-peptideos` são **referências externas** (comportamento, matemática, UX, formatos legados de migração) — nunca base de código local. Termos como "portar/preservar/paridade/migrar" significam *reproduzir futuramente comportamento/regra/UX/formato numa implementação limpa*. O futuro README referenciará somente esta especificação. O diretório `.token-optimizer/`, presente no repositório, é **tooling auxiliar deliberadamente versionado** — não é lixo nem corrupção; regras na §12.3.

**Legenda de evidência:** [CÓD] confirmado no código legado · [CALC] cálculo independente · [TESTE] teste automatizado legado · [INF] inferência · [N/C] não confirmado.

---

# 1. Correções da micro-errata (v4 → esta versão)

| # | Correção | Decisão final |
|---|---|---|
| 1 | Fonte normativa única | Linguagem “v2/v3 permanecem válidas…” removida; este documento basta para implementar |
| 2 | Semântica Temporal do GAP | GAP `'later'`: horário deslocado PARA FRENTE pela duração do gap (gap 1 h ⇒ 02:30→03:30); nunca “primeiro instante válido” |
| 3 | Snapshot de protocol-analysis | Preserva `displayWindow`, `calculationWindow` e `displayPoints` por série + métricas/labels/cores ⇒ VISUALIZAR desenha sem executar engine |
| 4 | Procedência de dados do usuário | `ProfileOrigin` discriminada: legacy/literature/user_defined, com reviewStatus coerentes (`not_applicable` p/ user) |
| 5 | Cutoff e Tmax instantâneo | `effectiveTmaxMs = selected.tmaxMs ?? 0` explícito na fórmula |
| 6 | Cutoff anterior de 40 T½ — **regra obsoleta**; vigente é 44 T½ (§4) | Deixa de citar 0,5⁴⁰ isoladamente; validade garantida por property tests (ka>ke, ka<ke, ka≈ke) contra `CUTOFF_TOLERANCE` |
| 7 | Source discriminada no Scenario | Fim de campos opcionais independentes; library exige refs+snapshot; custom é autossuficiente |
| 8 | Checklist factual | Passa a dizer que apenas documentação foi modificada/commitada; nunca “nenhum commit ocorreu” |
| 9 | Performance | Metas absolutas viram BENCHMARK TARGETS calibrados em E13; CI usa regressão relativa/budgets estruturais até lá |
| 10 | Manifest PWA | Fonte ÚNICA gerada pelo build (`VitePWA({manifest})` ← `app.config.ts`); sem `public/manifest.webmanifest` manual |
| 11 | README futuro | Referencia somente a especificação vigente (versões antigas = histórico) |
| 12 | Declaração de status | “PRONTA PARA IMPLEMENTAÇÃO”; pendência restrita a deploy |

## Adendo normativo — microcorreção documental final

| # | Correção | Decisão |
|---|---|---|
| A1 | Cutoff farmacocinético | `CONTRIBUTION_CUTOFF_HALF_LIVES = 44` — 40 violava `CUTOFF_TOLERANCE` no caso degênero ka≈ke |
| A2 | Cores legadas autossuficientes | Tabela completa de hexes embutida na §9 (validada contra o `commonDrugs` real); `LEGACY_COLORS` implementável somente com este documento |
| A3 | Snapshot visual do Comparador | `ChartViewSnapshot` no registro `pharmacokinetics`; política visual uniforme entre módulos |
| A4 | Testes/checklist | Casos cutoff/cores/histórico visual adicionados (§13/§14/§20) |

Nota: as tabelas históricas acima são informativas; os requisitos normativos residem exclusivamente nas seções 2–20 desta versão.

---

# 2. Visão final do produto

**Nome provisório:** FARMakit (nome público definitivo = pendência de deploy). **Repositório:** `Masselorc/farmacologico`. **Natureza:** greenfield.

**Finalidade:** aplicação única, estática, 100% client-side, pt-BR, para simulação farmacocinética educacional e **cálculo matemático de reconstituição e conversão de volumes/unidades**, com módulos Biblioteca · Meia-vida (Comparador) · Reconstituir · Protocolos · Histórico (+ Ajustes/Dados).

**Público:** usuário leigo-informado acompanhando próprio tratamento sob condução profissional; nada destina-se a prescrição ou orientação de preparo.

**Limites declarados na UI:** modelo de um compartimento, cinética linear, superposição, biodisponibilidade relativa F=1; sem variabilidade individual, volume de distribuição ou modelos multicompartimentais; não é medição sanguínea; não substitui avaliação clínica, prescrição ou monitorização laboratorial. A Reconstituição calcula **exclusivamente a partir da dose informada pelo usuário**.

**Privacidade:** funcionamento integral sem conta; **zero persistência de dados do usuário sem consentimento explícito** (desligada por padrão). Caches técnicos do PWA guardam apenas assets. Nenhum dado sai do dispositivo; sem backend na V1.

**Princípio científico:** parâmetros dependem de via, formulação/éster, preparação, população e estudo. Todo parâmetro carrega valor, unidade, contexto, origem (`ProfileOrigin`) e revisão coerentes. Presets legados são `legacy_unattributed`; dados bibliográficos futuros exigem fonte verificável; dados do usuário declaram-se `user_defined`. Nenhuma referência inventada.

---

# 3. Escopo funcional

## Obrigatório para V1
- Shell/hash routes (Biblioteca · Meia-vida · Reconstituir · Protocolos · Histórico · Ajustes); CSP meta efetiva; paleta fechada; PWA prompt-update; **gate E1 spike CSP×Chart.js**.
- **Biblioteca:** busca/fichas/perfis (`route:'unknown'` no legado), faixas com seleção obrigatória, badges por origem; CTAs para Comparador/Protocolos sem preencher doses.
- **Comparador:** cenários (cap 20), múltiplas doses, análise ao vivo (relógio 1 s), métricas + `phaseHint`, marcos, Detalhes do modelo, warning flip-flop, gráfico com eixo-X rotulado, modos absoluto/normalizado, log c/ política de zeros; **“Salvar análise no histórico”** captura também o `ChartViewSnapshot` (janela/modos/pontos por cenário).
- **Modo log (apresentação):** política relativa por série da §4 (`LOG_REL_EPSILON=1e-12`; pisos `absoluteLogFloorMg` e normalizado); valores no/baixo piso são clipados/omitidos com marcação `clippedBelowLogEpsilon`; tooltip/resumo informam o clipping; a série pode iniciar na primeira contribuição positiva; dados científicos persistidos permanecem intocados.
- **Reconstituição:** tela única automática; erros `DOSE_EXCEEDS_VIAL_CONTENT`/capacidade (mensagem neutra)/precisão por graduação; régua; copiar; **“Salvar no histórico”**.
- **Protocolos:** entidade canônica com componentes autocontidos; presets legados (19 entidades/16 visíveis); calendário multi-fuso desktop/mobile Agenda-Semana-Mês; drag+teclado+Desfazer; chips 20:00 com lookback (filtro <0,01 mg); gráficos combinado/individuais com guias; materialização por CalculationWindow; **“Salvar análise no histórico”**.
- **Histórico:** registros imutáveis tipados; ações VISUALIZAR (snapshot)/REABRIR (inputs)/RECALCULAR (engine atual ⇒ novo registro).
- **Ajustes/Dados:** consentimento opt-in; desativar = export opcional→confirmação→apagar; ConfigExport/FullBackup; migração assistida (timezone assumido + remapeamento de cores nos relatórios); quarentenas ≤5; falha IndexedDB formal; banner de atualização.
- **E10A integrações obrigatórias:** histórico completo, reabrir, Biblioteca→Comparador, Biblioteca→Protocolos, export/import, versionamentos.

## Recomendado (E10B) — NÃO bloqueia a V1
Share URL comprimido; favoritos avançados; tabela comparativa consolidada; zoom/pan; PNG do gráfico; duplicar protocolo; filtros avançados.

## Pós-V1
Incerteza/intervalo a partir de faixas; steady-state/trough/flutuação analíticos; enriquecimento bibliográfico (DOI/PMID); múltiplos perfis; PDF; i18n en/es; sincronização opcional; U-40; modelagem explícita de F≠1.

---

# 4. Regras matemáticas definitivas

Convenção global: internamente **ms** e **mg**; IEEE-754 duplo; **arredondamento/formato somente na apresentação** (Intl pt-BR); persistência em precisão plena; conversões centralizadas. Formatos de apresentação: massa/dose pt-BR com até 3 casas; duração `X d Y h Z min` (ou `0 min`); datas curtas `dd/mm/aaaa hh:mm`; título de tooltip com data completa por extenso.

**Tolerâncias oficiais** (`domain/shared/tolerances.ts`): `RATES_RTOL=1e-10`, `AMOUNT_RTOL=1e-9`, **`AMOUNT_ATOL_MG=1e-12 mg`**, `CONSERVATION_RTOL=1e-9`, `TMAX_RECOMPOSITION_RTOL=1e-9`, `PEAK_TIME_ABS_TOL=60_000 ms`, `MILESTONE_TIME_ABS_TOL=60_000 ms`, **`CUTOFF_TOLERANCE=1e-12`** (relativo à dose de cada administração). **Comparador numérico central para quantidades:** `amountClose(a,b) ⟺ |a−b| ≤ AMOUNT_ATOL_MG + AMOUNT_RTOL·max(|a|,|b|)` — comportamento perto de zero definido via ATOL, sem divisão por zero; obrigatório nos testes de quantidade (cutoff agregado/equivalência/conservação). **Constante de apresentação (não é tolerância farmacocinética):** `LOG_REL_EPSILON=1e-12` (política log da §4). Determinismo intra-plataforma; entre engines JS, conformidade pelas tolerâncias. Proibido “exato/bit a bit/diff 0” em ponto flutuante.

**Não-finito:** underflow esperado (ex.: `e^(−Δ)` grande) resulta legitimamente em 0; não-finito **inesperado** ⇒ erro `NUMERIC_FAILURE` (ou warning `EXTREME_PARAMETERS` quando parametrizado) — nunca zero silencioso.

## Farmacocinética
- Conversões: `min=60 000 ms`; `h=3 600 000 ms`; `d=86 400 000 ms`; `mcg=0,001 mg`; `g=1000 mg`.
- Civil→instante: **Temporal API** (polyfill bundled na V1). Proibido converter civil com `new Date(string)` ou offset manual.
- **Política DST única (dois casos nomeados):**
  - **GAP** (horário civil inexistente pela transição): `disambiguation:'later'` — o horário é **deslocado para frente pela duração do gap**. Exemplo: gap de 1 hora ⇒ `02:30` inexistente → `03:30`.
  - **OVERLAP** (horário civil corresponde a dois instantes): `disambiguation:'earlier'` — seleciona a **primeira ocorrência**.
  - Mesma política em criação de protocolos, Recurrence Engine, drag/move, migração e testes, com fixtures explícitas (seção 13). As duas regras são distintas por definição; proibido tratá-las como sinônimos.
- **Comparador — datetime-local → instante:** o campo civil digitado é interpretado com o `calendarTimeZone` vigente na criação/edição da dose: `LocalDate+LocalTime+calendarTimeZone → Temporal.ZonedDateTime → política DST (GAP 'later' / OVERLAP 'earlier') → InstantIso`. O `Dose.time` persistido é o **instante canônico**: trocas posteriores de timezone do dispositivo ou de `calendarTimeZone` NÃO alteram o instante salvo, apenas sua representação visual. Ao editar, a UI converte o `InstantIso` para o `calendarTimeZone` atual para preencher o controle; salvar regenera o instante conforme o fuso usado na edição. Proibido interpretar horário civil com `new Date(datetimeLocalString)`.
- Eliminação: `ke=ln2/T½` (erro se ≤0/não finito).
- Absorção: `g(y)=y/expm1(y)=ke·Tmax`, decrescente ℝ→(0,∞), solução única ∀Tmax>0; Taylor `1−y/2+y²/12` p/ `|y|<1e-8`; bisseção 180 iter.; bracket meiavida; `ka=ke·e^ŷ`. Ramos: `Tmax=0⇒ka=null` (instantânea); `<T½/ln2⇒ka>ke`; `≈⇒degênero`; `>⇒ka<ke` (flip-flop, warning). Âncoras rtol 1e-4: 6 d/2 d ⇒ ka=1,34159 dia⁻¹; ka=0,36 dia⁻¹ ⇒ Tmax≈4,649224 d. Identidade testada PELA EQUAÇÃO (§13).
- Central por dose (Δt≥0): instantânea `dose·e^(−ke·Δt)`; degênero (`|ka−ke|≤max(ka,ke)·1e-8`) `dose·ka·Δt·e^(−ke·Δt)`; Bateman geral; clamp `[0,dose]` só sobre valores finitos.
- Depósito `dose·e^(−ka·Δt)` (ka≠null); eliminado `max(0, adm−central−depósito)`; superposição linear; conservação ≤ CONSERVATION_RTOL.
- **Cutoff/lookback — política ÚNICA:**
  ```
  const CONTRIBUTION_CUTOFF_HALF_LIVES = 44;
  effectiveTmaxMs = selected.tmaxMs ?? 0          // null (instantânea) ⇒ 0, SEM coerção implícita
  cutoffAgeFor(selected) = max(44·T½term + effectiveTmaxMs,
                               effectiveTmaxMs + 86_400_000)
  requiredPkLookback(params[]) = maxᵢ cutoffAgeFor(paramsᵢ)   // mesma função
  ```
  **Justificativa:** o valor 44 foi dimensionado para atender `CUTOFF_TOLERANCE=1e-12` **inclusive no caso numericamente crítico ka≈ke**, cuja curva degenerada é `A(t)/dose = k·t·e^(−k·t)` (fator temporal multiplicativo — a exponencial simples `0,5⁴⁴≈5,7×10⁻¹⁴` NÃO é usada como justificativa isolada). No pior caso válido (`Tmax=1/k`; idade no corte = `effectiveTmaxMs + 44·T½term`): `k·t = 1 + 44·ln2` ⇒ `A/dose ≈ 6,6×10⁻¹³ < 10⁻¹²` [CALC]. O valor anterior (40) produzia ≈9,6×10⁻¹² > 10⁻¹² e violava a própria propriedade — por isso a constante foi elevada. **Prioridade: manter a tolerância declarada e elevar o cutoff quando necessário; nunca reduzir a tolerância para preservar uma constante.** Propriedades obrigatórias (§13): ∀domínio suportado (ka>ke, ka<ke, ka≈ke com Tmax=1/k, Tmax instantâneo), `contributionBeyondCutoff < CUTOFF_TOLERANCE × dose`; se futuros property tests mostrarem 44 insuficiente em alguma região válida, eleva-se a constante. **Garantia agregada:** para o conjunto D de administrações descartadas pelo cutoff vale a invariante `Σ_{i∈D} contributionᵢ < CUTOFF_TOLERANCE × Σ_{i∈D} doseᵢ` (consequência direta da propriedade individual). Adicionalmente, property tests de **equivalência prática** compararão a simulação padrão (cutoff/lookback normativo) contra uma **referência estendida** (janela muito além do cutoff ou todas as ocorrências do domínio bounded do teste) comparando SOMENTE grandezas de contribuição presente — `centralMg`, `depotMg`, `centralMg+depotMg`, `analysisCurve[].amountMg`, primeiro ponto da DisplayWindow, pontos críticos, `peak.amountMg` e marcos derivados — via comparador central `amountClose` (RTOL+ATOL, §4). **Proibido comparar entre universos com administrações distintas:** `administeredMg`, `administeredCount`, `eliminatedMg`, `plannedCount` (a referência materializa doses que a simulação truncada deliberadamente não materializa). Conservação permanece obrigatória **dentro de cada simulação** (`administrated ≈ central+depot+eliminated`, tolerâncias oficiais). Casos: dose única; weekly longo; múltiplos weekdays; blend; fixture de máximo de ocorrências; ka>ke; ka<ke; ka≈ke; Tmax instantâneo — se demonstrarem 44 insuficiente, eleva-se a constante; até prova em contrário, **44 é o valor normativo**.
- **Janelas:** `DisplayWindow` (visível) e `CalculationWindow{start=displayStart−requiredPkLookback(...), end=displayEnd}`. Fluxo: DisplayWindow → lookback (blends = máximo entre componentes) → CalculationWindow → `generateOccurrences(schedule, calcStart, calcEnd)` → SimulationInput[] → PK Engine → recorte/apresentação na DisplayWindow.
- Análise: taxa terminal `min(ke,ka)`; horizonte `lastDose+max(10,5·T½term, 2·Tmax, 2·T½)`; amostragem de análise default 1600 intervalos + pontos em cada dose e `dose+tmax`; pico (varredura+ternária 80); marcos `[50,25,12.5,10,5,1,0.1]%` (varredura reversa+bisseção 80; null⇒warning). Invariantes dos marcos: `targetMg≤peak.amountMg`; `timeMs ≥ peak.timeMs − MILESTONE_TIME_ABS_TOL`; tempos não decrescentes com % decrescentes; `targetMg=peak·pct/100` rtol 1e-12.
- Ciência × pixels: resultados derivam de `analysisCurve`/pontos críticos; `sampleForDisplay(analysisCurve, constraints)→DisplayPoint[]` é **geometria pura** (roda sobre snapshots sem executar PK Engine) e apenas reamostra.
- **Política log (apresentação — relativa por série):** `LOG_REL_EPSILON=1e-12` (constante oficial da lista de tolerâncias acima). Série absoluta: `absoluteLogFloorMg = seriesPeakMg × LOG_REL_EPSILON`, com **`seriesPeakMg = peak.amountMg` da série científica correspondente (`SimulationOutput.peak`) — proibido conceito alternativo de pico**; se `seriesPeakMg ≤ 0`, a série não possui domínio log válido — excluir do modo log com aviso). Série normalizada: piso = `LOG_REL_EPSILON` (máximo normalizado = 1). Valores ≤ piso podem ser clipados/omitidos no modo log, marcando `clippedBelowLogEpsilon=true`; **a ciência persistida jamais é substituída pelo epsilon** — clipping existe apenas na geometria/apresentação. Eventual piso absoluto adicional imposto por limitação de biblioteca gráfica será documentado como detalhe de apresentação, nunca como regra farmacocinética. Constante definida em `domain/shared/tolerances.ts` (constante de apresentação).

## Reconstituição
- `concentração=massa×1000÷volume`; `volume_dose=dose÷concentração`; `unidades=volume_dose×unitsPerMl`; `rendimento_teorico_maximo=⌊massa×1000÷dose⌋` (rotulado teórico).
- `dose_mcg > massa_mg×1000` ⇒ `DOSE_EXCEEDS_VIAL_CONTENT` (bloqueante).
- Precisão: `erroRel=0,5·graduationUnits/unidadesPedidas`; warning sse `erroRel > GRADUATION_ERROR_WARN_THRESHOLD (=0,05, estrito)`. Exemplos g=1: 9 U ⇒ alerta; 10 U ⇒ sem alerta. Threshold = config de UX, não padrão farmacêutico.
- Propriedade: massa/dose fixos ⇒ diluente↑ ⇒ unidades↑ (AMOUNT_RTOL).

## Recorrência (engine independente)
- Única: 1 ocorrência. Semanal: dias selecionados na janela pedida; término inclusivo `start+(weeks·7−1)`; `1≤weeks≤520`.
- `generateOccurrences(schedule, rangeStartMs, rangeEndMs)` ascendente; proibido materializar horizonte completo.
- Deslocamento Δ (dias civis medidos no calendarTimeZone, origem→destino do arrasto): `startDate+=Δ` (civil, fuso do protocolo); `localTime`/`timeZone` preservados; rotação semanal por Δ; nova data civil sujeita à política DST.
- Derivação: `componentDoseMg_i = totalDoseMg × proportion_i` (**nunca persistida**).

---

# 5. Arquitetura técnica final (DECIDIDA)

React 19 + TS strict + Vite (polyfill Temporal bundled; deps 100% bundled). React Router Hash. GitHub Pages V1. **Config de build única:** raiz `app.config.ts` exporta `{basePath, productName}` → consumida por `vite.config.ts` **incluindo `VitePWA({ manifest:{...} })`** (manifest GERADO no build — não existe `public/manifest.webmanifest` manual; `public/icons/` permanece) e re-exportada ao runtime via `src/app/config/basePath.ts`.

Fluxo canônico:
```
Protocol/Cenário (civis + snapshots)
 ↓ deriveCalculationWindow(displayWindow, params)        [domain/simulation]
CalculationWindow
 ↓ recurrence::generateOccurrences(schedule, calcWin)
Occurrence[]
 ↓ simulation::assembleScenarioInputs/assembleProtocolInputs
SimulationInput[]   (uma POR COMPONENTE em blends; números resolvidos)
 ↓ pk::analyze → SimulationOutput{analysisCurve,…,metadata:pkEngineVersion}
 ↓ sampleForDisplay + presentation (phaseHint, gráficos)
```

Motores independentes: `pk` (não conhece agenda/recurrence/outras versões), `recurrence`, `reconstitution`; orquestração registra `ProtocolAnalysisVersions{pkEngineVersion, recurrenceEngineVersion, datasetVersion}`.

Estado: Zustand só p/ compartilhado/persistível. Validação: LIMITS → Zod → HTML (`boundsFromLimits`); erros `{code,params}`; pt-BR só em `app/i18n/pt-BR.messages.ts`. Persistência opt-in (localStorage/IndexedDB/quarentena ≤5). Gráficos Chart.js 4 bundled sobre `analysisCurve` via `sampleForDisplay`.

**GATE E1 — spike CSP×Chart.js:** build mínimo (React+Chart.js responsivo+CSP final+paleta+Vite production) em navegador; aceite zero violações; incompatibilidade resolvida antes dos módulos gráficos.

**PWA:** vite-plugin-pwa `registerType:'prompt'`; manifest gerado pelo build a partir de `app.config.ts` (base/scope/start_url derivados; fonte única); banner “Nova versão disponível”→confirmação→reload; cache técnico só assets.

CI/CD: `npm ci`→lint→typecheck→type-tests(.test-d.ts)→unit/property→build→Playwright contra `vite preview` (zero violações CSP em console)→Pages após CI verde no main.

**CSP meta (efetivas):** `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` + `referrer-policy:no-referrer`. Documentado: `frame-ancestors` ineficaz via meta; GH Pages sem headers customizados — anti-framing por header NÃO implementado na V1. Proibições: eval/new Function/innerHTML c/ dado do usuário/CDN runtime.

Cores: `PALETTE_ALLOWED = PALETTE_MODERN ∪ LEGACY_COLORS` em tokens/classes `.tone-*`; picker restrito; `DisplayColor{paletteColor, legacyOriginalHex?}`; zero estilo inline dinâmico. Decimal: `parseLocaleDecimal` central.

---

# 6. Modelo de dados final (ESPECIFICAÇÃO)

```ts
// ── Primitivos ──────────────────────────────────────────────
type LocalDate=string; type LocalTime=string; type InstantIso=string; type TimeZoneId=string;
type TimeUnit='minutes'|'hours'|'days'; type MassUnit='mcg'|'mg'|'g';
interface DurationValue{value:number; unit:TimeUnit}              // finite>0
interface DurationRange{min:DurationValue; max:DurationValue}
// VALIDAÇÃO APÓS NORMALIZAÇÃO: toMs(min)<=toMs(max) — unidades podem diferir (24h..2d ✓)
type Duration=DurationValue|DurationRange;
interface DisplayWindow{startMs:number; endMs:number}
interface CalculationWindow{startMs:number; endMs:number}
type PaletteColorId=string;
interface DisplayColor{paletteColor:PaletteColorId; legacyOriginalHex?:string}

// ── Origem/revisão (discriminada — combinações impossíveis são inválidas) ──
type ProfileOrigin =
  | { kind:'legacy_unattributed'; reviewStatus:'legacy_unreviewed'|'needs_review'|'reviewed' }
  | { kind:'literature'; reviewStatus:'needs_review'|'reviewed'; sourceIds:string[] }
  | { kind:'user_defined'; reviewStatus:'not_applicable' };

interface Source{ id:string; doi?:string; pmid?:string; url?:string; title?:string;
  authors?:string[]; year?:number; population?:string; notes?:string; reviewedAt?:InstantIso }
type DatasetEntityKind='substance'|'profile';
type DatasetIdMigration =
  | { entityKind:'substance'; fromId:string; toId:string;
      sinceDatasetVersion:number; reason:string }
  | { entityKind:'profile';                       // identidade COMPOSTA — profileId pode repetir entre substâncias
      fromSubstanceId:string; fromProfileId:string;
      toSubstanceId:string;   toProfileId:string;
      sinceDatasetVersion:number; reason:string };
// Ciclo definido por identidade completa: substance A→B→A inválido;
// profile (A,p1)→(B,p2)→(A,p1) inválido. Destino deve existir; resolução
// determinística. Troca de profile entre substâncias permitida SOMENTE porque
// os quatro IDs estão explícitos no mapping.
interface DatasetMetadata{ datasetVersion:number; updatedAt:InstantIso; substanceCount:number;
  changelog?:Array<{version:number;date:InstantIso;summary:string}>;
  idMigrations?:DatasetIdMigration[] }
// datasetVersion muda quando conteúdo científico OU identidade/resolução semântica
// do dataset muda (parâmetros, perfis, sources, IDs/idMigrations). Alterações
// exclusivamente cosméticas de apresentação podem preservar a versão.
// IDs oficiais são estáveis,
// imutáveis e NUNCA reutilizados (política completa na §9).
interface EngineVersions{ pk:string; recurrence:string; reconstitution:string }

type TmaxSpecification =
  | {kind:'unknown'} | {kind:'instant'}
  | {kind:'value'; value:DurationValue} | {kind:'range'; range:DurationRange};

// ── Biblioteca ──────────────────────────────────────────────
type SubstanceCategory='peptide'|'steroid'|'steroid_ester'|'hormone'|'other';
type AdministrationRoute='intramuscular'|'subcutaneous'|'sublingual'|'oral'|'transdermal'|'unknown';

interface PharmacokineticProfile{
  id:string; route:AdministrationRoute; formulation?:string; ester?:string;
  halfLife:Duration; tmaxSpec:TmaxSpecification;
  /** METADADO NA V1 — não participa de cálculo (motor usa F relativo=1). */
  bioavailability?:number|Range;
  populationContext?:string; origin:ProfileOrigin;
  deprecated?:boolean;   // substituído/descontinuado — permanece resolvível; ID nunca reutilizado
}
interface Range{min:number; max:number}

interface SingleSubstance{ kind:'single'; id:string; slug:string; name:string; aliases:string[];
  category:SubstanceCategory; tags:string[]; profiles:PharmacokineticProfile[];
  componentOnly?:boolean;   /* true ⇒ interna; fora do seletor */
  deprecated?:boolean }     /* descontinuada — ID nunca reutilizado */
interface BlendComponent{ substanceId:string; profileId:string;   // DEVEM resolver no dataset
  proportion:number; displayColor?:DisplayColor }
interface BlendSubstance{ kind:'blend'; id:string; slug:string; name:string; aliases:string[];
  tags:string[]; components:BlendComponent[];
  origin:ProfileOrigin; /* próprio do blend, não herdado */
  deprecated?:boolean }
type Substance=SingleSubstance|BlendSubstance;

/* Perfis personalizados: `customProfiles` é a ÚNICA fonte canônica persistida.
   A Biblioteca monta uma VIEW agregada Substance+profiles em memória — derivada,
   nunca fonte de verdade. */
type CustomProfileOwner =
  | { type:'official'; substanceId:string }   // substância do dataset oficial (bundle)
  | { type:'custom';   substanceId:string };  // substância personalizada do usuário
interface CustomProfile{
  id:string;                                  // único ID canônico do perfil custom
  owner:CustomProfileOwner;                   // referência validada (substanceId deve existir)
  route:AdministrationRoute; formulation?:string; ester?:string;
  halfLife:Duration; tmaxSpec:TmaxSpecification;
  bioavailability?:number|Range; populationContext?:string;
  origin:{kind:'user_defined'; reviewStatus:'not_applicable'};
  createdAt:InstantIso; updatedAt:InstantIso;
}
interface CustomSubstance{ id:string; slug:string; name:string; aliases:string[];
  category:SubstanceCategory; tags:string[];
  createdAt:InstantIso; updatedAt:InstantIso }
// SEM profiles[] — invariantes: (1) perfil custom existe em UM único local persistido;
// (2) CustomSubstance não contém cópia concorrente de perfil;
// (3) exclusão de CustomSubstance com perfis vinculados é bloqueada, oferecendo
//     remoção em cascata com confirmação explícita;
// (4) export/import preserva owner↔perfil sem duplicação.
// Exclusão de CustomProfile: BLOQUEADA enquanto houver Scenario/Protocol ativo com
// source.type='custom_profile' apontando para o id; ação explícita “Converter referências
// para manual e excluir” preserva selectedPkParameters + pkParametersSnapshot, troca a
// origem para 'manual' (resultados matemáticos inalterados) e então permite excluir.
// Histórico antigo permanece intacto.
interface ReconstitutionRecipe{ id:string; name:string; input:ReconstitutionInput;
  createdAt:InstantIso; updatedAt:InstantIso }

// ── Parâmetros selecionados / snapshots ─────────────────────
interface SelectedPkParameters{ halfLifeMs:number; tmaxMs:number|null;   // null=instantânea
  selectionNote?:{ range:{halfLife?:DurationRange; tmaxRange?:DurationRange}; chosenBy:'user' } }
interface PkParametersSnapshot{ halfLife:DurationValue; tmax:DurationValue|null;
  selectedFromRange?:{ halfLife?:DurationRange; tmax?:DurationRange } }

// ── Comparador (source discriminada) ────────────────────────
interface Dose{ id:string; amountMg:number; time:InstantIso }
// amountMg: finite>0 e ≤ SIMULATION_DOSE_MG_MAX — entidade VÁLIDA/persistível.
// Fluxo de camadas: FORM/UI → DoseDraft (incompleto permitido) → VALIDAÇÃO →
// Dose válida → PERSISTÊNCIA (somente Dose válida) → PK ENGINE (somente SimulationDose).
// Nenhum null de formulário chega à persistência ou ao motor.
interface DoseDraft{ id:string; amountMg:number|null;
  localDate?:LocalDate; localTime?:LocalTime }
type ScenarioSource =
  | { type:'library'; substanceId:string; profileId:string; datasetVersion:number;
      pkParametersSnapshot:PkParametersSnapshot }
  | { type:'custom_profile'; customProfileId:string;
      pkParametersSnapshot:PkParametersSnapshot }   // CustomProfile SALVO — snapshot congela o uso
  | { type:'manual'; pkParametersSnapshot?:PkParametersSnapshot }; // digitado sem vínculo a perfil salvo
interface Scenario{ id:string; name:string; color:PaletteColorId;
  source:ScenarioSource;
  selectedPkParameters:SelectedPkParameters;      // sempre presente ⇒ custom funciona sozinho
  displayUnit:MassUnit; doses:Dose[] }

// ── Protocolos (entidade lógica ÚNICA; componentes autocontidos) ──
type Recurrence={type:'single'}|{type:'weekly'; weekdays:number[]; weeks:number};
interface Schedule{ startDate:LocalDate; localTime:LocalTime; timeZone:TimeZoneId; recurrence:Recurrence }
type ScheduleShape=Schedule;
interface ProtocolComponent{
  id:string;                       // associação PK NUNCA por índice
  label:string; proportion:number;
  source:
    | {type:'library'; substanceId:string; profileId:string; datasetVersion:number}
    | {type:'custom_profile'; customProfileId:string}
    | {type:'manual'};
  selectedPkParameters:SelectedPkParameters;
  pkParametersSnapshot:PkParametersSnapshot;
  displayColor:DisplayColor;
}
interface Protocol{ id:string; name:string; totalDoseMg:number; schedule:Schedule;
  components:ProtocolComponent[]; createdAt:InstantIso; updatedAt:InstantIso }
// DERIVAÇÃO: componentDoseMg_i = totalDoseMg × proportion_i (nunca persistida)

// ── Recorrência/janelas ─────────────────────────────────────
interface Occurrence{ instantMs:number; scheduleLocalDate:LocalDate }
// Posicionamento no calendário: localDateIn(instantMs, calendarTimeZone).

// ── Simulação ───────────────────────────────────────────────
interface SimulationDose{ id:string; amountMg:number; timeMs:number }
interface SimulationInput{ halfLifeMs:number; tmaxMs:number|null; doses:SimulationDose[];
  nowMs:number; analysisCurveSteps?:number /* default 1600 — independe da exibição */ }
interface SimulationMetadata{ pkEngineVersion:string;
  kePerMs:number; kaPerMs:number|null; terminalHalfLifeMs:number;
  horizonEndMs:number; analysisCurveSteps:number;
  contributionCutoffHalfLives:44; contributionCutoffAgeMs:number }
interface SimulationOutput{ currentState:{ administeredMg:number; centralMg:number; depotMg:number;
    eliminatedMg:number; administeredCount:number; plannedCount:number;
    centralPercent:number; depotPercent:number; eliminatedPercent:number };
  analysisCurve:Array<{timeMs:number; amountMg:number}>;
  peak:{timeMs:number; amountMg:number};
  milestones:Array<{percentage:number; targetMg:number; timeMs:number|null}>;
  administrations:Array<{doseId:string; timeMs:number; amountMg:number}>;
  warnings:PkWarningCode[]; metadata:SimulationMetadata }
type DisplayPoint={timeMs:number; amountMg:number; clippedBelowLogEpsilon?:boolean};
type PhaseHint='awaiting_first_dose'|'absorbing_latest'|'awaiting_next_planned'|'terminal_decline';
// phaseHint é HEURÍSTICA de apresentação (features/comparator/lib) — fora do output físico.
type PkWarningCode='FLIP_FLOP_ABSORPTION'|'NEAR_DEGENERATE_RATES'
  |'MILESTONE_NOT_REACHED'|'EXTREME_PARAMETERS';

// ── Reconstituição ──────────────────────────────────────────
interface Syringe{ family:'U-100'; capacityUnits:number; unitsPerMl:100;
  graduationUnits:number /* finite>0; aceita 0,5 */ }
interface ReconstitutionInput{ vialMassMg:number; diluentVolumeMl:number; desiredDoseMcg:number;
  syringe:Syringe; label?:string }
interface ReconstitutionResult{ concentrationMcgPerMl:number; doseVolumeMl:number;
  syringeUnits:number; theoreticalMaxDoses:number; capacityExceeded:boolean;
  warnings:ReconstitutionWarningCode[]; metadata:{reconstitutionEngineVersion:string} }
type ReconstitutionWarningCode='CAPACITY_EXCEEDED'|'LOW_SYRINGE_PRECISION'|'THEORETICAL_YIELD';

// ── Erros ───────────────────────────────────────────────────
interface DomainError{ code:DomainErrorCode; params?:Record<string,number|string> }
type DomainErrorCode='HALF_LIFE_NON_POSITIVE'|'TMAX_NEGATIVE'|'NO_DOSES'|'INVALID_DOSE_AMOUNT'
 |'INVALID_DOSE_TIME'|'INVALID_HORIZON'|'ABSORPTION_SOLVER_FAILURE'|'SCENARIO_NAME_REQUIRED'
 |'DOSE_EXCEEDS_VIAL_CONTENT'|'INVALID_RECONSTITUTION_INPUT'|'BLEND_PROPORTIONS_MUST_SUM_ONE'
 |'NUMERIC_FAILURE'|'PROTOCOL_TOTAL_DOSE_INVALID';

// ── Histórico reproducível (snapshot-first; tipado) ──────────
interface RecordDisplayMeta{ title:string; color:PaletteColorId; note?:string }
type HistoricalProfileRef =
  | { type:'official'; substanceId:string; profileId:string; datasetVersion:number }
  | { type:'custom'; customProfileId:string };
// Source 'manual' NÃO gera HistoricalProfileRef (ausência explícita — nunca inventar fake profileId).
interface ComparatorScenarioResultSnapshot{
  scenarioId:string; name:string; color:PaletteColorId;
  profileRef?:HistoricalProfileRef;      // ausente p/ cenário manual
  input:SimulationInput;
  resultSnapshot:Pick<SimulationOutput,'currentState'|'analysisCurve'|'peak'|'milestones'|'warnings'|'metadata'>;
}
// Invariantes do registro multicenário: scenarios.length ≥ 1; scenarioId único no
// registro; cada displayPointsByScenario[].scenarioId casa com exatamente um item de
// scenarios (cardinalidade científica = visual, sem série órfã nem cenário órfão);
// labels/cores consistentes entre scenarios e chartViewSnapshot.
interface CalculationRecordBase{ id:string; createdAt:InstantIso;
  profileRefs:HistoricalProfileRef[]; display:RecordDisplayMeta }
// profileRefs são metadados de RASTREABILIDADE discriminados — VISUALIZAR não
// depende deles (snapshots de exibição são autossuficientes); nenhum ID nu.
interface ProtocolAnalysisSeriesSnapshot{
  componentId:string; label:string; color:PaletteColorId;
  displayPoints:DisplayPoint[];                 // pontos EFETIVOS da visualização salva
  state:SimulationOutput['currentState']; peak:SimulationOutput['peak'];
  milestones:SimulationOutput['milestones']; warnings:PkWarningCode[] }
interface ProtocolAnalysisSnapshot{
  displayWindow:DisplayWindow; calculationWindow:CalculationWindow;
  series:ProtocolAnalysisSeriesSnapshot[] }
type CalculationRecord = CalculationRecordBase & (
  | { type:'pharmacokinetics';
      versions:{pkEngineVersion:string; recurrenceEngineVersion?:string; datasetVersion:number};
      scenarios:ComparatorScenarioResultSnapshot[];   // UM POR CENÁRIO (≥1) — sem input/resultSnapshot singular
      chartViewSnapshot:ChartViewSnapshot }           // estado visual salvo p/ VISUALIZAR sem executar engine
  | { type:'reconstitution';
      versions:{reconstitutionEngineVersion:string; datasetVersion:number};
      input:ReconstitutionInput; resultSnapshot:ReconstitutionResult }
  | { type:'protocol-analysis';
      versions:ProtocolAnalysisVersions;
      timeZone:TimeZoneId;                                  // calendarTimeZone vigente
      snapshot:ProtocolAnalysisSnapshot;                    // gráfico histórico reproduzível SEM engine
      simulationInputs:SimulationInput[];                   // p/ RECALCULAR
      protocolsSnapshot:Protocol[] }                        // p/ REABRIR com contexto
);
interface ProtocolAnalysisVersions{ pkEngineVersion:string; recurrenceEngineVersion:string; datasetVersion:number }

type ChartScaleMode='absolute'|'normalized';
type ChartYAxisMode='linear'|'log';
type ChartSnapshotValueKind='mg'|'normalized_ratio';
interface ChartSnapshotPoint{ timeMs:number; value:number; valueKind:ChartSnapshotValueKind;
  clippedBelowLogEpsilon?:boolean }
// Semântica inequívoca: scaleMode='absolute' ⇒ TODOS os points com valueKind='mg'
// e value em mg; scaleMode='normalized' ⇒ TODOS com valueKind='normalized_ratio',
// value finito em [0,1], onde 1 = pico projetado da própria série
// (normalizedRatio(t) = amountMg(t)/projectedPeakMg). Percentuais são formados
// apenas na camada de UI (0.75 → 75%); snapshot guarda precisão plena.
interface ChartViewScenarioSnapshot{ scenarioId:string; label:string;
  color:PaletteColorId; points:ChartSnapshotPoint[] }
interface ChartViewSnapshot{ displayWindow:DisplayWindow; scaleMode:ChartScaleMode;
  yAxisMode:ChartYAxisMode;
  displayPointsByScenario:ChartViewScenarioSnapshot[] }
// VISUALIZAR renderiza ESTES pontos DIRETAMENTE — sem PK Engine e sem sampleForDisplay.

// ── Persistência (estado do USUÁRIO; sem dataset oficial; sem consentimento restaurável) ──
interface AppSettings{ theme:'system'|'light'|'dark'; calendarTimeZone:TimeZoneId;
  graduationWarnThreshold?:number }
type SubstanceRef =
  | { type:'official'; substanceId:string; datasetVersion:number }  // resolve no dataset oficial
  | { type:'custom'; substanceId:string };                          // resolve em customSubstances
interface Favorites{ substances:SubstanceRef[]; recipeIds:string[] }
// Sem IDs nus ambíguos: o discriminador resolve o namespace; export/import preserva
// o `type`; referência inexistente é rejeitada (import) ou quarentenada conforme contexto.
interface PersistedStateV1{ schemaVersion:1; settings:AppSettings; favorites:Favorites;
  customSubstances:CustomSubstance[]; customProfiles:CustomProfile[]; recipes:ReconstitutionRecipe[];
  scenarios:Scenario[]; protocols:Protocol[] }

// ── Exportação (union válida) ───────────────────────────────
interface ExportBundleBase{ schemaVersion:1; exportedAt:InstantIso;
  datasetVersion:number; engineVersions:EngineVersions }
interface ConfigPayload{ settings:AppSettings; favorites:Favorites;
  customSubstances:CustomSubstance[]; customProfiles:CustomProfile[];
  recipes:ReconstitutionRecipe[]; scenarios:Scenario[]; protocols:Protocol[] }
interface ConfigExportBundle extends ExportBundleBase{ bundleKind:'config'; payload:ConfigPayload }
interface BackupCounts{ records:number; recipes:number; scenarios:number; protocols:number }
interface FullBackupBundle extends ExportBundleBase{ bundleKind:'full-backup';
  payload:ConfigPayload; history:CalculationRecord[]; counts:BackupCounts }
type ExportBundle=ConfigExportBundle|FullBackupBundle;

// ── Migração ────────────────────────────────────────────────
interface ColorRemapEntry{ protocolId:string; componentId:string;
  legacyOriginalHex:string; mappedPaletteColor:PaletteColorId }
interface MigrationReport{ sourceKey:'hormoTrackerProtocols'|'meiavida:v2:data';
  ranAt:InstantIso; importedCount:number; discardedCount:number;
  assumedTimeZone:TimeZoneId; colorRemaps:ColorRemapEntry[]; quarantined:boolean }
```

**LIMITS (fonte única de bounds → Zod → HTML):**
```ts
export const DOMAIN_LIMITS={HALF_LIFE_MS_MIN:1} as const;
export const SAFETY_LIMITS={ IMPORT_BYTES_MAX:2_000_000, SCENARIOS_MAX:20,
  DOSES_PER_SCENARIO_MAX:2000, PROTOCOLS_MAX:200, WEEKS_MAX:520,
  HISTORY_RECORDS_MAX:500, QUARANTINE_ITEMS_MAX:5,
  HALF_LIFE_DAYS_MAX:3650, TMAX_DAYS_MAX:3650,
  RECON_VIAL_MASS_MG_MAX:100_000, RECON_DILUENT_ML_MAX:1000, RECON_DOSE_MCG_MAX:1_000_000,
  SYRINGE_GRADUATION_UNITS_MAX:100,
  SIMULATION_DOSE_MG_MAX:1_000_000, PROTOCOL_TOTAL_DOSE_MG_MAX:1_000_000 } as const;
// graduationUnits: finite>0 (decimais ok). Limites de dose PK = TÉCNICOS
// (integridade numérica, validação de entrada, proteção contra payloads
// patológicos/import malformado) — NÃO são orientação clínica nem dose máxima
// recomendada. AJUSTÁVEIS pós-benchmark.
export const UX_LIMITS={ NAME_MAX_CHARS:100, FAVORITES_MAX:100,
  GRADUATION_ERROR_WARN_THRESHOLD:0.05 } as const;
```

---

# 7. Motores

**PK (`domain/pk`):** `eliminationRate`, `absorptionRateFromTmax`, `amountFromDose`, `depotFromDose`, `totalAmount`, `stateAt`, `analyze(input):SimulationOutput` (metadata SOMENTE `pkEngineVersion`), `sampleForDisplay(analysisCurve, constraints):DisplayPoint[]` (geometria pura). Não conhece agenda/recurrence/outras versões.

**Cutoff/lookback (política única):**
```
domain/pk::cutoffAgeFor(selected)           // usa effectiveTmaxMs = tmaxMs ?? 0
domain/simulation::requiredPkLookback(params[]) === max cutoffAgeFor(...)   // invariante testada
domain/simulation::deriveCalculationWindow(display, params[]): CalculationWindow
```
Nenhuma feature calcula lookback próprio.

**Recurrence (`domain/recurrence`):** `generateOccurrences(scheduleShape, rangeStartMs, rangeEndMs)`; `shiftSchedule(schedule, deltaDays)`; `validateRecurrence(r)`.

**Cola (`domain/simulation`):** `assembleScenarioInputs(scenario, nowMs)`; `assembleProtocolInputs(protocol, occurrences): SimulationInput[]` (UM POR COMPONENTE; deriva dose por proporção; proibidas médias); `derivePhaseHint(...)` heurística; orquestração de análise de protocolos monta `ProtocolAnalysisSnapshot` (usa `sampleForDisplay`) e registra `ProtocolAnalysisVersions`; a análise do Comparador monta analogicamente o `ChartViewSnapshot` no registro histórico — os pontos são gerados por `sampleForDisplay` **apenas no momento da gravação**; a visualização histórica consome-os diretamente, sem executar engine nem sampling.

Casos explícitos: ka>ke; ka<ke (flip-flop+warning); ka≈ke (degênero+warning); Tmax=0; extremos (`EXTREME_PARAMETERS`/`NUMERIC_FAILURE`). Invariantes: conservação; superposição; clamp finito; marcos (§4); horizonte 10,5; cutoff validado por propriedade nas três regiões; determinismo intra-plataforma.

Erros/warnings `{code,params}`; catálogo pt-BR preserva literalmente as mensagens herdadas (“A meia-vida deve ser maior que zero.”, “Informe o nome da substância/cenário.”, “Cadastre pelo menos uma dose.”, “Dose N: informe uma quantidade maior que zero.”, “Dose N: informe uma data e hora válidas.”, “Os parâmetros geraram um horizonte farmacocinético inválido.”, “O Tmax informado gera uma constante de absorção fora da faixa numérica do simulador.”, agregação “nome: erro”, caixa “Revise os dados:”) + textos novos (flip-flop educacional; NUMERIC_FAILURE).

---

# 8. Motor de reconstituição (independente)

`calculateReconstitution(input): Result<ReconstitutionResult, DomainError[]>`.

- Entradas finitas >0 dentro de SAFETY_LIMITS, senão `INVALID_RECONSTITUTION_INPUT`.
- `desiredDoseMcg > vialMassMg×1000` ⇒ **DOSE_EXCEEDS_VIAL_CONTENT** (bloqueante; explica a matemática; não apresenta resultado realizável).
- Capacidade excedida: números retornados; mensagem neutra: “Com os parâmetros informados, a dose corresponde a X U e excede a capacidade selecionada de Y U. Reduzir as unidades por dose exige maior concentração da solução. Revise os parâmetros informados ou a capacidade selecionada.”
- `LOW_SYRINGE_PRECISION` sse `0,5·graduationUnits/unidadesPedidas > threshold` (default 0,05 estrito).
- `THEORETICAL_YIELD` anexo ao rendimento. Arredondamento só na apresentação. Metadata registra `reconstitutionEngineVersion`.

Âncoras: 5 mg/2 mL/250 mcg/U-100(g=1) ⇒ 2500 mcg/mL · 0,1 mL · 10 U · 20 teóricas. Capacidade: 5/2/3000 ⇒ 2500 mcg/mL · 1,2 mL · **120 U**; 5/4/3000 ⇒ 1250 mcg/mL · 2,4 mL · **240 U**. Conteúdo: 5 mg+6000 mcg ⇒ DOSE_EXCEEDS_VIAL_CONTENT. Bordas g=1: 9 U alerta; 10 U não.

---

# 9. Biblioteca de substâncias

Dataset oficial bundled (`DATASET_VERSION=1`); todos os perfis legados com `origin={kind:'legacy_unattributed', reviewStatus:'legacy_unreviewed'}`, `route:'unknown'`. Nunca persistido no estado do usuário. Dados do usuário: `origin={kind:'user_defined', reviewStatus:'not_applicable'}` — **badges honestos**: “legado_sem_fonte” / fonte citada (literature) / “criado por você”; filtros por `origin.kind`; combinações inválidas rejeitadas por schema/typecheck (literature exige `sourceIds`; user_defined não carrega revisão).

Entidades internas: **19** (15 singles selecionáveis + 3 ésteres `componentOnly:true` + 1 blend); **16 entradas visíveis** no seletor. Invariante: nenhuma `BlendComponent` com id inexistente (teste). `BlendSubstance.origin` próprio.

`TmaxSpecification`: unknown (pedir valor) / instant (tmaxMs=null) / value (converter) / range (escolha explícita validada pós-normalização). Faixas exibem fonte e exigem seleção nos CTAs; doses jamais preenchidas automaticamente. `bioavailability` exibido como metadado (“não aplicado no modelo — F relativo = 1”).

Tabela legada normalizada (unidades em dias; cores normativas definidas abaixo):

| Seletor (16 visíveis) | kind | éster/formulação | T½ d | Tmax d |
|---|---|---|---|---|
| Retatrutida | single | — | 6 | 2 |
| Durateston LANDERGOLD | blend | Σ 0,2/0,4/0,4 | — | — |
| ↳ Propionato | componentOnly | propionato | 2 | 0,229167 |
| ↳ Fenilpropionato | componentOnly | fenilpropionato | 3 | 2 |
| ↳ Isocaproato | componentOnly | isocaproato | 8 | 1,5 |
| Enantato de Testosterona | single | enantato | 6 | 1,5 |
| Enantato de Trembolona | single | enantato | 6 | 1,5 |
| Enantato de Masteron | single | enantato | 6 | 1,5 |
| Cipionato de Testosterona | single | cipionato | 7 | 2 |
| Propionato de Testosterona | single | propionato | 2 | 0,23 ⚠ diverge do componente |
| Undecanoato de Testosterona | single | undecanoato | 21 | 4 |
| Acetato de Trembolona | single | acetato | 2 | 0,5 |
| Decanoato de Nandrolona | single | decanoato | 7 | 2 |
| Primobolan (Enantato) | single | enantato | 6 | 1,5 |
| Boldenona (Undecilenato) | single | undecilenato | 14 | 3 |
| Oxandrolona | single | oral | 0,4 | 0,1 |
| Hemogenin | single | oral | 0,4 | 0,1 |
| Dianabol | single | oral | 0,2 | 0,1 |
| Clembuterol | single | — | 1,5 | 0,15 |

**Cores legadas — valores NORMATIVOS (copiados literalmente do `commonDrugs` do HormoTracker; validados contra o código em 25/08/2026; nenhuma cor inventada):**

| Entidade legada | Hex |
|---|---|
| Retatrutida | #9b59b6 |
| Durateston LANDERGOLD (Blend) | #27ae60 |
| LANDERGOLD — Propionato (0,2) | #1abc9c |
| LANDERGOLD — Fenilpropionato (0,4) | #2ecc71 |
| LANDERGOLD — Isocaproato (0,4) | #27ae60 |
| Enantato de Testosterona | #2ecc71 |
| Enantato de Trembolona | #e74c3c |
| Enantato de Masteron | #3498db |
| Cipionato de Testosterona | #27ae60 |
| Propionato de Testosterona | #1abc9c |
| Decanoato de Nandrolona (Deca) | #f1c40f |
| Acetato de Trembolona | #c0392b |
| Undecanoato de Testosterona | #2c3e50 |
| Primobolan (Enantato) | #8e44ad |
| Boldenona (Undecilenato) | #e67e22 |
| Oxandrolona (Oral) | #d35400 |
| Hemogenin (Oral) | #ff7979 |
| Dianabol (Oral) | #f39c12 |
| Clembuterol | #ff9f43 |

`LEGACY_COLORS` = conjunto distinto desses hexes: {#9b59b6, #27ae60, #1abc9c, #2ecc71, #e74c3c, #3498db, #f1c40f, #c0392b, #2c3e50, #8e44ad, #e67e22, #d35400, #ff7979, #f39c12, #ff9f43} — 15 cores (repetições contam uma vez). O fallback padrão do legado (`#3498db`) já pertence ao conjunto. `PALETTE_ALLOWED = PALETTE_MODERN ∪ LEGACY_COLORS` permanece a definição vigente; cores legadas servem à compatibilidade/migração e não precisam aparecer como recomendações da UI moderna. **Esta tabela esgota o necessário para implementar cores: nenhum valor depende de auditoria, commit ou documento anterior.**

## 9.1 Política de identidade e evolução do dataset

1. `Substance.id` oficial é **estável e imutável**.
2. `PharmacokineticProfile.id` oficial é **estável e imutável**.
3. Renomear `name`/`slug`/`aliases`/`tags`/textos **NÃO altera ID**.
4. Um ID oficial **nunca é reutilizado** para outra entidade.
5. Entidade removida da UI/seletor passa a `deprecated:true` e **permanece resolvível** — nada é apagado semanticamente para liberar ID.
6. Perfil cientificamente substituído recebe **novo profileId**.
7. O perfil antigo pode permanecer `deprecated:true`.
8. Histórico mantém **snapshot e ID antigo** intactos.
9. Mudança inevitável de ID exige **migration mapping explícito** em `DatasetMetadata.idMigrations`: substance ⇒ `{entityKind:'substance', fromId, toId, …}`; profile ⇒ **identidade composta** `{entityKind:'profile', fromSubstanceId, fromProfileId, toSubstanceId, toProfileId, …}` — profileId pode repetir entre substâncias e a dupla resolve a ambiguidade (troca entre substâncias permitida só porque os quatro IDs são explícitos). Ciclo por identidade completa é inválido; destino deve existir; resolução determinística em export/import/migração.
10. Nenhum agente altera IDs por preferência estética.

`datasetVersion` muda quando **conteúdo científico OU identidade/resolução semântica** do dataset muda (parâmetros, perfis, sources, IDs/idMigrations); mudanças exclusivamente cosméticas podem preservar a versão. Casos de teste obrigatórios na §13 (identidade/versionamento).

---

# 10. UX e navegação

Abas fixas; transições pré-preenchem parâmetros/datas, nunca doses; faixas exigem seleção explícita.

**Histórico — três ações (todos os módulos):**
- **VISUALIZAR:** renderiza DIRETAMENTE os pontos persistidos — Comparador usa `chartViewSnapshot.displayPointsByScenario[].points` (já amostrados na gravação, com `valueKind` mg|normalized_ratio); Protocolos usa `snapshot.series[].displayPoints` — **em ambos os casos reproduz fielmente a apresentação salva, NÃO executa PK Engine, NÃO executa `sampleForDisplay`, não depende do algoritmo de sampling atual nem do dataset/engine antigo**. `resultSnapshot.analysisCurve` permanece como snapshot científico para inspeção, métricas, dados e export — não é necessário para desenhar o gráfico salvo.
- **REABRIR:** carrega `input`s/snapshots para inspeção/edição (rascunho; não cria registro) — no Comparador multicenário, restaura TODOS os cenários salvos (`scenarios[]` + `chartViewSnapshot`).
- **RECALCULAR:** engine atual ⇒ NOVO registro; original intacto — no Comparador, recalcula CADA `SimulationInput` de `scenarios[]` e cria um novo registro completo. Divergência: “Este resultado foi calculado com pk@X. Recalcular utilizará pk@Y e criará um novo registro.”
- Engines antigos executáveis FORA DA V1. Frase oficial: “histórico rastreável e preservado por snapshot”.

**Gravação por ação explícita nos três módulos** (“Salvar análise/no histórico”). Cálculos permanecem live.

**Calendário/fuso:** `settings.calendarTimeZone` (default dispositivo no 1º uso); células posicionam por `localDateIn(instant, calendarTimeZone)`; chips “≈ nome: X mg” às 20:00 no calendarTimeZone, materializando desde `evaluationInstant − requiredPkLookback`, filtro <0,01 mg, ordenação decrescente; dose do mês anterior contribui. Drag&drop (limiar 7 px; supressão de clique 800 ms): Δ dias civis medidos na exibição aplicado ao startDate civil do protocolo (hora/fuso preservados; rotação semanal; política DST na nova data).

**Diálogo do protocolo:** helpers “Informe em dias.” / “Informe em dias. Use 0 para absorção imediata.” / conversões “Equivale a aproximadamente X h/d”. Exclusão por modal próprio (sem `confirm()` nativo). Status global aria-live, auto-dismiss 7 s com ações (Desfazer).

**Ajustes:** consentimento off (texto literal “Desativado por padrão. Nenhum dado é enviado para servidor.”); desativar = oferecer export→confirmar→apagar (sem quarentena oculta); exports; migração assistida com diálogos de fuso (“Os dados antigos não registravam fuso horário. Informe o fuso em que estes horários foram originalmente cadastrados.” — default dispositivo) e remapeamento de cores; gestão de quarentenas (≤5); falha IndexedDB formal (memória+aviso+exportar+retry por ação); banner de atualização PWA.

Viewports de validação: 320/375/390/430/768/1024/1440 px.

---

# 11. Persistência, histórico e migrações

Opt-in; chaves `fk:v1:*`; IndexedDB stores scenarios|protocols|history|custom|quarantine; caches técnicos só assets. Corrupção ⇒ quarentena `fk:v1:corrupted-<ts>` (máx. 5; poda notificada; última cópia protegida). Falha IndexedDB: memória+aviso persistente+exportar+retry controlado; nunca fallback silencioso p/ localStorage grande; nunca fingir salvamento.

Exports: `ExportBundle` union; Config vs FullBackup (histórico completo; autossuficiente p/ VISUALIZAR graças aos snapshots de exibição); consentimento nunca exportado/restaurado. Import: zod+LIMITS; prévia/confirmação; erros amigáveis por código.

Histórico: FIFO 500; imutável; gravação só por ação explícita; budget de armazenamento contido por `HISTORY_RECORDS_MAX` + cap de `displayPoints` (sampling ≤1200 pts/série).

**Migrações (não destrutivas; apps legadas = fontes de formato):**
- `hormoTrackerProtocols`: aceita envelope `{schemaVersion:2, savedAt, protocols[]}` e array legado simples com campos `id?, name, halfLife, tmax, dose, startDate, startTime, type('single'|'weekly'), daysOfWeek?, weeksCount?, color, protocolId?, groupId?, isBlend/esters?` (sanitizar tudo; inválidos descartados com contagem). **N irmãos com mesmo groupId ⇒ 1 Protocol canônico**: `totalDoseMg=Σ doses`; `proportion_i=doseLegacy_i/totalDoseMg`; `totalDoseMg<=0` ⇒ inválido→quarentena/report; cada componente recebe `selectedPkParameters`+`pkParametersSnapshot` dos valores legados. Cores: na paleta ⇒ preserva; fora ⇒ `legacyOriginalHex` + remapeamento (vizinho mais próximo, distância euclidiana quadrática sRGB; empate ⇒ menor id lexicográfico) + entrada em `MigrationReport.colorRemaps`. groupId existe só no migrador.
- `meiavida:v2:data`: cenários → Scenario (source custom/library conforme dado); datetime-local convertido usando a **timezone assumida**; doses com `amountMg` nulo/não finito/fora de `SIMULATION_DOSE_MG_MAX` são descartadas e contabilizadas no relatório.
- `meiavida:v2:persistence-enabled`: apenas sugestão na tela de migração.
- Política: copiar, nunca apagar originais; `fk:v1:migrated-from=<origem>`; remoção manual posterior. localStorage é por ORIGEM (não path): sob `masselorc.github.io` as chaves são lidas diretamente.

---

# 12. Estrutura final de pastas (ESPECIFICAÇÃO)

```
farmacologico/                     # raiz do repo Masselorc/farmacologico
├─ .token-optimizer/               # EXISTE HOJE — tooling versionado; fora do runtime/bundle/dist/precache (§12.3)
├─ FARMakit-especificacao-final.md # EXISTE HOJE — FONTE NORMATIVA
├─ README.md                       # EXISTE HOJE (placeholder) — substituído na E14
├─ docs/
│  └─ DIARIO-DE-BORDO.md           # CRIAR NA E1 — histórico factual da implementação (regras na §12.2)
├─ package.json                     # futuro
├─ app.config.ts                    # futuro — FONTE ÚNICA {basePath, productName} → vite/PWA/runtime
├─ vite.config.ts                 # consome app.config.ts; VitePWA({manifest:{...}}) GERADO
├─ tsconfig.json / eslint.config.js
├─ index.html                     # CSP meta + root
├─ public/
│  └── icons/                     # SEM manifest.webmanifest manual (gerado no build)
├─ tools/spike-csp/               # GATE E1 (temporário)
├─ .github/workflows/{ci.yml,pages.yml}
└─ src/
   ├─ main.tsx
   ├─ app/{router.tsx,AppShell.tsx,providers.tsx,config/basePath.ts,i18n/pt-BR.messages.ts}
   ├─ domain/
   │  ├─ shared/{types.datetime.ts,datetime.ts(Temporal+DST),errors.ts,tolerances.ts(+CUTOFF_TOLERANCE),result.ts}
   │  ├─ units/{convert.ts,decimal.ts,format.ts}
   │  ├─ pk/{rates.ts,bateman.ts,state.ts,analysis.ts,cutoff.ts,warnings.ts,version.ts}
   │  ├─ recurrence/{generate.ts,shift.ts,validate.ts}
   │  ├─ reconstitution/calculate.ts
   │  ├─ simulation/{windows.ts,assemble.ts,historyView.ts(monta snapshots de exibição)}
   │  └─ version.ts                # ENGINE_VERSIONS
   ├─ data/substances/{legacy.dataset.ts(componentOnly+LEGACY_COLORS),palette.allowed.ts,index.ts}
   ├─ data/sources/
   ├─ validation/{limits.ts,boundsFromLimits.ts,schemas/*.ts}
   ├─ storage/{consent.ts,localStorage.ts,idb.ts,history.ts,quarantine.ts}
   ├─ migrations/{registry.ts,fromHormoTracker.ts,fromMeiavida.ts,fixtures/*.json}
   ├─ stores/{libraryCustom,scenarios,protocols,history,settings}.store.ts
   ├─ features/
   │  ├─ library/pages/LibraryPage.tsx (+SubstanceCard,SubstanceSheet,RangeSelector)
   │  ├─ comparator/pages/{EditPage,AnalysisPage}.tsx
   │  │   components/{ScenarioForm,DoseEditor,QuickDose,MetricsPanel,MilestonesTable,ModelDetails,SaveAnalysisButton}
   │  │   lib/phaseHint.ts
   │  ├─ charts/{CompareChart,KineticChart,temporalGuides,sampling,chartSummary,fallback}.ts(x)
   │  ├─ reconstitution/pages/ReconstitutePage.tsx
   │  │   components/{ResultPanel,SyringeGauge,CopyButton,SaveToHistoryButton}
   │  ├─ protocols/pages/{CalendarPage,ChartsPage}.tsx
   │  │   components/{MonthGrid,DaySheet,AgendaList,WeekStrip,AdminCard,QuickMenu,ProtocolDialog,
   │  │              DragController,KeyboardMove,EstimateChips,RangeControls,InfoPanel,UndoBar,SaveAnalysisButton}
   │  │   hooks/{useCalculationWindow,useWindowOccurrences,useReschedule}.ts
   │  ├─ history/pages/HistoryPage.tsx (+RecordItem[Ver/Reabrir/Recalcular],RecordDetail)
   │  └─ settings/pages/SettingsPage.tsx (+DataControls,MigrationWizard,QuarantineManager,UpdateBanner)
   ├─ components/ui/{Button,Field,NumberField,PalettePicker,Select,Checkbox,Modal,StatusRegion,EmptyState,ErrorBox,Tabs,Badge}
   ├─ styles/tokens.css
   └─ tests/{domain/**/*.test.ts,types/**/*.test-d.ts,e2e/*.spec.ts,perf/*.bench.ts}
```

*Nota: a árvore mistura artefatos que **já existem** (`.token-optimizer/`, este documento, `README.md`) e os que serão criados durante a implementação (marcados "futuro"/"CRIAR NA E1").*

## 12.1 Hierarquia documental e regra de divergência

| Artefato | Papel |
|---|---|
| `FARMakit-especificacao-final.md` | **FONTE NORMATIVA** — contrato de arquitetura e comportamento |
| `docs/DIARIO-DE-BORDO.md` | Histórico factual da implementação (o que foi feito, descoberto, testado ou alterado) |
| `.token-optimizer/` | Tooling de desenvolvimento auxiliar — versionado |
| `README.md` | Documentação pública/operacional futura |

Em divergência entre código, diário e especificação, a **especificação prevalece**, salvo alteração formal aprovada. Divergir durante a implementação **nunca é silencioso**: (1) identificar a divergência; (2) registrar no diário; (3) explicar a razão; (4) explicar o impacto; (5) marcar **DECISÃO PENDENTE** quando exigir aprovação do proprietário; (6) nunca redefinir unilateralmente decisões congeladas (§18).

## 12.2 Diário de bordo (`docs/DIARIO-DE-BORDO.md`)

Criado na **E1**. Append-only durante o desenvolvimento; factual; cronológico; conciso; legível por humanos e agentes. **Não substitui a especificação.**

Entrada obrigatória ao concluir cada etapa E1–E15 e sempre que ocorrer: decisão arquitetural relevante · desvio da especificação · bug importante · falha relevante de teste · alteração de schema/storage/migration · mudança de dependência ou de comportamento · decisão que afete compatibilidade · descoberta relevante.

Template:
```markdown
## YYYY-MM-DD — E? — Título
### Objetivo
### Alterações realizadas
### Arquivos principais
### Decisões tomadas
### Validações executadas
- comando: PASS/FAIL
### Problemas encontrados
### Solução adotada
### Pendências
### Commit
```

Proibido registrar: chain of thought/raciocínio privado do modelo; dumps enormes de terminal; diffs completos; conteúdo integral de arquivos; tokens consumidos; credenciais/API keys/secrets/dados sensíveis.

Primeira entrada (E1): início da implementação greenfield; commit/base inicial; estado inicial do repositório; criação do scaffold; decisões de E1; resultados do gate CSP×Chart.js; resultados de typecheck/test/build.

## 12.3 `.token-optimizer/` — tooling versionado (FORA do produto)

Deliberadamente mantido no repositório. Regras: **NÃO remover · NÃO adicionar ao `.gitignore` · NÃO limpar automaticamente · NÃO tratar como temporário descartável · NÃO interpretar sua presença como corrupção do projeto.**

Classificação: **TOOLING DE DESENVOLVIMENTO** (usado por tooling/Codex/Token Optimizer; pode conter artefatos técnicos/telemetria da ferramenta). NÃO integra: runtime da FARMakit · bundle da aplicação · PWA · dataset · storage do usuário · código de domínio. Não contém dados funcionais do produto. Sua presença não deve interferir em npm, Vite, TypeScript, testes, CI ou deploy.

Validação de build (critério de aceite): permanece no repositório; **não aparece em `dist/`**; nenhum arquivo seu é solicitado em runtime; nada entra no precache do PWA. Como fica fora de `src/` e `public/`, o Vite já o ignora naturalmente — adicionar apenas um assert/verificação de build equivalente, sem configuração especial.

---

# 13. Estratégia de testes

Convenção: tolerâncias da seção 4; proibido igualdade bit-a-bit/exato/diff-0 em floating point; migração estrutural usa igualdade exata onde cabível.

## Unitários (Vitest)
- **Solver pela equação:** recomposição com TMAX_RECOMPOSITION_RTOL ∀(T½,Tmax) válidos; **oráculo estável perto de ka≈ke avaliado em espaço-y (`y/expm1(y)`+Taylor), nunca ln(ka/ke)/(ka−ke) cru**; âncoras rtol 1e-4 (6d/2d⇒1,34159; ka=0,36 dia⁻¹⇒4,649224 d); paridade meiavida 24 h/4 h.
- Ramos: Tmax=0; degênero; flip-flop+warning; extremos: NaN/∞ inesperado ⇒ NUMERIC_FAILURE; underflow documentado ⇒ 0.
- Bateman/estado: 50%@1T½; pico@Tmax; conservação; clamp; percentuais zerados; futuras fora do estado.
- **Lookback/cutoff:** assert `CONTRIBUTION_CUTOFF_HALF_LIVES === 44`; `requiredPkLookback ≡ max cutoffAgeFor`; `effectiveTmaxMs = tmaxMs ?? 0` (**Tmax instantâneo ⇒ 0 ⇒ cutoff calculado corretamente**); janela de cálculo com T½ longa; **dose anterior à DisplayWindow altera o primeiro ponto exibido**; blend ⇒ máximo entre componentes.
- **Cutoff agregado:** invariante `Σ contribuições descartadas < CUTOFF_TOLERANCE × Σ doses descartadas`; **equivalência prática** cutoff-normativo × referência estendida comparando apenas grandezas de contribuição presente (central/depósito/central+depósito/curva/primeiro ponto visível/pontos críticos) via `amountClose`; **proibido comparar `eliminatedMg`/`administeredMg`/`administeredCount`/`plannedCount` entre universos com administrações distintas**; conservação validada **dentro de cada simulação**. Casos: dose única; weekly longo; múltiplos weekdays; blend; fixture de máximo de ocorrências; ka>ke; ka<ke; ka≈ke; Tmax instantâneo.
- **Dataset/cores legadas:** cada preset/componente da tabela da §9 possui exatamente o hex especificado; componentes do LANDERGOLD com cores corretas; `LEGACY_COLORS` derivável somente deste documento (golden test sem dependência externa).
- **Dados personalizados:** perfil custom existe em um único store canônico (`customProfiles`); `CustomSubstance` sem `profiles[]`; owner `{official|custom}.substanceId` válido (owner inexistente rejeitado); exclusão bloqueia/oferece cascata confirmada; export/import round-trip sem duplicação.
- **Limites de dose:** 0/negativo/NaN/Infinity rejeitados; limite máximo aceito; acima rejeitado (`INVALID_DOSE_AMOUNT` por dose, `PROTOCOL_TOTAL_DOSE_INVALID` no protocolo); import e migração obedecem caps.
- **IDs do dataset:** rename preserva id; ID nunca reutilizado; `deprecated:true` permanece resolvível; alias/`idMigrations` resolve corretamente; snapshot antigo íntegro.
- **Datetime do Comparador:** criação em TZ A ⇒ troca de dispositivo para TZ B mantém o `InstantIso`; display converte para o fuso vigente; edição sem mudança de valor preserva o instante; GAP/OVERLAP conforme política global; proibido `new Date(datetimeLocalString)`.
- **Log (apresentação):** absolute floor = peak×`LOG_REL_EPSILON`; normalized floor = ε; série toda zero ⇒ sem domínio log válido; valor exatamente no epsilon e abaixo são clipados apenas visualmente; snapshots log preservam a ciência.
- **Identidade do dataset:** migration substance válida; migration profile na MESMA substância; migration profile ENTRE substâncias (4 IDs explícitos); mesmo profileId em substâncias diferentes não gera ambiguidade (identidade composta); ciclo substance rejeitado; ciclo profile rejeitado; destino inválido rejeitado; resolução determinística; rename preserva id; deprecated resolve.
- **Histórico multicenário do Comparador:** 1/2/20 cenários; `scenarioId` únicos; cardinalidade `scenarios == displayPointsByScenario`; série visual sem cenário científico rejeitada; cenário científico sem série visual rejeitado; REABRIR restaura todos; RECALCULAR cria novo registro completo; FullBackup round-trip preserva todos.
- **custom_profile/manual:** sources library/custom_profile/manual distintos; `custom_profile` armazena `customProfileId`; manual não inventa ref de perfil; conversão custom_profile→manual preserva `selectedPkParameters`+`pkParametersSnapshot`; exclusão bloqueada com refs ativas e permitida após conversão; histórico antigo íntegro.
- **datasetVersion:** mudança científica incrementa; mudança de identity mapping incrementa; mudança puramente cosmética pode preservar.
- **Dose/DoseDraft:** draft aceita `amountMg:null`; Dose persistida nunca aceita null; schema impede persistência de draft; limite máximo (`SIMULATION_DOSE_MG_MAX`) permanece aplicado.
- **Amount comparator:** perto de zero (ATOL domina); valores grandes (RTOL domina); igualdade dentro de ATOL; dentro de RTOL; fora de tolerância reprovada; cutoff vs referência estendida usa `amountClose`.
- **Favorites:** official e custom com o MESMO texto de ID não colidem (discriminador); round-trip export/import preserva `type`; ref inexistente rejeitada/quarentenada.
- **HistoricalProfileRef:** official/custom discriminados; snapshot histórico continua autossuficiente; nenhum ID nu ambíguo.
- **Cutoff property:** ka>ke, ka<ke, ka≈ke ⇒ contribuição além do cutoff `< CUTOFF_TOLERANCE×dose`.
- Análise: horizonte 10,5; invariantes dos marcos; 0,1% ∈ 9,9–10,1 T½; truncamento < AMOUNT_RTOL.
- **Blend:** 3 componentes ⇒ 3 SimulationInputs; dose derivada; Σ proporções=1; snapshot pertence ao componente (reordenação não troca associação).
- Recorrência: janela parcial (fronteira); única/semanal; fim inclusivo; rotação ±1/±7.
- **Datas/DST (Temporal, fixtures explícitas):** GAP 1 h ⇒ 02:30→03:30 ('later'); OVERLAP ⇒ primeira ocorrência ('earlier'); mudança de TZ do dispositivo não altera protocolo salvo; fusos distintos no dia correto da exibição; chips c/ contribuição anterior.
- `parseLocaleDecimal`: "0,5"/"0.5" ok; rejeita ambíguos/vazios/múltiplos separadores.
- Reconstituição: âncora 250 mcg; capacidade 3000 mcg (120/240 U); 6000 mcg ⇒ DOSE_EXCEEDS_VIAL_CONTENT; graduação decimal (0,5) e bordas 9/10 U; inválidos/caps.
- **Provenance:** user_defined aceito sem fingir fonte; literatura sem sourceIds rejeitado; combinações inválidas falham (schema+typecheck .test-d.ts).
- **Export/types:** discriminated union válida (switch exaustivo compila); metadata do output só pkEngineVersion; protocol-analysis registra pk+recurrence.
- Schemas×LIMITS fronteiras; boundsFromLimits sincronizado.

## Propriedade (fast-check)
Monotonicidades da reconstituição; superposição comutativa; identidade do solver ampla (incl. vizinhança degênero, oráculo y-space); **cutoff: contribuição além do corte < CUTOFF_TOLERANCE×dose para ka>ke, ka<ke, ka≈ke (caso degênero explícito, com Tmax=1/k) e Tmax instantâneo**; **agregado: Σ descartadas < ε×Σ doses**; **equivalência cutoff × referência estendida via `amountClose` (RTOL+ATOL) nas grandezas de contribuição presente — nunca eliminated/administered/plannedCount entre universos distintos**; marcos ordenados; contagem de ocorrências ∝ janela de cálculo.

## Integração
Formulário⇄zod⇄analyze; Registrar-dose; consent on/off (desligar=export opcional+confirmação+apagar, sem quarentena); export Config vs FullBackup; import sem consentimento restaurado; caps; IDB failure simulado; quarentena >5 poda notificando; SW prompt-banner; **história: snapshot antigo intacto; VISUALIZAR produz o mesmo gráfico SEM executar PK Engine e SEM chamar `sampleForDisplay` — renderiza os pontos persistidos (mesmo com engine removido/substituído ou algoritmo de sampling alterado); RECALCULAR cria novo registro**; **Comparador: salvar em modo normalizado + escala log + DisplayWindow específica ⇒ VISUALIZAR preserva janela, modo, escala, `valueKind` e pontos renderizando-os diretamente**; FullBackup renderiza histórico sem dataset atual; migração: assumedTimeZone + colorRemaps registrados; blend refs íntegras; totalDose≤0 ⇒ quarentena/report.

## E2E (Playwright, viewports 320–1440)
Fluxos felizes/erro dos 3 módulos; mover por teclado e drag; Desfazer; foco-no-gráfico; Biblioteca→destinos c/ seleção de faixa; offline reload; update banner; console sem violações CSP no build produção.

## Acessibilidade
axe-core zero serious/critical nas 6 rotas; teclado completo; focus-trap/devolução; aria-live; NVDA checklist arquivado (pré-condição WCAG 2.2 AA); contraste; reduced-motion.

## Migração
Golden fixtures hormo (envelope v2, array legado c/ blends) e meiavida (válido/inválido/schema≠2/corrompido); asserts de canônico/doses/proporções/snapshots por componente; assumedTimeZone presente; cores remapeadas reportadas; originais intactos; idempotência.

## Desempenho (BENCHMARK TARGETS antes de hard gates)
Metas iniciais (calibrar em E13): materialização ano×200 protocolos ≤50 ms; análise 200×520 semanas <2 s; sampling ≤1200 pts/série; bundle inicial gzip ≤300 kB. Até a calibração, CI verifica apenas: **regressão relativa** contra baseline registrado, budgets de bundle, limite algorítmico (objetos ∝ CalculationWindow, nunca horizonte total), ausência de long tasks perceptíveis em cenários normais. Milissegundos absolutos tornam-se hard gates somente após benchmark com ambiente/hardware registrado e congelamento dos budgets.

---

# 14. Critérios de aceite

- **Biblioteca:** 19 entidades internas/16 visíveis; badges por origem honestos (inclui “criado por você”); faixas exigem seleção; CTAs não preenchem doses; **cores legadas conforme tabela da §9, sem dependência de documento externo**.
- **Meia-vida:** 6d/2d aceito (ka≈1,3416/d rtol 1e-3); flip-flop avisado; eixo-X datado; marcos paridade dentro de MILESTONE_TIME_ABS_TOL; log c/ clipping informado.
- **Reconstituição:** âncora 250 mcg exata nas tolerâncias; 3000 mcg ⇒ 120/240 U c/ mensagem neutra; 6000 mcg ⇒ bloqueio; bordas de graduação 9/10 U; salvar-no-histórico explícito.
- **Protocolos:** golden de datas; blend canônico 3 componentes; mover/rotacionar; Desfazer; chips c/ lookback e filtro <0,01 mg; geração ∝ CalculationWindow (instrumentação); fusos distintos no dia correto.
- **Histórico:** Ver produz o mesmo gráfico **sem executar engine** (teste com engine removido/stubado); Reabrir traz inputs; Recalcular cria novo registro com aviso de versão; versões corretas por motor; recon só por botão; **Comparador restaura janela/escala/eixo do `chartViewSnapshot` sem engine**.
- **Errata de consistência contratual:** dados custom com fonte canônica única e zero duplicação; doses PK com limites técnicos definidos e declarados como não clínicos; erro agregado do cutoff testado (44 mantido como normativo); histórico do Comparador renderiza pontos salvos diretamente, sem `sampleForDisplay`; absolute/normalized com semântica persistida inequívoca (`valueKind`); IDs oficiais estáveis, nunca reutilizados, com deprecated/alias/`idMigrations` definidos; datetime-local do Comparador via Temporal+`calendarTimeZone`, instante imutável após trocas de fuso; log com pisos distintos absoluto/normalizado e clipping apenas visual; §18 sem duplicatas e referências internas corretas.
- **Microerrata contratual final:** todas as referências §18.x corretas (varridas uma a uma); §9.1 contém a política de identidade do dataset; `DatasetIdMigration` com `entityKind` e regras anti-ciclo/cross-kind; `datasetVersion` cobre ciência + identidade/resolução semântica; `Dose` persistível nunca possui `amountMg=null` (`DoseDraft` separado); `AMOUNT_ATOL_MG` definido com fórmula central `amountClose`; cutoff agregado usa o comparador central; `LOG_REL_EPSILON` na lista oficial com origem explícita de `seriesPeakMg`; `Favorites` diferencia official/custom via `SubstanceRef`; histórico usa `HistoricalProfileRef` discriminado, sem IDs nus.
- **Microerrata de cardinalidade/cutoff/origem custom:** registro `pharmacokinetics` preserva N inputs+N resultados científicos+N séries visuais (um por cenário; cardinalidades consistentes; IDs únicos); REABRIR/RECALCULAR multicenário completos e FullBackup preserva tudo; equivalência cutoff×referência compara apenas contribuição presente via `amountClose` — **nunca `eliminatedMg`/`administeredMg`/`administeredCount`/`plannedCount` entre universos distintos**, conservação intra-simulação; `DatasetIdMigration` de profile com identidade composta anti-ciclo; sources library/custom_profile/manual em ScenarioSource e ProtocolComponent.source, com manual sem fake ref; exclusão de CustomProfile bloqueada com refs ativas e conversão para manual preservando snapshots.
- **Persistência:** zero escrita de dados do usuário sem consentimento; corrupção⇒quarentena≤5; desligar sem quarentena oculta; FullBackup visualiza histórico sem dataset; import não liga persistência.
- **Migração:** fixtures verdes; assumedTimeZone+colorRemaps no relatório; nenhum protocolo perdido por cor; idempotente; originais intactos.
- **PWA/manifest:** artefato buildado contém base/scope/start_url derivados de app.config.ts; **nenhum segundo manifest**; instalável/offline; atualização via banner.
- **Mobile/acessibilidade:** Agenda/Semana/Mês <768 px sem scroll lateral; alvos ≥44 px; axe CI zero serious/critical + NVDA arquivado.
- **Segurança/CSP:** spike E1 aprovado (zero violações); paleta fechada; zero requisições externas runtime.
- **Build/config:** app.config.ts único alimenta Vite+manifest/SW+runtime (assert de artefatos).
- **Performance:** benchmarks calibrados em E13 com ambiente registrado; CI usa regressão relativa até lá; propriedades estruturais (janela, sampling) sempre ativas.
- **Release V1:** E10A + endurecimento + critérios obrigatórios + **README real substituindo o placeholder**, contendo visão geral, aviso educacional, arquitetura resumida, módulos, setup/comandos, testes, build/deploy, PWA, privacidade, persistência opt-in, estrutura do domínio, engineVersion/datasetVersion, política de dados científicos, migração das apps legadas, limitações científicas, status das ferramentas antigas e URL pública — **referenciando somente esta especificação como fonte arquitetural**; incluir ainda as seções **“Estrutura do projeto”** (`FARMakit-especificacao-final.md` = contrato normativo · `docs/DIARIO-DE-BORDO.md` = histórico da implementação · `.token-optimizer/` = tooling auxiliar versionado, fora do runtime/deploy · `src/` = aplicação · `dist/` = artefato de build) e **“Ferramentas de desenvolvimento”** (`.token-optimizer/` deliberadamente versionado, usado por tooling/Codex/Token Optimizer, sem dados funcionais do produto e sem entrar no bundle).

---

# 15. Plano de implementação futura (APENAS DESCREVER — NÃO EXECUTAR)

| Etapa | Objetivo | Notas |
|---|---|---|
| E0 Confirmações de deploy | slug/nome/Pages | Não bloqueia desenvolvimento |
| E1 Scaffold + infraestrutura + gate CSP×Chart.js | app.config.ts único; CSP meta; PWA(prompt, manifest gerado); tokens/paleta; spike obrigatório; **criar `docs/DIARIO-DE-BORDO.md` com a 1ª entrada** (início greenfield, base inicial, estado do repo, scaffold, decisões, gate CSP, typecheck/test/build); reconhecer `.token-optimizer/` como tooling versionado e validar exclusão do build; **NÃO adicioná-lo ao `.gitignore`** | Zero violações CSP + diário iniciado + build sem tooling |
| E2 Unidades/tempo/decimal | ms/mg; Temporal+DST(GAP/OVERLAP c/ fixtures); parseLocaleDecimal | Polyfill bundled |
| E3 Motores | pk(+cutoff c/ effectiveTmaxMs), recurrence(janela), reconstitution, simulation(windows+assemble N-inputs+historyView) | NUMERIC_FAILURE |
| E4 Gate de testes matemáticos | equação-solver; lookback=cutoff (assert `CONTRIBUTION_CUTOFF_HALF_LIVES===44` + caso degênero explícito); blend 3 inputs; marcos; cutoff property 4 casos + **bound agregado** + **equivalência vs referência estendida**; limites de dose PK; bordas seringa | Antes de qualquer UI |
| E5 LIMITS+zod+i18n | LIMITS→zod/HTML; códigos+pt-BR; .test-d.ts (union de exports, provenance) | Contratos compiláveis |
| E6 Persistência/exports | consent; idb+fallback; quarentena≤5; Config/FullBackup (snapshots de exibição, incl. `ChartViewSnapshot`) | Snapshot-first |
| E7 Migrações | hormo(irmãos→canônico; dose derivada; cores; fuso assumido) + meiavida; fixtures | Relatórios completos |
| E8 Reconstituição | tela completa; âncoras 120/240 U; DOSE_EXCEEDS_VIAL_CONTENT; salvar explícito | Mensagens neutras |
| E9 Comparador | forms/análise/dashboard/CompareChart; salvar análise | phaseHint heurística |
| E10 Biblioteca | dataset v1 (componentOnly; origins); fichas/faixas/CTAs | — |
| E11 Protocolos | entidade canônica; calendário multi-fuso; chips lookback; drag/teclado; KineticChart; Desfazer | CalculationWindow |
| E12 E10A Histórico+integrações | Ver/Reabrir/Recalcular; CTAs; export/import; versionamentos; restauração visual do Comparador | Bloqueia release |
| E13 Endurecimento + **benchmark** | a11y real; **calibrar benchmarks (ambiente registrado) e congelar budgets**; PWA polish | Hard gates só pós-calibração |
| E14 Release docs | **README real** (referencia somente esta spec) + changelog + URL pública; incluir seções “Estrutura do projeto” (especificação=contrato · diário=histórico · `.token-optimizer/`=tooling auxiliar versionado, fora do runtime/deploy · `src/`=aplicação · `dist/`=artefato de build) e “Ferramentas de desenvolvimento” (.token-optimizer/Codex/Token Optimizer) | Após E0/E13 |
| E15 E10B (pós-release) | share URL; favoritos avançados; tabela consolidada; zoom/pan; PNG; duplicação; filtros | Não bloqueia V1 |

Transição das URLs antigas (fases): F1 publicar mantendo apps antigas → F2 banners “Esta ferramenta foi incorporada ao FARMakit.” + link por módulo → F3 coexistência/validação → F4 redirecionamento quando tecnicamente apropriado (GH Pages não tem redirect de servidor: página legada mínima com link/location.replace) ou página legada mínima.

---

# 16. Ordem recomendada de implementação futura

E0 confirmações de deploy (não bloqueia) → E1 scaffold+spike CSP → E2 unidades/tempo/decimal → E3 motores → E4 gate de testes matemáticos → E5 limites/schemas/i18n → E6 persistência/exports → E7 migrações → E8 Reconstituição → E9 Comparador → E10 Biblioteca → E11 Protocolos → E12 E10A histórico/integrações → E13 endurecimento+benchmark calibration → E14 release+README real → E15 E10B. **NADA disto deve ser executado nesta tarefa.**

---

# 17. Riscos técnicos restantes

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Parâmetros legados implausíveis (sem fonte) | Média | Alto | origins/badges/datasetVersion/histórico imutável |
| Flip-flop mal interpretado | Média | Médio | warning educacional + Detalhes |
| Variantes imprevistas nos storages legados | Média | Alto | migrador tolerante+quarentena+report+nunca destruir |
| Bugs DST/civil→instante | Média | Alto | Temporal+fixtures GAP/OVERLAP; proibição new Date(string) civil |
| Janela exibição×cálculo mal ligadas | Média | Alto | tipos dedicados + teste “dose anterior altera 1º ponto” |
| Chart.js×CSP | Baixa | Alto | gate E1 |
| IndexedDB indisponível | Baixa | Médio | memória+aviso+export+retry formal |
| Budget bundle (React+Chart.js+Temporal) | Média | Médio | code-splitting+budget CI |
| Crescimento do histórico por displayPoints | Baixa | Baixo | cap sampling+FIFO 500 |
| Flakiness drag | Média | Baixo | teclado primário |
| Sessão mista de versões (SW) | Baixa | Alto | prompt update+guard |
| Timezone assumido incorreto na migração | Média | Baixo | usuário escolhe/edita; registrado |
| Framing possível (meta CSP) | Certa (limitação) | Baixo | documentado |
| Hard gates de perf antes de calibração | Média | Médio | benchmark targets→congelar em E13; regressão relativa no CI |
| Scope creep | Alta | Alto | seções 3/18 vinculantes |

---

# 18. Decisões congeladas (vinculantes)

**Declaração de congelamento:** NÃO devem ser feitas novas mudanças arquiteturais preventivas antes da implementação. As decisões desta seção só podem ser alteradas durante a implementação se houver: falha comprovada; contradição concreta; teste demonstrando problema; impossibilidade técnica real; ou decisão explícita do proprietário. Não reabrir arquitetura por preferência do agente.

1. **Esta especificação é a ÚNICA fonte normativa; v2/v3/v4 anteriores são apenas histórico de auditoria** e não devem ser consultadas para preencher requisitos.
2. Greenfield em `Masselorc/farmacologico`; apps antigas = referências externas/fontes de formato; stack React+TS+Vite; GitHub Pages V1; sem backend.
3. Persistência de dados do usuário opt-in; “zero persistência” = dados do usuário; caches técnicos à parte; desativar não cria quarentena.
4. Um PK Engine; Recurrence Engine independente (por janela); Reconstitution Engine independente; `simulation.assemble` como ponte.
5. DisplayWindow ≠ CalculationWindow; lookback = mesma política do cutoff (`cutoffAgeFor`), única no PK Engine; **`effectiveTmaxMs = tmaxMs ?? 0` explícito**.
6. Protocolo = entidade única; `ProtocolComponent` autocontido; sem componentIndex/substanceRef/blendRef/snapshot no nível do protocolo; custom autossuficiente; dose do componente derivada.
7. Blend ⇒ uma SimulationInput por componente (médias proibidas).
8. Camadas ScientificProfile → SelectedPkParameters → SimulationInput; PK nunca consome perfil/dataset; `TmaxSpecification` union; DurationRange normaliza unidades.
9. `SimulationOutput.metadata` registra somente `pkEngineVersion`; orquestração registra pk+recurrence.
10. Histórico snapshot-first: **VISUALIZAR renderiza diretamente os pontos persistidos, sem executar PK Engine nem `sampleForDisplay`** (protocol-analysis preserva DisplayWindow+displayPoints; comparador preserva `chartViewSnapshot`); REABRIR usa inputs/snapshots; RECALCULAR usa engine e sampling atuais e cria novo registro; engines antigos executáveis fora da V1; gravação por ação explícita nos três módulos; registros imutáveis tipados; FullBackup autossuficiente.
11. Export = discriminated union (`ExportBundleBase` + `ConfigExportBundle`/`FullBackupBundle`); consentimento nunca exportado/restaurado como autorização.
12. Dataset oficial bundled; `componentOnly` para ésteres (19 entidades internas / 16 visíveis no seletor); blend com origin própria; **`ProfileOrigin` discriminada incluindo `user_defined`**; vias unknown; nenhuma fonte inventada; nenhuma dose sugerida; linguagem educacional.
13. Tempo: tipos distintos; Temporal (polyfill V1); **GAP='later' (desloca o horário pela duração do gap, ex.: 02:30→03:30)**, **OVERLAP='earlier' (primeira ocorrência)**; `calendarTimeZone`; chips 20:00 = calendarTimeZone+lookback; drag Δ civil medido na exibição.
14. Migração não destrutiva; fuso ausente perguntado (`migrationAssumedTimeZone`); cores fora da paleta preservam `legacyOriginalHex`+remapeamento determinístico; totalDose≤0 ⇒ inválido/quarentena.
15. Arredondamento só na apresentação; unidades internas ms/mg e conversões centralizadas; tolerâncias oficiais incl. `CUTOFF_TOLERANCE=1e-12`; **cutoff = 44 meias-vidas terminais (`CONTRIBUTION_CUTOFF_HALF_LIVES=44`), dimensionado inclusive para o caso degênero ka≈ke (`k·t·e^(−k·t) ≈ 6,6×10⁻¹³ < 10⁻¹²` no pior caso `Tmax=1/k`) e validado por property tests nas três regiões + Tmax instantâneo; nunca reduzir a tolerância para preservar a constante**; oráculo y-space; NaN/∞ inesperado ⇒ NUMERIC_FAILURE.
16. Cores legadas integralmente embutidas nesta especificação (tabela da §9 / `LEGACY_COLORS`, validada contra o código em 25/08/2026); nenhum dado de implementação depende de auditoria, commits ou documentos anteriores.
17. **Dados personalizados possuem UMA fonte canônica:** perfis custom vivem somente em `customProfiles` (`CustomProfile.id` = único ID canônico); `CustomSubstance` NÃO contém `profiles[]`; owner `{official|custom}.substanceId` validado; exclusão de substância com perfis vinculados é bloqueada/oferece cascata confirmada; a VIEW agregada Substance+profiles da Biblioteca é derivada em memória, jamais fonte persistida.
18. **Limites técnicos de dose:** toda dose satisfaz finite>0≤`SIMULATION_DOSE_MG_MAX`; `Protocol.totalDoseMg` satisfaz finite>0≤`PROTOCOL_TOTAL_DOSE_MG_MAX` — limites de integridade numérica/validação, explicitamente NÃO clínicos.
19. **Cutoff — garantia agregada:** `Σ contribuições descartadas < CUTOFF_TOLERANCE × Σ doses descartadas`; property tests de equivalência prática contra referência estendida usando `amountClose` (RTOL+ATOL) **nas grandezas farmacocinéticas comparáveis** (contribuição presente — nunca `eliminated`/`administered*`/`plannedCount` entre universos com administrações distintas); conservação validada intra-simulação; **44 T½ permanece normativo até prova em contrário** (elevar a constante, jamais baixar a tolerância).
20. Performance absoluta = BENCHMARK TARGETS calibrados em E13 antes de virarem hard gates; até lá CI usa regressão relativa/budgets estruturais; propriedades estruturais sempre obrigatórias.
21. BASE_PATH via `app.config.ts` único (vite+PWA+runtime); **manifest PWA gerado pelo build (fonte única; sem arquivo manual)**; spike CSP×Chart.js gate E1; CSP meta efetiva; paleta fechada.
22. LIMITS categorizados alimentando Zod e HTML; SAFETY/UX defaults ajustáveis pós-benchmark; caps próprios da Reconstituição.
23. Mobile-first; viewports fixos; WCAG 2.2 AA com verificação real; testes matemáticos antes de UI; E10B não bloqueia release; **README real referencia somente a especificação vigente**.
24. Pendências de nome/slug/Pages NÃO bloqueiam desenvolvimento — apenas deploy/publicação.
25. Renomear produto é cosmético; renomear conceitos de domínio exige atualização desta spec.
26. **Hierarquia documental:** especificação (normativa) → `docs/DIARIO-DE-BORDO.md` (factual, append-only, criado na E1) → `.token-optimizer/` (tooling versionado) → `README.md` (público futuro). Divergências da especificação nunca são silenciosas: registrar no diário, justificar, medir impacto e marcar DECISÃO PENDENTE quando exigirem aprovação.
27. **`.token-optimizer/` é TOOLING DE DESENVOLVIMENTO deliberadamente versionado** — proibido remover, gitignore, auto-limpar ou tratar como descartável; validação de build confirma sua ausência em `dist/`, em runtime e no precache do PWA.
28. **IDs oficiais estáveis e imutáveis, nunca reutilizados:** renomear name/slug/aliases/tags não altera ID; descontinuação via `deprecated:true` permanecendo resolvível; substituição científica ⇒ novo profileId com antigo deprecated; mudança inevitável exige `DatasetIdMigration` em `DatasetMetadata.idMigrations`; resolução determinística em export/import/migração; nenhum agente altera IDs por preferência estética.
29. **Datetime-local do Comparador vira `InstantIso` canônico** via `calendarTimeZone` + Temporal + política DST; trocas posteriores de fuso (dispositivo ou settings) não alteram o instante salvo; edição converte para o civil vigente e regenera na gravação.
30. **Snapshot visual tem unidade inequívoca:** `ChartSnapshotPoint{timeMs, value, valueKind:'mg'|'normalized_ratio', clippedBelowLogEpsilon?}`; absolute ⇒ tudo 'mg'; normalized ⇒ tudo 'normalized_ratio' finito em [0,1] (razão ao pico da própria série); percentuais só na UI; precisão plena persistida; visualização histórica nunca recalcula normalização.
31. **Log é relativo por série:** `LOG_REL_EPSILON=1e-12`; `absoluteLogFloorMg = seriesPeakMg×ε` (peak≤0 ⇒ sem domínio log válido), piso normalizado = ε; clipping apenas na geometria/apresentação — ciência persistida jamais substituída pelo epsilon.

---

# 19. Pendências e itens não confirmados

**Pendência não bloqueadora (deploy):** confirmar nome público, permanência do slug `farmacologico` e habilitar/configurar GitHub Pages antes da publicação.

**Pesquisa não confirmada (herdada; não bloqueia):** trechos literais irrecuperáveis do monólito HormoTracker (updateDashboard; texto/callback de “Desfazer”; enterMoveMode/commitMoveMode; options/resumo dos gráficos individuais; texto pós-remoção; forma do registro pointercancel); fontes bibliográficas dos presets legados inexistentes; existência de dados reais nos storages legados indeterminável; comportamento legado em navegadores muito antigos não exercitado; motivo da divergência 0,23 vs 5,5/24 (propionato) desconhecido (ambos preservados); vias legadas não codificadas (modelo adota `'unknown'`).

---

# 20. Checklist final

**Microerrata final — cardinalidade, cutoff e origem custom:**
[ ] Comparador histórico é multicenário no snapshot científico — ✔ `scenarios[]` (§6)
[ ] CalculationRecord pharmacokinetics não usa input singular — ✔ removido (§6)
[ ] CalculationRecord pharmacokinetics não usa resultSnapshot singular — ✔ removido (§6)
[ ] ChartViewSnapshot e snapshots científicos possuem cardinalidade consistente — ✔ invariantes §6
[ ] cutoff não compara eliminated entre universos diferentes — ✔ §4/§13
[ ] conservação é intra-simulação — ✔ §4/§13
[ ] equivalência usa amountClose — ✔ §4/§13/§18.19
[ ] DatasetIdMigration profile usa substanceId+profileId — ✔ §6/§9.1
[ ] profile mapping é anti-ciclo — ✔ §6/§9.1/§13
[ ] custom_profile e manual são sources distintos — ✔ ScenarioSource/ProtocolComponent.source (§6)
[ ] CustomProfile selecionado mantém customProfileId — ✔ §6
[ ] manual é autossuficiente sem fake ref — ✔ §6/HistoricalProfileRef
[ ] exclusão de CustomProfile com refs ativas é tratada — ✔ política §6
[ ] checklist usa §9.1 onde aplicável — ✔ corrigido
[ ] nenhuma implementação foi iniciada — ✔

**Microerrata de consistência contratual (final):**
[ ] todas as referências §18.x estão corretas — ✔ varridas uma a uma (mapa semântico)
[ ] §9.1 contém política de identidade do dataset — ✔
[ ] DatasetIdMigration possui entityKind — ✔ §6
[ ] aliases não podem formar ciclo — ✔ §9.1/§13
[ ] datasetVersion cobre ciência + identidade/resolução semântica — ✔ §6/§9.1
[ ] Dose persistível nunca possui amountMg=null — ✔ §6
[ ] DoseDraft é separado do domínio persistível — ✔ §6/§13
[ ] AMOUNT_ATOL_MG está definido — ✔ §4
[ ] amountClose possui fórmula explícita — ✔ §4
[ ] cutoff agregado usa comparador numérico central — ✔ §4/§13
[ ] LOG_REL_EPSILON está na lista oficial — ✔ §4
[ ] seriesPeakMg possui origem explícita — ✔ peak.amountMg (§4)
[ ] Favorites diferencia official/custom — ✔ SubstanceRef (§6)
[ ] histórico não usa IDs nus ambíguos — ✔ HistoricalProfileRef (§6)
[ ] checklist é factualmente verdadeiro — ✔ revisado nesta errata
[ ] nenhuma implementação foi executada nesta tarefa — ✔

**Errata final de consistência contratual:**
[ ] §18 deduplicada — ✔ itens 1–31 sem repetição
[ ] §18 renumerada — ✔ 1–31 sequenciais
[ ] referências internas corrigidas — ✔ grep de §18.x verificado
[ ] CustomProfile possui uma única fonte canônica — ✔ `customProfiles` (§6)
[ ] CustomSubstance não duplica profiles — ✔ interface sem `profiles[]` (§6)
[ ] ownership official/custom definido — ✔ `CustomProfileOwner` (§6)
[ ] export/import de custom data é não ambíguo — ✔ ConfigPayload + invariantes (§6)
[ ] SIMULATION_DOSE_MG_MAX definido — ✔ SAFETY_LIMITS (§6)
[ ] PROTOCOL_TOTAL_DOSE_MG_MAX definido — ✔ SAFETY_LIMITS (§6)
[ ] limites PK declarados como técnicos, não clínicos — ✔ comentário normativo (§6)
[ ] cutoff continua 44 — ✔ §4/§6/§18.15
[ ] bound agregado de cutoff definido — ✔ invariante Σ < ε×Σdoses (§4)
[ ] equivalência com referência estendida prevista em property tests — ✔ §4/§13
[ ] ChartViewSnapshot é renderizado diretamente — ✔ §10/§18.10
[ ] VISUALIZAR não chama PK Engine — ✔ §10/§13/§18.10
[ ] VISUALIZAR não chama sampleForDisplay — ✔ §10/§13/§18.10
[ ] ChartSnapshotPoint possui semântica de unidade — ✔ `valueKind` (§6)
[ ] normalizado usa ratio numérico inequívoco — ✔ [0,1], fórmula amountMg/peakMg (§6)
[ ] IDs oficiais são imutáveis — ✔ §9.1/§18.28
[ ] IDs nunca são reutilizados — ✔ §9.1/§18.28
[ ] deprecated/alias/migrationMap definidos — ✔ `deprecated?`, `DatasetIdMigration`, `idMigrations?` (§6/§9.1)
[ ] datetime-local do Comparador usa calendarTimeZone — ✔ §4
[ ] datetime-local usa Temporal — ✔ §4 (proibido `new Date` civil)
[ ] Dose.time persiste como InstantIso canônico — ✔ §4/§6
[ ] log absolute possui floor definido — ✔ `absoluteLogFloorMg = peak×LOG_REL_EPSILON` (§4)
[ ] log normalized possui floor definido — ✔ piso = LOG_REL_EPSILON (§4)
[ ] clipping não altera ciência — ✔ §4/§6
[ ] nenhuma mudança de arquitetura macro/stack foi introduzida; alterações estruturais ficaram restritas aos contratos explicitamente corrigidos nesta errata
[ ] nenhuma implementação foi iniciada — ✔ somente edição documental

**Ajuste documental final (tooling · diário · congelamento):**
[ ] frase residual da §9 sobre auditoria de cores removida — ✔ §9
[ ] tabela de cores continua autossuficiente — ✔ §9
[ ] `.token-optimizer/` explicitamente reconhecido como tooling versionado — ✔ cabeçalho/§12.3/§18.27 — Tooling versionado
[ ] `.token-optimizer/` NÃO deve ser removido — ✔ §12.3/§18.27 — Tooling versionado
[ ] `.token-optimizer/` NÃO deve entrar no .gitignore — ✔ §12.3/§15(E1)
[ ] `.token-optimizer/` não integra runtime — ✔ §12.3
[ ] `.token-optimizer/` não integra dist/ — ✔ critério de aceite §12.3
[ ] `.token-optimizer/` não integra precache PWA — ✔ critério de aceite §12.3
[ ] `docs/DIARIO-DE-BORDO.md` previsto — ✔ §12.2/árvore §12
[ ] diário criado na E1 — ✔ previsto §15(E1); execução futura
[ ] diário é append-only — ✔ §12.2
[ ] diário registra cada etapa E1–E15 — ✔ §12.2
[ ] diário registra decisões/desvios relevantes — ✔ §12.2
[ ] diário não contém chain of thought — ✔ §12.2 (proibições)
[ ] diário não contém secrets — ✔ §12.2 (proibições)
[ ] hierarquia documental está definida — ✔ §12.1
[ ] especificação permanece fonte normativa — ✔ cabeçalho/§12.1/§18.1
[ ] desvios da spec não podem ser silenciosos — ✔ §12.1/§18.26 — Hierarquia/divergência
[ ] README futuro documentará Token Optimizer — ✔ §14/E14
[ ] README futuro documentará diário de bordo — ✔ §14/E14
[ ] cutoff normativo continua em 44 — ✔ §4/§6/§18.15
[ ] menções históricas a 40 estão claramente marcadas como obsoletas — ✔ §1 linha 6 (“regra obsoleta; vigente é 44”)
[ ] arquitetura está congelada para início da implementação — ✔ declaração §18
[ ] nenhuma implementação foi iniciada nesta tarefa — ✔ somente edição documental

**Microcorreção documental final:**
[ ] CONTRIBUTION_CUTOFF_HALF_LIVES definido como 44 — ✔ §4/§6/§18.15
[ ] nenhuma referência normativa residual a cutoff 40 — ✔ varredura concluída (grep)
[ ] cutoff degenerado ka≈ke fica abaixo de CUTOFF_TOLERANCE — ✔ 6,587×10⁻¹³ < 10⁻¹² [CALC]
[ ] property tests cobrem ka>ke — ✔ §13
[ ] property tests cobrem ka<ke — ✔ §13
[ ] property tests cobrem ka≈ke — ✔ §13 (caso degênero explícito, Tmax=1/k)
[ ] property tests cobrem Tmax instantâneo — ✔ §13
[ ] effectiveTmaxMs continua explícito — ✔ §4/§6
[ ] todas as cores legadas estão dentro da especificação — ✔ tabela da §9
[ ] nenhum hex necessário depende da auditoria antiga — ✔ §9 (tabela validada contra o código)
[ ] LANDERGOLD e componentes possuem cores explícitas — ✔ §9 (#27ae60 / #1abc9c / #2ecc71 / #27ae60)
[ ] PALETTE_ALLOWED permanece definida de forma inequívoca — ✔ §5/§9
[ ] histórico do Comparador possui política visual explícita — ✔ `ChartViewSnapshot` §6/§7/§10
[ ] VISUALIZAR não depende de engine antigo — ✔ §10/§13/§14
[ ] especificação continua sendo única fonte normativa — ✔ cabeçalho/§18.1

**Consolidação anterior:**
[ ] v4 corrigida é a única fonte normativa — ✔ cabeçalho/§18.1
[ ] v2/v3 (e v4 anterior) são somente histórico — ✔ cabeçalho/§18.1
[ ] nenhum requisito depende implicitamente de versão removida — ✔ varredura concluída (mensagens pt-BR, formatos, limiares de interação e campos legados foram trazidos para cá)
[ ] GAP `later` está descrito corretamente — ✔ deslocamento pela duração do gap (02:30→03:30)
[ ] OVERLAP `earlier` está descrito corretamente — ✔ primeira ocorrência
[ ] protocol-analysis salva DisplayWindow — ✔ ProtocolAnalysisSnapshot
[ ] protocol-analysis salva displayPoints suficientes — ✔ por série
[ ] VISUALIZAR histórico não executa engine — ✔ §10/§13
[ ] FullBackup preserva visualização histórica — ✔ autossuficiente
[ ] user_defined existe na procedência — ✔ ProfileOrigin
[ ] combinações de provenance/review são coerentes — ✔ union discriminada + rejeição
[ ] tmaxMs=null tem regra explícita no cutoff — ✔ effectiveTmaxMs ?? 0 + teste
[ ] cutoff é validado para ka>ke — ✔ property test
[ ] cutoff é validado para ka<ke — ✔ property test
[ ] cutoff é validado para ka≈ke — ✔ property test (fator temporal)
[ ] Scenario usa source discriminada — ✔ ScenarioSource
[ ] cenários custom não dependem da Biblioteca — ✔ selectedPkParameters sempre presente
[ ] cenários de Biblioteca preservam snapshot — ✔ library exige pkParametersSnapshot
[ ] checklist não afirma falsamente que nenhum commit ocorreu — ✔ reformulado abaixo
[ ] nenhum código da FARMakit foi criado — ✔
[ ] nenhum commit de implementação foi realizado — ✔ somente documentação de planejamento foi modificada/commitada historicamente
[ ] budgets absolutos de performance são inicialmente benchmark targets — ✔ §13/E13/§18.20 — Performance
[ ] manifest possui uma única fonte — ✔ gerado pelo build
[ ] app.config.ts controla base/scope/start_url — ✔ §5/§12
[ ] README futuro aponta somente para a spec vigente — ✔ §14/§18.23 — README/E10B
[ ] pendência de deploy não bloqueia desenvolvimento — ✔ STATUS/§18.24
[ ] nenhuma contradição conhecida permanece — ✔ varredura final executada

---

**STATUS: ESPECIFICAÇÃO PRONTA PARA IMPLEMENTAÇÃO.**
**PENDÊNCIA NÃO BLOQUEADORA DE DEPLOY:** confirmar nome público, permanência do slug/repositório `farmacologico` e configuração do GitHub Pages antes da publicação.

**ESPECIFICAÇÃO PRONTA PARA IMPLEMENTAÇÃO GREENFIELD.**

A implementação será solicitada em tarefa separada em modo Code.
