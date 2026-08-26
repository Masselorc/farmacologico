# FARMakit — ESPECIFICAÇÃO FINAL PARA IMPLEMENTAÇÃO
### Consolidação definitiva após revisão geral red-team | Substitui integralmente todas as versões anteriores

**STATUS: ESPECIFICAÇÃO PRONTA PARA IMPLEMENTAÇÃO GREENFIELD.**

**PENDÊNCIA NÃO BLOQUEADORA DE DEPLOY:** confirmar nome público, permanência do slug/repositório `farmacologico` e configuração do GitHub Pages antes da publicação. Essa pendência NÃO bloqueia scaffold, domínio, testes, UI, persistência nem migrações — bloqueia apenas a configuração/publicação final.

**Regra normativa:** este documento, após esta revisão geral, **substitui integralmente** todas as versões anteriores (v1–v4) e é a **ÚNICA fonte normativa** para implementação da FARMakit. Versões anteriores podem existir no histórico Git exclusivamente como registro de auditoria; NÃO são fontes normativas e NÃO devem ser consultadas pelo agente implementador para preencher lacunas.

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
| A1 | Cutoff farmacocinético | `CONTRIBUTION_CUTOFF_HALF_LIVES = 44` — 40 violava `CUTOFF_TOLERANCE` no caso degenerado ka≈ke |
| A2 | Cores legadas autossuficientes | Tabela completa de hexes embutida na §9 (validada contra o `commonDrugs` real); `LEGACY_COLORS` implementável somente com este documento |
| A3 | Snapshot visual do Comparador | `ChartViewSnapshot` no registro `pharmacokinetics`; política visual uniforme entre módulos |
| A4 | Testes/checklist | Casos cutoff/cores/histórico visual adicionados (§13/§14/§20) |

Nota: as tabelas históricas acima são informativas; os requisitos normativos residem exclusivamente nas seções 2–20 desta versão.

## Revisão geral red-team — correções consolidadas nesta versão

| # | Contrato corrigido | Decisão vigente |
|---|---|---|
| R1 | Comparadores numéricos | `amountClose` para erro numérico normal; `cutoffClose` para simulação truncada × referência estendida |
| R2 | Cutoff de 44 T½ | Garantia usa `contribution=central+depot`; máximo global no limite `ka=ke` é ≈`6,795927×10⁻¹³` da dose |
| R3 | Bateman perto de `ka=ke` | Forma estável com `expm1` em todo o domínio; limiar de warning não escolhe algoritmo físico |
| R4 | Histórico de Protocolos | Associação por chave composta `(protocolId, componentId)`, nunca por índice |
| R5 | Blend no Comparador | `Scenario` representa uma única parametrização; Blend não é Scenario simples na V1 |
| R6 | Persistência/export/import | Budgets por bytes UTF-8 medidos, limite dual do histórico e round-trip same-version obrigatório |
| R7 | Recorrência semanal | `IsoWeekday` ISO 1=segunda…7=domingo; legado JS 0=domingo mapeado explicitamente para 7 |
| R8 | Segurança documental | CSP e Referrer Policy em metas separadas |
| R9 | Rastreabilidade histórica | Um único contrato derivado `HistoricalProfileRef`, nunca persistido |
| R10 | Checklist | `[x]` significa contrato documentado/verificado; execução futura permanece separada e desmarcada |

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
- Shell/hash routes (Biblioteca · Meia-vida · Reconstituir · Protocolos · Histórico · Ajustes); CSP meta efetiva + meta referrer separada; paleta fechada; PWA prompt-update; **gate E1 spike CSP×Chart.js/referrer**.
- **Biblioteca:** busca/fichas/perfis (`route:'unknown'` no legado), faixas com seleção obrigatória, badges por origem; SingleSubstance oferece CTAs para Comparador/Protocolos sem preencher doses; Blend oferece Protocolo, mas não Scenario simples no Comparador (§9).
- **Comparador:** cenários (cap 20), múltiplas doses, análise ao vivo (relógio 1 s), métricas + `phaseHint`, marcos, Detalhes do modelo, warning flip-flop, gráfico com eixo-X rotulado, modos absoluto/normalizado, log c/ política de zeros; **“Salvar análise no histórico”** captura também o `ChartViewSnapshot` (janela/modos/pontos por cenário).
- **Modo log (apresentação):** política relativa por série da §4 (`LOG_REL_EPSILON=1e-12`; pisos `absoluteLogFloorMg` e normalizado); valores no/baixo piso são clipados/omitidos com marcação `clippedBelowLogEpsilon`; tooltip/resumo informam o clipping; a série pode iniciar na primeira contribuição positiva; dados científicos persistidos permanecem intocados.
- **Reconstituição:** tela única automática; erros `DOSE_EXCEEDS_VIAL_CONTENT`/capacidade (mensagem neutra)/precisão por graduação; régua; copiar; **“Salvar no histórico”**.
- **Protocolos:** entidade canônica com componentes autocontidos; presets legados (19 entidades/16 visíveis); calendário multi-fuso desktop/mobile Agenda-Semana-Mês; drag+teclado+Desfazer; chips 20:00 com lookback (filtro <0,01 mg); gráficos combinado/individuais com guias; materialização por CalculationWindow; **“Salvar análise no histórico”**.
- **Histórico:** registros imutáveis tipados; ações VISUALIZAR (snapshot visual persistido)/REABRIR (estado lógico salvo — `scenarioSnapshot` no Comparador e `protocolsSnapshot` em Protocolos)/RECALCULAR (input científico persistido + engine atual ⇒ novo registro); Protocolos associa séries e inputs exclusivamente por `(protocolId, componentId)`.
- **Ajustes/Dados:** consentimento opt-in; desativar = export opcional→confirmação→apagar; ConfigExport/FullBackup; migração assistida (timezone assumido + remapeamento de cores nos relatórios); quarentenas ≤5; falha IndexedDB formal; banner de atualização.
- **E10A integrações obrigatórias:** histórico completo, reabrir, Biblioteca→Comparador, Biblioteca→Protocolos, export/import, versionamentos.

## Recomendado (E10B) — NÃO bloqueia a V1
Share URL comprimido; favoritos avançados; tabela comparativa consolidada; zoom/pan; PNG do gráfico; duplicar protocolo; filtros avançados.

## Pós-V1
Incerteza/intervalo a partir de faixas; steady-state/trough/flutuação analíticos; enriquecimento bibliográfico (DOI/PMID); múltiplos perfis; PDF; i18n en/es; sincronização opcional; U-40; modelagem explícita de F≠1.

---

# 4. Regras matemáticas definitivas

Convenção global: internamente **ms** e **mg**; IEEE-754 duplo; **arredondamento/formato somente na apresentação** (Intl pt-BR); persistência em precisão plena; conversões centralizadas. Formatos de apresentação: massa/dose pt-BR com até 3 casas; duração `X d Y h Z min` (ou `0 min`); datas curtas `dd/mm/aaaa hh:mm`; título de tooltip com data completa por extenso.

