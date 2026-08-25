# FARMakit — ESPECIFICAÇÃO FINAL PARA IMPLEMENTAÇÃO
### Consolidação definitiva (micro-errata sobre a v4) | Substitui integralmente todas as versões anteriores

**STATUS: ESPECIFICAÇÃO PRONTA PARA IMPLEMENTAÇÃO.**

**PENDÊNCIA NÃO BLOQUEADORA DE DEPLOY:** confirmar nome público, permanência do slug/repositório `farmacologico` e configuração do GitHub Pages antes da publicação. Essa pendência NÃO bloqueia scaffold, domínio, testes, UI, persistência nem migrações — bloqueia apenas a configuração/publicação final.

**Regra normativa:** este documento, após esta micro-errata, **substitui integralmente** todas as versões anteriores (v1–v4) e é a **ÚNICA fonte normativa** para implementação da FARMakit. Versões anteriores podem existir no histórico Git exclusivamente como registro de auditoria; NÃO são fontes normativas e NÃO devem ser consultadas pelo agente implementador para preencher lacunas.

**Contexto de workspace:** projeto **GREENFIELD** no repositório existente `Masselorc/farmacologico` (branch `main`), contendo este documento e um README placeholder. **Não existe código FARMakit.** As aplicações `Masselorc/tabela-farmacos`, `Masselorc/meiavida` e `Masselorc/calculadora-peptideos` são **referências externas** (comportamento, matemática, UX, formatos legados de migração) — nunca base de código local. Termos como "portar/preservar/paridade/migrar" significam *reproduzir futuramente comportamento/regra/UX/formato numa implementação limpa*. O futuro README referenciará somente esta especificação.

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
| 6 | Justificativa do cutoff 40 T½ | Deixa de citar 0,5⁴⁰ isoladamente; validade garantida por property tests (ka>ke, ka<ke, ka≈ke) contra `CUTOFF_TOLERANCE` |
| 7 | Source discriminada no Scenario | Fim de campos opcionais independentes; library exige refs+snapshot; custom é autossuficiente |
| 8 | Checklist factual | Passa a dizer que apenas documentação foi modificada/commitada; nunca “nenhum commit ocorreu” |
| 9 | Performance | Metas absolutas viram BENCHMARK TARGETS calibrados em E13; CI usa regressão relativa/budgets estruturais até lá |
| 10 | Manifest PWA | Fonte ÚNICA gerada pelo build (`VitePWA({manifest})` ← `app.config.ts`); sem `public/manifest.webmanifest` manual |
| 11 | README futuro | Referencia somente a especificação vigente (versões antigas = histórico) |
| 12 | Declaração de status | “PRONTA PARA IMPLEMENTAÇÃO”; pendência restrita a deploy |

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
- **Comparador:** cenários (cap 20), múltiplas doses, análise ao vivo (relógio 1 s), métricas + `phaseHint`, marcos, Detalhes do modelo, warning flip-flop, gráfico com eixo-X rotulado, modos absoluto/normalizado, log c/ política de zeros; **“Salvar análise no histórico”**.
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

**Tolerâncias oficiais** (`domain/shared/tolerances.ts`): `RATES_RTOL=1e-10`, `AMOUNT_RTOL=1e-9`, `CONSERVATION_RTOL=1e-9`, `TMAX_RECOMPOSITION_RTOL=1e-9`, `PEAK_TIME_ABS_TOL=60_000 ms`, `MILESTONE_TIME_ABS_TOL=60_000 ms`, **`CUTOFF_TOLERANCE=1e-12`** (relativo à dose de cada administração). Determinismo intra-plataforma; entre engines JS, conformidade pelas tolerâncias. Proibido “exato/bit a bit/diff 0” em ponto flutuante.

**Não-finito:** underflow esperado (ex.: `e^(−Δ)` grande) resulta legitimamente em 0; não-finito **inesperado** ⇒ erro `NUMERIC_FAILURE` (ou warning `EXTREME_PARAMETERS` quando parametrizado) — nunca zero silencioso.

