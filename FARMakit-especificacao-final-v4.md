# FARMakit — ESPECIFICAÇÃO FINAL APÓS ERRATA TÉCNICA
## Versão 4 — consolidação final | Substitui integralmente a versão 3
### Planejamento greenfield — sem implementação

**Contexto de workspace reconhecido:** projeto **GREENFIELD** no repositório existente `Masselorc/farmacologico` (branch `main`), contendo apenas este documento e um README placeholder ("# farmacologico / App farmacologico"). **Não existe código FARMakit** — a aplicação será construída do zero em tarefa futura. As aplicações `Masselorc/tabela-farmacos`, `Masselorc/meiavida` e `Masselorc/calculadora-peptideos` são **referências externas** (funcional, matemática, UX e formatos legados de migração) — nunca base de refatoração local. Termos como "portar/preservar/paridade/migrar" significam *reproduzir futuramente comportamento, regra matemática, UX ou formato numa implementação limpa*. A presente especificação é a principal fonte de verdade do produto.

**Fontes de evidência (rodadas anteriores):** `meiavida` lido integralmente em primeira mão; `tabela-farmacos` com recuperação dirigida; `calculadora-peptideos` inline integral. Legenda: [CÓD] código · [CALC] cálculo independente · [TESTE] teste automatizado legado · [INF] inferência · [N/C] não confirmado.

---

# 1. Correções desta errata técnica estrutural (v3 → v4)