**Tolerâncias oficiais** (`domain/shared/tolerances.ts`): `RATES_RTOL=1e-10`, `AMOUNT_RTOL=1e-9`, **`AMOUNT_ATOL_MG=1e-12 mg`**, `CONSERVATION_RTOL=1e-9`, `TMAX_RECOMPOSITION_RTOL=1e-9`, `PEAK_TIME_ABS_TOL=60_000 ms`, `MILESTONE_TIME_ABS_TOL=60_000 ms`, **`CUTOFF_TOLERANCE=1e-12`** (relativo à dose de cada administração) e **`NEAR_DEGENERATE_RATES_REL=1e-8`** (somente detecção do warning). **Comparador numérico geral para quantidades sem truncamento deliberado:** `amountClose(a,b) ⟺ |a−b| ≤ AMOUNT_ATOL_MG + AMOUNT_RTOL·max(|a|,|b|)` — comportamento perto de zero definido via ATOL, sem divisão por zero. Conservação usa `conservationClose(a,b) ⟺ |a−b| ≤ AMOUNT_ATOL_MG + CONSERVATION_RTOL·max(|a|,|b|)`. **Constante de apresentação (não é tolerância farmacocinética):** `LOG_REL_EPSILON=1e-12` (política log da §4). Determinismo intra-plataforma; entre engines JS, conformidade pelas tolerâncias. Proibido “exato/bit a bit/diff 0” em ponto flutuante.
**Orçamento de truncamento farmacocinético:** para uma administração `i` no instante `t`, **`contribution_i(t) = central_i(t) + depot_i(t)`** (absorção instantânea ⇒ depot=0; sempre ≥0; **NÃO inclui eliminated** — eliminado não é contribuição presente). Bound individual: `contribution_i(t) < CUTOFF_TOLERANCE × dose_i` para administração descartável; bound agregado: `Σ_{i∈D} contribution_i(t) < CUTOFF_TOLERANCE × Σ_{i∈D} dose_i`. **`CUTOFF_TOLERANCE` é política de erro físico/truncamento — não é tolerância de ponto flutuante.**
**Comparador de equivalência com truncamento:** seja `DiscardedAdministrations` o conjunto determinístico de administrações presentes na referência estendida e deliberadamente omitidas da simulação padrão pela política de cutoff/lookback (mesmo cenário/componente; exclui doses futuras, rejeitadas por validação, de outro cenário e presentes em ambos). Definem-se `sumDiscardedDoseMg = Σ administration.amountMg` (i ∈ DiscardedAdministrations), **`cutoffErrorBudgetMg = CUTOFF_TOLERANCE × sumDiscardedDoseMg`** e **`cutoffClose(a,b,sumDiscardedDoseMg) ⟺ |a−b| ≤ AMOUNT_ATOL_MG + AMOUNT_RTOL·max(|a|,|b|) + cutoffErrorBudgetMg`**. O termo ATOL+RTOL é erro numérico normal; o termo final é o orçamento físico do truncamento — conceitos distintos, nunca misturados silenciosamente. **Invariante: `sumDiscardedDoseMg = 0 ⇒ cutoffClose ≡ amountClose`.**

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
- Absorção: para `Tmax>0`, resolver `g(y)=y/expm1(y)=c`, `c=ke·Tmax`; `g` é estritamente decrescente ℝ→(0,∞), logo há solução única. Avaliar `g` por Taylor `1−y/2+y²/12` quando `|y|<1e-8`. Bracket determinístico: `c=1⇒y=0`; `c<1⇒[lo,hi]=[0,1]` e duplicar `hi` até `g(hi)≤c`; `c>1⇒[lo,hi]=[-1,0]` e duplicar `|lo|` até `g(lo)≥c`; então bisseção por 180 iterações e `ka=ke·exp(ŷ)`. Ramos físicos: `Tmax=0⇒ka=null` (instantânea); `<T½/ln2⇒ka>ke`; igualdade ⇒ `ka=ke`; `>⇒ka<ke` (flip-flop, warning). Âncoras rtol 1e-4: 6 d/2 d ⇒ ka=1,34159 dia⁻¹; ka=0,36 dia⁻¹ ⇒ Tmax≈4,649224 d. Identidade testada PELA EQUAÇÃO (§13).
- **Central por dose (Δt≥0), forma Bateman estável:** instantânea `dose·exp(−ke·Δt)`. Para absorção finita, definir `gap=|ka−ke|`, `slow=min(ka,ke)`, `z=gap·Δt` e `phi(z)=−expm1(−z)/z`, com extensão contínua `phi(0)=1`; então `central=dose·ka·Δt·exp(−slow·Δt)·phi(z)`. Essa forma é equivalente à Bateman geral nos dois lados de `ka=ke`, não subtrai exponenciais próximas e não cria `exp(+z)` capaz de combinar overflow com underflow. Em `ka=ke=k`, reduz exatamente a `dose·k·Δt·exp(−k·Δt)`. **Não existe ramo aproximado escolhido por `1e-8`:** `NEAR_DEGENERATE_RATES_REL` apenas dispara `NEAR_DEGENERATE_RATES` quando `gap/max(ka,ke)≤1e-8`; o cálculo usa a mesma forma estável em toda absorção finita. Clamp `[0,dose]` somente após resultado finito.
- Depósito `dose·e^(−ka·Δt)` (ka≠null); eliminado `max(0, adm−central−depósito)`; superposição linear; conservação por `conservationClose(administeredMg,centralMg+depotMg+eliminatedMg)`.
- **Cutoff/lookback — política ÚNICA:**
  ```
  const CONTRIBUTION_CUTOFF_HALF_LIVES = 44;
  effectiveTmaxMs = selected.tmaxMs ?? 0          // null (instantânea) ⇒ 0, SEM coerção implícita
  cutoffAgeFor(selected) = max(44·T½term + effectiveTmaxMs,
                               effectiveTmaxMs + 86_400_000)
  requiredPkLookback(params[]) = maxᵢ cutoffAgeFor(paramsᵢ)   // mesma função
  ```
  **Justificativa matemática de 44 T½:** para absorção finita, seja `m=min(ka,ke)`, `q=max(ka,ke)/m≥1`, `L=44·ln2`, `a(q)=ln(q)/(q−1)` (extensão contínua `a(1)=1`) e `x=m·t=L+a(q)` na idade de corte `Tmax+44·T½term`. A fração total ainda presente é simétrica em `ka/ke`: `Pq=[q·exp(−x)−exp(−q·x)]/(q−1)`, com limite `P1=(x+1)·exp(−x)`. A análise adimensional da função e a varredura independente ampla do domínio mostram máximo global no limite `q=1`; `q→∞` tende a `2⁻⁴⁴`. No caso exatamente degenerado, `x=1+44·ln2=31,4984759446376`: `central/dose=x·exp(−x)=6,5868117237×10⁻¹³`, `depot/dose=exp(−x)=2,0911525165×10⁻¹⁴` e **`contribution/dose=(x+1)·exp(−x)=6,7959269753×10⁻¹³<10⁻¹²`** [CALC]. Na absorção instantânea, `depot=0` e `contribution/dose=2⁻⁴⁴=5,6843418861×10⁻¹⁴`. Como `d(contribution)/dt=−ke·central≤0`, o bound continua válido para toda idade posterior ao corte. O número ≈`6,587×10⁻¹³` refere-se **somente à central**, nunca à contribuição total. O valor anterior (40) violava a propriedade; **44 e `CUTOFF_TOLERANCE` permanecem normativos**.

  Propriedades obrigatórias (§13): em todo o domínio suportado (`ka>ke`, `ka<ke`, vizinhança e igualdade `ka=ke`, Tmax instantâneo), `contributionBeyondCutoff < CUTOFF_TOLERANCE × dose`; a busca deve variar amplamente `q=max(ka,ke)/min(ka,ke)`, com amostragem densa perto de 1 e limites extremos, sem assumir antecipadamente qual região maximiza o resíduo. **Garantia agregada:** para o conjunto D de administrações descartadas pelo cutoff, `Σ_{i∈D} contributionᵢ < CUTOFF_TOLERANCE × Σ_{i∈D} doseᵢ`. Adicionalmente, property tests de **equivalência prática** compararão a simulação padrão (cutoff/lookback normativo) contra uma **referência estendida** (janela muito além do cutoff ou todas as ocorrências do domínio limitado do teste) avaliando AMBOS os resultados nos MESMOS timestamps de **CommonComparisonWindow = DisplayWindow**. **CommonComparisonTimestamps** = conjunto determinístico dentro da DisplayWindow — ordenado, sem duplicatas e idêntico nos dois universos — incluindo no mínimo start/end, timestamps regulares, doses/ocorrências e `dose+tmax` dentro da janela e demais pontos críticos determinísticos. Cada timestamp é avaliado nos dois universos pela mesma função física; é proibido alinhar `analysisCurve[i]` por índice. Comparar `centralMg`, `depotMg` e `totalPresentMg=centralMg+depotMg` exclusivamente por `cutoffClose(actual,reference,sumDiscardedDoseMg)`, incluindo o primeiro ponto. O teste principal não depende de peak nem milestones; `peakWithinWindow` é complemento opcional apenas com mesma janela/algoritmo/refinamento, e milestones somente se recomputados no mesmo domínio. Nunca comparar entre universos com administrações distintas `administeredMg`, `administeredCount`, `eliminatedMg` ou `plannedCount`; conservação é verificada dentro de cada simulação por `conservationClose`.
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
- `IsoWeekday` segue ISO/`Temporal.PlainDate.dayOfWeek`: `1=segunda`, `2=terça`, `3=quarta`, `4=quinta`, `5=sexta`, `6=sábado`, `7=domingo`. Semanal exige pelo menos um valor, somente 1..7, sem duplicatas e persistido em ordem ascendente.
- Única: 1 ocorrência. Semanal: dias selecionados na janela pedida; término inclusivo `start+(weeks·7−1)`; `1≤weeks≤520`.
- `generateOccurrences(schedule, rangeStartMs, rangeEndMs)` ascendente; proibido materializar horizonte completo.
- Deslocamento Δ (dias civis medidos no calendarTimeZone, origem→destino do arrasto): `startDate+=Δ` (civil, fuso do protocolo); `localTime`/`timeZone` preservados; rotação semanal ISO `rotate(d)=1+mod((d−1)+Δ,7)` (módulo não negativo); nova data civil sujeita à política DST.
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

CI/CD: `npm ci`→lint→typecheck→type-tests(.test-d.ts)→unit/property→build→Playwright contra `vite preview` (zero violações CSP em console)→Pages somente após pipeline bem-sucedido no main.

**CSP e Referrer Policy são controles separados.** `index.html` contém a meta CSP `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">` e, separadamente, `<meta name="referrer" content="no-referrer">`. **`referrer-policy` não é diretiva CSP e é proibido dentro da string CSP.** Documentado: `frame-ancestors` é ineficaz via meta; GH Pages não oferece headers customizados — anti-framing por header NÃO implementado na V1. Proibições: eval/new Function/innerHTML com dado do usuário/CDN runtime.

Cores: `PALETTE_ALLOWED = PALETTE_MODERN ∪ LEGACY_COLORS` em tokens/classes `.tone-*`; picker restrito; `DisplayColor{paletteColor, legacyOriginalHex?}`; zero estilo inline dinâmico. Decimal: `parseLocaleDecimal` central.

---

# 6. Modelo de dados final (ESPECIFICAÇÃO)