## Farmacocinética
- Conversões: `min=60 000 ms`; `h=3 600 000 ms`; `d=86 400 000 ms`; `mcg=0,001 mg`; `g=1000 mg`.
- Civil→instante: **Temporal API** (polyfill bundled na V1). Proibido converter civil com `new Date(string)` ou offset manual.
- **Política DST única (dois casos nomeados):**
  - **GAP** (horário civil inexistente pela transição): `disambiguation:'later'` — o horário é **deslocado para frente pela duração do gap**. Exemplo: gap de 1 hora ⇒ `02:30` inexistente → `03:30`.
  - **OVERLAP** (horário civil corresponde a dois instantes): `disambiguation:'earlier'` — seleciona a **primeira ocorrência**.
  - Mesma política em criação de protocolos, Recurrence Engine, drag/move, migração e testes, com fixtures explícitas (seção 13). As duas regras são distintas por definição; proibido tratá-las como sinônimos.
- Eliminação: `ke=ln2/T½` (erro se ≤0/não finito).
- Absorção: `g(y)=y/expm1(y)=ke·Tmax`, decrescente ℝ→(0,∞), solução única ∀Tmax>0; Taylor `1−y/2+y²/12` p/ `|y|<1e-8`; bisseção 180 iter.; bracket meiavida; `ka=ke·e^ŷ`. Ramos: `Tmax=0⇒ka=null` (instantânea); `<T½/ln2⇒ka>ke`; `≈⇒degênero`; `>⇒ka<ke` (flip-flop, warning). Âncoras rtol 1e-4: 6 d/2 d ⇒ ka=1,34159 dia⁻¹; ka=0,36 dia⁻¹ ⇒ Tmax≈4,649224 d. Identidade testada PELA EQUAÇÃO (§13).
- Central por dose (Δt≥0): instantânea `dose·e^(−ke·Δt)`; degênero (`|ka−ke|≤max(ka,ke)·1e-8`) `dose·ka·Δt·e^(−ke·Δt)`; Bateman geral; clamp `[0,dose]` só sobre valores finitos.
- Depósito `dose·e^(−ka·Δt)` (ka≠null); eliminado `max(0, adm−central−depósito)`; superposição linear; conservação ≤ CONSERVATION_RTOL.
- **Cutoff/lookback — política ÚNICA:**
  ```
  effectiveTmaxMs = selected.tmaxMs ?? 0          // null (instantânea) ⇒ 0, SEM coerção implícita
  cutoffAgeFor(selected) = max(40·T½term + effectiveTmaxMs,
                               effectiveTmaxMs + 86_400_000)
  requiredPkLookback(params[]) = maxᵢ cutoffAgeFor(paramsᵢ)   // mesma função
  ```
  **Justificativa (substitui a argumentação anterior por 0,5⁴⁰):** 40 meias-vidas terminais é um **cutoff numérico conservador inicial**. Sua adequação é garantida por **testes de propriedade no domínio suportado**, cobrindo ka>ke, ka<ke e ka≈ke (caso degênero possui fator temporal multiplicativo `k·t·e^(−kt)` e não é coberto por exponencial simples), verificando que a contribuição descartada permaneça abaixo de `CUTOFF_TOLERANCE`. O número 40 mantém-se apenas enquanto os testes confirmarem a condição; caso contrário, eleva-se a constante. Propriedade de aceite: ∀parâmetros suportados, `contributionBeyondCutoff < CUTOFF_TOLERANCE × dose`.