| # | Correção | Decisão final |
|---|---|---|
| 1 | DisplayWindow ≠ CalculationWindow | Janela de cálculo = displayStart − requiredPkLookback até displayEnd |
| 2 | Lookback × cutoff | Política ÚNICA: `requiredPkLookback(params) = cutoffAgeFor(params)` no PK Engine |
| 3 | Protocol simplificado | Sem snapshots no Protocol; `ProtocolComponent` autocontido (id, source, selected, snapshot, cor) |
| 4 | Dose derivada | `componentDoseMg = totalDoseMg × proportion`; migração soma subprotocolos legados |
| 5 | Blend → N inputs | Uma `SimulationInput` por componente; proibida média de T½/Tmax |
| 6 | Custom autossuficiente | Funciona sem Biblioteca/dataset |
| 7 | Export types | `ExportBundleBase` + discriminated union válida; `ConfigPayload`/`BackupCounts` explícitos |
| 8 | Versionamento por motor | `SimulationOutput` registra só `pkEngineVersion`; orquestração registra pk+recurrence |
| 9 | Teste de capacidade | 5/2/**3000** ⇒ 120 U (e 5/4/3000 ⇒ 240 U); 6000 mcg fica exclusivo de DOSE_EXCEEDS_VIAL_CONTENT |
| 10 | Histórico: snapshot ≠ engine executável | Ações VISUALIZAR/REABRIR/RECALCULAR; engines antigos fora da V1 |
| 11 | Histórico por ação explícita nos 3 módulos | Botões "Salvar análise/no histórico" |
| 12 | TmaxSpecification | union `unknown\|instant\|value\|range` no perfil científico |
| 13 | DurationRange normaliza unidades | Validação após `toMs`; 24 h–2 d é válido |
| 14 | DST com semântica única | Temporal API (polyfill bundled V1); GAP→'later', OVERLAP→'earlier' |
| 15 | Migração pergunta timezone | `migrationAssumedTimeZone` no MigrationReport; default = dispositivo |
| 16 | calendarTimeZone | `AppSettings.calendarTimeZone`; calendário/chips exibem nesse fuso |
| 17 | Chips 20:00 usam lookback | Materializam ocorrências desde evaluationInstant − requiredPkLookback |
| 18 | Cores legadas fora da paleta | `DisplayColor{paletteColor, legacyOriginalHex?}` + remapeamento determinístico reportado |
| 19 | componentOnly | Entidades internas do dataset não aparecem no seletor; 19 entidades / 16 visíveis |
| 20 | Metadados do blend | `provenance`+`reviewStatus` diretos no `BlendSubstance` |
| 21 | graduationUnits finito >0 | Aceita 0,5; borda: warning sse erroRel > 0,05 (10 U @1 U ⇒ sem warning) |
| 22 | Oráculo estável perto ka≈ke | Testes usam g(y)=y/expm1(y)+Taylor, nunca ln(ka/ke)/(ka−ke) cru |
| 23 | Não-finito inesperado ≠ zero | Underflow esperado ⇒ 0; caso contrário `NUMERIC_FAILURE` |
| 24 | BASE_PATH no build | Raiz versionada `app.config.ts` alimenta vite.config, PWA e runtime |
| 25 | Repositório confirmado | `Masselorc/farmacologico` existe; pendência reformulada (slug/nome/Pages antes do deploy) |
| 26 | Spike CSP×Chart.js em E1 | Gate obrigatório: build mínimo produtivo sem violação de CSP |
| 27 | analysisCurve × DisplayPoints | Ciência independe de pixels; renomeação `curve→analysisCurve` |
| 28 | Log e zeros | LOG_EPSILON clipa ≤ε; série inicia na 1ª contribuição positiva; ciência intacta |
| 29 | FullBackup autossuficiente | Registros carregam display-meta para renderização sem dataset atual |
| 30 | Escopo E10A/E10B | Recomendados não bloqueiam release |
| 31 | README futuro | Substituição do placeholder como critério de release (não nesta tarefa) |
| 32 | Unidades do exemplo ka | ka=0,36 dia⁻¹ ⇒ Tmax≈4,649224 d (sem notação dimensional confusa) |

Rodadas anteriores (auditoria v2 e revisão arquitetural v3) permanecem válidas onde aqui não modificado; seus históricos detalhados ficam arquivados nas versões 2 e 3 deste documento.

---

# 2. Visão final do produto

**Nome provisório:** FARMakit (nome público definitivo pendente do proprietário — seção 18/19). **Repositório atual:** `Masselorc/farmacologico` (confirmado). **Natureza:** implementação greenfield — nenhuma linha da nova aplicação existe ainda; as três apps legadas são referências externas e fontes de formato de migração.

**Finalidade:** aplicação única, estática, 100% client-side, em pt-BR, para simulação farmacocinética educacional e **cálculo matemático de reconstituição e conversão de volumes/unidades**, reunindo: Biblioteca de substâncias com perfis contextuais, Comparador de meia-vida multi-cenário em tempo real, calculadora de Reconstituição, calendário de Protocolos com gráficos temporais e Histórico reproducível por snapshot.

**Módulos:** Biblioteca · Meia-vida (Comparador) · Reconstituir · Protocolos · Histórico (+ Ajustes/Dados).

**Público:** usuário leigo-informado que acompanha próprio tratamento sob condução profissional; nada destina-se a prescrição ou orientação de preparo.

**Limites declarados na UI:** modelo de um compartimento, cinética linear, superposição, biodisponibilidade relativa F=1; não incorpora variabilidade individual, volume de distribuição nem modelos multicompartimentais; não é medição sanguínea; não substitui avaliação clínica, prescrição ou monitorização laboratorial. A Reconstituição calcula **exclusivamente a partir da dose informada pelo usuário**.

**Princípio de privacidade:** funcionamento integral sem conta; **zero persistência de dados do usuário sem consentimento explícito** (persistência desligada por padrão). Caches técnicos do PWA armazenam apenas assets — jamais inputs, resultados ou preferências. Nenhum dado sai do dispositivo; sem backend na V1.

**Princípio científico:** parâmetros farmacocinéticos dependem de via, formulação/éster, preparação, população e estudo. Todo parâmetro carrega valor, unidade, contexto, origem e `reviewStatus`. Presets legados são `legacy_unreviewed`/`legacy_unattributed`; dados bibliográficos futuros exigem fonte verificável. Nenhuma referência inventada.

---

# 3. Escopo funcional

## Obrigatório para V1
- Shell/hash routes com os 6 destinos; CSP meta efetiva; paleta fechada; PWA prompt-update; gate E1 (spike CSP×Chart.js).
- **Biblioteca:** busca/fichas/perfis (`route:'unknown'` no legado; faixas com seleção obrigatória; badges); CTAs para Comparador/Protocolos sem preencher doses.
- **Comparador:** cenários (cap UX 20), doses múltiplas, análise ao vivo (relógio 1 s), métricas + `phaseHint`, marcos, Detalhes do modelo, flip-flop warning, gráfico com eixo-X rotulado/modos absoluto+normalizado/log c/ política de zeros, **“Salvar análise no histórico”**.
- **Reconstituição:** tela única automática; erros `DOSE_EXCEEDS_VIAL_CONTENT`/capacidade (mensagem neutra)/precisão por graduação; régua; copiar; **“Salvar no histórico”**.
- **Protocolos:** entidade canônica com componentes autocontidos; presets legados (19 entidades/16 visíveis); calendário multi-fuso (`calendarTimeZone`) desktop/mobile Agenda-Semana-Mês; drag+teclado+Desfazer; chips 20:00 com lookback; gráficos combinados/individuais com guias; materialização por CalculationWindow; **“Salvar análise no histórico”**.
- **Histórico:** registros imutáveis tipados; ações VISUALIZAR/REABRIR/RECALCULAR; versões por motor.
- **Ajustes/Dados:** consentimento opt-in; desativar = export opcional→confirmação→apagar; ConfigExport/FullBackup; migração assistida (timezone assumido + remapeamento de cores reportados); quarentenas ≤5; falha IndexedDB formal; banner de atualização.
- **E10A — integrações obrigatórias:** histórico completo, reabrir, Biblioteca→Comparador, Biblioteca→Protocolos, export/import, versionamentos (pk/recurrence/reconstitution/dataset).

## Recomendado (E10B) — NÃO bloqueia a V1
Share URL comprimido; favoritos avançados; tabela comparativa consolidada; zoom/pan; PNG do gráfico; duplicar protocolo; filtros avançados.

## Pós-V1
Simulação de incerteza a partir de faixas; steady-state/trough/flutuação analíticos; enriquecimento bibliográfico (DOI/PMID) e novos compostos; múltiplos perfis; PDF; i18n en/es; sincronização opcional; U-40; modelagem explícita de F≠1.

---

# 4. Regras matemáticas definitivas

Convenção global: internamente **ms** e **mg**; IEEE-754 duplo; **arredondamento/formato somente na apresentação** (Intl pt-BR); persistência em precisão plena; conversões centralizadas. **Tolerâncias oficiais** (`domain/shared/tolerances.ts`): `RATES_RTOL=1e-10`, `AMOUNT_RTOL=1e-9`, `CONSERVATION_RTOL=1e-9`, `TMAX_RECOMPOSITION_RTOL=1e-9`, `PEAK_TIME_ABS_TOL=60_000 ms`, `MILESTONE_TIME_ABS_TOL=60_000 ms`. Determinismo intra-plataforma; entre engines JS, conformidade pelas tolerâncias. Proibido "exato/bit a bit/diff 0" em ponto flutuante.

**Não-finito (política):** underflow esperado (ex.: `e^(−Δ)` com Δ grande) resulta legitimamente em 0; qualquer não-finito **inesperado** (NaN/±∞ não atribuível a underflow documentado) ⇒ erro `NUMERIC_FAILURE` (ou warning `EXTREME_PARAMETERS` quando parametrizado), nunca zero farmacocinético silencioso.

## Farmacocinética
- Conversões: `min=60 000 ms`; `h=3 600 000 ms`; `d=86 400 000 ms`; `mcg=0,001 mg`; `g=1000 mg`.
- Civil→instante: **Temporal API** (`Temporal.ZonedDateTime`, polyfill bundled na V1). Proibido converter civil com `new Date(string)` ou aritmética manual de offset.
- **Política DST única (dois casos nomeados, independentes):**
  - **GAP** (horário civil inexistente; relógio salta 01:59→03:00, ex.: 02:30 não ocorre): interpretar com disambiguation **'later'** ⇒ instante = primeiro instante válido após o início do gap.
  - **OVERLAP** (horário ocorre duas vezes no retorno): usar disambiguation **'earlier'** ⇒ primeira ocorrência.
  - Essas duas regras são deliberadamente distintas e aplicadas identicamente em Protocolos, Recurrence Engine, migrações e testes. As expressões vagas "primeiro horário válido" e "offset posterior" não são usadas como sinônimos.
- Eliminação: `ke=ln2/T½` (erro se ≤0/não finito).
- Absorção: `g(y)=y/expm1(y)=ke·Tmax`, `g:ℝ→(0,∞)` decrescente ⇒ solução única ∀Tmax>0; Taylor `1−y/2+y²/12` p/ `|y|<1e-8`; bisseção 180 iter.; bracket meiavida; `ka=ke·e^ŷ`. Ramos: `Tmax=0⇒ka=null`; `<T½/ln2⇒ka>ke`; `≈T½/ln2⇒degênero`; `>T½/ln2⇒ka<ke` (flip-flop, warning). Sem restrições artificiais.
- Âncoras (rtol 1e-4, detector grosseiro): T½ 6 d/Tmax 2 d ⇒ `ka=1,34159 dia⁻¹`; **ka=0,36 dia⁻¹ ⇒ Tmax≈4,649224 d**. Identidade principal testada PELA EQUAÇÃO (seção 13), não pelos valores do texto. Verificação: f(1,34158755)=2,000000000000 [CALC].
- Central por dose (Δt≥0): instantânea `dose·e^(−ke·Δt)`; degênero (`|ka−ke|≤max(ka,ke)·1e-8`) `dose·ka·Δt·e^(−ke·Δt)`; Bateman geral; clamp `[0,dose]` **aplicado somente a valores finitos** (ver política não-finito acima).
- Depósito `dose·e^(−ka·Δt)` (ka≠null); eliminado `max(0, adm−central−depósito)`; superposição linear; conservação com `CONSERVATION_RTOL`.
- **Cutoff/lookback — política ÚNICA:** `cutoffAgeFor(selected) = max(40·T½term + tmaxMs, tmaxMs + 86_400_000)` ms (resíduo por administração ≤0,5⁴⁰≈9,1e-13 < AMOUNT_RTOL). Esta mesma função governa: (a) descarte de contribuições antigas dentro do motor; (b) **lookback** de materialização: `requiredPkLookback(params[]) = maxᵢ cutoffAgeFor(paramsᵢ)`. Nenhuma feature calcula lookback próprio.
- **Janelas:** `DisplayWindow{startMs,endMs}` (o que se vê) e `CalculationWindow{startMs,endMs}` com `calculationEnd=displayEnd`, `calculationStart=displayStart−requiredPkLookback(...)`. Fluxo: DisplayWindow → derive lookback (params efetivos; blends = máximo entre componentes) → CalculationWindow → `generateOccurrences(schedule, calcStart, calcEnd)` → SimulationInput[] → PK Engine → recorte/apresentação na DisplayWindow. O Recurrence Engine continua trabalhando SOMENTE por janela — a janela dele é a de cálculo.
- Análise: taxa terminal `min(ke,ka)`; horizonte `lastDose+max(10,5·T½term, 2·Tmax, 2·T½)`; amostragem de análise default 1600 intervalos + pontos em cada dose e `dose+tmax`; pico (varredura+ternária 80); marcos `[50,25,12.5,10,5,1,0.1]%` (varredura reversa+bisseção 80; null⇒warning). **Invariante dos marcos:** `targetMg ≤ peak.amountMg`; `timeMs ≥ peak.timeMs − MILESTONE_TIME_ABS_TOL`; tempos não decrescentes com % decrescentes (tolerância); `targetMg=peak·pct/100` rtol 1e-12.
- **Ciência × pixels:** resultados (pico/marcos/estado) derivam de `analysisCurve`/pontos críticos, nunca da resolução de renderização; `sampleForDisplay(analysisCurve, constraints) → DisplayPoints` apenas reamostra.

## Reconstituição
- `concentração = massa_mg×1000 ÷ volume_mL`; `volume_dose = dose_mcg ÷ concentração`; `unidades = volume_dose × syringe.unitsPerMl`; `rendimento_teorico_maximo = ⌊massa×1000 ÷ dose⌋` (rotulado teórico).
- `dose_mcg > massa_mg×1000` ⇒ erro bloqueante `DOSE_EXCEEDS_VIAL_CONTENT`.
- Precisão: `erroRel = 0,5·graduationUnits/unidadesPedidas`; warning `LOW_SYRINGE_PRECISION` **sse erroRel > GRADUATION_ERROR_WARN_THRESHOLD (=0,05, estrito)**. Exemplo g=1 U: 9 U ⇒ 0,0556 ⇒ warning; 10 U ⇒ 0,05 ⇒ **sem warning**. Threshold = configuração de UX ajustável, não padrão farmacêutico.
- Propriedade: massa/dose fixos ⇒ diluente↑ ⇒ unidades↑ (AMOUNT_RTOL).

## Recorrência (engine independente)
- Única: 1 ocorrência. Semanal: dias selecionados dentro da janela pedida; término inclusivo `start+(semanas·7−1)` dias civis; `1≤weeks≤520`.
- `generateOccurrences(schedule, rangeStartMs, rangeEndMs)` ascendente; proibido materializar horizonte completo.
- Deslocamento Δ (dias civis medidos no **calendarTimeZone**, origem→destino do arrasto): `schedule.startDate += Δ` (civil, no fuso do protocolo); `localTime` e `timeZone` preservados; semanal rotaciona weekdays por Δ. Se a nova data civil cruzar transição no fuso do protocolo, o instante resultante segue a política DST — comportamento aceito e documentado.
- Componente derivado: `componentDoseMg = protocol.totalDoseMg × component.proportion` (**nunca persistido**).

---

# 5. Arquitetura técnica final (DECIDIDA)

- **React 19 + TypeScript strict + Vite**; dependências bundled (inclui **polyfill Temporal** na V1); chunks por rota. **Projeto greenfield** no repo existente `Masselorc/farmacologico`.
- **Roteamento:** React Router Hash. **Deploy:** GitHub Pages (habilitação/configuração pendente do proprietário — seção 19); caminho conceitual `/farmacologico/` se slug mantido.
- **Configuração de build única:** arquivo raiz versionado **`app.config.ts`** exporta `{ basePath, productName }`. Consumidores: `vite.config.ts` (base), geração do manifest/SW (vite-plugin-pwa), e runtime via `src/app/config/basePath.ts` (re-export tipado). Nenhuma string de path duplicada.
- **Fluxo canônico:**
  ```
  Protocol/Cenário (civis + snapshots)
    ↓ deriveCalculationWindow(displayWindow, params)      [domain/simulation]
  CalculationWindow
    ↓ domain/recurrence::generateOccurrences(schedule, calcWin)
  Occurrence[]
    ↓ domain/simulation::assembleScenarioInputs/assembleProtocolInputs
  SimulationInput[]   (uma POR COMPONENTE em blends; números resolvidos)
    ↓ domain/pk::analyze
  SimulationOutput {analysisCurve, peak, milestones, state, warnings, metadata:pkEngineVersion…}
    ↓ sampleForDisplay + presentation (phaseHint, gráficos)
  ```
- **Motores:** `pk` (não conhece agenda/recurrence/version de outros motores), `recurrence` (não conhece PK), `reconstitution`. Orquestração (`features/*` + `domain/simulation`) conhece os participantes e registra `ProtocolAnalysisMetadata{pkEngineVersion, recurrenceEngineVersion}`.
- **Estado:** Zustand só para estado compartilhado/persistível; UI efêmera em componentes.
- **Validação:** LIMITS (fonte única de bounds) → schemas Zod → props HTML via `boundsFromLimits()`; sem introspecção de Zod. Erros de domínio `{code,params}`; pt-BR apenas em `app/i18n/pt-BR.messages.ts`.
- **Persistência:** opt-in; localStorage (consent/settings/favoritos/receitas); IndexedDB (`idb`) p/ cenários/protocolos/histórico; quarentena c/ retenção ≤5; dois bundles de export (seção 11).
- **Gráficos:** Chart.js 4 bundled; wrappers `CompareChart`/`KineticChart`; consumem `analysisCurve` via `sampleForDisplay`.
- **GATE E1 — spike CSP×Chart.js:** build mínimo (React + Chart.js responsivo + CSP final + paleta + Vite production) executado em navegador; aceite: **zero violações de CSP**; incompatibilidade ⇒ resolver ANTES de prosseguir para módulos gráficos.
- **PWA:** vite-plugin-pwa `registerType:'prompt'`; banner “Nova versão disponível” → confirmação → ativação → reload; cache técnico só de assets.
- **CI/CD:** `npm ci` → lint → typecheck → type-tests (.test-d.ts) → unit/property → build → Playwright contra `vite preview` (assert zero violações CSP em console) → Pages após CI verde no main.
- **CSP (meta, diretivas efetivas):** `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` + `referrer-policy: no-referrer`. **Documentado:** `frame-ancestors` é ineficaz via meta e GH Pages não expõe headers customizados — anti-framing por header NÃO está implementado na V1. Proibições: eval/new Function/innerHTML com dado do usuário/CDN runtime.
- **Cores:** `PALETTE_ALLOWED = PALETTE_MODERN ∪ LEGACY_COLORS` compilada em tokens/classes `.tone-*`; picker restrito à paleta; `DisplayColor{paletteColor, legacyOriginalHex?}` preserva histórico migrado; zero estilo inline dinâmico.
- **Decimal:** `parseLocaleDecimal` central (vírgula ou ponto simples; rejeita ambíguos/múltiplos separadores/vazio).

---

# 6. Modelo de dados final (ESPECIFICAÇÃO)

```ts
// ── Primitivos ──────────────────────────────────────────────
type LocalDate  = string;   // "YYYY-MM-DD"
type LocalTime  = string;   // "HH:mm"
type InstantIso = string;   // ISO-8601 absoluto (Z/offset)
type TimeZoneId = string;   // IANA
type TimeUnit = 'minutes'|'hours'|'days';
type MassUnit = 'mcg'|'mg'|'g';

interface DurationValue { value:number; unit:TimeUnit }              // finite > 0
interface DurationRange { min:DurationValue; max:DurationValue }
// VALIDAÇÃO: toMs(min) <= toMs(max) APÓS normalização — unidades podem diferir (24h..2d ✓)
type Duration = DurationValue | DurationRange;

interface DisplayWindow    { startMs:number; endMs:number }
interface CalculationWindow{ startMs:number; endMs:number }

type PaletteColorId = string;                                        // token de PALETTE_ALLOWED
interface DisplayColor { paletteColor:PaletteColorId; legacyOriginalHex?:string }

// ── Fontes/versões/revisão ──────────────────────────────────
type Provenance = 'legacy_unattributed'|'literature';
type ReviewStatus = 'legacy_unreviewed'|'needs_review'|'reviewed';
interface Source { id:string; doi?:string; pmid?:string; url?:string; title?:string;
  authors?:string[]; year?:number; population?:string; notes?:string; reviewedAt?:InstantIso }
interface DatasetMetadata { datasetVersion:number; updatedAt:InstantIso; substanceCount:number;
  changelog?:Array<{version:number;date:InstantIso;summary:string}> }
// datasetVersion muda SOMENTE com conteúdo científico (parâmetro/perfil/source/contexto).
interface EngineVersions { pk:string; recurrence:string; reconstitution:string }

// ── Especificação de Tmax ───────────────────────────────────
type TmaxSpecification =
  | { kind:'unknown' }                       // usuário informa valor antes de simular
  | { kind:'instant' }                       // absorção instantânea ⇒ tmaxMs=null
  | { kind:'value';  value:DurationValue }
  | { kind:'range';  range:DurationRange };  // exige escolha explícita dentro da faixa

// ── Biblioteca ──────────────────────────────────────────────
type SubstanceCategory = 'peptide'|'steroid'|'steroid_ester'|'hormone'|'other';
type AdministrationRoute = 'intramuscular'|'subcutaneous'|'sublingual'|'oral'|'transdermal'|'unknown';

interface PharmacokineticProfile {
  id:string; route:AdministrationRoute; formulation?:string; ester?:string;
  halfLife:Duration;
  tmaxSpec:TmaxSpecification;                // substitui tmax opcional — unknown ≠ instant ≠ 0
  /** METADADO BIBLIOGRÁFICO NA V1 — não participa de cálculo (motor usa F relativo = 1). */
  bioavailability?:number|Range;
  populationContext?:string; sourceIds:string[];
  provenance:Provenance; reviewStatus:ReviewStatus;
}
interface Range { min:number; max:number }