```ts
// ── Primitivos ──────────────────────────────────────────────
type LocalDate=string; type LocalTime=string; type InstantIso=string; type TimeZoneId=string;
type TimeUnit='minutes'|'hours'|'days'; type MassUnit='mcg'|'mg'|'g';
type IsoWeekday=1|2|3|4|5|6|7; // ISO/Temporal: 1=segunda ... 7=domingo
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
  | { type:'official'; substanceId:string }   // DEVE resolver para SingleSubstance oficial, inclusive componentOnly
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
// Invariante library: (substanceId,profileId) resolve para SingleSubstance+
// PharmacokineticProfile. BlendSubstance não possui profile próprio e nunca é Scenario simples.

// ── Protocolos (entidade lógica ÚNICA; componentes autocontidos) ──
type Recurrence=
  | {type:'single'}
  | {type:'weekly'; weekdays:IsoWeekday[]; weeks:number};
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
// Invariantes: component.id é único dentro do Protocol; source.library resolve para
// SingleSubstance+PharmacokineticProfile; soma das proportions=1.
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
type DataManagementErrorCode=
  |'CONFIG_STORAGE_LIMIT_EXCEEDED'|'CALCULATION_RECORD_TOO_LARGE'
  |'EXPORT_SIZE_LIMIT_EXCEEDED'|'IMPORT_FILE_TOO_LARGE'|'IMPORT_KIND_MISMATCH';

// ── Histórico reproducível (snapshot-first; tipado) ──────────
interface RecordDisplayMeta{ title:string; color:PaletteColorId; note?:string }
type HistoricalProfileRef =
  | { type:'official'; substanceId:string; profileId:string; datasetVersion:number }
  | { type:'custom'; customProfileId:string };
/* TIPO DERIVADO (helper conceitual): computado de `scenarioSnapshot.source` ou de
   `protocolsSnapshot[].components[].source` quando necessário para exibição/filtros —
   NÃO é persistido em nenhum contrato nem adicionado ao export.
   library → ref official · custom_profile → ref custom · manual → ausência. */
interface ComparatorScenarioResultSnapshot{
  scenarioId:string;
  scenarioSnapshot:Scenario;             // Scenario lógico COMPLETO — fonte do REABRIR
  simulationInput:SimulationInput;       // entrada científica — fonte do RECALCULAR
  resultSnapshot:Pick<SimulationOutput,'currentState'|'analysisCurve'|'peak'|'milestones'|'warnings'|'metadata'>;
}
// Invariantes: scenarioSnapshot.id === scenarioId; cada item de scenarios[] possui
// exatamente um Scenario salvo + um SimulationInput + um resultado científico; cada
// displayPointsByScenario[].scenarioId casa com scenarioSnapshot.id (cardinalidade
// científica = visual, sem série órfã nem cenário órfão). Semântica das ações:
// VISUALIZAR → somente ChartViewSnapshot · REABRIR → somente scenarioSnapshot ·
// RECALCULAR → simulationInput + engine/sampling atuais. Rastreabilidade DERIVA de
// scenarioSnapshot.source — nenhum campo de perfil duplicado no registro.
interface CalculationRecordBase{ id:string; createdAt:InstantIso; display:RecordDisplayMeta }
// Base contém apenas campos comuns aos três tipos de registro; dados específicos
// (inputs científicos, snapshots, protocolos) vivem em cada variante da union.
// Rastreabilidade de perfis deriva de scenarioSnapshot.source / protocolsSnapshot —
// sem índice persistido global e sem segunda fonte de verdade.
interface ProtocolComponentKey{ protocolId:string; componentId:string }
interface ProtocolSimulationInputSnapshot{
  key:ProtocolComponentKey; input:SimulationInput }
interface ProtocolAnalysisSeriesSnapshot{
  key:ProtocolComponentKey; label:string; color:PaletteColorId;
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
      simulationInputs:ProtocolSimulationInputSnapshot[];   // p/ RECALCULAR, associado por chave
      protocolsSnapshot:Protocol[] }                        // p/ REABRIR com contexto
);
interface ProtocolAnalysisVersions{ pkEngineVersion:string; recurrenceEngineVersion:string; datasetVersion:number }
// Invariantes de protocol-analysis: (protocolId,componentId) é único; toda key resolve
// exatamente um componente em protocolsSnapshot; existe bijeção 1:1 entre snapshot.series
// e simulationInputs por key. Mesmo componentId em Protocols distintos é permitido.
// Reordenação de protocols/components/series/inputs não altera associação; posição de array
// nunca participa de VISUALIZAR, REABRIR ou RECALCULAR.

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
export const SAFETY_LIMITS={
  CONFIG_PAYLOAD_BYTES_MAX:15_728_640,          // 15 MiB; estado configurável persistível
  CONFIG_IMPORT_BYTES_MAX:16_777_216,           // 16 MiB; arquivo Config completo
  CALCULATION_RECORD_BYTES_MAX:8_388_608,       // 8 MiB; um registro histórico
  HISTORY_TOTAL_BYTES_MAX:49_283_072,           // 47 MiB; array histórico efetivamente persistido
  FULL_BACKUP_IMPORT_BYTES_MAX:67_108_864,      // 64 MiB; arquivo FullBackup completo
  SCENARIOS_MAX:20,
  DOSES_PER_SCENARIO_MAX:2000, PROTOCOLS_MAX:200, WEEKS_MAX:520,
  HISTORY_RECORDS_MAX:500, QUARANTINE_ITEMS_MAX:5,
  HALF_LIFE_DAYS_MAX:3650, TMAX_DAYS_MAX:3650,
  RECON_VIAL_MASS_MG_MAX:100_000, RECON_DILUENT_ML_MAX:1000, RECON_DOSE_MCG_MAX:1_000_000,
  SYRINGE_GRADUATION_UNITS_MAX:100,
  SIMULATION_DOSE_MG_MAX:1_000_000, PROTOCOL_TOTAL_DOSE_MG_MAX:1_000_000 } as const;
// graduationUnits: finite>0 (decimais ok). Limites de dose PK = TÉCNICOS
// (integridade numérica, validação de entrada, proteção contra payloads
// patológicos/import malformado) — NÃO são orientação clínica nem dose máxima
// recomendada. Qualquer alteração exige revisão normativa e testes de fronteira.
export const UX_LIMITS={ NAME_MAX_CHARS:100, FAVORITES_MAX:100,
  GRADUATION_ERROR_WARN_THRESHOLD:0.05 } as const;
```

Todos os limites são **conjuntivos**. Medição normativa: `serializedUtf8Bytes(value) = new TextEncoder().encode(JSON.stringify(value)).byteLength`, usando exatamente o serializador do export. O payload configurável possui 15 MiB; o Config completo possui 16 MiB, reservando 1 MiB para envelope/versionamento. O caso de referência de 40.000 doses (20×2.000), mesmo com IDs de 100 caracteres e snapshots preenchidos, mediu ≈6,23 MiB [CALC], deixando margem para os demais dados. O FullBackup contém o payload (até 15 MiB) e o histórico (até 47 MiB), deixando 2 MiB dos 64 MiB para envelopes/metadados; o tamanho final completo é sempre revalidado. Esses budgets são de proteção técnica, não metas de consumo.

---

# 7. Motores

**PK (`domain/pk`):** `eliminationRate`, `absorptionRateFromTmax`, `stableBatemanAmount` (forma `phi/expm1` da §4), `amountFromDose`, `depotFromDose`, `totalAmount`, `stateAt`, `analyze(input):SimulationOutput` (metadata SOMENTE `pkEngineVersion`), `sampleForDisplay(analysisCurve, constraints):DisplayPoint[]` (geometria pura). Não conhece agenda/recurrence/outras versões. O warning near-degenerate não seleciona caminho numérico.

**Cutoff/lookback (política única):**
```
domain/pk::cutoffAgeFor(selected)           // usa effectiveTmaxMs = tmaxMs ?? 0
domain/simulation::requiredPkLookback(params[]) === max cutoffAgeFor(...)   // invariante testada
domain/simulation::deriveCalculationWindow(display, params[]): CalculationWindow
```
Nenhuma feature calcula lookback próprio.

**Recurrence (`domain/recurrence`):** `generateOccurrences(scheduleShape, rangeStartMs, rangeEndMs)`; `shiftSchedule(schedule, deltaDays)`; `validateRecurrence(r)`.

**Cola (`domain/simulation`):** `assembleScenarioInputs(scenario, nowMs)`; `assembleProtocolInputs(protocol, occurrences): SimulationInput[]` (UM POR COMPONENTE; deriva dose por proporção; proibidas médias); ao persistir protocol-analysis, cada input é envolvido em `ProtocolSimulationInputSnapshot{key:{protocolId,componentId},input}` e cada série recebe a mesma chave, com validação da bijeção; `derivePhaseHint(...)` heurística; orquestração de análise de protocolos monta `ProtocolAnalysisSnapshot` (usa `sampleForDisplay`) e registra `ProtocolAnalysisVersions`; a análise do Comparador monta analogicamente o `ChartViewSnapshot` no registro histórico — os pontos são gerados por `sampleForDisplay` **apenas no momento da gravação**; a visualização histórica consome-os diretamente, sem executar engine nem sampling.

Casos explícitos: ka>ke; ka<ke (flip-flop+warning); igualdade e vizinhança ka≈ke (mesma avaliação estável+warning); Tmax=0; extremos (`EXTREME_PARAMETERS`/`NUMERIC_FAILURE`). Invariantes: continuidade ao cruzar ka=ke; conservação; superposição; clamp finito; marcos (§4); horizonte 10,5; cutoff validado por propriedade nas três regiões; determinismo intra-plataforma.

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

**Contrato V1 de Blend nos CTAs:** um `Scenario` representa exatamente uma parametrização PK; por isso `ScenarioSource.library` resolve apenas `SingleSubstance+PharmacokineticProfile`. `BlendSubstance` não possui perfil próprio e **não pode ser selecionado diretamente como Scenario simples**. Na Biblioteca, o CTA “Comparar” fica oculto ou desabilitado para Blend, com texto acessível explicando que a composição é analisada em Protocolos; a V1 não cria Scenario composto, média de parâmetros nem dose implícita. O CTA “Adicionar a Protocolos” permanece: cria um `Protocol` canônico com N `ProtocolComponents`, um por `BlendComponent`, cada qual referenciando a SingleSubstance/profile correspondente; `componentDoseMg` deriva da proporção após o usuário informar a dose total. Para SingleSubstance, os dois CTAs continuam disponíveis, sem preencher dose. `CustomProfileOwner.type='official'` também só pode resolver uma `SingleSubstance` oficial; apontar para Blend é inválido.

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
- **VISUALIZAR:** renderiza DIRETAMENTE os pontos persistidos — Comparador usa `chartViewSnapshot.displayPointsByScenario[].points` (já amostrados na gravação, com `valueKind` mg|normalized_ratio); Protocolos usa `snapshot.series[].displayPoints`, identificados por `ProtocolComponentKey` — **em ambos os casos reproduz fielmente a apresentação salva, NÃO executa PK Engine, NÃO executa `sampleForDisplay`, não depende do algoritmo de sampling atual nem do dataset/engine antigo**. Cada cenário preserva seu próprio snapshot científico (`scenarios[].resultSnapshot.analysisCurve`, …) para inspeção, métricas, dados, export e rastreabilidade — o gráfico salvo não depende dele.
- **REABRIR:** Comparador usa exclusivamente cada `scenarioSnapshot` (Scenario lógico COMPLETO); Protocolos usa exclusivamente `protocolsSnapshot` e resolve cada componente por `(protocolId,componentId)`. Inputs científicos são reservados ao RECALCULAR e nunca participam da reconstrução. A ação cria rascunho de edição, não registro, restaura todos os cenários/protocolos salvos e não depende da ordem dos arrays nem consulta o dataset atual para reconstruir estado.
- **RECALCULAR:** engine atual ⇒ NOVO registro; original intacto. Comparador recalcula cada `simulationInput` de `scenarios[]`. Protocolos recalcula cada `ProtocolSimulationInputSnapshot.input`, associa o novo resultado pela `key` e rejeita registro cuja bijeção key↔série↔input esteja quebrada; nunca usa posição de array. Divergência: “Este resultado foi calculado com pk@X. Recalcular utilizará pk@Y e criará um novo registro.”
- **CustomProfile órfão no histórico do Comparador:** ao REABRIR um registro cujo `scenarioSnapshot.source` seja `custom_profile` com `customProfileId` que NÃO resolva mais: o registro histórico permanece IMUTÁVEL; cria-se apenas o DRAFT de edição com source `'manual'`, preservando selectedPkParameters, pkParametersSnapshot, doses, displayUnit, nome e demais dados do Scenario, com aviso não bloqueante: “O perfil personalizado usado originalmente não existe mais. Este cenário foi reaberto como parâmetros manuais usando o snapshot histórico preservado.” Caso A (id ainda resolve) → abre normalmente como custom_profile. Nunca recriar CustomProfile, nunca inventar id, nunca bloquear VISUALIZAR ou RECALCULAR (os parâmetros científicos estão preservados no snapshot/input).
- **ProtocolComponent órfão em protocolos históricos:** caminho estrutural correto é `protocolsSnapshot[].components[].source` — `Protocol` NÃO possui `source` próprio. Ao REABRIR para edição, se `component.source.type === 'custom_profile'` e o `customProfileId` não resolver mais: NÃO modificar `protocolsSnapshot`; converter apenas o DRAFT DAQUELE COMPONENTE para `{type:'manual'}`, preservando selectedPkParameters, pkParametersSnapshot, proportion, label, displayColor e demais campos, com aviso não bloqueante equivalente. Teste obrigatório garante que o fallback ocorre em `protocolsSnapshot[].components[]`, nunca em nível de Protocol.
- Engines antigos executáveis FORA DA V1. Frase oficial: “histórico rastreável e preservado por snapshot”.