- **Janelas:** `DisplayWindow` (visível) e `CalculationWindow{start=displayStart−requiredPkLookback(...), end=displayEnd}`. Fluxo: DisplayWindow → lookback (blends = máximo entre componentes) → CalculationWindow → `generateOccurrences(schedule, calcStart, calcEnd)` → SimulationInput[] → PK Engine → recorte/apresentação na DisplayWindow.
- Análise: taxa terminal `min(ke,ka)`; horizonte `lastDose+max(10,5·T½term, 2·Tmax, 2·T½)`; amostragem de análise default 1600 intervalos + pontos em cada dose e `dose+tmax`; pico (varredura+ternária 80); marcos `[50,25,12.5,10,5,1,0.1]%` (varredura reversa+bisseção 80; null⇒warning). Invariantes dos marcos: `targetMg≤peak.amountMg`; `timeMs ≥ peak.timeMs − MILESTONE_TIME_ABS_TOL`; tempos não decrescentes com % decrescentes; `targetMg=peak·pct/100` rtol 1e-12.
- Ciência × pixels: resultados derivam de `analysisCurve`/pontos críticos; `sampleForDisplay(analysisCurve, constraints)→DisplayPoint[]` é **geometria pura** (roda sobre snapshots sem executar PK Engine) e apenas reamostra.

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
interface DatasetMetadata{ datasetVersion:number; updatedAt:InstantIso; substanceCount:number;
  changelog?:Array<{version:number;date:InstantIso;summary:string}> }
// datasetVersion muda SOMENTE com conteúdo científico.
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
}
interface Range{min:number; max:number}

interface SingleSubstance{ kind:'single'; id:string; slug:string; name:string; aliases:string[];
  category:SubstanceCategory; tags:string[]; profiles:PharmacokineticProfile[];
  componentOnly?:boolean /* true ⇒ interna; fora do seletor */ }
interface BlendComponent{ substanceId:string; profileId:string;   // DEVEM resolver no dataset
  proportion:number; displayColor?:DisplayColor }
interface BlendSubstance{ kind:'blend'; id:string; slug:string; name:string; aliases:string[];
  tags:string[]; components:BlendComponent[];
  origin:ProfileOrigin /* próprio do blend, não herdado */ }
type Substance=SingleSubstance|BlendSubstance;

interface CustomProfile{ id:string; substanceId:string;
  profile:PharmacokineticProfile & { origin:{kind:'user_defined'; reviewStatus:'not_applicable'} } }
interface CustomSubstance extends SingleSubstance {} // todos os perfis obrigatoriamente user_defined (refine zod)
interface ReconstitutionRecipe{ id:string; name:string; input:ReconstitutionInput;
  createdAt:InstantIso; updatedAt:InstantIso }

// ── Parâmetros selecionados / snapshots ─────────────────────
interface SelectedPkParameters{ halfLifeMs:number; tmaxMs:number|null;   // null=instantânea
  selectionNote?:{ range:{halfLife?:DurationRange; tmaxRange?:DurationRange}; chosenBy:'user' } }
interface PkParametersSnapshot{ halfLife:DurationValue; tmax:DurationValue|null;
  selectedFromRange?:{ halfLife?:DurationRange; tmax?:DurationRange } }

// ── Comparador (source discriminada) ────────────────────────
interface Dose{ id:string; amountMg:number|null; time:InstantIso }
type ScenarioSource =
  | { type:'library'; substanceId:string; profileId:string; datasetVersion:number;
      pkParametersSnapshot:PkParametersSnapshot }
  | { type:'custom'; pkParametersSnapshot?:PkParametersSnapshot };
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
    | {type:'custom'};
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
  contributionCutoffHalfLives:40; contributionCutoffAgeMs:number }
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
 |'NUMERIC_FAILURE';

// ── Histórico reproducível (snapshot-first; tipado) ──────────
interface RecordDisplayMeta{ title:string; color:PaletteColorId; note?:string }
interface CalculationRecordBase{ id:string; createdAt:InstantIso;
  substanceProfileIds:string[]; display:RecordDisplayMeta }
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
      input:SimulationInput;
      resultSnapshot:Pick<SimulationOutput,'currentState'|'analysisCurve'|'peak'|'milestones'|'warnings'|'metadata'> }
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

// ── Persistência (estado do USUÁRIO; sem dataset oficial; sem consentimento restaurável) ──
interface AppSettings{ theme:'system'|'light'|'dark'; calendarTimeZone:TimeZoneId;
  graduationWarnThreshold?:number }