interface SingleSubstance {
  kind:'single'; id:string; slug:string; name:string; aliases:string[];
  category:SubstanceCategory; tags:string[];
  profiles:PharmacokineticProfile[]; sourceIds:string[];
  componentOnly?:boolean;   // true ⇒ entidade interna (ex.: ésteres do LANDERGOLD);
                            // NÃO aparece no seletor/Biblioteca pública
}
interface BlendComponent {
  substanceId:string; profileId:string;     // DEVEM resolver no dataset (sem referência órfã — testada)
  proportion:number;                        // Σ=1±1e-9
  displayColor?:DisplayColor;
}
interface BlendSubstance {
  kind:'blend'; id:string; slug:string; name:string; aliases:string[]; tags:string[];
  components:BlendComponent[]; sourceIds:string[];
  provenance:Provenance; reviewStatus:ReviewStatus;   // próprios do blend, não herdados
}
type Substance = SingleSubstance | BlendSubstance;

interface CustomProfile { id:string; substanceId:string; profile:PharmacokineticProfile }
interface CustomSubstance extends SingleSubstance {}
interface ReconstitutionRecipe { id:string; name:string; input:ReconstitutionInput;
  createdAt:InstantIso; updatedAt:InstantIso }

// ── Parâmetros selecionados (camada intermediária) ──────────
interface SelectedPkParameters {
  halfLifeMs:number;                 // >0
  tmaxMs:number|null;                // null ⇒ instantânea
  selectionNote?:{ range:{halfLife?:DurationRange; tmaxRange?:DurationRange}; chosenBy:'user' };
}
interface PkParametersSnapshot {     // congela o efetivamente usado (por componente/cenário)
  halfLife:DurationValue; tmax:DurationValue|null;
  selectedFromRange?:{ halfLife?:DurationRange; tmax?:DurationRange };
}

// ── Comparador ──────────────────────────────────────────────
interface Dose { id:string; amountMg:number|null; time:InstantIso }
interface Scenario {
  id:string; name:string; color:PaletteColorId;
  substanceRef?:{ substanceId:string; profileId:string; datasetVersion:number };
  pkParametersSnapshot?:PkParametersSnapshot;
  selected:SelectedPkParameters;     // sempre presente ⇒ cenário custom funciona sozinho
  displayUnit:MassUnit; doses:Dose[];
}

// ── Protocolos (entidade lógica ÚNICA; autocontida) ─────────
type Recurrence = { type:'single' } | { type:'weekly'; weekdays:number[]; weeks:number };
interface Schedule { startDate:LocalDate; localTime:LocalTime; timeZone:TimeZoneId; recurrence:Recurrence }
type ScheduleShape = Schedule; // alias p/ engine

interface ProtocolComponent {
  id:string;                         // ID próprio (associação PK nunca por índice)
  label:string;
  proportion:number;
  source:
    | { type:'library'; substanceId:string; profileId:string; datasetVersion:number }
    | { type:'custom' };
  selectedPkParameters:SelectedPkParameters;
  pkParametersSnapshot:PkParametersSnapshot;
  displayColor:DisplayColor;
}
interface Protocol {
  id:string; name:string;
  totalDoseMg:number;                // dose por administração (soma lógica dos componentes)
  schedule:Schedule;
  components:ProtocolComponent[];    // 1 = simples; N = blend
  createdAt:InstantIso; updatedAt:InstantIso;
}
// DERIVAÇÃO: componentDoseMg_i = totalDoseMg × components[i].proportion  (nunca persistida)

// ── Recorrência/janelas ─────────────────────────────────────
interface Occurrence { instantMs:number; scheduleLocalDate:LocalDate }
// Posicionamento no calendário usa localDateIn(instantMs, calendarTimeZone).