**Gravação por ação explícita nos três módulos** (“Salvar análise/no histórico”). Cálculos permanecem live.

**Calendário/fuso:** `settings.calendarTimeZone` (default dispositivo no 1º uso); células posicionam por `localDateIn(instant, calendarTimeZone)`; chips “≈ nome: X mg” às 20:00 no calendarTimeZone, materializando desde `evaluationInstant − requiredPkLookback`, filtro <0,01 mg, ordenação decrescente; dose do mês anterior contribui. Drag&drop (limiar 7 px; supressão de clique 800 ms): Δ dias civis medidos na exibição aplicado ao startDate civil do protocolo (hora/fuso preservados; rotação semanal; política DST na nova data).

**Diálogo do protocolo:** helpers “Informe em dias.” / “Informe em dias. Use 0 para absorção imediata.” / conversões “Equivale a aproximadamente X h/d”. Exclusão por modal próprio (sem `confirm()` nativo). Status global aria-live, auto-dismiss 7 s com ações (Desfazer).

**Ajustes:** consentimento off (texto literal “Desativado por padrão. Nenhum dado é enviado para servidor.”); desativar = oferecer export→confirmar→apagar (sem quarentena oculta); exports; migração assistida com diálogos de fuso (“Os dados antigos não registravam fuso horário. Informe o fuso em que estes horários foram originalmente cadastrados.” — default dispositivo) e remapeamento de cores; gestão de quarentenas (≤5); falha IndexedDB formal (memória+aviso+exportar+retry por ação); banner de atualização PWA.

Viewports de validação: 320/375/390/430/768/1024/1440 px.

---

# 11. Persistência, histórico e migrações

Opt-in; chaves `fk:v1:*`; IndexedDB stores scenarios|protocols|history|custom|quarantine; caches técnicos só assets. Corrupção ⇒ quarentena `fk:v1:corrupted-<ts>` (máx. 5; poda notificada; última cópia protegida). Falha IndexedDB: memória+aviso persistente+exportar+retry controlado; nunca fallback silencioso p/ localStorage grande; nunca fingir salvamento.

**Budgets e round-trip:** Config e FullBackup são JSON UTF-8 não comprimidos, medidos por `serializedUtf8Bytes` (§6). Toda mutação configurável é aceita/persistida apenas se o `ConfigPayload` projetado for ≤15 MiB; acima disso, rejeitar sem alterar o estado com `CONFIG_STORAGE_LIMIT_EXCEEDED` e orientação para remover dados não necessários/exportá-los. Todo Config gerado mede ≤16 MiB e todo FullBackup gerado mede ≤64 MiB. **Invariante fundamental:** todo bundle produzido por uma versão a partir de estado válido dessa versão é aceito pelo importador da mesma versão; export válido nunca é rejeitado pelo próprio cap de import.

Há duas ações de importação explícitas antes da seleção do arquivo: **Importar configurações** (cap 16 MiB, exige `bundleKind:'config'`) e **Restaurar backup completo** (cap 64 MiB, exige `bundleKind:'full-backup'`). O fluxo verifica `File.size` contra o cap da ação **antes** de `File.text()`, `arrayBuffer()` ou `JSON.parse`; depois valida bundleKind, Zod/LIMITS, payload ≤15 MiB, cada registro ≤8 MiB, histórico ≤47 MiB, contagens e referências. Kind divergente ⇒ `IMPORT_KIND_MISMATCH`; excesso ⇒ `IMPORT_FILE_TOO_LARGE`. Prévia/confirmação continuam obrigatórias; consentimento nunca é exportado, restaurado ou ligado automaticamente. Bundle externo pode ser rejeitado mesmo abaixo do cap de arquivo se violar schema ou limites internos.

**Histórico — limite dual e FIFO determinístico:** imutável; gravação só por ação explícita; `displayPoints` continua ≤1200 pts/série. Antes de inserir, serializar o novo `CalculationRecord`; se >8 MiB, rejeitar somente a gravação com `CALCULATION_RECORD_TOO_LARGE`, manter cálculo/tela disponíveis e orientar redução de janela/séries — não inserir e não remover registros antigos. Se couber, inserir como mais novo e remover, pela ordem de inserção persistida, os registros mais antigos enquanto **qualquer** condição for verdadeira: contagem >500; `serializedUtf8Bytes(history)` >47 MiB; FullBackup projetado >64 MiB. Nunca remover silenciosamente o registro recém-criado; informar quantos antigos foram evictados. A mesma poda ocorre após mutação Config que faça o FullBackup projetado exceder 64 MiB. `FullBackup.history` e `counts.records` refletem exatamente os registros remanescentes. A soma planejada (15 MiB payload +47 MiB histórico) deixa 2 MiB para envelopes/metadados; o tamanho final do bundle é sempre medido, não presumido.

Falha inesperada de serialização ou violação de cap ao exportar um estado que deveria ser válido ⇒ `EXPORT_SIZE_LIMIT_EXCEEDED`, nenhum arquivo parcial e oferta de Config export/gestão do histórico. Esse caminho é defesa contra corrupção/bug, não comportamento normal; os invariantes e testes devem torná-lo inalcançável para estado válido.

**Migrações (não destrutivas; apps legadas = fontes de formato):**
- `hormoTrackerProtocols`: aceita envelope `{schemaVersion:2, savedAt, protocols[]}` e array legado simples com campos `id?, name, halfLife, tmax, dose, startDate, startTime, type('single'|'weekly'), daysOfWeek?, weeksCount?, color, protocolId?, groupId?, isBlend/esters?` (sanitizar tudo; inválidos descartados com contagem). **Convenção confirmada no legado [CÓD]:** `daysOfWeek` usa `Date.getDay()`, isto é, `0=domingo`, `1=segunda`, …, `6=sábado`. Mapping obrigatório para `IsoWeekday`: `0→7`; `1..6→1..6`; valores externos a `0..6` são inválidos; deduplicar e ordenar ascendente depois do mapping. Golden fixture prova domingo `[0]→[7]`, segunda `[1]→[1]`, sábado `[6]→[6]` e mistura `[0,1,6]→[1,6,7]`, sem deslocamento civil. **N irmãos com mesmo groupId ⇒ 1 Protocol canônico**: `totalDoseMg=Σ doses`; `proportion_i=doseLegacy_i/totalDoseMg`; `totalDoseMg<=0` ⇒ inválido→quarentena/report; cada componente recebe `selectedPkParameters`+`pkParametersSnapshot` dos valores legados. Cores: na paleta ⇒ preserva; fora ⇒ `legacyOriginalHex` + remapeamento (vizinho mais próximo, distância euclidiana quadrática sRGB; empate ⇒ menor id lexicográfico) + entrada em `MigrationReport.colorRemaps`. groupId existe só no migrador.
- `meiavida:v2:data`: cenários → Scenario com `source` apenas `'library'` ou `'manual'`: **library** somente quando a associação oficial for inequívoca (substanceId+profileId oficiais + datasetVersion + snapshot de parâmetros); caso contrário **manual**, preservando `selectedPkParameters`, `PkParametersSnapshot` (quando disponível), nome, doses e horários. **NUNCA produzir `source:'custom'` nem fabricar CustomProfile/customProfileId** na migração — custom_profile só existe com entidade real criada/importada explicitamente. datetime-local convertido usando a **timezone assumida**; doses com `amountMg` nulo/não finito/fora de `SIMULATION_DOSE_MG_MAX` são descartadas e contabilizadas no relatório.
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

Primeira entrada (E1): início da implementação greenfield; commit/base inicial; estado inicial do repositório; criação do scaffold; decisões de E1; resultados do gate CSP×Chart.js/referrer; resultados de typecheck/test/build.

## 12.3 `.token-optimizer/` — tooling versionado (FORA do produto)

Deliberadamente mantido no repositório. Regras: **NÃO remover · NÃO adicionar ao `.gitignore` · NÃO limpar automaticamente · NÃO tratar como temporário descartável · NÃO interpretar sua presença como corrupção do projeto.**

Classificação: **TOOLING DE DESENVOLVIMENTO** (usado por tooling/Codex/Token Optimizer; pode conter artefatos técnicos/telemetria da ferramenta). NÃO integra: runtime da FARMakit · bundle da aplicação · PWA · dataset · storage do usuário · código de domínio. Não contém dados funcionais do produto. Sua presença não deve interferir em npm, Vite, TypeScript, testes, CI ou deploy.

Validação de build (critério de aceite): permanece no repositório; **não aparece em `dist/`**; nenhum arquivo seu é solicitado em runtime; nada entra no precache do PWA. Como fica fora de `src/` e `public/`, o Vite já o ignora naturalmente — adicionar apenas um assert/verificação de build equivalente, sem configuração especial.