interface Favorites{ substanceIds:string[]; recipeIds:string[] }
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
  SYRINGE_GRADUATION_UNITS_MAX:100 } as const;   // graduationUnits: finite>0 (decimais ok) — AJUSTÁVEIS pós-benchmark
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

**Cola (`domain/simulation`):** `assembleScenarioInputs(scenario, nowMs)`; `assembleProtocolInputs(protocol, occurrences): SimulationInput[]` (UM POR COMPONENTE; deriva dose por proporção; proibidas médias); `derivePhaseHint(...)` heurística; orquestração de análise de protocolos monta `ProtocolAnalysisSnapshot` (usa `sampleForDisplay`) e registra `ProtocolAnalysisVersions`.

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

Tabela legada normalizada (dias; ver v-repositório de auditoria para cores hex legais que compõem `LEGACY_COLORS`):

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

*(Nota: a lista completa dos 16 hexes legados está definida no dataset `legacy.dataset.ts` a ser criado na implementação, copiada literalmente do `commonDrugs` auditado — valores registrados na auditoria original; nenhuma cor nova é inventada aqui.)*

---

# 10. UX e navegação

Abas fixas; transições pré-preenchem parâmetros/datas, nunca doses; faixas exigem seleção explícita.

**Histórico — três ações (todos os módulos):**
- **VISUALIZAR:** renderiza do snapshot preservado — comparador usa `resultSnapshot.analysisCurve` + `sampleForDisplay` (geometria pura); protocol-analysis usa `snapshot.series[].displayPoints` — **em ambos os casos NÃO executa PK Engine, não depende do dataset atual nem de engine antigo**.
- **REABRIR:** carrega `input`s/snapshots para inspeção/edição (rascunho; não cria registro).
- **RECALCULAR:** engine atual ⇒ NOVO registro; original intacto. Divergência: “Este resultado foi calculado com pk@X. Recalcular utilizará pk@Y e criará um novo registro.”
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
- `meiavida:v2:data`: cenários → Scenario (source custom/library conforme dado); datetime-local convertido usando a **timezone assumida**.
- `meiavida:v2:persistence-enabled`: apenas sugestão na tela de migração.
- Política: copiar, nunca apagar originais; `fk:v1:migrated-from=<origem>`; remoção manual posterior. localStorage é por ORIGEM (não path): sob `masselorc.github.io` as chaves são lidas diretamente.

---

# 12. Estrutura final de pastas (ESPECIFICAÇÃO)