// ── Simulação (entrada 100% numérica) ───────────────────────
interface SimulationDose { id:string; amountMg:number; timeMs:number }
interface SimulationInput {
  halfLifeMs:number; tmaxMs:number|null;
  doses:SimulationDose[];
  nowMs:number;
  analysisCurveSteps?:number;        // default 1600 (paridade meiavida) — INDEPENDENTE da exibição
}
interface SimulationMetadata {
  pkEngineVersion:string;            // ÚNICO versionamento no output do PK Engine
  kePerMs:number; kaPerMs:number|null; terminalHalfLifeMs:number;
  horizonEndMs:number; analysisCurveSteps:number;
  contributionCutoffHalfLives:40; contributionCutoffAgeMs:number;
}
interface SimulationOutput {
  currentState:{ administeredMg:number; centralMg:number; depotMg:number; eliminatedMg:number;
    administeredCount:number; plannedCount:number;
    centralPercent:number; depotPercent:number; eliminatedPercent:number };
  analysisCurve:Array<{timeMs:number; amountMg:number}>;   // ciência (antes: "curve")
  peak:{ timeMs:number; amountMg:number };
  milestones:Array<{percentage:number; targetMg:number; timeMs:number|null}>;
  administrations:Array<{doseId:string; timeMs:number; amountMg:number}>;
  warnings:PkWarningCode[];
  metadata:SimulationMetadata;
}
type DisplayPoint = { timeMs:number; amountMg:number; clippedBelowLogEpsilon?:boolean };

// Heurística de apresentação — FORA do output físico:
type PhaseHint='awaiting_first_dose'|'absorbing_latest'|'awaiting_next_planned'|'terminal_decline';
// derivePhaseHint(...) vive em features/comparator/lib.

type PkWarningCode = 'FLIP_FLOP_ABSORPTION'|'NEAR_DEGENERATE_RATES'
  |'MILESTONE_NOT_REACHED'|'EXTREME_PARAMETERS';

// ── Reconstituição ──────────────────────────────────────────
interface Syringe { family:'U-100'; capacityUnits:number; unitsPerMl:100;
  graduationUnits:number /* finite > 0 (aceita 0,5) */ }
interface ReconstitutionInput { vialMassMg:number; diluentVolumeMl:number; desiredDoseMcg:number;
  syringe:Syringe; label?:string }
interface ReconstitutionResult { concentrationMcgPerMl:number; doseVolumeMl:number;
  syringeUnits:number; theoreticalMaxDoses:number; capacityExceeded:boolean;
  warnings:ReconstitutionWarningCode[];
  metadata:{ reconstitutionEngineVersion:string } }
type ReconstitutionWarningCode='CAPACITY_EXCEEDED'|'LOW_SYRINGE_PRECISION'|'THEORETICAL_YIELD';

// ── Erros de domínio ────────────────────────────────────────
interface DomainError { code:DomainErrorCode; params?:Record<string,number|string> }
type DomainErrorCode = 'HALF_LIFE_NON_POSITIVE'|'TMAX_NEGATIVE'|'NO_DOSES'|'INVALID_DOSE_AMOUNT'
  |'INVALID_DOSE_TIME'|'INVALID_HORIZON'|'ABSORPTION_SOLVER_FAILURE'|'SCENARIO_NAME_REQUIRED'
  |'DOSE_EXCEEDS_VIAL_CONTENT'|'INVALID_RECONSTITUTION_INPUT'|'BLEND_PROPORTIONS_MUST_SUM_ONE'
  |'NUMERIC_FAILURE';

// ── Histórico reproducível (tipado; snapshot-first) ──────────
interface RecordDisplayMeta { title:string; color:PaletteColorId; note?:string }
interface CalculationRecordBase { id:string; createdAt:InstantIso;
  substanceProfileIds:string[]; display:RecordDisplayMeta }
type CalculationRecord = CalculationRecordBase & (
  | { type:'pharmacokinetics';
      versions:{ pkEngineVersion:string; recurrenceEngineVersion?:string; datasetVersion:number };
      input:SimulationInput;
      resultSnapshot:Pick<SimulationOutput,'currentState'|'analysisCurve'|'peak'|'milestones'|'warnings'|'metadata'> }
  | { type:'reconstitution';
      versions:{ reconstitutionEngineVersion:string; datasetVersion:number };
      input:ReconstitutionInput; resultSnapshot:ReconstitutionResult }
  | { type:'protocol-analysis';
      versions:ProtocolAnalysisVersions;
      calculationWindow:{ startMs:number; endMs:number };       // janela DE CÁLCULO usada
      timeZone:TimeZoneId;                                      // calendarTimeZone vigente
      protocolsSnapshot:Protocol[];
      simulationInputs:SimulationInput[];                       // inputs finais por componente
      resultSnapshot:Array<{ componentLabel:string; color:PaletteColorId;
        state:SimulationOutput['currentState']; peak:SimulationOutput['peak'];
        milestones:SimulationOutput['milestones']; warnings:PkWarningCode[] }> }
);
interface ProtocolAnalysisVersions { pkEngineVersion:string; recurrenceEngineVersion:string; datasetVersion:number }

// ── Persistência (estado do USUÁRIO; sem dataset oficial) ───
interface AppSettings { theme:'system'|'light'|'dark';
  calendarTimeZone:TimeZoneId;             // default: fuso do dispositivo no 1º uso
  graduationWarnThreshold?:number }
interface Favorites { substanceIds:string[]; recipeIds:string[] }
interface PersistedStateV1 { schemaVersion:1; settings:AppSettings; favorites:Favorites;
  customSubstances:CustomSubstance[]; customProfiles:CustomProfile[]; recipes:ReconstitutionRecipe[];
  scenarios:Scenario[]; protocols:Protocol[] }
// Consentimento NÃO faz parte do estado restaurável.

// ── Exportação (union TypeScript VÁLIDA) ────────────────────
interface ExportBundleBase { schemaVersion:1; exportedAt:InstantIso;
  datasetVersion:number; engineVersions:EngineVersions }
interface ConfigPayload { settings:AppSettings; favorites:Favorites;
  customSubstances:CustomSubstance[]; customProfiles:CustomProfile[];
  recipes:ReconstitutionRecipe[]; scenarios:Scenario[]; protocols:Protocol[] }
interface ConfigExportBundle extends ExportBundleBase { bundleKind:'config'; payload:ConfigPayload }
interface BackupCounts { records:number; recipes:number; scenarios:number; protocols:number }
interface FullBackupBundle extends ExportBundleBase { bundleKind:'full-backup';
  payload:ConfigPayload; history:CalculationRecord[]; counts:BackupCounts }
type ExportBundle = ConfigExportBundle | FullBackupBundle;

// ── Migração ────────────────────────────────────────────────
interface ColorRemapEntry { protocolId:string; componentId:string;
  legacyOriginalHex:string; mappedPaletteColor:PaletteColorId }
interface MigrationReport {
  sourceKey:'hormoTrackerProtocols'|'meiavida:v2:data';
  ranAt:InstantIso; importedCount:number; discardedCount:number;
  assumedTimeZone:TimeZoneId;                 // suposição escolhida pelo usuário (dados legados sem fuso)
  colorRemaps:ColorRemapEntry[]; quarantined:boolean }
```

**LIMITS (fonte única de bounds → Zod → HTML):**

```ts
export const DOMAIN_LIMITS = { HALF_LIFE_MS_MIN:1 } as const;          // validade matemática
export const SAFETY_LIMITS = {           // protegem CPU/memória — AJUSTÁVEIS pós-benchmark
  IMPORT_BYTES_MAX:2_000_000, SCENARIOS_MAX:20, DOSES_PER_SCENARIO_MAX:2000,
  PROTOCOLS_MAX:200, WEEKS_MAX:520, HISTORY_RECORDS_MAX:500, QUARANTINE_ITEMS_MAX:5,
  HALF_LIFE_DAYS_MAX:3650, TMAX_DAYS_MAX:3650,          // substituem os arbitrários 365/180 do legado
  RECON_VIAL_MASS_MG_MAX:100_000, RECON_DILUENT_ML_MAX:1000, RECON_DOSE_MCG_MAX:1_000_000,
  SYRINGE_GRADUATION_UNITS_MAX:100,                      // finite > 0 (decimais permitidos)
} as const;
export const UX_LIMITS = { NAME_MAX_CHARS:100, FAVORITES_MAX:100,
  GRADUATION_ERROR_WARN_THRESHOLD:0.05 /* warning sse erroRel > 0,05 (estrito) */ } as const;
```

---

# 7. Motores

**PK (`domain/pk`, puro):**
```
eliminationRate(halfLifeMs); absorptionRateFromTmax(halfLifeMs,tmaxMs)
amountFromDose(t,dose,params); depotFromDose(...); totalAmount(...); stateAt(...)
analyze(input:SimulationInput):SimulationOutput      // metadata SOMENTE pkEngineVersion
sampleForDisplay(analysisCurve, constraints):DisplayPoint[]
```
Funções que NÃO existem aqui: geração de administrações, conhecimento de Protocol/weekday/recurrence/outras versões.

**Política cutoff/lookback (mesma função):**
```
domain/pk::cutoffAgeFor(selected:SelectedPkParameters): number      // governa descarte interno
domain/simulation::requiredPkLookback(paramsList:SelectedPkParameters[]): number
                     // === maxᵢ cutoffAgeFor(paramsᵢ)  (invariante testada)