---

# 13. Estratégia de testes

Convenção: tolerâncias da seção 4; proibido igualdade bit-a-bit/exato/diff-0 em floating point; migração estrutural usa igualdade exata onde cabível.

## Unitários (Vitest)
- **Solver pela equação:** recomposição com TMAX_RECOMPOSITION_RTOL ∀(T½,Tmax) válidos; **oráculo estável perto de ka≈ke avaliado em espaço-y (`y/expm1(y)`+Taylor), nunca ln(ka/ke)/(ka−ke) cru**; âncoras rtol 1e-4 (6d/2d⇒1,34159; ka=0,36 dia⁻¹⇒4,649224 d); paridade meiavida 24 h/4 h.
- Ramos: Tmax=0; igualdade `ka=ke`; vizinhança; flip-flop+warning; extremos: NaN/∞ inesperado ⇒ NUMERIC_FAILURE; underflow documentado ⇒ 0.
- **Bateman estável:** `ka/ke = 1`, `1±1e-12`, `1±1e-10`, `1±1e-8`, `1±1e-6`; tempos `0`, antes, no e depois de Tmax e cauda; doses `1e-9`, `1` e `1e6 mg`; comparar `stableBatemanAmount` por `amountClose` contra oráculo independente de precisão ampliada/fixtures geradas fora do SUT. Verificar continuidade bilateral em `ka=ke` e ausência de salto ao cruzar `NEAR_DEGENERATE_RATES_REL`; o warning pode mudar na fronteira, o valor físico não. O caso exato reduz à fórmula limite. A avaliação recomendada com `phi/expm1` é a mesma nos dois lados; não existe “fronteira de ramo” em 1e-8.
- Bateman/estado: **50%@1T½ somente para dose única de absorção instantânea**; pico@Tmax para dose única com absorção finita; conservação por `conservationClose`; clamp; percentuais zerados; futuras fora do estado.
- **Lookback/cutoff:** assert `CONTRIBUTION_CUTOFF_HALF_LIVES === 44`; `requiredPkLookback ≡ max cutoffAgeFor`; `effectiveTmaxMs = tmaxMs ?? 0` (**Tmax instantâneo ⇒ 0 ⇒ cutoff calculado corretamente**); janela de cálculo com T½ longa; **dose anterior à DisplayWindow altera o primeiro ponto exibido**; blend ⇒ máximo entre componentes.
- **Cutoff equivalence:** `CommonComparisonWindow = DisplayWindow` (única definição); `CommonComparisonTimestamps` determinísticos (start/end; regulares; doses e `dose+tmax` na janela; críticos — ordenado, sem duplicatas, idêntico nos dois universos); ambos os universos avaliados exatamente nesses timestamps via `stateAt(input,t)`/helper físico equivalente; comparar central/depot/central+depot via `cutoffClose(actual, reference, sumDiscardedDoseMg)` — que degenera para `amountClose` quando não há descarte; conservação intra-universo; **não comparar analysisCurve por índice**; `peakWithinWindow(universe, DisplayWindow)` opcional/complementar (mesma janela/algoritmo/refinamento); **milestones globais fora desse teste**; proibido comparar `eliminatedMg`/`administeredMg`/`administeredCount`/`plannedCount` entre universos. Invariante agregada mantida: `Σ descartadas < CUTOFF_TOLERANCE × Σ doses descartadas`. Casos: dose única; weekly longo; múltiplos weekdays; blend; fixture máxima; ka>ke/ka<ke/ka≈ke; Tmax instantâneo.
- **HistoricalProfileRef (único contrato derivado):** library → `{official,substanceId,profileId,datasetVersion}`; custom_profile → `{custom,customProfileId}`; manual → ausência; discriminadores e identidades compostas sem ambiguidade; derivação tanto de `scenarioSnapshot.source` quanto de `protocolsSnapshot[].components[].source`; snapshots permanecem autossuficientes; nenhum `HistoricalProfileRef` é persistido em `CalculationRecordBase`, snapshots ou FullBackup e não existe segunda fonte de rastreabilidade.
- **Dataset/cores legadas:** cada preset/componente da tabela da §9 possui exatamente o hex especificado; componentes do LANDERGOLD com cores corretas; `LEGACY_COLORS` derivável somente deste documento (golden test sem dependência externa).
- **Dados personalizados:** perfil custom existe em um único store canônico (`customProfiles`); `CustomSubstance` sem `profiles[]`; owner custom resolve CustomSubstance; owner official resolve exclusivamente SingleSubstance oficial (Blend rejeitado); owner inexistente rejeitado; exclusão bloqueia/oferece cascata confirmada; export/import round-trip sem duplicação.
- **Limites de dose:** 0/negativo/NaN/Infinity rejeitados; limite máximo aceito; acima rejeitado (`INVALID_DOSE_AMOUNT` por dose, `PROTOCOL_TOTAL_DOSE_INVALID` no protocolo); import e migração obedecem caps.
- **IDs do dataset:** rename preserva id; ID nunca reutilizado; `deprecated:true` permanece resolvível; alias/`idMigrations` resolve corretamente; snapshot antigo íntegro.
- **Datetime do Comparador:** criação em TZ A ⇒ troca de dispositivo para TZ B mantém o `InstantIso`; display converte para o fuso vigente; edição sem mudança de valor preserva o instante; GAP/OVERLAP conforme política global; proibido `new Date(datetimeLocalString)`.
- **Log (apresentação):** absolute floor = peak×`LOG_REL_EPSILON`; normalized floor = ε; série toda zero ⇒ sem domínio log válido; valor exatamente no epsilon e abaixo são clipados apenas visualmente; snapshots log preservam a ciência.
- **cutoffClose (orçamento de truncamento):** sem descarte (`sumDiscardedDoseMg=0`) ⇒ degenera exatamente para `amountClose`; resíduo dentro do orçamento aceito (ex.: 100 mg descartados no pior limite degenerado produzem contribuição total ≈`6,795927×10⁻¹¹ mg`, aceita pelo budget físico de `1×10⁻¹⁰ mg` mais ATOL/RTOL); erro acima do orçamento total reprova; múltiplas doses descartadas ⇒ soma integral das doses omitidas; central/depot/central+depot testados separadamente com o mesmo budget agregado; escalas grandes mantêm o termo RTOL dominante; perto de zero ATOL+budget operam sem divisão por zero; propriedade agregada `Σ contribution_i(t) < CUTOFF_TOLERANCE × Σ dose_i` validada à parte.
- **Identidade do dataset:** migration substance válida; migration profile na MESMA substância; migration profile ENTRE substâncias (4 IDs explícitos); mesmo profileId em substâncias diferentes não gera ambiguidade (identidade composta); ciclo substance rejeitado; ciclo profile rejeitado; destino inválido rejeitado; resolução determinística; rename preserva id; deprecated resolve.
- **Histórico multicenário do Comparador:** 1/2/20 cenários; `scenarioSnapshot.id` casa com `scenarioId`; `simulationInput` corresponde ao Scenario salvo; cardinalidade `scenarios == displayPointsByScenario`; série visual sem cenário científico rejeitada; cenário científico sem série visual rejeitado; REABRIR restaura todos; RECALCULAR cria novo registro completo; FullBackup round-trip preserva o Scenario COMPLETO.
- **REABRIR (Comparador):** scenarios library/custom_profile/manual restauram source, displayUnit, selectedPkParameters, selectionNote, doses (`InstantIso`) e snapshots/proveniência **sem consultar dataset e sem reconstruir Scenario a partir de SimulationInput**; custom_profile com id ainda existente abre como custom_profile; id ÓRFÃO ⇒ draft manual + aviso (registro histórico inalterado), preservando selectedPkParameters/pkParametersSnapshot; mesmo comportamento por COMPONENTE histórico (`protocolsSnapshot[].components[].source`): fallback para `{type:'manual'}` preservando selectedPkParameters, pkParametersSnapshot, proportion, label, displayColor e demais campos.
- **custom_profile/manual:** sources library/custom_profile/manual distintos; `custom_profile` armazena `customProfileId`; manual não inventa ref de perfil; conversão custom_profile→manual preserva `selectedPkParameters`+`pkParametersSnapshot`; exclusão bloqueada com refs ativas e permitida após conversão; histórico antigo íntegro.
- **datasetVersion:** mudança científica incrementa; mudança de identity mapping incrementa; mudança puramente cosmética pode preservar.
- **Dose/DoseDraft:** draft aceita `amountMg:null`; Dose persistida nunca aceita null; schema impede persistência de draft; limite máximo (`SIMULATION_DOSE_MG_MAX`) permanece aplicado.
- **Comparadores:** `amountClose` perto de zero (ATOL domina), em valores grandes (RTOL domina), dentro e fora da tolerância; `conservationClose` usa `CONSERVATION_RTOL`; toda comparação simulação truncada × referência estendida usa `cutoffClose`, nunca `amountClose` isolado.
- **Favorites:** official e custom com o MESMO texto de ID não colidem (discriminador); round-trip export/import preserva `type`; ref inexistente rejeitada/quarentenada.
- **Cutoff property:** ka>ke, ka<ke, igualdade/vizinhança ka=ke e instantâneo ⇒ `central+depot < CUTOFF_TOLERANCE×dose` na idade de corte e depois dela; fixture degenerada confirma central≈`6,5868117e-13`, depot≈`2,0911525e-14`, total≈`6,7959270e-13` da dose. Busca adimensional ampla em `q=max/min`, densa perto de 1, deve encontrar o máximo no limite q=1 sem assumir isso como gerador.
- Análise: horizonte 10,5; invariantes dos marcos; **âncora analítica 0,1% restrita a dose única com absorção instantânea: pico→0,1% ≈ log2(1000) ≈ 9,9658 T½ (tolerância apropriada)**; Bateman geral valida o marco contra a equação do próprio cenário (`amount(timeMilestone) ≈ peak.amountMg×0,001` via `amountClose`) **sem impor faixa fixa de ~10 T½**; ka≈ke não é forçado a ~10 T½; horizonte insuficiente ⇒ `timeMs:null` + MILESTONE_NOT_REACHED (**horizonte 10,5 permanece inalterado**); qualquer comparação que contenha truncamento usa `cutoffClose`.
- **Blend:** 3 componentes ⇒ 3 SimulationInputs em Protocolos; dose derivada; Σ proporções=1; snapshot pertence ao componente; reordenação não troca associação; Blend não satisfaz ScenarioSource.library, CTA Comparar indisponível, SingleSubstance continua comparável.
- **Histórico de Protocolos por chave:** fixture Protocol A/component `c1` + Protocol B/component `c1` não colide; keys completas distintas; cada série tem exatamente um input e vice-versa; key inexistente/duplicada/órfã rejeitada; reorder de protocols, components, series e inputs preserva VISUALIZAR/REABRIR/RECALCULAR.
- Recorrência: janela parcial (fronteira); única/semanal; fim inclusivo; `IsoWeekday` aceita 1..7, exige não vazio/único/ordenado; rotação ISO ±1/±7.
- **Datas/DST (Temporal, fixtures explícitas):** GAP 1 h ⇒ 02:30→03:30 ('later'); OVERLAP ⇒ primeira ocorrência ('earlier'); mudança de TZ do dispositivo não altera protocolo salvo; fusos distintos no dia correto da exibição; chips c/ contribuição anterior.
- `parseLocaleDecimal`: "0,5"/"0.5" ok; rejeita ambíguos/vazios/múltiplos separadores.
- Reconstituição: âncora 250 mcg; capacidade 3000 mcg (120/240 U); 6000 mcg ⇒ DOSE_EXCEEDS_VIAL_CONTENT; graduação decimal (0,5) e bordas 9/10 U; inválidos/caps.
- **Provenance:** user_defined aceito sem fingir fonte; literatura sem sourceIds rejeitado; combinações inválidas falham (schema+typecheck .test-d.ts).
- **Export/types e budgets:** discriminated union válida (switch exaustivo compila); metadata do output só pkEngineVersion; protocol-analysis registra pk+recurrence; ConfigPayload exatamente no limite válido exporta/importa, acima rejeita mutação; Config completo ≤16 MiB; CalculationRecord ≤8 MiB; histórico ≤47 MiB; FullBackup completo ≤64 MiB; todos medidos em UTF-8 real.
- Schemas×LIMITS fronteiras; boundsFromLimits sincronizado.