```
farmacologico/
├─ package.json
├─ app.config.ts                  # FONTE ÚNICA {basePath, productName} → vite/PWA/runtime
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

---

# 13. Estratégia de testes

Convenção: tolerâncias da seção 4; proibido igualdade bit-a-bit/exato/diff-0 em floating point; migração estrutural usa igualdade exata onde cabível.

## Unitários (Vitest)
- **Solver pela equação:** recomposição com TMAX_RECOMPOSITION_RTOL ∀(T½,Tmax) válidos; **oráculo estável perto de ka≈ke avaliado em espaço-y (`y/expm1(y)`+Taylor), nunca ln(ka/ke)/(ka−ke) cru**; âncoras rtol 1e-4 (6d/2d⇒1,34159; ka=0,36 dia⁻¹⇒4,649224 d); paridade meiavida 24 h/4 h.
- Ramos: Tmax=0; degênero; flip-flop+warning; extremos: NaN/∞ inesperado ⇒ NUMERIC_FAILURE; underflow documentado ⇒ 0.
- Bateman/estado: 50%@1T½; pico@Tmax; conservação; clamp; percentuais zerados; futuras fora do estado.
- **Lookback/cutoff:** `requiredPkLookback ≡ max cutoffAgeFor`; `effectiveTmaxMs = tmaxMs ?? 0` (**Tmax instantâneo ⇒ 0 ⇒ cutoff calculado corretamente**); janela de cálculo com T½ longa; **dose anterior à DisplayWindow altera o primeiro ponto exibido**; blend ⇒ máximo entre componentes.
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
Monotonicidades da reconstituição; superposição comutativa; identidade do solver ampla (incl. vizinhança degênero, oráculo y-space); **cutoff: contribuição além do corte < CUTOFF_TOLERANCE nas três regiões cinéticas**; marcos ordenados; contagem de ocorrências ∝ janela de cálculo.

## Integração
Formulário⇄zod⇄analyze; Registrar-dose; consent on/off (desligar=export opcional+confirmação+apagar, sem quarentena); export Config vs FullBackup; import sem consentimento restaurado; caps; IDB failure simulado; quarentena >5 poda notificando; SW prompt-banner; **história: snapshot antigo intacto; VISUALIZAR produz o mesmo gráfico SEM executar PK Engine (mesmo com engine removido/substituído); RECALCULAR cria novo registro**; FullBackup renderiza histórico sem dataset atual; migração: assumedTimeZone + colorRemaps registrados; blend refs íntegras; totalDose≤0 ⇒ quarentena/report.

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

- **Biblioteca:** 19 entidades internas/16 visíveis; badges por origem honestos (inclui “criado por você”); faixas exigem seleção; CTAs não preenchem doses.
- **Meia-vida:** 6d/2d aceito (ka≈1,3416/d rtol 1e-3); flip-flop avisado; eixo-X datado; marcos paridade dentro de MILESTONE_TIME_ABS_TOL; log c/ clipping informado.
- **Reconstituição:** âncora 250 mcg exata nas tolerâncias; 3000 mcg ⇒ 120/240 U c/ mensagem neutra; 6000 mcg ⇒ bloqueio; bordas de graduação 9/10 U; salvar-no-histórico explícito.
- **Protocolos:** golden de datas; blend canônico 3 componentes; mover/rotacionar; Desfazer; chips c/ lookback e filtro <0,01 mg; geração ∝ CalculationWindow (instrumentação); fusos distintos no dia correto.
- **Histórico:** Ver produz o mesmo gráfico **sem executar engine** (teste com engine removido/stubado); Reabrir traz inputs; Recalcular cria novo registro com aviso de versão; versões corretas por motor; recon só por botão.
- **Persistência:** zero escrita de dados do usuário sem consentimento; corrupção⇒quarentena≤5; desligar sem quarentena oculta; FullBackup visualiza histórico sem dataset; import não liga persistência.
- **Migração:** fixtures verdes; assumedTimeZone+colorRemaps no relatório; nenhum protocolo perdido por cor; idempotente; originais intactos.
- **PWA/manifest:** artefato buildado contém base/scope/start_url derivados de app.config.ts; **nenhum segundo manifest**; instalável/offline; atualização via banner.
- **Mobile/acessibilidade:** Agenda/Semana/Mês <768 px sem scroll lateral; alvos ≥44 px; axe CI zero serious/critical + NVDA arquivado.
- **Segurança/CSP:** spike E1 aprovado (zero violações); paleta fechada; zero requisições externas runtime.
- **Build/config:** app.config.ts único alimenta Vite+manifest/SW+runtime (assert de artefatos).
- **Performance:** benchmarks calibrados em E13 com ambiente registrado; CI usa regressão relativa até lá; propriedades estruturais (janela, sampling) sempre ativas.
- **Release V1:** E10A + endurecimento + critérios obrigatórios + **README real substituindo o placeholder**, contendo visão geral, aviso educacional, arquitetura resumida, módulos, setup/comandos, testes, build/deploy, PWA, privacidade, persistência opt-in, estrutura do domínio, engineVersion/datasetVersion, política de dados científicos, migração das apps legadas, limitações científicas, status das ferramentas antigas e URL pública — **referenciando somente esta especificação como fonte arquitetural**.

---

# 15. Plano de implementação futura (APENAS DESCREVER — NÃO EXECUTAR)

| Etapa | Objetivo | Notas |
|---|---|---|
| E0 Confirmações de deploy | slug/nome/Pages | Não bloqueia desenvolvimento |
| E1 Scaffold + gate CSP×Chart.js | app.config.ts único; CSP meta; PWA(prompt, manifest gerado); tokens/paleta; spike obrigatório | Zero violações |
| E2 Unidades/tempo/decimal | ms/mg; Temporal+DST(GAP/OVERLAP c/ fixtures); parseLocaleDecimal | Polyfill bundled |
| E3 Motores | pk(+cutoff c/ effectiveTmaxMs), recurrence(janela), reconstitution, simulation(windows+assemble N-inputs+historyView) | NUMERIC_FAILURE |
| E4 Gate de testes matemáticos | equação-solver; lookback=cutoff; blend 3 inputs; marcos; cutoff property 3 regiões; bordas seringa | Antes de qualquer UI |
| E5 LIMITS+zod+i18n | LIMITS→zod/HTML; códigos+pt-BR; .test-d.ts (union de exports, provenance) | Contratos compiláveis |
| E6 Persistência/exports | consent; idb+fallback; quarentena≤5; Config/FullBackup (snapshots de exibição) | Snapshot-first |
| E7 Migrações | hormo(irmãos→canônico; dose derivada; cores; fuso assumido) + meiavida; fixtures | Relatórios completos |
| E8 Reconstituição | tela completa; âncoras 120/240 U; DOSE_EXCEEDS_VIAL_CONTENT; salvar explícito | Mensagens neutras |
| E9 Comparador | forms/análise/dashboard/CompareChart; salvar análise | phaseHint heurística |
| E10 Biblioteca | dataset v1 (componentOnly; origins); fichas/faixas/CTAs | — |
| E11 Protocolos | entidade canônica; calendário multi-fuso; chips lookback; drag/teclado; KineticChart; Desfazer | CalculationWindow |
| E12 E10A Histórico+integrações | Ver/Reabrir/Recalcular; CTAs; export/import; versionamentos | Bloqueia release |
| E13 Endurecimento + **benchmark** | a11y real; **calibrar benchmarks (ambiente registrado) e congelar budgets**; PWA polish | Hard gates só pós-calibração |
| E14 Release docs | **README real** (referencia somente esta spec) + changelog + URL pública | Após E0/E13 |
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

1. **Esta especificação é a ÚNICA fonte normativa; v2/v3/v4 anteriores são apenas histórico de auditoria** e não devem ser consultadas para preencher requisitos.
2. Greenfield em `Masselorc/farmacologico`; apps antigas = referências externas/fontes de formato; stack React+TS+Vite; GitHub Pages V1; sem backend.
3. Persistência de dados do usuário opt-in; “zero persistência” = dados do usuário; caches técnicos à parte; desativar não cria quarentena.
4. Um PK Engine; Recurrence Engine independente (por janela); Reconstitution Engine independente; `simulation.assemble` como ponte.
5. DisplayWindow ≠ CalculationWindow; lookback = mesma política do cutoff (`cutoffAgeFor`), única no PK Engine; **`effectiveTmaxMs = tmaxMs ?? 0` explícito**.
6. Protocolo = entidade única; `ProtocolComponent` autocontido; sem componentIndex/substanceRef/blendRef/snapshot no nível do protocolo; custom autossuficiente; dose do componente derivada.
7. Blend ⇒ uma SimulationInput por componente (médias proibidas).
8. Camadas ScientificProfile → SelectedPkParameters → SimulationInput; PK nunca consome perfil/dataset; `TmaxSpecification` union; DurationRange normaliza unidades.
9. `SimulationOutput.metadata` registra somente `pkEngineVersion`; orquestração registra pk+recurrence.
10. Histórico snapshot-first: VISUALIZAR não executa engine (protocol-analysis preserva DisplayWindow+displayPoints); RECALCULAR usa engine atual e cria novo registro; engines antigos executáveis fora da V1; gravação por ação explícita nos três módulos; registros imutáveis tipados; FullBackup autossuficiente.
11. Export = discriminated union; consentimento nunca restaurado.
12. Dataset oficial bundled; `componentOnly` (19 entidades/16 visíveis); blend com origin própria; **`ProfileOrigin` discriminada incluindo `user_defined`**; vias unknown; nenhuma fonte inventada; nenhuma dose sugerida; linguagem educacional.
13. Tempo: tipos distintos; Temporal (polyfill V1); **GAP='later' (desloca pela duração do gap)**, **OVERLAP='earlier' (primeira ocorrência)**; `calendarTimeZone`; chips 20:00 = calendarTimeZone+lookback; drag Δ civil medido na exibição.
14. Migração não destrutiva; fuso ausente perguntado (`migrationAssumedTimeZone`); cores fora da paleta preservam `legacyOriginalHex`+remapeamento determinístico; totalDose≤0 ⇒ inválido.
15. Arredondamento só na apresentação; tolerâncias oficiais incl. `CUTOFF_TOLERANCE=1e-12`; **cutoff 40 T½ validado por property tests (3 regiões), não justificado apenas por 0,5⁴⁰**; oráculo y-space; NaN/∞ inesperado ⇒ NUMERIC_FAILURE.
16. LIMITS categorizados alimentando Zod e HTML; SAFETY/UX defaults ajustáveis pós-benchmark; caps próprios da Reconstituição.
17. BASE_PATH via `app.config.ts` único (vite+PWA+runtime); **manifest PWA gerado pelo build (fonte única; sem arquivo manual)**; spike CSP×Chart.js gate E1; CSP meta efetiva; paleta fechada.
18. **Performance absoluta = BENCHMARK TARGETS calibrados em E13 antes de virarem hard gates**; até lá CI usa regressão relativa/budgets estruturais; propriedades estruturais sempre obrigatórias.
19. Mobile-first; viewports fixos; WCAG 2.2 AA com verificação real; testes matemáticos antes de UI; E10B não bloqueia release; **README real referencia somente a especificação vigente**.
20. Pendências de nome/slug/Pages NÃO bloqueiam desenvolvimento — apenas deploy/publicação.
21. Renomear produto é cosmético; renomear conceitos de domínio exige atualização desta spec.

---

# 19. Pendências e itens não confirmados

**Pendência não bloqueadora (deploy):** confirmar nome público, permanência do slug `farmacologico` e habilitar/configurar GitHub Pages antes da publicação.

**Pesquisa não confirmada (herdada; não bloqueia):** trechos literais irrecuperáveis do monólito HormoTracker (updateDashboard; texto/callback de “Desfazer”; enterMoveMode/commitMoveMode; options/resumo dos gráficos individuais; texto pós-remoção; forma do registro pointercancel); fontes bibliográficas dos presets legados inexistentes; existência de dados reais nos storages legados indeterminável; comportamento legado em navegadores muito antigos não exercitado; motivo da divergência 0,23 vs 5,5/24 (propionato) desconhecido (ambos preservados); vias legadas não codificadas (modelo adota `'unknown'`).

---

# 20. Checklist final

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
[ ] budgets absolutos de performance são inicialmente benchmark targets — ✔ §13/E13/§18.18
[ ] manifest possui uma única fonte — ✔ gerado pelo build
[ ] app.config.ts controla base/scope/start_url — ✔ §5/§12
[ ] README futuro aponta somente para a spec vigente — ✔ §14/§18.19
[ ] pendência de deploy não bloqueia desenvolvimento — ✔ STATUS/§18.20
[ ] nenhuma contradição conhecida permanece — ✔ varredura final executada

---

**STATUS: ESPECIFICAÇÃO PRONTA PARA IMPLEMENTAÇÃO.**
**PENDÊNCIA NÃO BLOQUEADORA DE DEPLOY:** confirmar nome público, permanência do slug/repositório `farmacologico` e configuração do GitHub Pages antes da publicação.

**ESPECIFICAÇÃO PRONTA PARA IMPLEMENTAÇÃO GREENFIELD.**

A implementação será solicitada em tarefa separada em modo Code.