domain/simulation::deriveCalculationWindow(display:DisplayWindow, paramsList): CalculationWindow
                     // { start: display.start − requiredPkLookback, end: display.end }
```
Nenhuma feature calcula lookback próprio.

**Recurrence (`domain/recurrence`, puro):** `generateOccurrences(scheduleShape, rangeStartMs, rangeEndMs)`; `shiftSchedule(schedule, deltaDays)`; `validateRecurrence(r)`.

**Cola (`domain/simulation`, pura):**
```
assembleScenarioInputs(scenario, nowMs): SimulationInput
assembleProtocolInputs(protocol, occurrences): SimulationInput[]   // UM POR COMPONENTE
// componentDoseMg_i = totalDoseMg × proportion_i; injeta selectedPkParameters_i;
// proibidas médias de T½/Tmax e input único artificial para blend.
recordProtocolAnalysis(...)  // orquestração: registra pkEngineVersion + recurrenceEngineVersion
```

**Casos explícitos:** ka>ke; ka<ke (flip-flop+warning); ka≈ke (degênero+warning); Tmax=0 (instantânea); extremos (`EXTREME_PARAMETERS`/`NUMERIC_FAILURE`). Invariantes: conservação, superposição, clamp finito, marcos (seção 4), horizonte 10,5, cutoff único, determinismo intra-plataforma.

**Erros/warnings:** `{code,params}`; catálogo pt-BR de UI preserva literalmente as mensagens herdadas (“A meia-vida deve ser maior que zero.”, “Informe o nome da substância/cenário.”, “Cadastre pelo menos uma dose.”, “Dose N: …”, “Os parâmetros geraram um horizonte farmacocinético inválido.”, “O Tmax informado gera…”, agregação “nome: erro”, caixa “Revise os dados:”) + textos novos (flip-flop educacional; NUMERIC_FAILURE).

---

# 8. Motor de reconstituição (independente)

`calculateReconstitution(input): Result<ReconstitutionResult, DomainError[]>`.

- Entradas finitas >0 e dentro de SAFETY_LIMITS, senão `INVALID_RECONSTITUTION_INPUT`.
- `desiredDoseMcg > vialMassMg×1000` ⇒ **DOSE_EXCEEDS_VIAL_CONTENT** (bloqueia apresentação como realizável; explica a matemática).
- `capacityExceeded` quando unidades>capacityUnits — números continuam retornados; mensagem neutra:
  > “Com os parâmetros informados, a dose corresponde a X U e excede a capacidade selecionada de Y U. Reduzir as unidades por dose exige maior concentração da solução. Revise os parâmetros informados ou a capacidade selecionada.”
- `LOW_SYRINGE_PRECISION` sse `0,5·graduationUnits/syringeUnits > threshold` (default 0,05 estrito; configuração de UX).
- `THEORETICAL_YIELD` anexo ao rendimento. Arredondamento só na apresentação. Metadata registra `reconstitutionEngineVersion`.

**Âncoras atualizadas:** 5 mg/2 mL/250 mcg/U-100(g=1) ⇒ 2500 mcg/mL · 0,1 mL · 10 U · 20 doses teóricas. **Capacidade:** 5/2/3000 ⇒ 2500 mcg/mL · 1,2 mL · **120 U** (>100 U, ≤ conteúdo de 5000 mcg); 5/4/3000 ⇒ 1250 mcg/mL · 2,4 mL · **240 U**. **Conteúdo:** 5 mg + 6000 mcg ⇒ DOSE_EXCEEDS_VIAL_CONTENT. Bordas de graduação (g=1): 9 U ⇒ warning; 10 U ⇒ sem warning.

---

# 9. Biblioteca de substâncias

- Dataset oficial **bundled** (`DATASET_VERSION=1`), todo perfil com `provenance='legacy_unattributed'`, `reviewStatus='legacy_unreviewed'`, **route `'unknown'`** (via não codificada no legado). Nunca persistido no estado do usuário.
- **Entidades internas × seletor:** dataset contém **19 entidades** — 15 singles selecionáveis + **3 ésteres `componentOnly:true`** (propionato, fenilpropionato, isocaproato do LANDERGOLD) + 1 blend. **16 entradas visíveis** no seletor. Invariante testada: nenhuma `BlendComponent` referencia id inexistente.
- `BlendSubstance` possui `provenance`/`reviewStatus` próprios.
- `TmaxSpecification`: unknown (pedir valor ao usuário) / instant (tmaxMs=null) / value (converter) / range (escolha explícita validada dentro da faixa após normalização em ms). Ausência, instantâneo e zero são conceitos distintos.
- `DurationRange` valida `toMs(min)<=toMs(max)` — unidades mistas permitidas (24 h–2 d ✓).
- Faixas exibem fonte e exigem seleção explícita nos CTAs (Biblioteca→Comparador/Protocolos); doses jamais preenchidas.
- Dados validados futuros: `Source` verificável; fluxo needs_review→reviewed; `bioavailability` exibido como metadado (“não aplicado no modelo — F relativo = 1”).

Tabela legada normalizada (unidades em DIAS; cores entram em LEGACY_COLORS):

| Seletor (16 visíveis) | kind | éster/formulação | T½ d | Tmax d |
|---|---|---|---|---|
| Retatrutida | single | — | 6 | 2 |
| Durateston LANDERGOLD | blend | Σ prop. 0,2/0,4/0,4 | — | — |
| ↳ Propionato | comp.(componentOnly) | propionato | 2 | 0,229167 |
| ↳ Fenilpropionato | comp.(componentOnly) | fenilpropionato | 3 | 2 |
| ↳ Isocaproato | comp.(componentOnly) | isocaproato | 8 | 1,5 |
| Enantato de Testosterona | single | enantato | 6 | 1,5 |
| Enantato de Trembolona | single | enantato | 6 | 1,5 |
| Enantato de Masteron | single | enantato | 6 | 1,5 |
| Cipionato de Testosterona | single | cipionato | 7 | 2 |
| Propionato de Testosterona | single | propionato | 2 | 0,23 ⚠ diverge do comp. |
| Undecanoato de Testosterona | single | undecanoato | 21 | 4 |
| Acetato de Trembolona | single | acetato | 2 | 0,5 |
| Decanoato de Nandrolona | single | decanoato | 7 | 2 |
| Primobolan (Enantato) | single | enantato | 6 | 1,5 |
| Boldenona (Undecilenato) | single | undecilenato | 14 | 3 |
| Oxandrolona | single | oral | 0,4 | 0,1 |
| Hemogenin | single | oral | 0,4 | 0,1 |
| Dianabol | single | oral | 0,2 | 0,1 |
| Clembuterol | single | — | 1,5 | 0,15 |

---

# 10. UX e navegação

Abas: Biblioteca · Meia-vida · Reconstituir · Protocolos · Histórico · Ajustes (hash routes). Transições pré-preenchem parâmetros/datas, **nunca doses**; faixas exigem seleção explícita.

- **Histórico — três ações distintas em todos os módulos:**
  - **VISUALIZAR:** sempre do `resultSnapshot` preservado (renderiza sem acessar Biblioteca/dataset atual — FullBackup autossuficiente).
  - **REABRIR:** carrega inputs/snapshots para inspeção/edição (cria rascunho, não registro).
  - **RECALCULAR:** usa a versão ATUAL do motor e cria NOVO registro; nunca altera o original. Com divergência: “Este resultado foi calculado com pk@X. Recalcular utilizará pk@Y e criará um novo registro.”
  - Execução literal com engines antigos: FORA DA V1. Frase oficial: **“histórico rastreável e preservado por snapshot.”**
- **Gravação por ação explícita nos três módulos:** Comparador “Salvar análise no histórico”; Protocolos “Salvar análise no histórico”; Reconstituição “Salvar no histórico”. Cálculos permanecem live/automáticos.
- **Calendário/fuso:** `AppSettings.calendarTimeZone` (default = dispositivo no 1º uso). Células posicionam ocorrências por `localDateIn(instant, calendarTimeZone)`; protocolos de fusos distintos aparecem no dia correto da exibição. **Chips “≈ nome: X mg às 20:00”** = 20:00 no calendarTimeZone, com materialização desde `evaluationInstant − requiredPkLookback` (dose do mês anterior contribui). Drag&drop: Δ dias civis medidos no calendarTimeZone aplicado ao startDate civil do protocolo (fuso/hora preservados; rotação semanal por Δ; política DST na nova data conforme seção 4).
- **Reconstituição:** formulário único automático; estados vazio/erro/capacidade/conteúdo-do-frasco; régua mostrando graduação; Copiar; **“Salvar no histórico”** explícito.
- **Protocolos:** tags por protocolo (blends com ícone de composição); cartão 💉 Editar/Mover/Focar/Excluir; arrasto c/ prévia fantasma + Desfazer; mobile Agenda/Semana/Mês <768 px.
- **Ajustes:** consentimento off; desativar persistência = oferecer export → confirmação → apagar → memória (sem quarentena); exports Config/FullBackup; migração assistida com diálogos: fuso (“Os dados antigos não registravam fuso horário. Informe o fuso em que estes horários foram originalmente cadastrados.” — default dispositivo, editável) e remapeamento de cores (lista legacyOriginalHex→paleta); gestão de quarentenas (≤5, exportar/remover, última cópia protegida); falha IndexedDB (memória+aviso persistente+exportar+retry por ação); banner de atualização PWA.
- Status global aria-live; foco trap/devolução; reduced-motion; viewports 320–1440 px.

---

# 11. Persistência, histórico e migrações

- Opt-in; chaves `fk:v1:*` (localStorage: consent/settings/favorites/recipes; IndexedDB stores scenarios|protocols|history|custom|quarantine). Caches técnicos do PWA = só assets.
- Corrupção ⇒ quarentena `fk:v1:corrupted-<ts>` (máx. 5; poda da mais antiga após notificação/oportunidade de export; última cópia nunca apagada automaticamente sem oferta de recuperação) ⇒ estado limpo ⇒ status informativo.
- **Exports:** `ExportBundle` union (seção 6) — Config (payload de configuração) e FullBackup (+histórico+counts). FullBackup é **autossuficiente para VISUALIZAR** cada registro (records carregam `display` + snapshots tipados; nenhum lookup no dataset atual; dataset inteiro NÃO duplicado). Import: zod+LIMITS; substituição com prévia/confirmação; erros amigáveis por código. Consentimento não exportado/restaurado.
- **Histórico:** FIFO 500; registros imutáveis; gravação somente por ação explícita (seção 10).
- **Migrações (não destrutivas; apps legadas = fontes de FORMATO):**
  - HormoTracker: envelope v2/array legado; **N irmãos(groupId) ⇒ 1 Protocol canônico**: `totalDoseMg = Σ doses dos subprotocolos`; `proportion_i = doseLegacy_i / totalDoseMg`; `totalDoseMg<=0` ⇒ registro inválido → política de quarentena/report; cor: pertence à paleta ⇒ preserva; senão `legacyOriginalHex` + remapeamento para a cor permitida mais próxima (distância euclidiana quadrática em sRGB; empate ⇒ menor paletteColorId lexicográfico) + entrada em `MigrationReport.colorRemaps`; groupId existe só no migrador.
  - meiavida v2: cenários → Scenario (selected + snapshot).
  - **Fuso:** dados legados não tinham timezone ⇒ diálogo da seção 10; resposta registrada em `MigrationReport.assumedTimeZone` (suposição do usuário, não dado confirmado); conversões civis→instantes usam essa TZ + política DST.
  - Originais intocados; marca `fk:v1:migrated-from=<origem>`; remoção manual posterior.

---

# 12. Estrutura final de pastas (ESPECIFICAÇÃO)

```
farmacologico/                    # repo existente Masselorc/farmacologico (greenfield)
├─ package.json
├─ app.config.ts                  # FONTE ÚNICA: { basePath, productName } → vite/PWA/runtime
├─ vite.config.ts                 # consome app.config.ts
├─ tsconfig.json / eslint.config.js
├─ index.html                     # CSP meta + root
├─ public/
│  ├── manifest.webmanifest       # gerado com basePath
│  └── icons/
├─ tools/
│  └─ spike-csp/                  # GATE E1 (temporário): React+Chart.js+CSP+prod build
├─ .github/workflows/{ci.yml,pages.yml}
└─ src/
   ├─ main.tsx
   ├─ app/{router.tsx,AppShell.tsx,providers.tsx,
   │       config/basePath.ts, i18n/pt-BR.messages.ts}
   ├─ domain/
   │  ├─ shared/{types.datetime.ts,datetime.ts(Temporal+DST),errors.ts,tolerances.ts,result.ts}
   │  ├─ units/{convert.ts,decimal.ts,format.ts}
   │  ├─ pk/{rates.ts,bateman.ts,state.ts,analysis.ts,cutoff.ts,warnings.ts,version.ts}
   │  ├─ recurrence/{generate.ts(janela),shift.ts,validate.ts}
   │  ├─ reconstitution/calculate.ts
   │  ├─ simulation/{windows.ts(DisplayWindow→CalculationWindow),assemble.ts,historyView.ts}
   │  └─ version.ts               # ENGINE_VERSIONS
   ├─ data/substances/{legacy.dataset.ts(componentOnly),palette.allowed.ts,index.ts}
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
   │  ├─ charts/{CompareChart,KineticChart,temporalGuides,sampling(chart→DisplayPoints),chartSummary,fallback}.ts(x)
   │  ├─ reconstitution/pages/ReconstitutePage.tsx
   │  │   components/{ResultPanel,SyringeGauge,CopyButton,SaveToHistoryButton}
   │  ├─ protocols/pages/{CalendarPage,ChartsPage}.tsx
   │  │   components/{MonthGrid,DaySheet,AgendaList,WeekStrip,AdminCard,QuickMenu,ProtocolDialog,
   │  │              DragController,KeyboardMove,EstimateChips,RangeControls,InfoPanel,UndoBar,SaveAnalysisButton}
   │  │   hooks/{useCalculationWindow,useWindowOccurrences,useReschedule}.ts
   │  ├─ history/pages/HistoryPage.tsx (+RecordItem[Ver/Reabrir/Recalcular],RecordDetail)
   │  └─ settings/pages/SettingsPage.tsx (+DataControls,MigrationWizard[timezone+cores],QuarantineManager,UpdateBanner)
   ├─ components/ui/{Button,Field,NumberField,PalettePicker,Select,Checkbox,Modal,StatusRegion,EmptyState,ErrorBox,Tabs,Badge}
   ├─ styles/tokens.css
   └─ tests/{domain/**/*.test.ts, types/**/*.test-d.ts, e2e/*.spec.ts}
```

---

# 13. Estratégia de testes

Convenção: tolerâncias da seção 4; proibido igualdade bit-a-bit/exato/diff-0 em floating point; migração estrutural usa igualdade exata onde cabível.

## Unitários (Vitest)
- **Solver pela equação:** ∀(T½,Tmax) válidos: recomposição com rtol TMAX_RECOMPOSITION_RTOL. **Oráculo estável perto de ka≈ke: testes avaliam `g(y)=y/expm1(y)` (+Taylor |y|<1e-8) em espaço-y — nunca ln(ka/ke)/(ka−ke) cru próximo do ponto degênero.** Âncoras rtol 1e-4: 6d/2d⇒ka∈1,34159±tol; ka=0,36 dia⁻¹⇒Tmax∈4,649224±tol. Paridade meiavida 24 h/4 h.
- Ramos: Tmax=0; degênero; flip-flop+warning; extremos: **NaN/±∞ inesperado ⇒ NUMERIC_FAILURE (nunca zero)**; underflow documentado ⇒ 0.
- Bateman/estado: 50%@1T½; pico@Tmax; conservação; clamp; percentuais zerados sem doses; futuras fora do estado.
- **Lookback/cutoff (obrigatórios):** `requiredPkLookback ≡ max cutoffAgeFor`; `deriveCalculationWindow` com params de T½ longa; **dose anterior à DisplayWindow altera corretamente o primeiro ponto exibido**; blend ⇒ lookback = máximo entre componentes; descarte interno usa a MESMA função.
- Análise: horizonte 10,5; marcos (invariantes da seção 4); 0,1% ∈ 9,9–10,1 T½; cutoff 40 T½ ⇒ truncamento < AMOUNT_RTOL.
- **Blend:** 3 componentes ⇒ 3 SimulationInputs; `componentDose=totalDose×proportion`; Σ proporções=1 (erro de domínio caso contrário); **snapshot PK pertence ao componente — reordenar components não troca associações**.
- Recorrência: janela parcial retorna só ocorrências ∈ janela (fronteira); única/semanal/multi-dias; fim inclusivo; rotação Δ=+1,+7,−1,−8.
- **Datas/DST (Temporal):** fixtures GAP ('later') e OVERLAP ('earlier'); mudança de TZ do dispositivo não altera protocolo salvo; **CALENDAR TIMEZONE: protocolos de fusos distintos caem no dia correto da exibição**; chips: **dose no mês anterior contribui no chip de 20:00 do mês atual (T½ longa)**.
- `parseLocaleDecimal`: "0,5"/"0.5" ok; rejeita "1.234,56","1,234.56","","1,2,3".
- Reconstituição: âncora 5/2/250/U-100(g=1); **capacidade 5/2/3000⇒120 U; 5/4/3000⇒240 U**; **5 mg+6000 mcg⇒DOSE_EXCEEDS_VIAL_CONTENT**; graduação decimal (g=0,5 aceita); bordas g=1: 9 U warn / 10 U ok; inválidos/caps.
- **Export/types (type-level .test-d.ts no CI):** ConfigExport/FullBackup formam discriminated union válida (exhaustiveness switch compila); `SimulationOutput.metadata` contém somente pkEngineVersion; records de protocol-analysis contêm pk+recurrence.
- Schemas×LIMITS fronteiras; `boundsFromLimits` sincronizado.

## Propriedade (fast-check)
Diluente/dose/massa monotonicidades; superposição comutativa; solver identidade ampla (incl. vizinhança degênero, oráculo y-space); marcos ordenados; janela: contagem combinatória de ocorrências ∝ janela de cálculo (nunca do horizonte).

## Integração
Formulário⇄zod⇄analyze; Registrar-dose; consent on/off (off⇒zero escrita de dados do usuário; desligar=export opcional+confirmação+apagar, **sem quarentena**); export Config vs FullBackup; import sem consentimento restaurado; caps; IDB failure simulado (memória+aviso+retry); quarentena >5 poda com notificação; SW prompt-banner; **histórico: snapshot antigo intacto; RECALCULAR com engine atual cria NOVO registro**; **FullBackup renderiza histórico sem dataset atual**; migração: timezone assumido registrado; cores fora da paleta remapeadas sem perda de protocolo; blend references íntegras.

## E2E (Playwright, viewports 320–1440)
Fluxos felizes/erro dos 3 módulos; mover por teclado e drag; Desfazer; foco-no-gráfico; Biblioteca→Comparador com seleção de faixa e sem preencher doses; offline reload; update banner; console sem violações CSP no build de produção.

## Acessibilidade
axe-core zero serious/critical nas 6 rotas; teclado completo; focus-trap/devolução; aria-live em resultados/status/chips; NVDA checklist arquivado (pré-condição de declaração WCAG 2.2 AA); contraste; reduced-motion.

## Migração
Golden fixtures: hormo v2 + array legado c/ blends (irmãos→canônico: totalDose=soma, proporções=dose/total, snapshots por componente); meiavida v2 válido/inválido/schema≠2/corrompido(quarentena); **migrationAssumedTimeZone presente**; cores remapeadas reportadas; originais intactos; idempotência; totalDose<=0 ⇒ quarentena/report.

## Desempenho
Bundle inicial gzip ≤300 kB; **materialização por janela: objetos gerados proporcionais à CalculationWindow (instrumentação); ano×200 protocolos ≤50 ms**; análise 200×520 semanas <2 s; display sampling ≤1200 pts/série sem alterar pico/marcos (diff dentro das tolerâncias); histórico 500 fluido.

---

# 14. Critérios de aceite

- **Biblioteca:** 19 entidades internas (15 singles + 3 componentOnly + 1 blend), **16 entradas visíveis**; badges legado_sem_fonte/unknown route; faixas com seleção explícita nos CTAs; nenhuma dose preenchida automaticamente.
- **Meia-vida:** caso 6d/2d aceito (ka≈1,3416/d rtol 1e-3); flip-flop com aviso; gráfico com datas no eixo X; marcos paridade meiavida dentro de MILESTONE_TIME_ABS_TOL; log com clipping informado.
- **Reconstituição:** âncora 5/2/250 ⇒ 2500 mcg/mL·0,1 mL·10 U·20 teóricas; **capacidade 5/2/3000⇒120 U e 5/4/3000⇒240 U com mensagem neutra**; **6000 mcg/5 mg ⇒ DOSE_EXCEEDS_VIAL_CONTENT bloqueando resultado**; g=1: 9 U alerta, 10 U não alerta; salvar-no-histórico explícito.
- **Protocolos:** golden de datas idêntico ao legado; blend ⇒ 1 protocolo/3 componentes autocontidos; mover+3d desloca e rota; Desfazer restaura; **chips 20:00 incluem contribuição anterior à janela visível**; instrumentação comprova geração por CalculationWindow; **fusos distintos aparecem no dia correto**.
- **Histórico:** Ver/Reabrir/Recalcular conforme seção 10; mensagem de divergência de versão exibida; registros com versões corretas por motor (pk only no output do PK; pk+recurrence na análise de protocolos); recon só por botão.
- **Persistência:** sem consentimento zero escrita de dados do usuário; corrupção⇒quarentena≤5; desligar sem quarentena oculta; FullBackup visualiza histórico sem dataset; import não liga persistência.
- **Migração:** fixtures verdes; migrationAssumedTimeZone + colorRemaps no relatório; nenhum protocolo perdido por cor; totalDose<=0 ⇒ quarentena; idempotente; originais intactos.
- **PWA:** instalável/offline; atualização controlada; sem sessão mista.
- **Mobile/desktop:** Agenda/Semana/Mês <768 px sem scroll lateral; alvos ≥44 px.
- **Acessibilidade:** axe CI zero serious/critical + NVDA arquivado.
- **Segurança/CSP:** meta efetiva; **spike E1 aprovado com zero violações**; paleta fechada; zero requisições externas runtime.
- **Build/config:** app.config.ts único alimenta Vite+manifest/SW+runtime (assert de artefatos no CI).
- **Release V1:** E10A + endurecimento + critérios obrigatórios + **README real substituindo o placeholder** (visão, aviso educacional, arquitetura, módulos, setup/scripts/testes/build/deploy/PWA/privacidade/versionamentos/dataset/engines/migração/limitações/status das apps antigas/URL pública). Itens E10B não bloqueiam.

---

# 15. Plano de implementação futura (APENAS DESCREVER — NÃO EXECUTAR)

| Etapa | Objetivo | Notas-chave desta errata |
|---|---|---|
| E0 Confirmações do proprietário | Confirmar permanência do slug `farmacologico`, nome público e habilitar/configurar GitHub Pages | Única pendência externa; bloqueia apenas deploy |
| E1 Scaffold + **gate CSP×Chart.js** | Vite+React+TS, app.config.ts único, CI/Pages, CSP meta, PWA(prompt), tokens/paleta, **spike obrigatório** | Aceite: zero violações CSP em produção simulada |
| E2 Unidades/tempo/decimal | units(ms/mg), Temporal+DST(GAP/OVERLAP), parseLocaleDecimal | Polyfill bundled |
| E3 Motores | pk(+cutoff único), recurrence(janela), reconstitution, simulation(windows+assemble N-inputs) | metadata só pk; NUMERIC_FAILURE |
| E4 Testes matemáticos críticos | gate verde (equação-solver, lookback=cutoff, blend 3 inputs, marcos, bordas seringa) | Antes de qualquer UI |
| E5 LIMITS+zod+i18n erros | LIMITS→zod/HTML; códigos+catálogo pt-BR; .test-d.ts | Union de exports compilável |
| E6 Persistência/quarentena/exports | consent, idb+fallback, retenção, Config/FullBackup autossuficientes | História por snapshot |
| E7 Migrações | hormo(irmãos→canônico, dose derivada, cores, timezone assumido) + meiavida; fixtures | Relatório completo |
| E8 Reconstituição | tela completa (novos âncoras 120/240 U; DOSE_EXCEEDS_VIAL_CONTENT; salvar explícito) | Mensagens neutras |
| E9 Comparador | forms/análise/dashboard/CompareChart(eixo-X, modos, log-zeros, sampling) | phaseHint heurística |
| E10 Biblioteca | dataset v1 (componentOnly), fichas/faixas/CTAs, integrações obrigatórias | — |
| E11 Protocolos | entidade canônica, calendário multi-fuso, chips c/ lookback, drag/teclado, KineticChart, Desfazer | CalculationWindow |
| E12 **E10A** Histórico+integrações obrigatórias | histórico tipado (Ver/Reabrir/Recalcular), CTAs, export/import, versionamentos | Bloqueia release |
| E13 Endurecimento | a11y real (axe+NVDA), perf budgets, PWA polish | — |
| E14 Release docs | **README real** (critério seção 14) + changelog + URL pública | Após E0/E13 |
| E15 **E10B** (pós-release) | share URL, favoritos avançados, tabela consolidada, zoom/pan, PNG, duplicação, filtros | Não bloqueia V1 |

Transição das URLs antigas (fases): F1 publicar FARMakit mantendo apps antigas → F2 banners “Esta ferramenta foi incorporada ao FARMakit.” + link por módulo → F3 coexistência/validação → F4 redirecionamento quando tecnicamente apropriado (GH Pages não tem redirects de servidor: página legada mínima com link/location.replace) OU página legada mínima. localStorage é por ORIGEM (não path): sob masselorc.github.io a migração lê as chaves antigas diretamente.

---

# 16. Ordem recomendada de implementação futura

E0 decisões do proprietário → E1 scaffold+spike CSP → E2 unidades/tempo/decimal → E3 motores → E4 gate de testes matemáticos → E5 limites/schemas/i18n → E6 persistência/exports → E7 migrações → E8 Reconstituição → E9 Comparador → E10 Biblioteca → E11 Protocolos → E12 E10A histórico/integrações → E13 endurecimento → E14 release+README real → E15 E10B. **NADA disto deve ser executado nesta tarefa.**

---

# 17. Riscos técnicos restantes

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Parâmetros legados sem fonte implausíveis | Média | Alto | badges/reviewStatus/datasetVersion/histórico imutável |
| Flip-flop mal interpretado | Média | Médio | warning educacional + Detalhes |
| Variantes imprevistas nos storages legados | Média | Alto | migrador tolerante+quarentena+report+nunca destruir |
| Bugs DST/conversão civil→instante | Média | Alto | Temporal+fixtures GAP/OVERLAP+proibição de new Date(string) civil |
| Janela de exibição × cálculo mal ligadas | Média | Alto | tipos Display/CalculationWindow + teste “dose anterior altera 1º ponto” |
| Chart.js × CSP incompatível | Baixa | Alto | **gate E1 obrigatório** antes dos módulos gráficos |
| IndexedDB indisponível/quota | Baixa | Médio | memória+aviso+export+retry formal |
| Budget bundle (React+Chart.js+Temporal polyfill) | Média | Médio | code-splitting+budget CI |
| Flakiness drag tests | Média | Baixo | teclado primário |
| Sessão mista de versões (SW) | Baixa | Alto | registerType prompt + guard |
| Timezone assumido incorreto na migração | Média | Baixo | usuário escolhe/edita; registrado no relatório; editável depois |
| Framing possível (frame-ancestors ineficaz via meta) | Certa (limitação) | Baixo | documentado; header exigiria outro hosting |
| Scope creep | Alta | Alto | seções 3/18 vinculantes |

---

# 18. Decisões congeladas (vinculantes)

1. Greenfield em `Masselorc/farmacologico` (repo atual); apps antigas = referências externas/fontes de formato.
2. Stack: React+TS+Vite; GitHub Pages V1; sem backend; PWA prompt-update.
3. Persistência de dados do usuário opt-in; “zero persistência” = dados do usuário; caches técnicos à parte; desativar não cria quarentena.
4. Um PK Engine; Recurrence Engine independente (por janela); Reconstitution Engine independente; `simulation.assemble` como ponte.
5. **DisplayWindow ≠ CalculationWindow**; lookback usa a MESMA política do cutoff (`cutoffAgeFor`), única no PK Engine.
6. Protocolo = entidade única; `ProtocolComponent` autocontido (id próprio, source library/custom, selected+snapshot+cor); sem componentIndex/substanceRef/blendRef/snapshot no nível do protocolo; custom funciona sem Biblioteca.
7. Blend ⇒ uma SimulationInput por componente; `componentDoseMg = totalDoseMg × proportion` (derivada); médias de T½/Tmax proibidas.
8. Camadas ScientificProfile → SelectedPkParameters → SimulationInput; PK nunca consome perfil/dataset; `TmaxSpecification` discriminated union; DurationRange normaliza unidades.
9. `SimulationOutput.metadata` registra somente `pkEngineVersion`; orquestração registra pk+recurrence (`ProtocolAnalysisVersions`).
10. Histórico: snapshot-first (VISUALIZAR/REABRIR/RECALCULAR); recalcular cria novo registro; engines antigos executáveis FORA da V1; gravação somente por ação explícita nos três módulos; registros imutáveis e tipados (sem `unknown` interno); FullBackup autossuficiente para visualizar.
11. Export = discriminated union `ExportBundle` (base compartilhada); consentimento nunca restaurado.
12. Dataset oficial bundled; `componentOnly` para ésteres; 19 entidades/16 visíveis; BlendSubstance com provenance/reviewStatus próprios; legado ≠ validado; vias unknown; nenhuma fonte inventada; nenhuma dose sugerida; linguagem educacional.
13. Tempo: LocalDate/LocalTime/InstantIso/TimeZoneId distintos; Temporal API (polyfill V1); política DST única (GAP='later', OVERLAP='earlier'); `calendarTimeZone` nas settings; chips 20:00 = calendarTimeZone + lookback; drag Δ civil medido na exibição aplicado ao civil do protocolo.
14. Migração não destrutiva; timezone ausente perguntado ao usuário (`migrationAssumedTimeZone`); cores fora da paleta preservam `legacyOriginalHex` + remapeamento determinístico reportado; totalDose≤0 ⇒ inválido/quarentena.
15. Arredondamento só na apresentação; tolerâncias oficiais; oráculo estável (y-space) nos testes; NaN/∞ inesperado ⇒ `NUMERIC_FAILURE`.
16. LIMITS categorizados (DOMAIN/SAFETY/UX) alimentando Zod e HTML; SAFETY ajustáveis pós-benchmark; threshold de graduação = config de UX (0,05 estrito); caps próprios da Reconstituição.
17. `BASE_PATH` via raiz versionada `app.config.ts` (vite+PWA+runtime); spike CSP×Chart.js é gate da E1; CSP meta efetiva (frame-ancestors documentado como ineficaz); cores por paleta fechada.
18. Mobile-first (Agenda/Semana/Mês <768 px); viewports fixos; WCAG 2.2 AA com verificação real; testes matemáticos antes de UI; E10B não bloqueia release; README real é entrega de release.
19. Renomear produto é cosmético; renomear conceitos de domínio exige atualização desta spec.

**PENDÊNCIA EXTERNA (formulada com precisão):** “Confirmar se o repositório/slug atual `Masselorc/farmacologico` permanecerá definitivo, confirmar o nome público do produto e habilitar/configurar o GitHub Pages antes do primeiro deploy.” — bloqueia somente deploy/release, não o início do desenvolvimento.

---

# 19. Pendências e itens não confirmados

**Decisão externa (única):** a da seção 18.

**Pesquisa não confirmada (herdada; não bloqueia implementação):**
1. Trechos literais irrecuperáveis do monólito HormoTracker (updateDashboard; texto+callback de “Desfazer”; enterMoveMode/commitMoveMode; options/resumo dos gráficos individuais; texto pós-remoção; forma do registro pointercancel — presença/ausência já verificadas em profundidade).
2. Fontes bibliográficas dos presets legados — inexistentes (“Fonte bibliográfica não disponível na aplicação atual.”).
3. Existência/quantidade de dados reais nos storages legados — indeterminável desta máquina.
4. Comportamento legado em navegadores muito antigos — não exercitado.
5. Motivo da divergência 0,23 vs 5,5/24 (propionato) — intenção do autor; ambos preservados com reviewStatus.
6. Vias de administração legadas — não codificadas; modelo adota `'unknown'`.

---

# 20. Checklist final

[ ] Projeto reconhecido como greenfield — ✔ cabeçalho/seções 2/5
[ ] Repositório atual identificado como Masselorc/farmacologico — ✔ seções 5/18/19
[ ] README atual reconhecido apenas como placeholder — ✔ cabeçalho/seção 14/31
[ ] Nenhum código FARMakit presumido como existente — ✔
[ ] Apps legadas tratadas apenas como referências externas — ✔ cabeçalho/15/18
[ ] DisplayWindow ≠ CalculationWindow — ✔ seção 4/6/7
[ ] Lookback farmacocinético previsto — ✔ `requiredPkLookback`
[ ] Lookback e cutoff compartilham política — ✔ invariante testada
[ ] Dose anterior à janela visual pode contribuir — ✔ exemplo + teste obrigatório
[ ] ProtocolComponent é autocontido — ✔ seção 6
[ ] Nenhuma associação PK usa componentIndex — ✔ removido
[ ] Protocolo custom funciona sem Biblioteca — ✔ source.type='custom'
[ ] Blend gera SimulationInput por componente — ✔ assembleProtocolInputs
[ ] Dose componente = totalDose × proportion — ✔ derivação formal
[ ] Config/FullBackup formam union TypeScript válida — ✔ ExportBundleBase
[ ] SimulationOutput registra somente versão PK — ✔ SimulationMetadata
[ ] ProtocolAnalysis registra PK+Recurrence — ✔ ProtocolAnalysisVersions
[ ] Teste de capacidade usa 3000 mcg — ✔ 120/240 U [CALC]
[ ] 6000 mcg em frasco 5 mg é DOSE_EXCEEDS_VIAL_CONTENT — ✔
[ ] Histórico usa snapshots — ✔ snapshot-first
[ ] Recalcular cria novo registro — ✔
[ ] Engine antigo não é prometido na V1 — ✔ frase oficial
[ ] Histórico só é salvo por ação explícita — ✔ 3 módulos
[ ] TmaxSpecification diferencia unknown/instant/value/range — ✔
[ ] DurationRange normaliza unidades — ✔ toMs(min)<=toMs(max)
[ ] Política DST é inequívoca — ✔ GAP='later', OVERLAP='earlier', Temporal
[ ] Migração de timezone pede confirmação/suposição do usuário — ✔ migrationAssumedTimeZone
[ ] calendarTimeZone definido — ✔ AppSettings
[ ] chips 20:00 usam calendarTimeZone + lookback — ✔
[ ] cores legadas custom não causam perda — ✔ DisplayColor + colorRemaps
[ ] componentes internos de blend possuem IDs válidos — ✔ invariant testada
[ ] BlendSubstance possui provenance/reviewStatus — ✔
[ ] graduationUnits aceita decimais positivos — ✔ finite>0 (0,5 ok)
[ ] borda de precisão da seringa está definida — ✔ warning sse >0,05 (9 U sim / 10 U não)
[ ] solver é testado com oráculo estável — ✔ y-space/expm1+Taylor
[ ] NaN/Infinity inesperado gera erro — ✔ NUMERIC_FAILURE
[ ] BASE_PATH possui fonte única disponível no build — ✔ app.config.ts
[ ] spike CSP×Chart.js ocorre em E1 — ✔ gate obrigatório
[ ] analysisCurve e DisplayPoints estão separados — ✔ renomeado + sampleForDisplay
[ ] FullBackup consegue exibir histórico sem dataset atual — ✔ display meta + teste
[ ] itens recomendados não bloqueiam V1 — ✔ E10B
[ ] README futuro está previsto como entrega de release — ✔ seção 14/E14
[ ] nenhuma contradição conhecida permaneceu após a errata — ✔ varredura completa (tipos↔texto↔testes↔aceite)
[ ] nenhum código foi implementado — ✔ documento apenas
[ ] nenhum arquivo do projeto foi alterado — ✔ somente esta especificação foi escrita
[ ] nenhum commit foi feito — ✔
[ ] nenhuma etapa de desenvolvimento foi iniciada — ✔ todas marcadas como futuro

---

## Declaração de status

**(B) ESPECIFICAÇÃO AGUARDANDO DECISÃO DO PROPRIETÁRIO.**

Única pendência externa: **“Confirmar se o repositório/slug atual `Masselorc/farmacologico` permanecerá definitivo, confirmar o nome público do produto e habilitar/configurar o GitHub Pages antes do primeiro deploy.”** — impacta apenas deploy/publicação (tudo isolado em `app.config.ts`); o desenvolvimento pode iniciar independentemente dessa confirmação.

**FIM DO DOCUMENTO — versão 4 (errata consolidada).** A implementação greenfield será solicitada em tarefa separada.