## Propriedade (fast-check)
Monotonicidades da reconstituição; superposição comutativa; identidade do solver ampla (incl. vizinhança degenerada, oráculo y-space); continuidade Bateman com `ka/ke=1±{1e-12,1e-10,1e-8,1e-6}` contra oráculo independente; **cutoff: `central+depot < CUTOFF_TOLERANCE×dose` para ka>ke, ka<ke, igualdade/vizinhança e Tmax instantâneo, variando `q=max/min` em ampla faixa com densidade perto de 1**; **agregado: Σ descartadas < ε×Σ doses**; **equivalência cutoff × referência estendida via `cutoffClose` (ATOL+RTOL+budget físico), ambos os lados avaliados nos mesmos timestamps do CommonComparisonWindow — pico/marcos somente recomputados no domínio; nunca eliminated/administered/plannedCount entre universos distintos nem peak/milestones globais independentes**; marcos ordenados; contagem de ocorrências ∝ janela de cálculo.

## Integração
Formulário⇄zod⇄analyze; Registrar-dose; consent on/off (desligar=export opcional+confirmação+apagar, sem quarentena); export Config vs FullBackup; import sem consentimento restaurado; ações de import separadas rejeitam `File.size` acima de 16/64 MiB antes de parse e rejeitam kind divergente; round-trip same-version nas fronteiras; histórico respeita simultaneamente 500 registros, 47 MiB e FullBackup 64 MiB, com FIFO por inserção determinístico, notificação e preservação do recém-criado; record >8 MiB é recusado sem evictar antigos; IDB failure simulado; quarentena >5 poda notificando; SW prompt-banner; **história: snapshot antigo intacto; VISUALIZAR produz o mesmo gráfico sem PK Engine e sem `sampleForDisplay`; RECALCULAR cria novo registro e, em Protocolos, associa somente por ProtocolComponentKey**; **Comparador: salvar em modo normalizado + escala log + DisplayWindow específica ⇒ VISUALIZAR preserva janela, modo, escala, `valueKind` e pontos diretamente**; FullBackup reflete apenas histórico efetivamente persistido e renderiza sem dataset atual; migração: assumedTimeZone + colorRemaps + mapping weekday registrados; blend refs íntegras; totalDose≤0 ⇒ quarentena/report.

## E2E (Playwright, viewports 320–1440)
Fluxos felizes/erro dos 3 módulos; mover por teclado e drag; Desfazer; foco-no-gráfico; Biblioteca: Single→Comparador/Protocolos e Blend sem CTA Scenario simples, com CTA Protocolos; import com mensagens de tamanho/kind; offline reload; update banner; meta CSP efetiva + meta referrer separada; `document.referrer`/navegação conforme política quando observável; console sem diretiva CSP desconhecida nem violações Chart.js no build produção.

## Acessibilidade
axe-core zero serious/critical nas 6 rotas; teclado completo; focus-trap/devolução; aria-live; NVDA checklist arquivado (pré-condição WCAG 2.2 AA); contraste; reduced-motion.

## Migração
Golden fixtures hormo (envelope v2, array legado com blends e `daysOfWeek` JS 0/1/6→ISO 7/1/6) e meiavida (válido/inválido/schema≠2/corrompido); asserts de canônico/doses/proporções/snapshots por componente; domingo/segunda/sábado sem off-by-one; assumedTimeZone presente; cores remapeadas reportadas; originais intactos; idempotência.

## Desempenho (BENCHMARK TARGETS antes de hard gates)
Metas iniciais (calibrar em E13): materialização ano×200 protocolos ≤50 ms; análise 200×520 semanas <2 s; sampling ≤1200 pts/série; bundle inicial gzip ≤300 kB. Até a calibração, CI verifica apenas: **regressão relativa** contra baseline registrado, budgets de bundle, limite algorítmico (objetos ∝ CalculationWindow, nunca horizonte total), ausência de long tasks perceptíveis em cenários normais. Milissegundos absolutos tornam-se hard gates somente após benchmark com ambiente/hardware registrado e congelamento dos budgets.

---

# 14. Critérios de aceite

- **Biblioteca:** 19 entidades internas/16 visíveis; badges por origem honestos (inclui “criado por você”); faixas exigem seleção; CTAs não preenchem doses; Single oferece Comparador/Protocolos, Blend oferece apenas Protocolos na V1 e não resolve como Scenario simples; **cores legadas conforme tabela da §9, sem dependência de documento externo**.
- **Meia-vida:** 6d/2d aceito (ka≈1,3416/d rtol 1e-3); Bateman contínuo e dentro de `amountClose` em `ka/ke=1±{1e-12,1e-10,1e-8,1e-6}`; flip-flop avisado; eixo-X datado; marcos paridade dentro de MILESTONE_TIME_ABS_TOL; log com clipping informado.
- **Reconstituição:** âncora 250 mcg exata nas tolerâncias; 3000 mcg ⇒ 120/240 U c/ mensagem neutra; 6000 mcg ⇒ bloqueio; bordas de graduação 9/10 U; salvar-no-histórico explícito.
- **Protocolos:** golden de datas e `IsoWeekday`; blend canônico 3 componentes; mover/rotacionar; Desfazer; chips com lookback e filtro <0,01 mg; geração ∝ CalculationWindow (instrumentação); fusos distintos no dia correto.
- **Histórico:** Ver produz o mesmo gráfico **sem executar engine** (teste com engine removido/stubado); Comparador REABRIR usa `scenarioSnapshot` e RECALCULAR usa `simulationInput`; Protocolos REABRIR usa `protocolsSnapshot` e RECALCULAR usa inputs associados por `ProtocolComponentKey`, sem índice e sem colisão para `componentId` repetido em Protocols distintos; novo registro recebe aviso de versão; recon só por botão; **Comparador restaura janela/escala/eixo do `chartViewSnapshot` sem engine**.
- **Microerrata de domínio temporal e REABRIR órfão:** REABRIR do Comparador usa somente `scenarioSnapshot` (`simulationInput` reservado ao RECALCULAR); CustomProfile histórico inexistente converte APENAS o draft para manual, preservando selectedPkParameters/pkParametersSnapshot e exibindo aviso — registro histórico imutável; mesmo fallback por COMPONENTE (`protocolsSnapshot[].components[].source`); milestone 0,1% ≈ log2(1000) T½ testado SOMENTE para absorção instantânea (Bateman geral valida contra a equação do cenário; ka≈ke sem regra fixa; horizonte insuficiente ⇒ null+warning); equivalência cutoff×referência avalia os dois lados nos mesmos timestamps do CommonComparisonWindow (= DisplayWindow), com peak/marcos recomputados no domínio — nunca peak/milestones globais independentes; `HistoricalProfileRef` permanece derivado e não persistido.
- **Errata de consistência contratual:** dados custom com fonte canônica única e zero duplicação; doses PK com limites técnicos definidos e declarados como não clínicos; erro agregado do cutoff testado (44 mantido como normativo); histórico do Comparador renderiza pontos salvos diretamente, sem `sampleForDisplay`; absolute/normalized com semântica persistida inequívoca (`valueKind`); IDs oficiais estáveis, nunca reutilizados, com deprecated/alias/`idMigrations` definidos; datetime-local do Comparador via Temporal+`calendarTimeZone`, instante imutável após trocas de fuso; log com pisos distintos absoluto/normalizado e clipping apenas visual; §18 sem duplicatas e referências internas corretas.
- **Microerrata contratual final:** todas as referências §18.x corretas (varridas uma a uma); §9.1 contém a política de identidade do dataset; `DatasetIdMigration` com `entityKind` e regras anti-ciclo/cross-kind; `datasetVersion` cobre ciência + identidade/resolução semântica; `Dose` persistível nunca possui `amountMg=null` (`DoseDraft` separado); `AMOUNT_ATOL_MG` e `amountClose` definidos; equivalência com truncamento compõe `amountClose` + budget físico exclusivamente em `cutoffClose`; `LOG_REL_EPSILON` na lista oficial com origem explícita de `seriesPeakMg`; `Favorites` diferencia official/custom via `SubstanceRef`; rastreabilidade derivada usa `HistoricalProfileRef` discriminado — nunca fonte persistida — sem IDs nus.
- **Microerrata de cardinalidade/cutoff/origem custom:** registro `pharmacokinetics` preserva N inputs+N resultados científicos+N séries visuais (um por cenário; cardinalidades consistentes; IDs únicos); REABRIR/RECALCULAR multicenário completos e FullBackup preserva tudo; equivalência cutoff×referência compara apenas contribuição presente via `cutoffClose` (`amountClose` + orçamento de truncamento) — **nunca `eliminatedMg`/`administeredMg`/`administeredCount`/`plannedCount` entre universos distintos**, conservação intra-simulação; `DatasetIdMigration` de profile com identidade composta anti-ciclo; sources library/custom_profile/manual em ScenarioSource e ProtocolComponent.source, com manual sem fake ref; exclusão de CustomProfile bloqueada com refs ativas e conversão para manual preservando snapshots.
- **Orçamento de truncamento:** `contribution_i(t)=central_i(t)+depot_i(t)` formalizado; `sumDiscardedDoseMg` e `cutoffErrorBudgetMg=CUTOFF_TOLERANCE×sumDiscardedDoseMg` definidos; equivalência cutoff×referência usa `cutoffClose`, que degenera para `amountClose` quando não há descarte.
- **Microcorreção REABRIR/rastreabilidade:** REABRIR do Comparador usa o `scenarioSnapshot` (Scenario COMPLETO preservado no histórico); SimulationInput nunca é usado para reconstruir Scenario; `CalculationRecordBase` sem `profileRefs` (rastreabilidade derivada de snapshots — fonte única); migração meiavida produz apenas library/manual (nunca `source:'custom'`, nunca customProfileId fabricado), associação ambígua cai para manual; truncamento validado via `cutoffClose`; regra anti-ciclo refere-se a cadeias de `DatasetIdMigration`.
- **Persistência:** zero escrita de dados do usuário sem consentimento; corrupção⇒quarentena≤5; desligar sem quarentena oculta; Config ≤16 MiB e FullBackup ≤64 MiB fazem round-trip same-version; histórico respeita 500 registros +47 MiB e record ≤8 MiB com FIFO determinístico; excesso é tratado antes de parse/gravação; FullBackup visualiza histórico efetivamente persistido sem dataset; import não liga persistência.
- **Migração:** fixtures devem aprovar; `daysOfWeek` JS 0..6 mapeado para ISO 1..7 sem off-by-one; assumedTimeZone+colorRemaps no relatório; nenhum protocolo perdido por cor; idempotente; originais intactos.
- **PWA/manifest:** artefato buildado contém base/scope/start_url derivados de app.config.ts; **nenhum segundo manifest**; instalável/offline; atualização via banner.
- **Mobile/acessibilidade:** Agenda/Semana/Mês <768 px sem scroll lateral; alvos ≥44 px; axe CI zero serious/critical + NVDA arquivado.
- **Segurança/CSP:** spike CSP×Chart.js deverá ser aprovado na E1 (zero violações e zero diretiva desconhecida) antes dos módulos gráficos; CSP meta não contém `referrer-policy`; meta referrer separada define `no-referrer`; paleta fechada; zero requisições externas runtime.
- **Build/config:** app.config.ts único alimenta Vite+manifest/SW+runtime (assert de artefatos).
- **Performance:** benchmarks calibrados em E13 com ambiente registrado; CI usa regressão relativa até lá; propriedades estruturais (janela, sampling) sempre ativas.
- **Release V1:** E10A + endurecimento + critérios obrigatórios + **README real substituindo o placeholder**, contendo visão geral, aviso educacional, arquitetura resumida, módulos, setup/comandos, testes, build/deploy, PWA, privacidade, persistência opt-in, estrutura do domínio, engineVersion/datasetVersion, política de dados científicos, migração das apps legadas, limitações científicas, status das ferramentas antigas e URL pública — **referenciando somente esta especificação como fonte arquitetural**; incluir ainda as seções **“Estrutura do projeto”** (`FARMakit-especificacao-final.md` = contrato normativo · `docs/DIARIO-DE-BORDO.md` = histórico da implementação · `.token-optimizer/` = tooling auxiliar versionado, fora do runtime/deploy · `src/` = aplicação · `dist/` = artefato de build) e **“Ferramentas de desenvolvimento”** (`.token-optimizer/` deliberadamente versionado, usado por tooling/Codex/Token Optimizer, sem dados funcionais do produto e sem entrar no bundle).

---

# 15. Plano de implementação futura (APENAS DESCREVER — NÃO EXECUTAR)

| Etapa | Objetivo | Notas |
|---|---|---|
| E0 Confirmações de deploy | slug/nome/Pages | Não bloqueia desenvolvimento |
| E1 Scaffold + infraestrutura + gate CSP×Chart.js | app.config.ts único; CSP meta + meta referrer separada; PWA(prompt, manifest gerado); tokens/paleta; spike obrigatório; **criar `docs/DIARIO-DE-BORDO.md` com a 1ª entrada** (início greenfield, base inicial, estado do repo, scaffold, decisões, gate CSP, typecheck/test/build); reconhecer `.token-optimizer/` como tooling versionado e validar exclusão do build; **NÃO adicioná-lo ao `.gitignore`** | Zero violações/diretivas CSP desconhecidas + Referrer Policy correta + diário iniciado + build sem tooling |
| E2 Unidades/tempo/decimal | ms/mg; Temporal+DST(GAP/OVERLAP c/ fixtures); parseLocaleDecimal | Polyfill bundled |
| E3 Motores | pk (solver + Bateman estável `phi/expm1` + cutoff/effectiveTmaxMs), recurrence ISO (janela), reconstitution, simulation(windows+assemble N-inputs+historyView) | NUMERIC_FAILURE; warning near-degenerate separado do algoritmo |
| E4 Gate de testes matemáticos | equação-solver; continuidade `ka≈ke`; lookback=cutoff (assert 44 + central+depot degenerado); blend 3 inputs; marcos; cutoff property amplo + **bound agregado** + **equivalência via cutoffClose**; limites de dose PK; bordas seringa | Antes de qualquer UI |
| E5 LIMITS+zod+i18n | LIMITS→zod/HTML; budgets 15/16/8/47/64 MiB; códigos+pt-BR; .test-d.ts (union de exports, provenance) | Contratos compiláveis |
| E6 Persistência/exports | consent; idb+fallback; quarentena≤5; FIFO count+bytes; import pré-parse por kind; round-trip Config/FullBackup (snapshots de exibição, incl. `ChartViewSnapshot`) | Snapshot-first; budgets testados |
| E7 Migrações | hormo (irmãos→canônico; dose derivada; cores; fuso assumido; `daysOfWeek` JS→ISO) + meiavida; fixtures | Relatórios completos; domingo/segunda/sábado golden |
| E8 Reconstituição | tela completa; âncoras 120/240 U; DOSE_EXCEEDS_VIAL_CONTENT; salvar explícito | Mensagens neutras |
| E9 Comparador | forms/análise/dashboard/CompareChart; salvar análise | phaseHint heurística |
| E10 Biblioteca | dataset v1 (componentOnly; origins); fichas/faixas; CTA Blend apenas para Protocolos, sem Scenario simples | — |
| E11 Protocolos | entidade canônica; calendário multi-fuso; chips lookback; drag/teclado; KineticChart; Desfazer | CalculationWindow |
| E12 E10A Histórico+integrações | Ver/Reabrir/Recalcular; `ProtocolComponentKey` e bijeção série↔input; CTAs; export/import; versionamentos; restauração visual do Comparador | Bloqueia release |
| E13 Endurecimento + **benchmark** | a11y real; **calibrar benchmarks (ambiente registrado) e congelar budgets de performance**; PWA polish | Hard gates só pós-calibração |
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
| Crescimento do histórico/backup | Média | Médio | record≤8 MiB; histórico≤47 MiB+FIFO 500; FullBackup≤64 MiB; sampling cap |
| Payload importado causa parse/memória excessivos | Baixa | Alto | ações por kind + `File.size` 16/64 MiB antes de leitura/parse |
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
6. Protocolo = entidade única; `ProtocolComponent` autocontido e único por id dentro do protocolo; sem componentIndex/substanceRef/blendRef/snapshot no nível do protocolo; custom autossuficiente; dose do componente derivada. Histórico usa chave `(protocolId,componentId)` com bijeção série↔input; nunca índice.
7. Blend ⇒ uma SimulationInput por componente em Protocolos (médias proibidas). Comparador V1 aceita somente Scenario de uma `SingleSubstance+PharmacokineticProfile`; Blend não é Scenario simples e seu CTA Comparar fica indisponível.
8. Camadas ScientificProfile → SelectedPkParameters → SimulationInput; PK nunca consome perfil/dataset; `TmaxSpecification` union; DurationRange normaliza unidades.
9. `SimulationOutput.metadata` registra somente `pkEngineVersion`; orquestração registra pk+recurrence.
10. Histórico snapshot-first: **VISUALIZAR renderiza diretamente os pontos persistidos, sem executar PK Engine nem `sampleForDisplay`**. Comparador: REABRIR→`scenarioSnapshot`, RECALCULAR→`simulationInput`. Protocolos: REABRIR→`protocolsSnapshot`, RECALCULAR→`ProtocolSimulationInputSnapshot.input` associado por key. RECALCULAR cria novo registro; engines antigos executáveis fora da V1; gravação explícita nos três módulos; registros imutáveis tipados; FullBackup autossuficiente.
11. Export = discriminated union; consentimento nunca exportado/restaurado como autorização; Config payload≤15 MiB/arquivo≤16 MiB; registro≤8 MiB; histórico≤47 MiB e≤500; FullBackup≤64 MiB; FIFO determinístico; round-trip same-version obrigatório; import verifica `File.size` por kind antes do parse.
12. Dataset oficial bundled; `componentOnly` para ésteres (19 entidades internas / 16 visíveis no seletor); blend com origin própria e sem profile próprio; **`ProfileOrigin` discriminada incluindo `user_defined`**; `CustomProfileOwner.official` somente SingleSubstance; vias unknown; nenhuma fonte inventada; nenhuma dose sugerida; linguagem educacional.
13. Tempo: tipos distintos; Temporal (polyfill V1); **GAP='later'** desloca pela duração do gap; **OVERLAP='earlier'** escolhe a primeira ocorrência; recorrência usa `IsoWeekday` 1=segunda…7=domingo; `calendarTimeZone`; chips 20:00 = calendarTimeZone+lookback; drag Δ civil medido na exibição.
14. Migração não destrutiva; fuso ausente perguntado (`migrationAssumedTimeZone`); `daysOfWeek` legado usa JS 0=domingo…6=sábado e mapeia `0→7`, `1..6→1..6`; cores fora da paleta preservam `legacyOriginalHex`+remapeamento determinístico; totalDose≤0 ⇒ inválido/quarentena.
15. Arredondamento só na apresentação; unidades internas ms/mg e conversões centralizadas; Bateman usa forma estável `phi/expm1` em toda absorção finita, e limiar near-degenerate serve somente ao warning; tolerâncias oficiais incl. `CUTOFF_TOLERANCE=1e-12`; **cutoff=44 T½ terminais**, dimensionado por `central+depot` no máximo global degenerado (`6,7959269753×10⁻¹³` da dose) e validado nas três regiões + instantâneo; `amountClose` não aprova truncamento, cuja equivalência usa `cutoffClose`; NaN/∞ inesperado ⇒ NUMERIC_FAILURE.
16. Cores legadas integralmente embutidas nesta especificação (tabela da §9 / `LEGACY_COLORS`, validada contra o código em 25/08/2026); nenhum dado de implementação depende de auditoria, commits ou documentos anteriores.
17. **Dados personalizados possuem UMA fonte canônica:** perfis custom vivem somente em `customProfiles`; `CustomSubstance` não contém `profiles[]`; owner custom resolve CustomSubstance e owner official resolve exclusivamente SingleSubstance oficial, nunca Blend; exclusão com perfis vinculados é bloqueada/oferece cascata confirmada; a VIEW agregada é derivada em memória.
18. **Limites técnicos de dose:** toda dose satisfaz finite>0≤`SIMULATION_DOSE_MG_MAX`; `Protocol.totalDoseMg` satisfaz finite>0≤`PROTOCOL_TOTAL_DOSE_MG_MAX` — limites de integridade numérica/validação, explicitamente NÃO clínicos.
19. **Cutoff — garantia agregada:** `Σ contribuições descartadas < CUTOFF_TOLERANCE × Σ doses descartadas`; equivalência prática contra referência estendida usa **`cutoffClose`**, composto pela tolerância numérica `amountClose` mais o orçamento máximo de truncamento `CUTOFF_TOLERANCE × sumDiscardedDoseMg`, nos mesmos timestamps da DisplayWindow; conservação permanece intra-simulação; **44 T½ permanece normativo até prova em contrário** (elevar a constante, jamais baixar a tolerância).
20. Performance absoluta = BENCHMARK TARGETS calibrados em E13 antes de virarem hard gates; até lá CI usa regressão relativa/budgets estruturais; propriedades estruturais sempre obrigatórias.
21. BASE_PATH via `app.config.ts` único (vite+PWA+runtime); **manifest PWA gerado pelo build (fonte única; sem arquivo manual)**; spike CSP×Chart.js gate E1; CSP meta efetiva e meta referrer `no-referrer` separada; `referrer-policy` proibido na string CSP; paleta fechada.
22. LIMITS categorizados alimentando Zod e HTML; budgets de bytes usam serialização UTF-8 real e são invariantes de validade; SAFETY/UX defaults ajustáveis apenas por alteração normativa e testes de round-trip; caps próprios da Reconstituição.
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

**Semântica:** `[x]` significa **contrato documentado e verificado nesta especificação**. Não significa código implementado, teste de implementação executado ou gate aprovado. Toda execução futura permanece no bloco separado e desmarcado.

## Contratos matemáticos

[x] solver de ka possui domínio, bracket, Taylor, bisseção e âncoras definidos
[x] Bateman usa forma estável `phi/expm1` contínua nos dois lados e em `ka=ke`
[x] `NEAR_DEGENERATE_RATES_REL` controla somente warning, nunca ramo físico aproximado
[x] `amountClose` é exclusivo de erro numérico normal sem truncamento deliberado
[x] `cutoffClose` é o único comparador de simulação truncada × referência estendida
[x] `cutoffClose(...,0)` degenera para `amountClose`
[x] contribuição descartável é `central+depot`, nunca inclui eliminado
[x] cutoff permanece 44 T½ e `CUTOFF_TOLERANCE` permanece `1e-12`
[x] caso degenerado em 44 T½: central≈6,5868117e-13, depot≈2,0911525e-14, total≈6,7959270e-13 da dose
[x] regiões ka>ke, ka<ke, ka≈ke e instantânea possuem property tests especificados
[x] equivalência usa timestamps comuns da DisplayWindow, nunca índice de `analysisCurve`
[x] conservação é intra-simulação; universos com doses diferentes não comparam eliminated/administered/counts
[x] horizonte 10,5 T½ e milestone instantâneo de 0,1%≈log2(1000) permanecem coerentes
[x] âncoras de reconstituição 5/2/250=10 U, 5/2/3000=120 U e 5/4/3000=240 U permanecem coerentes

## Tipos, dataset e histórico

[x] `ScenarioSource.library` resolve somente SingleSubstance+PharmacokineticProfile
[x] Blend não é Scenario simples no Comparador; CTA V1 direciona Blend apenas a Protocolos
[x] Protocolos mantêm um input por componente e proíbem média PK do Blend
[x] `CustomProfileOwner.official` resolve somente SingleSubstance oficial, nunca Blend
[x] `ProtocolComponentKey=(protocolId,componentId)` identifica séries e inputs históricos
[x] série↔input de protocol-analysis é bijeção por chave, independente da ordem dos arrays
[x] mesmo `componentId` em protocolos diferentes não colide
[x] VISUALIZAR usa snapshots; REABRIR usa scenarioSnapshot/protocolsSnapshot; RECALCULAR usa inputs científicos
[x] `HistoricalProfileRef` possui um único contrato derivado e nunca é persistido
[x] customProfiles permanece fonte canônica; custom_profile e manual continuam distintos
[x] DatasetIdMigration de profile usa identidade composta e rejeita ciclos
[x] Favorites diferencia namespaces official/custom

## Temporal, recorrência e migração

[x] Temporal é obrigatório; GAP=later e OVERLAP=earlier permanecem congelados
[x] `IsoWeekday` usa ISO/Temporal 1=segunda…7=domingo, sem duplicatas e em ordem canônica
[x] HormoTracker legado foi confirmado como JS `Date.getDay()`: 0=domingo…6=sábado
[x] mapping legado `0→7`, `1..6→1..6` e fixtures domingo/segunda/sábado estão especificados
[x] rotação semanal usa módulo ISO não negativo e preserva semântica civil/DST

## Persistência, export e segurança

[x] bytes são medidos na serialização JSON UTF-8 efetivamente exportada
[x] ConfigPayload≤15 MiB e Config file≤16 MiB
[x] CalculationRecord≤8 MiB, history≤47 MiB e HISTORY_RECORDS_MAX=500
[x] FullBackup file≤64 MiB e contém exatamente o histórico efetivamente persistido
[x] FIFO considera contagem, bytes do histórico e bytes do FullBackup; registro novo não é removido silenciosamente
[x] import possui ações por kind e rejeita `File.size` acima do cap antes de leitura/parse
[x] round-trip same-version é invariante; import nunca ativa persistência
[x] CSP e Referrer Policy usam metas separadas; `referrer-policy` não aparece na string CSP
[x] PWA, BASE_PATH, manifest gerado, GitHub Pages e ausência de CDN runtime permanecem coerentes

## Testes, aceite e roadmap

[x] §13 cobre Bateman estável, cutoff total, chave histórica, Blend, budgets, weekday e CSP/referrer
[x] teste `50%@1T½` está restrito à absorção instantânea
[x] §14 contém critérios verificáveis sem afirmar execução futura
[x] E1 cobre CSP/referrer; E3–E4 estabilidade/cutoffClose; E5–E6 budgets; E7 weekday; E10 Blend; E12 chave histórica
[x] decisões congeladas §18 foram atualizadas apenas nos contratos diretamente afetados
[x] revisão transversal de matemática, tipos, histórico, persistência, Temporal, dataset, segurança, testes, aceite e roadmap concluída
[x] nenhuma contradição objetiva conhecida permanece

## Estado documental e do repositório nesta tarefa

[x] somente `FARMakit-especificacao-final.md` foi alterado pelo commit documental
[x] nenhum código FARMakit, scaffold, `package.json` ou `src/` foi criado
[x] `docs/DIARIO-DE-BORDO.md` não foi criado; criação continua reservada à E1
[x] `README.md` permaneceu intacto
[x] `.token-optimizer/` permaneceu intacto
[x] nenhuma aplicação legada foi alterada
[x] nenhuma etapa E1–E15 foi executada

### Execução futura — ainda NÃO realizada

[ ] scaffold criado — E1
[ ] docs/DIARIO-DE-BORDO.md criado — E1
[ ] spike CSP×Chart.js/referrer executado e aprovado — E1
[ ] typecheck real executado — implementação
[ ] testes unitários reais executados — E4+
[ ] property tests reais executados — E4
[ ] suíte cutoffClose executada — E4
[ ] testes de budgets/round-trip/FIFO executados — E6
[ ] fixtures de migração weekday executadas — E7
[ ] Playwright real executado — etapas de UI
[ ] axe/NVDA executados — E13
[ ] CI completo aprovado — implementação
[ ] benchmark calibrado — E13
[ ] README final criado — E14
[ ] GitHub Pages configurado/publicado — deploy

---

**STATUS: ESPECIFICAÇÃO PRONTA PARA IMPLEMENTAÇÃO GREENFIELD.**
**PENDÊNCIA NÃO BLOQUEADORA DE DEPLOY:** confirmar nome público, permanência do slug/repositório `farmacologico` e configuração do GitHub Pages antes da publicação.

A implementação será solicitada em tarefa separada em modo Code.
