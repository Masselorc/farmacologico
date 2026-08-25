# FARMakit — DOCUMENTO FINAL DE PLANEJAMENTO E ESPECIFICAÇÃO TÉCNICA
## Revisão arquitetural final — versão 3
### Terceira e última revisão corretiva | Substitui integralmente a versão 2 | Sem implementação

**Status:** especificação consolidada para execução futura por agente implementador, após auditoria (v2) e revisão arquitetural/matemática final (v3).
**Fontes:** as da v2 (`meiavida` lido integralmente em primeira mão; `tabela-farmacos` com recuperação dirigida; `calculadora-peptideos` código inline integral). Nenhuma nova exploração foi realizada nesta rodada.
**Legenda de evidência:** [CÓD] confirmado no código · [CALC] confirmado por cálculo independente (re-executado nesta rodada: `ke=ln2/6=0,115524530093 d⁻¹`; `Tmax(ka=0,36)=4,649224 d`; `ka(Tmax=2 d)=1,34158755 d⁻¹`, verificação `2,000000000000`) · [TESTE] teste automatizado existente · [INF] inferência · [N/C] não foi possível confirmar.

### Resumo das correções desta rodada

| Área corrigida | Decisão final |
|---|---|
| 1. Matemática residual | `Tmax(ka=0,36)≈4,6492 d` corrige o errado “≈10,9”; testes verificam a EQUAÇÃO, não texto |
| 2. Protocolo | Uma entidade lógica única com `components[]`; fim dos sub-protocolos irmãos/`groupId` canônico |
| 3. Motores separados | Recurrence Engine independente; PK Engine recebe apenas doses materializadas |
| 4. Recorrência | Geração obrigatoriamente por janela `(rangeStart, rangeEnd)` |
| 5. Datas | `LocalDate`/`LocalTime`/`InstantIso`/`TimeZoneId` distintos; timezone explícito no protocolo; política DST definida |
| 6. Faixas | `DurationRange` exige escolha explícita do usuário dentro da faixa antes de simular |
| 7. Bioavailability | Metadado bibliográfico na V1; motor permanece F relativo = 1 |
| 8. Histórico de protocolos | Salva `SimulationInput` + snapshot + janela absoluta; reproduzível sem depender do protocolo atual |
| 9. Exportação | Dois schemas: ConfigExport e FullBackup (com histórico); consentimento nunca restaurado |
| 10. Receitas | Entidade `ReconstitutionRecipe` criada; favoritos referenciam seu id |
| 11. Dataset oficial | Bundled com a app; estado do usuário guarda apenas dados personalizados |
| 12–14. Domínio científico | `CustomProfile` vinculado a substância; blend como variante canônica de Substance; `ReviewStatus` único |
| 15–16. Seringa | `graduationUnits` modelado; critério de erro relativo à graduação; dose > conteúdo do frasco é ERRO |
| 17–18. Mensagens | Capacidade: texto neutro não-operacional; domínio usa códigos+params (catálogo pt-BR na UI) |
| 19–22. Precisão/cutoff | Tolerâncias numéricas explícitas; invariante de marcos formal; `phaseHint` é heurística; cutoff único no PK Engine |
| 23–24. Privacidade | Desativar persistência não cria quarentena; “zero persistência” = dados do usuário (caches técnicos do PWA à parte) |
| 25–26. CSP | Somente diretivas efetivas via meta; `frame-ancestors` documentado como ineficaz; cores restritas a paleta whitelisted |
| 27. PWA | Atualização controlada (`registerType:'prompt'`) com banner e confirmação |
| 28–29. Legados | Vias não codificadas = `'unknown'`; contagem única: 16 entradas (15 substâncias + 1 blend) |
| 30–32. Limites | Categorizados (domínio/segurança/UX) com justificativa; LIMITS alimenta Zod e UI; caps próprios da Reconstituição |
| 33–34. Decimal/histórico | `parseLocaleDecimal()` central pt-BR; histórico de reconstituição só por ação explícita |
| 35–36. Deploy/transição | BASE_PATH pendente do proprietário (única pendência externa); plano em 4 fases para as URLs antigas |
| 37–39. Reprodutibilidade | Snapshots de parâmetros em protocolo/cenário; camadas ScientificProfile→SelectedPkParameters→SimulationInput; fim de `unknown` interno |
| 40–41. Gráficos | Resolução de análise ≠ amostragem de exibição; política de zeros na escala log |
| 42–43. Versões | `EngineVersions{pk,recurrence,reconstitution}`; datasetVersion muda só com dado científico |
| 45–46. Falhas | Comportamento formal se IndexedDB falhar; retenção de quarentena limitada |
| 47–50. Texto/estrutura | Linguagem educacional (não “manipulação”); árvore de pastas corrigida e consistente |

---

# 1. Correções realizadas no relatório anterior

## 1.A Auditoria (rodada 2 — mantidas e já integradas)

| # | Problema anterior | Correção | Evidência |
|---|---|---|---|
| 1 | ka da Retatrutida estimado 0,36/dia | **ka ≈ 1,34158 dia⁻¹** para T½=6 d/Tmax=2 d (verificação: f(ka)=2,000000000000) | [CALC] |
| 2 | `tmax<T½/ln2` tratado como limite matemático | Artefato do ramo ka>ke do HormoTracker; solução única ∀Tmax>0 em espaço-y; flip-flop (ka<ke) válido | [CALC]+[CÓD] |
| 3 | Horizonte com constante 10× | Constante real **10,5×** T½terminal | [CÓD] `pharmacokinetics.ts` |
| 4 | Orientação “aumente o volume de diluição” | Matematicamente invertida; substituída (texto neutro definitivo na seção 8) | [CALC] 240 U vs 480 U |
| 5 | Divergência HTML min × validação JS nos peptídeos | Confirmada (`novalidate` + JS só exige >0); resolvida com fonte única de limites | [CÓD] |
| 6 | Fenilpropionato Tmax “2 h” | É **2 dias** (estrutura toda em dias); tabela normalizada na seção 9 | [CÓD] linha 34 |
| 7 | Presets não-blend “travam” campos | Não travam — apenas preenchem; somente blends desabilitam meia-vida/Tmax/cor | [CÓD] verbatim |
| 8 | Ausência de undo negada | Existe **“Desfazer”** pós-reagendamento (única ação em `showStatus`) | [CÓD] detecção |
| 9 | Lacuna de corrupção no meiavida | `catch` apaga storage sem backup → nova spec adota quarentena (com retenção, seção 11) | [CÓD] `App.tsx` |
| 10 | Gráfico comparador “completo” | Sem rótulos temporais no eixo X → requisito explícito na nova spec | [CÓD] `DecayChart.tsx` |
| 11 | Import meiavida ilimitado | Sem cap de tamanho/registros; mensagem crua de parser → caps + códigos de erro | [CÓD] `DataControls.tsx` |
| 12 | Imprecisões menores | CURVE_STEPS=1600 intervalos; percentuais zerados quando nada administrado; export com `exportedAt`; tracejado alternado também na legenda | [CÓD] |
| 13 | Workflows “não lidos” | ci.yml (Node 22, lint/test/build) e pages.yml (deploy-pages@v4) confirmados; novo projeto usará `npm ci` | [CÓD] YAMLs |

## 1.B Revisão arquitetural final (rodada 3 — as 50 correções desta versão)

| # | Correção aplicada | Seções afetadas |
|---|---|---|
| 1 | `Tmax(ka=0,36)≈4,6492 d` substitui “≈10,9”; testes passam a validar a equação | 4, 13, 20 |
| 2 | Protocolo canônico único com `components[]`; `groupId` só no migrador | 6, 9, 11, 12, 13, 14, 18 |
| 3 | Separação total Recurrence × PK (fluxo Protocolo→Recorrência→Ocorrências→PK) | 5, 6, 7, 12 |
| 4 | Geração de recorrência exclusivamente por janela | 4, 7, 13, 14 |
| 5 | Tipos de data distintos + timezone explícito + política DST | 4, 5, 6, 10, 11, 13 |
| 6 | `DurationRange` ⇒ escolha explícita obrigatória na UI | 3, 6, 10, 14 |
| 7 | `bioavailability` = metadado; motor F≡1 na V1 | 4, 6, 7 |
| 8 | Registro `protocol-analysis` com janela absoluta + `simulationInput` + snapshot tipado | 6, 11, 13 |
| 9 | Export dividido em ConfigExportBundle × FullBackupBundle (histórico incluído) | 6, 11, 13, 14 |
| 10 | Entidade `ReconciliationRecipe`→`ReconstitutionRecipe` criada | 6, 10, 11 |
| 11 | Dataset oficial fora do persisted state | 6, 11, 12 |
| 12 | `CustomProfile{id,substanceId,profile}` | 6, 9, 11 |
| 13 | `Substance = SingleSubstance \| BlendSubstance` (modelo canônico único de blend, com cor opcional por componente) | 6, 9, 12 |
| 14 | `ReviewStatus` único ('legacy_unreviewed'\|'needs_review'\|'reviewed') no perfil | 6, 9, 14 |
| 15 | `Syringe.graduationUnits`; alerta por erro relativo à graduação (default UX 5%, configurável) | 6, 8, 13, 18 |
| 16 | `DOSE_EXCEEDS_VIAL_CONTENT` como erro bloqueante | 8, 13, 14 |
| 17 | Mensagem de capacidade neutra e matemática | 8, 14 |
| 18 | `DomainError{code,params}`; textos pt-BR viram catálogo de UI | 6, 7, 8, 12 |
| 19 | Tolerâncias numéricas globais substituem igualdade bit a bit / “exato” | 4, 7, 13 |
| 20 | Invariante dos marcos formalizada (tempos ≥ pico; alvos ≤ pico; não decrescentes) | 4, 7, 13 |
| 21 | `phaseHint` é heurística de apresentação, fora do output físico do motor | 6, 7, 10 |
| 22 | Cutoff de contribuições antigas único no PK Engine (40 T½, derivação por tolerância) | 4, 7 |
| 23 | Desativar persistência: export opcional → confirmação → apagar (sem quarentena oculta) | 10, 11, 14 |
| 24 | “Zero persistência” = dados do usuário; caches técnicos do PWA documentados | 2, 5, 11 |
| 25 | CSP meta sem `frame-ancestors`; limitação documentada | 5, 14, 17 |
| 26 | Cores via paleta whitelist (legado ∪ moderna), zero estilo inline | 5, 6, 10, 12 |
| 27 | PWA `registerType:'prompt'` com fluxo de atualização controlada | 5, 10, 11 |
| 28 | Vias do legado = `'unknown'` (nenhuma via codificada hoje) | 9 |
| 29 | Contagem única: 16 entradas no seletor (15 substâncias + 1 blend) | 9, 14 |
| 30 | LIMITS categorizados (domínio/segurança/UX) com justificativa; caps de segurança ajustáveis pós-benchmark | 5, 6, 18 |
| 31 | Direção LIMITS→Zod e LIMITS→HTML (sem introspecção de schema) | 5, 6 |
| 32 | Caps específicos da Reconstituição | 5, 6, 8 |
| 33 | `parseLocaleDecimal()` central (vírgula e ponto; rejeita ambíguos) | 4, 12, 13 |
| 34 | Histórico de reconstituição somente por “Salvar no histórico” | 3, 10, 14 |
| 35 | Repo/slug/URL = DECISÃO PENDENTE DO PROPRIETÁRIO; tudo parametrizado por BASE_PATH | 5, 15, 16, 18, 19 |
| 36 | Transição das 3 URLs antigas em 4 fases; localStorage é por origem, não por path | 5, 11, 15 |
| 37 | `profileReference` + `pkParametersSnapshot` em Protocolo e Cenário | 6, 9, 11, 13 |
| 38 | Camadas ScientificProfile → SelectedPkParameters → SimulationInput; PK nunca consome perfil | 4, 6, 7 |
| 39 | `unknown` eliminado dos contratos internos (só na borda pré-zod) | 6, 11 |
| 40 | Análise (pico/marcos) independe da amostragem de exibição; 1600 vira default de paridade | 4, 7, 13 |
| 41 | Escala log com política de zeros (clipar ≤ε; iniciar após 1ª contribuição) | 5, 10 |
| 42 | `EngineVersions{pk,recurrence,reconstitution}` | 6, 7, 8, 11 |
| 43 | datasetVersion muda apenas com conteúdo científico | 6, 9, 11 |
| 44 | Backup não restaura autorização de persistência | 6, 11, 14 |
| 45 | Falha de IndexedDB: memória + aviso persistente + exportar + retry controlado | 11, 10, 14 |
| 46 | Quarentena com retenção máx. 5 itens + UI de gestão | 11, 10, 14 |
| 47 | Visão sem “manipulação”: “cálculo matemático de reconstituição e conversão de volumes/unidades” | 2 |
| 48 | Árvore: `public/manifest.webmanifest` e `public/icons/` separados | 12 |
| 49 | Árvore revisada: `domain/{pk,recurrence,reconstitution,units,shared}`; `data/{substances,sources}` | 12 |
| 50 | Varredura de contradições concluída (checklist da seção 20) | todo |

---

# 2. Visão final do produto

**Nome provisório:** FARMakit (ver pendência da seção 18/19 sobre repositório/URL).

**Finalidade:** aplicação única, estática, 100% client-side, em pt-BR, para simulação farmacocinética educacional e **cálculo matemático de reconstituição e conversão de volumes/unidades**, reunindo: Biblioteca de substâncias com perfis contextuais, Comparador de meia-vida multi-cenário em tempo real, calculadora de Reconstituição, calendário de Protocolos com gráficos temporais, e Histórico reproducível.

**Módulos:** Biblioteca · Meia-vida (Comparador) · Reconstituir · Protocolos · Histórico (+ Ajustes/Dados).

**Público:** usuário leigo-informado que acompanha próprio tratamento sob condução profissional; nada destina-se a prescrição ou orientação de preparo.

**Limites declarados na UI:** modelo de um compartimento, cinética linear, superposição, biodisponibilidade relativa F=1; não incorpora variabilidade individual, volume de distribuição nem modelos multicompartimentais; não é medição sanguínea; não substitui avaliação clínica, prescrição ou monitorização laboratorial. A Reconstituição calcula **exclusivamente a partir da dose informada pelo usuário**.

**Princípio de privacidade:** funcionamento integral sem conta; **zero persistência de dados do usuário sem consentimento explícito** (persistência desligada por padrão). Caches técnicos do PWA (Service Worker/Cache Storage) armazenam apenas assets da aplicação — jamais inputs, resultados ou preferências do usuário. Nenhum dado sai do dispositivo; sem backend na V1.

**Princípio científico:** parâmetros farmacocinéticos dependem de via, formulação/éster, preparação, população e estudo. Todo parâmetro carrega valor, unidade, contexto, origem e `reviewStatus`. Presets legados são `legacy_unreviewed` com procedência `legacy_unattributed`; dados bibliográficos futuros exigem fonte verificável. Nenhuma referência foi inventada.

---

# 3. Escopo funcional

## Obrigatório para V1
- **Shell/navegação:** SPA React, abas persistentes, deep-links por hash (`#/biblioteca`, `#/meia-vida`, `#/reconstituir`, `#/protocolos`, `#/historico`, `#/ajustes`).
- **Biblioteca:** listar/buscar; ficha por substância com perfis (via quando conhecida — no legado todas `'unknown'` — formulação/éster, T½, Tmax, contexto, fontes, `reviewStatus`, badge de procedência); exibição de faixa quando `DurationRange`; CTAs “Abrir no Comparador”/“Usar em Protocolos” que **exigem seleção explícita de valor dentro da faixa** e **nunca preenchem doses**.
- **Comparador:** N cenários (cap UX 20); nome/cor/paletaválida; T½+unidade; Tmax+unidade; lista de doses (passadas/futuras); unidade de exibição mcg/mg/g; validação agregada; modo análise com relógio 1 s; métricas físicas + `phaseHint`; pico projetado; horizonte; marcos 50/25/12,5/10/5/1/0,1%; registro rápido de dose; Detalhes do modelo quando Tmax>0; warning de flip-flop; aviso de parâmetro em faixa (“valor selecionado pelo usuário dentro da faixa X–Y, fonte Z”).
- **Gráfico do Comparador:** eixo X temporal rotulado; eixo Y com unidade; passado sólido/futuro tracejado; ponto “agora” com valor; marcadores de dose e Tmax; legenda acessível; modos absoluto e normalizado-ao-pico; escala linear padrão; log conforme política de zeros (seção 5/10); tooltips; resumo textual acessível; separação análise×exibição (seção 7).
- **Reconstituição:** uma tela, cálculo automático ao digitar; histórico gravado **somente** pelo botão “Salvar no histórico”; entradas massa/diluente/dose/seringa (com `graduationUnits`); saídas concentração/volume/unidades/rendimento teórico máximo; estados vazio/erro/`DOSE_EXCEEDS_VIAL_CONTENT`/capacidade excedida (mensagem neutra da seção 8); copiar; régua visual; alerta de precisão relativa à graduação.
- **Protocolos:** CRUD via modal (nome, dose total mg, agenda civil `{data, hora, fuso}`, recorrência única/semanal ≤520 semanas, T½, Tmax, cor da paleta, vínculo opcional a perfil com snapshot); presets legados (**16 entradas: 15 substâncias + 1 blend**); calendário desktop com cartões arrastáveis + alternativa de teclado; chips “≈” às 20:00; “somente aplicações”; reagendar com prévia fantasma e Desfazer; exclusão por modal próprio; gráficos combinado+individuais com guias temporais; mobile Agenda/Semana/Mês simplificado; materialização de ocorrências sempre por janela.
- **Histórico:** registros tipados e imutáveis com `EngineVersions`/`datasetVersion`; reabrir/copiar/excluir.
- **Ajustes/Dados:** consentimento opt-in; ConfigExport/FullBackup; migração guiada não destrutiva (HormoTracker, meiavida); gestão de quarentenas; comportamento formal de falha IndexedDB.
- **Transversais:** PWA instalável offline com atualização controlada; CSP meta efetiva; zero CDN runtime; paleta de cores fechada; acessibilidade WCAG 2.2 AA (verificação real); responsividade 320–1440 px; `parseLocaleDecimal` em todos os campos numéricos.

## Recomendado para V1
Share-URL comprimido; favoritos (substâncias e receitas); comparação tabular consolidada; zoom/pan; duplicar protocolo; busca/filtro de protocolos; PNG do gráfico.

## Pós-V1
Simulação de incerteza/intervalo a partir de `DurationRange`; métricas de regime crônico (steady-state/trough/flutuação); enriquecimento bibliográfico do dataset (DOI/PMID) e novos compostos; múltiplos perfis; PDF; i18n en/es; sincronização opcional; seringas U-40; modelagem explícita de F≠1.

---

# 4. Regras matemáticas definitivas

Convenção global: internamente **ms** e **mg**; IEEE-754 duplo; **arredondamento/formato somente na apresentação** (Intl pt-BR); valores persistidos em precisão plena; conversões centralizadas. **Tolerâncias numéricas oficiais** (módulo `domain/shared/tolerances.ts`): `RATES_RTOL=1e-10`, `AMOUNT_RTOL=1e-9`, `CONSERVATION_RTOL=1e-9`, `TMAX_RECOMPOSITION_RTOL=1e-9`, `PEAK_TIME_ABS_TOL=60_000 ms` (±1 min), `MILESTONE_TIME_ABS_TOL=60_000 ms`. Determinismo estrito na mesma plataforma/engine JS; entre engines JS diferentes, conformidade pelas tolerâncias acima. Expressões como “exato/bit a bit/diff 0” ficam proibidas em testes de ponto flutuante.

## Farmacocinética
- Conversões: `min=60 000 ms`; `h=3 600 000 ms`; `d=86 400 000 ms`; `mcg=0,001 mg`; `g=1000 mg`.
- Civil→instante: `civilToInstant(LocalDate, LocalTime, TimeZoneId): InstantIso` via transições IANA expostas por `Intl.DateTimeFormat` (proibido converter com `new Date(string)`). **Política DST definitiva:** horário inexistente (gap) ⇒ interpretar com o offset **posterior** à transição (resultado: primeiro instante válido ≥ horário pedido); horário ambíguo (overlap) ⇒ escolher o instante **anterior** (primeira ocorrência). Mudança de fuso do dispositivo não altera o significado armazenado (fuso é dado do protocolo); exibição converte para o fuso do visualizador indicando o fuso original quando distinto; importação em outro país preserva o fuso original (conversão só por ação explícita do usuário).
- Eliminação: `ke = ln(2)/T½`; erro de domínio se T½≤0/não finito.
- Absorção inferida: `g(y)=y/expm1(y)=ke·Tmax`, `g:ℝ→(0,∞)` estritamente decrescente ⇒ solução única ∀Tmax>0; série `1 − y/2 + y²/12` para `|y|<1e-8`; bisseção 180 iter., bracket do meiavida; `ka=ke·e^ŷ`. Ramos: `Tmax=0⇒ka=null`; `Tmax<T½/ln2⇒ka>ke`; `Tmax=T½/ln2⇒ka≈ke` (degênero); `Tmax>T½/ln2⇒ka<ke` (flip-flop, warning `FLIP_FLOP_ABSORPTION`). Sem restrições artificiais de Tmax.
- Casos-regressão **baseados na equação**: para amostras válidas de (T½, Tmax>0): `|ln(ka/ke)/(ka−ke) − Tmax| ≤ TMAX_RECOMPOSITION_RTOL·Tmax`. Âncoras numéricas (rtol 1e-4, apenas como detector de regressão grosseira): T½=6 d, Tmax=2 d ⇒ `ke=0,11552453… d⁻¹`, `ka=1,34159 d⁻¹` (cálculo: 1,34158755); **ka=0,36 d⁻¹ ⇒ Tmax=4,649224 d⁻¹·(dias)** — substituindo o antigo valor incorreto “≈10,9”. Verificação direta: `f(1,34158755)=2,000000000000`.
- Central por dose (Δt≥0): instantânea `dose·e^(−ke·Δt)`; degênero (`|ka−ke|≤max(ka,ke)·1e-8`) `dose·ka·Δt·e^(−ke·Δt)`; geral Bateman `dose·(ka/(ka−ke))·(e^(−ke·Δt)−e^(−ka·Δt))`; clamp `[0,dose]`; não finito ⇒ 0.
- Depósito `dose·e^(−ka·Δt)` (ka≠null); eliminado `max(0, adm−central−depósito)`; superposição linear; conservação `central+depósito+eliminado ≈ administrado` com `CONSERVATION_RTOL`.
- **Cutoff de contribuições antigas — política única do motor:** contribuições com idade > `max(CONTRIBUTION_HALF_LIVES·T½term + tmax, tmax+1)` são ignoradas, com `CONTRIBUTION_HALF_LIVES=40` (resíduo por administração ≤ 0,5⁴⁰ ≈ 9,1e-13 < AMOUNT_RTOL — derivação registrada; substitui o 30 legado). Nenhuma feature pode aplicar cutoff próprio.
- Análise: taxa terminal `min(ke,ka)`; horizonte = última dose + `max(10,5·T½term, 2·Tmax, 2·T½)`; amostragem de **análise** (pico/marcos) independente da de **exibição**: base com `curveSteps` default 1600 (paridade meiavida) + pontos em cada dose e `dose+tmax`; pico por varredura + ternária 80 iter.; marcos `[50,25,12,5;10;5;1;0,1]%` via cruzamento descendente (varredura reversa) + bisseção 80 iter.; `null` se não cruza no horizonte (warning). A UI pode reamostrar/reduzir pontos para renderizar **sem** alterar resultados científicos.
- **Invariantes dos marcos (forma testável):** ∀marco m: `m.targetMg ≤ peak.amountMg` e `m.timeMs ≥ peak.timeMs` (comparação com `MILESTONE_TIME_ABS_TOL` para acomodar amostragem); para percentuais decrescentes consecutivos com ambos os tempos não nulos: `time_i ≤ time_{i+1}` (mesma tolerância); `targetMg = peak.amountMg·pct/100` com rtol 1e-12.
- Timezone na simulação: ocorrências são materializadas em instantes absolutos (ms) antes de entrarem no PK Engine.

## Reconstituição
- `concentração = massa_mg×1000 ÷ volume_mL` (mcg/mL); `volume_dose = dose_mcg ÷ concentração` (mL); `unidades = volume_dose × syringe.unitsPerMl`; `rendimento_teorico_maximo = ⌊massa_mg×1000 ÷ dose_mcg⌋` (sempre rotulado como teórico — ignora volume morto/perdas/imprecisão).
- **Erro bloqueante:** `dose_mcg > massa_mg×1000` ⇒ `DOSE_EXCEEDS_VIAL_CONTENT` (a dose não é apresentável como realizável a partir do frasco informado; a UI explica a matemática, mas não exibe resultado realizável).
- **Precisão da seringa (modelo):** erro de leitura ≈ ±½ graduação ⇒ erro relativo estimado `0,5·graduationUnits/unidadesPedidas`. Warning `LOW_SYRINGE_PRECISION` quando esse valor > `GRADUATION_ERROR_WARN_THRESHOLD = 0,05` (equivalente a pedir menos que 10 graduações). Justificativa do default: prática volumétrica usual de ±5%; **classificado explicitamente como configuração de UX ajustável, não como padrão farmacêutico**.
- Propriedade fundamental: massa e dose fixos ⇒ unidades crescem monotonicamente com o diluente (linearidade verificada com `AMOUNT_RTOL`).

## Recorrência
- Única: 1 ocorrência em `startDate+localTime` (no fuso declarado). Semanal: dias selecionados dentro da janela pedida, com término inclusivo `start + semanas·7 − 1` dias civis; `1≤semanas≤520`.
- API por janela: `generateOccurrences(schedule, rangeStartMs, rangeEndMs) → Occurrence[]` ascendente; **proibido** materializar previamente todo o horizonte (520 semanas × N protocolos) para depois filtrar.
- Deslocamento Δ dias: aplica ao protocolo inteiro (`startDate += Δ`); semanal: rotação `d'=((d+Δ) mod 7 +7) mod 7`.
- Blend: dose total repartida por proporções com `Σ=1±1e-9` (validação de domínio); a divisão ocorre na montagem do input (seção 7), não na recorrência.

---

# 5. Arquitetura técnica final (DECIDIDA)

- **Framework/Linguagem:** React 19 + TypeScript `strict`. **Build:** Vite; dependências bundled; chunks por rota.
- **Roteamento:** React Router **Hash** (`createHashRouter`) — compatível com GitHub Pages.
- **Fluxo de dados canônico:**
  ```
  Protocol/Cenario (dados civis + snapshots)
      ↓  domain/recurrence (por janela, fuso explícito)
  Occurrence[] (instantes absolutos)
      ↓  domain/simulation::assembleSimulationInput(...)  [camada SelectedPkParameters]
  SimulationInput (apenas números resolvidos)
      ↓  domain/pk
  SimulationOutput (valores físicos)
      ↓  presentation (phaseHint, formatação, gráficos)
  ```
  O PK Engine **não conhece** Protocol, weekday, weeks, calendário, recurrence ou dataset científico. O Recurrence Engine **não conhece** farmacocinética. A Reconstituição é um terceiro motor independente.
- **Estado:** Zustand apenas para estado compartilhado/persistível (`library-custom`, `scenarios`, `protocols`, `history`, `settings`); estado efêmero fica em componentes — proibido store global trivial.
- **Domínio:** funções puras, sem React/DOM/storage; módulos `pk`, `recurrence`, `reconstitution`, `units`, `simulation`, `shared` (tipos de data, erros, tolerâncias).
- **Validação:** **LIMITS é a fonte única de bounds** e alimenta (a) schemas Zod e (b) atributos HTML via helper puro (`boundsFromLimits()`); Zod valida estrutura/semântica; runtime nunca confia em validação nativa. Proibida introspecção de schemas Zod para extrair limites.
- **Erros/warnings:** domínio emite `{code, params}` (ex.: `HALF_LIFE_NON_POSITIVE`, `TMAX_NEGATIVE`, `NO_DOSES`, `INVALID_HORIZON`, `ABSORPTION_SOLVER_FAILURE`, `DOSE_EXCEEDS_VIAL_CONTENT`, `CAPACITY_EXCEEDED`); catálogo pt-BR vive na camada de app (`app/i18n/pt-BR.messages.ts`) e preserva as mensagens literais atuais como texto de UI, não como contrato.
- **Persistência:** opt-in; localStorage (consentimento, settings, favoritos, receitas); IndexedDB (`idb`) para cenários/protocolos/histórico; quarentena com retenção; dois bundles de export (seção 11).
- **Gráficos:** Chart.js 4 bundled; wrappers `CompareChart`/`KineticChart`; plugins de guias portados; fallback textual acessível.
- **PWA:** `vite-plugin-pwa` com **`registerType:'prompt'`**: SW novo detectado → banner “Nova versão disponível” → confirmação → conclusão do estado transitório → ativação → reload completo; proibido update silencioso em sessão; cache técnico só de assets; versionamento atado a build+datasetVersion.
- **Testes/CI:** Vitest (+fast-check), Testing Library, Playwright (multi-viewport), axe-core no CI; pipeline `npm ci` → lint → typecheck → unit/property → build → Playwright contra `vite preview` → deploy Pages após CI verde no `main`.
- **Deploy:** GitHub Pages. **BASE_PATH/reposatórioio: DECISÃO PENDENTE DO PROPRIETÁRIO** (seção 18/19) — todos os artefatos parametrizados por uma única constante `BASE_PATH` (Vite `base`, `manifest.start_url/scope`, escopo do SW, canonical links).
- **Segurança/CSP (meta, apenas diretivas efetivas):**
  `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">`
  + `referrer-policy: no-referrer`. **Documentado e aceito:** `frame-ancestors` **não funciona via meta** e o GitHub Pages não expõe headers customizados por projeto — proteção anti-framing por header NÃO está implementada na V1; se tornar requisito, exigirá outro hosting/proxy. Proibições: `eval`, `new Function`, `innerHTML`/`dangerouslySetInnerHTML` com dado do usuário, CDN runtime.
- **Cores dinâmicas (política CSP-safe):** cores restritas a **paleta fechada** `PALETTE_ALLOWED = PALETTE_MODERN (6 cores meiavida) ∪ LEGACY_COLORS (16 hexes do HormoTracker)` compiladas como tokens CSS/classes (`.tone-<slug>`); seletor de cor da UI é um palette-picker (não color-input livre); gráficos recebem as constantes hex bundled (canvas não é afetado por style-src). Zero estilos inline dinâmicos.
- **Parsing decimal:** `parseLocaleDecimal(input: string): number | ParseError` em `domain/units/decimal.ts`: aceita vírgula OU ponto decimal simples (`"0,5"`, `"0.5"`); rejeita separadores misturados/ambíguos (`"1.234,56"`, `"1,234.56"`), vazios, múltiplos separadores; saída `Number`; formatação de saída sempre Intl pt-BR.

---

# 6. Modelo de dados final (ESPECIFICAÇÃO — não implementar)

```ts
// ── Primitivos ──────────────────────────────────────────────
type LocalDate   = string;  // "YYYY-MM-DD" (civil)
type LocalTime   = string;  // "HH:mm"      (civil)
type InstantIso  = string;  // instante absoluto ISO-8601 com Z/offset
type TimeZoneId  = string;  // IANA, ex.: "America/Sao_Paulo"
type HexColor    = string;  // membro de PALETTE_ALLOWED (whitelist)

type TimeUnit = 'minutes' | 'hours' | 'days';
type MassUnit = 'mcg' | 'mg' | 'g';

interface DurationValue { value: number; unit: TimeUnit }            // value > 0
interface DurationRange { min: DurationValue; max: DurationValue }   // max >= min
type Duration = DurationValue | DurationRange;
interface Range { min: number; max: number }

// ── Fontes, versões, revisão ────────────────────────────────
type Provenance = 'legacy_unattributed' | 'literature';
type ReviewStatus = 'legacy_unreviewed' | 'needs_review' | 'reviewed';

interface Source {
  id: string; doi?: string; pmid?: string; url?: string;
  title?: string; authors?: string[]; year?: number;
  population?: string; notes?: string; reviewedAt?: InstantIso;
}

interface DatasetMetadata {
  datasetVersion: number;              // incrementa SOMENTE com mudança de conteúdo científico
  updatedAt: InstantIso;
  substanceCount: number;
  changelog?: Array<{ version: number; date: InstantIso; summary: string }>;
}
// Política: CSS/texto/layout/engine NÃO alteram datasetVersion;
// parâmetro, perfil, source ou contexto científico alteram.

interface EngineVersions { pk: string; recurrence: string; reconstitution: string }
// Cada registro/export registra apenas as versões dos motores que efetivamente usou.

// ── Biblioteca (dataset oficial = bundled; usuário = overrides) ──
type SubstanceCategory =
  | 'peptide' | 'steroid' | 'steroid_ester' | 'hormone' | 'other';
type AdministrationRoute =
  | 'intramuscular' | 'subcutaneous' | 'sublingual'
  | 'oral' | 'transdermal' | 'unknown';

interface PharmacokineticProfile {
  id: string;
  route: AdministrationRoute;
  formulation?: string;
  ester?: string;
  halfLife: Duration | DurationRange;
  tmax?: Duration | DurationRange;
  /** METADADO BIBLIOGRÁFICO NA V1 — NÃO participa de nenhum cálculo (motor usa F relativo = 1). */
  bioavailability?: number | Range;
  populationContext?: string;
  sourceIds: string[];
  provenance: Provenance;
  reviewStatus: ReviewStatus;
}

interface SingleSubstance {
  kind: 'single';
  id: string; slug: string; name: string; aliases: string[];
  category: SubstanceCategory; tags: string[];
  profiles: PharmacokineticProfile[];       // perfis oficiais (bundled) — vazio em substância 100% do usuário
  sourceIds: string[];
}
interface BlendComponent {
  substanceId: string;                      // referência a substância single
  profileId: string;                        // perfil farmacocinético do componente
  proportion: number;                       // Σ proporções = 1 ± 1e-9
  displayColor?: HexColor;                  // cor própria opcional (paleta)
}
interface BlendSubstance {
  kind: 'blend';
  id: string; slug: string; name: string; aliases: string[];
  tags: string[];
  components: BlendComponent[];
  sourceIds: string[];
}
type Substance = SingleSubstance | BlendSubstance;

// Dados do usuário (persistidos; NUNCA cópia do dataset oficial):
interface CustomProfile { id: string; substanceId: string; profile: PharmacokineticProfile }
interface CustomSubstance extends SingleSubstance {}   // criação livre pelo usuário (kind sempre 'single')

interface ReconstitutionRecipe {
  id: string; name: string;
  input: ReconstitutionInput;
  createdAt: InstantIso; updatedAt: InstantIso;
}

// ── Parâmetros selecionados (camada intermediária) ──────────
interface SelectedPkParameters {
  halfLifeMs: number;                       // > 0 — valor escalar escolhido
  tmaxMs: number | null;                    // null ⇒ instantânea
  selectionNote?: {                         // preenchido quando veio de DurationRange
    range: { halfLife?: DurationRange; tmax?: DurationRange };
    chosenBy: 'user';                       // a V1 EXIGE escolha humana explícita
  };
}
interface ProfileReference { substanceId: string; profileId: string; datasetVersion: number }
interface PkParametersSnapshot {             // congela o que foi usado na criação
  halfLife: DurationValue;
  tmax: DurationValue | null;
  selectedFromRange?: { halfLife?: DurationRange; tmax?: DurationRange };
}

// ── Comparador ──────────────────────────────────────────────
interface Dose { id: string; amountMg: number | null; time: InstantIso }  // instante absoluto
interface Scenario {
  id: string; name: string; color: HexColor;
  substanceRef?: ProfileReference;
  pkParametersSnapshot?: PkParametersSnapshot;     // quando derivado da Biblioteca
  selected: SelectedPkParameters;                  // valores escalares efetivos (fonte única p/ simular)
  displayUnit: MassUnit;
  doses: Dose[];                                   // ≥ 1 (validação)
}

// ── Protocolos (UMA entidade lógica; SEM groupId canônico) ──
type Recurrence =
  | { type: 'single' }
  | { type: 'weekly'; weekdays: number[] /*0=Dom..6*/; weeks: number };

interface Schedule {
  startDate: LocalDate;
  localTime: LocalTime;
  timeZone: TimeZoneId;                     // EXPLÍCITO — imune a viagens/mudança do dispositivo
  recurrence: Recurrence;
}

interface ProtocolComponent {
  substanceId: string;
  profileId?: string;                       // presente se vinculado à Biblioteca
  label: string;                            // ex.: "Propionato"
  proportion: number;                       // soma 1 no protocolo
  displayColor: HexColor;                   // cor do componente (paleta)
}

interface Protocol {
  id: string;
  name: string;
  totalDoseMg: number;                      // dose por administração (soma dos componentes)
  schedule: Schedule;
  components: ProtocolComponent[];          // 1 componente = substância simples; N = blend
  substanceRef?: ProfileReference;          // quando single vinculado à Biblioteca
  blendRef?: { substanceId: string };       // quando blend vinculado
  pkParametersSnapshot: PkParametersSnapshot; // T½/Tmax EFETIVOS por componente? ver nota
  componentPkSnapshots?: Array<{
    componentIndex: number;
    selected: SelectedPkParameters;
  }>;
  createdAt: InstantIso; updatedAt: InstantIso;
}
// Nota: para blends, cada componente tem SelectedPkParameters próprio
// (componentPkSnapshots); pkParametersSnapshot guarda os valores do caso single.

// ── Recorrência (engine independente) ───────────────────────
interface ScheduleShape { startDate: LocalDate; localTime: LocalTime; timeZone: TimeZoneId; recurrence: Recurrence }
interface Occurrence { instantMs: number; localDate: LocalDate }  // localDate p/ calendário/chips

// ── Simulação (entrada 100% numérica) ───────────────────────
interface SimulationDose { id: string; amountMg: number; timeMs: number }
interface SimulationInput {
  halfLifeMs: number;                       // > 0
  tmaxMs: number | null;                    // null ⇒ instantânea
  doses: SimulationDose[];                  // materializadas; ordenável; sem semântica de agenda
  nowMs: number;
  analysisCurveSteps?: number;              // default 1600 (paridade meiavida) — INDEPENDENTE da exibição
}

interface SimulationOutput {
  currentState: {
    administeredMg: number; centralMg: number; depotMg: number; eliminatedMg: number;
    administeredCount: number; plannedCount: number;
    centralPercent: number; depotPercent: number; eliminatedPercent: number;
  };
  curve: Array<{ timeMs: number; amountMg: number }>;   // curva de ANÁLISE (base p/ pico/marcos)
  peak: { timeMs: number; amountMg: number };
  milestones: Array<{ percentage: number; targetMg: number; timeMs: number | null }>;
  administrations: Array<{ doseId: string; timeMs: number; amountMg: number }>;
  warnings: PkWarningCode[];
  metadata: {
    engineVersions: Pick<EngineVersions, 'pk' | 'recurrence'>; // recurrence quando doses vieram de agenda
    kePerMs: number; kaPerMs: number | null; terminalHalfLifeMs: number;
    horizonEndMs: number; analysisCurveSteps: number;
  };
}
// phaseHint NÃO faz parte do output físico; é heurística de apresentação:
// derivePhaseHint(state, doses, tmaxMs, nowMs) vive em features/comparator/lib.
type PhaseHint =
  | 'awaiting_first_dose' | 'absorbing_latest'
  | 'awaiting_next_planned' | 'terminal_decline';

type PkWarningCode =
  | 'FLIP_FLOP_ABSORPTION' | 'NEAR_DEGENERATE_RATES'
  | 'MILESTONE_NOT_REACHED' | 'EXTREME_PARAMETERS';

// ── Reconstituição ──────────────────────────────────────────
interface Syringe {
  family: 'U-100';
  capacityUnits: number;      // int > 0 (UI oferece presets 30/50/100)
  unitsPerMl: 100;            // explícito — proibido literal solto
  graduationUnits: number;    // int > 0 — graduação REAL da seringa
}
interface ReconstitutionInput {
  vialMassMg: number; diluentVolumeMl: number; desiredDoseMcg: number;
  syringe: Syringe; label?: string;
}
interface ReconstitutionResult {
  concentrationMcgPerMl: number; doseVolumeMl: number;
  syringeUnits: number; theoreticalMaxDoses: number;
  capacityExceeded: boolean;
  warnings: ReconstitutionWarningCode[];
  metadata: { engineVersions: Pick<EngineVersions, 'reconstitution'> };
}
type ReconstitutionWarningCode = 'CAPACITY_EXCEEDED' | 'LOW_SYRINGE_PRECISION' | 'THEORETICAL_YIELD';

// ── Erros de domínio (códigos, nunca pt-BR) ─────────────────
interface DomainError { code: DomainErrorCode; params?: Record<string, number | string> }
type DomainErrorCode =
  | 'HALF_LIFE_NON_POSITIVE' | 'TMAX_NEGATIVE' | 'NO_DOSES'
  | 'INVALID_DOSE_AMOUNT' | 'INVALID_DOSE_TIME' | 'INVALID_HORIZON'
  | 'ABSORPTION_SOLVER_FAILURE' | 'SCENARIO_NAME_REQUIRED'
  | 'DOSE_EXCEEDS_VIAL_CONTENT' | 'INVALID_RECONSTITUTION_INPUT'
  | 'BLEND_PROPORTIONS_MUST_SUM_ONE';

// ── Histórico reproducível (tipado; sem unknown interno) ────
interface CalculationRecordBase {
  id: string; createdAt: InstantIso;
  substanceProfileIds: string[];
  versions: Partial<EngineVersions> & { datasetVersion: number };
}
type CalculationRecord = CalculationRecordBase & (
  | { type: 'pharmacokinetics';
      input: SimulationInput;
      resultSnapshot: Pick<SimulationOutput, 'currentState' | 'peak' | 'milestones' | 'warnings' | 'metadata'> }
  | { type: 'reconstitution';
      input: ReconstitutionInput;
      resultSnapshot: ReconstitutionResult }
  | { type: 'protocol-analysis';
      windowStartMs: number; windowEndMs: number; timeZone: TimeZoneId;
      protocolsSnapshot: Protocol[];                 // estado usado no cálculo
      simulationInputs: SimulationInput[];           // inputs finais por componente/série
      resultSnapshot: Array<SimulationOutput['currentState'] & { name: string }>;
      warnings: PkWarningCode[] }
);

// ── Persistência (estado do USUÁRIO — sem dataset oficial) ──
interface AppSettings { theme: 'system' | 'light' | 'dark'; graduationWarnThreshold?: number }
interface Favorites { substanceIds: string[]; recipeIds: string[] }   // referenciam entidades existentes
interface PersistedStateV1 {
  schemaVersion: 1;
  settings: AppSettings;
  favorites: Favorites;
  customSubstances: CustomSubstance[];
  customProfiles: CustomProfile[];
  recipes: ReconstitutionRecipe[];
  scenarios: Scenario[];
  protocols: Protocol[];
}
// Consentimento NÃO faz parte do estado restaurável (seção 11).

// ── Exportação (dois contratos separados) ───────────────────
interface ConfigExportBundle {
  bundleKind: 'config';
  schemaVersion: 1; exportedAt: InstantIso;
  datasetVersion: number; engineVersions: EngineVersions;
  payload: Omit<PersistedStateV1, 'schemaVersion'>;   // settings relevantes, favoritos, customs, cenários, protocolos
}
interface FullBackupBundle extends ConfigExportBundle {
  bundleKind: 'full-backup';
  history: CalculationRecord[];                        // backup COMPLETO inclui histórico
  counts: { records: number; recipes: number };
}
```

**LIMITS (fonte única de bounds; categorias e justificativas):**

```ts
export const DOMAIN_LIMITS = {        // validade matemática — imutáveis nesta V1
  HALF_LIFE_MS_MIN: 1,                // > 0 estrito; piso técnico numérico
  DOSE_MG_MIN: 0,                     // estrito > 0 nas validações
} as const;

export const SAFETY_LIMITS = {       // protegem CPU/memória/armazenamento — AJUSTÁVEIS pós-benchmark (justificativa ao lado)
  IMPORT_BYTES_MAX: 2_000_000,       // DoS por arquivo gigante
  SCENARIOS_MAX: 20,                 // memória + grade de cartões
  DOSES_PER_SCENARIO_MAX: 2000,      // custo O(doses·amostras) por análise
  PROTOCOLS_MAX: 200,                // calendário/gráficos
  WEEKS_MAX: 520,                    // paridade com legado
  HISTORY_RECORDS_MAX: 500,          // ring-buffer FIFO
  QUARANTINE_ITEMS_MAX: 5,           // retenção de quarentena (seção 11)
  HALF_LIFE_DAYS_MAX: 3650,          // 10 anos — substitui o 365 arbitrário do legado;
                                     // robustez numérica verificada no solver (teste de extremos)
  TMAX_DAYS_MAX: 3650,               // idem — elimina a limitação artificial de 180 d
  RECON_VIAL_MASS_MG_MAX: 100_000,   // entrada absurda/overflow prático (segurança, NÃO orientação clínica)
  RECON_DILUENT_ML_MAX: 1_000,
  RECON_DOSE_MCG_MAX: 1_000_000,
  SYRINGE_GRADUATION_UNITS_MAX: 100,
} as const;

export const UX_LIMITS = {           // praticabilidade de interface — ajustáveis
  NAME_MAX_CHARS: 100, FAVORITES_MAX: 100,
  GRADUATION_ERROR_WARN_THRESHOLD: 0.05,   // ver seção 4/8 — default UX, configurável
} as const;
// Fluxo: LIMITS ──► schemas Zod   e   LIMITS ──► props HTML (boundsFromLimits()).
// Zod permanece fonte de verdade estrutural/semântica; nunca introspectado.
```

---

# 7. Motor farmacocinético (único, independente)

**API pública (`domain/pk`, pura):**
```
eliminationRate(halfLifeMs): number
absorptionRateFromTmax(halfLifeMs, tmaxMs): number | null
amountFromDose(tMs, dose, params): number
depotFromDose(tMs, dose, kaPerMs): number
totalAmount(tMs, doses, params): number
stateAt(nowMs, doses, params): SimulationOutput['currentState']
analyze(input: SimulationInput): SimulationOutput          // fachada única (curva, pico, marcos, avisos)
sampleForDisplay(curve, constraints): DisplayPoints[]       // reamostragem pura p/ render (não altera ciência)
```
Funções que **não existem** aqui: qualquer variante de `generateAdministrations(protocol|recurrence, …)` — isso é `domain/recurrence`.

**API pública (`domain/recurrence`, pura):**
```
generateOccurrences(schedule: ScheduleShape, rangeStartMs, rangeEndMs): Occurrence[]
shiftSchedule(schedule: ScheduleShape, deltaDays): ScheduleShape     // deslocamento + rotação de weekdays
validateRecurrence(r: Recurrence): DomainError[]
```

**Cola entre motores (`domain/simulation`, pura):**
```
assembleScenarioInputs(scenario: Scenario, nowMs): SimulationInput
assembleProtocolInputs(protocol: Protocol, occurrences: Occurrence[]): SimulationInput[]
// divide totalDoseMg por proporções; injeta SelectedPkParameters de cada componente;
// NÃO conhece calendarização (já recebeu ocorrências) nem dataset científico.
derivePhaseHint(state, doses, tmaxMs, nowMs): PhaseHint   // heurística de UI (pode morar em features)
```

**Casos explícitos:** ka>ke (ramo geral); ka<ke (flip-flop + warning); ka≈ke (ramo degenerado + warning); Tmax=0 (instantânea); extremos (clamps + `EXTREME_PARAMETERS`; teste de robustez com SAFETY_LIMITS máximos).

**Invariantes:** conservação (CONSERVATION_RTOL); superposição; clamp `[0,dose]`; marcos conforme seção 4; horizonte `lastDose + max(10,5·T½term, 2·Tmax, 2·T½)`; cutoff único de 40 T½ (derivação < AMOUNT_RTOL); determinismo intra-plataforma; conformidade inter-plataforma por tolerâncias.

**Erros/warnings:** apenas `{code, params}`; catálogo pt-BR de UI preserva literalmente as mensagens atuais do meiavida (“A meia-vida deve ser maior que zero.”, “Informe o nome da substância/cenário.”, “Cadastre pelo menos uma dose.”, “Dose N: informe uma quantidade maior que zero.”, “Dose N: informe uma data e hora válidas.”, “Os parâmetros geraram um horizonte farmacocinético inválido.”, “O Tmax informado gera uma constante de absorção fora da faixa numérica do simulador.”, agregação “`nome: erro`”, caixa “Revise os dados:”). Warnings novos com textos próprios no mesmo catálogo (flip-flop: explicação educacional de absorção mais lenta que a eliminação).

**Versões:** `metadata.engineVersions.pk` e, quando doses vieram de agenda, `.recurrence` — sempre gravados em histórico/exports.

---

# 8. Motor de reconstituição (independente)

**API:** `calculateReconstitution(input: ReconstitutionInput): Result<ReconstitutionResult, DomainError[]>` — puro, `domain/reconstitution`.

**Fórmulas:** seção 4. `unitsPerMl` vem de `input.syringe` (U-100 ⇒ tipo literal `100`). Proibido número mágico.

**Validações/estados:**
- Entradas finitas > 0 e dentro de `SAFETY_LIMITS` de reconstituição ⇒ senão `INVALID_RECONSTITUTION_INPUT`.
- `desiredDoseMcg > vialMassMg×1000` ⇒ **erro bloqueante** `DOSE_EXCEEDS_VIAL_CONTENT` (params: `{requested, available}`). UI: não apresenta resultado como realizável; painel explica a matemática (“a dose informada excede todo o conteúdo do frasco: massa disponível = massa×1000 mcg”) e destaca os campos; teste dedicado.
- `unidades > capacityUnits` ⇒ `capacityExceeded=true`; números continuam retornados; mensagem **neutra** (não-operacional):
  > “Com os parâmetros informados, a dose corresponde a X U e excede a capacidade selecionada de Y U. Reduzir as unidades por dose exige maior concentração da solução. Revise os parâmetros informados ou a capacidade selecionada.”
  Explicações matemáticas complementares (relação inversa entre diluente e concentração) pertencem à área educacional da tela, nunca como instrução de preparo.
- `LOW_SYRINGE_PRECISION` quando `0,5·graduationUnits/syringeUnits > UX_LIMITS.GRADUATION_ERROR_WARN_THRESHOLD` (default 0,05 — configuração de UX ajustável, não padrão farmacêutico).
- `THEORETICAL_YIELD` anexo ao rendimento (sempre).

**Arredondamento:** só na apresentação (unidades 1 casa; volume 3; concentração 2). **Versão:** `metadata.engineVersions.reconstitution`.

**Âncoras de teste:** 5 mg/2 mL/250 mcg/U-100(graduação 1 U) ⇒ 2500 mcg/mL; 0,1 mL; 10 U; 20 doses teóricas. Casos A/B: 5/2/6000 ⇒ 240 U; 5/4/6000 ⇒ 480 U (propriedade diluente↑⇒unidades↑ com AMOUNT_RTOL). Erro: dose 6000 mcg com frasco de 5 mg ⇒ `DOSE_EXCEEDS_VIAL_CONTENT`.

---

# 9. Biblioteca de substâncias

- **Dataset oficial:** bundled em `src/data/substances/legacy.dataset.ts`, `DATASET_VERSION = 1`, `Provenance='legacy_unattributed'`, `reviewStatus='legacy_unreviewed'` em todos os perfis; **nunca persistido no estado do usuário** (a atualização do app traz o dataset novo; conflito com cópia local antiga fica impossível).
- **Dados do usuário:** `customSubstances`, `customProfiles` (vínculo obrigatório `substanceId`), overrides futuros por perfil.
- **Contagem única dos presets:** **16 entradas no seletor principal — 15 substâncias individuais + 1 blend** (componentes do blend NÃO são entradas independentes). Confere com `commonDrugs` [CÓD].
- **Tabela normalizada legada** (todas as unidades em DIAS [CÓD]; **via não codificada na app original ⇒ `route:'unknown'` para todas** — nenhuma via foi inferida):

| Entrada do seletor (16) | kind | Éster/formulação (do código) | T½ (d) | Tmax (d) | route | reviewStatus |
|---|---|---|---|---|---|---|
| Retatrutida | single | — | 6 | 2 | unknown | legacy_unreviewed |
| Durateston LANDERGOLD | blend | componentes abaixo | — | — | unknown | legacy_unreviewed |
| ↳ Propionato (0,2) | comp. | propionato | 2 | 0,229167 (5,5/24) | unknown | legacy_unreviewed |
| ↳ Fenilpropionato (0,4) | comp. | fenilpropionato | 3 | **2** | unknown | legacy_unreviewed |
| ↳ Isocaproato (0,4) | comp. | isocaproato | 8 | 1,5 | unknown | legacy_unreviewed |
| Enantato de Testosterona | single | enantato | 6 | 1,5 | unknown | legacy_unreviewed |
| Enantato de Trembolona | single | enantato | 6 | 1,5 | unknown | legacy_unreviewed |
| Enantato de Masteron | single | enantato | 6 | 1,5 | unknown | legacy_unreviewed |
| Cipionato de Testosterona | single | cipionato | 7 | 2 | unknown | legacy_unreviewed |
| Propionato de Testosterona | single | propionato | 2 | 0,23 | unknown | legacy_unreviewed |
| Undecanoato de Testosterona | single | undecanoato | 21 | 4 | unknown | legacy_unreviewed |
| Acetato de Trembolona | single | acetato | 2 | 0,5 | unknown | legacy_unreviewed |
| Decanoato de Nandrolona | single | decanoato | 7 | 2 | unknown | legacy_unreviewed |
| Primobolan (Enantato) | single | enantato | 6 | 1,5 | unknown | legacy_unreviewed |
| Boldenona (Undecilenato) | single | undecilenato | 14 | 3 | unknown | legacy_unreviewed |
| Oxandrolona | single | oral (formulação) | 0,4 | 0,1 | unknown | legacy_unreviewed |
| Hemogenin | single | oral (formulação) | 0,4 | 0,1 | unknown | legacy_unreviewed |
| Dianabol | single | oral (formulação) | 0,2 | 0,1 | unknown | legacy_unreviewed |
| Clembuterol | single | — | 1,5 | 0,15 | unknown | legacy_unreviewed |

*(linhas “comp.” são componentes do blend, não entradas do seletor; Σ proporções = 0,2+0,4+0,4 = 1,0 ✓ [CALC]; divergência 0,23 vs 5,5/24 mantida tal como está, com flag de revisão; cores do legado entram em `LEGACY_COLORS` da paleta.)*
- **Dados validados (futuro):** ingestão só com `Source` verificável; `provenance='literature'`; fluxo `needs_review→reviewed` com `Source.reviewedAt`.
- **Faixas:** perfis com `DurationRange` exibem a faixa + fonte; CTAs abrem o destino com a faixa visível e **obrigam seleção** (campo/slider validado dentro do range) antes de qualquer simulação.
- **Proibições:** nenhum campo de dose sugerida; nenhum vínculo automático dose↔substância; `bioavailability` exibido como metadado com nota “não aplicado no modelo (F relativo = 1)”.
- **Blend canônico:** apenas `BlendSubstance.components[]`; migração do legado cria os três perfis de éster como parte do dataset legado e referencia-os.

---

# 10. UX e navegação

**Arquitetura de informação:** shell com header (identidade + indicador de privacidade) e abas: Biblioteca · Meia-vida · Reconstituir · Protocolos · Histórico · Ajustes. Rotas hash. Transições entre módulos sempre por ação explícita; **pré-preenchem parâmetros/datas, nunca doses**; com `DurationRange`, a transição abre passo obrigatório de seleção de valor.

**Telas:**
- *Comparador* (fluxo meiavida): grade de cenários → validação → análise (relógio 1 s; dashboards com métricas físicas + `phaseHint` rotulada como estimativa de fase; marcos; registrar dose; Detalhes do modelo). Estados vazios guiados; erros agregados.
- *Gráfico:* eixo X rotulado; absoluto/normalizado; log habilitável com **política de zeros:** clipar/omitir valores ≤ `LOG_EPSILON` (1e-12 mg) e iniciar o domino log na primeira contribuição positiva — a existência de zeros não desabilita o modo; tooltips indicam trecho clipado.
- *Reconstituição:* formulário único, cálculo automático, overlay neutro quando vazio; erros inline; painel de resultado com régua da seringa (mostra graduação); **botão “Salvar no histórico”** (explícito); Copiar/Reiniciar; mensagens da seção 8.
- *Protocolos:* header com tags de protocolo (um chip por **protocolo**, blends identificados com ícone de composição); calendário desktop; cartão 💉 abre Editar/Mover/Focar/Excluir; arrasto com prévia fantasma + Desfazer; mobile Agenda/Semana/Mês-simplificado (<768 px, sem scroll lateral); materialização de ocorrências por janela visível (mês/semana/agenda carregada).
- *Biblioteca:* busca; fichas com perfis/faixas/fontes/badges; CTAs com seleção obrigatória em faixa.
- *Histórico:* filtros; item expansível mostrando input/snapshot/versões; ações reabrir/copiar/excluir.
- *Ajustes:* consentimento (off; texto literal “Desativado por padrão. Nenhum dado é enviado para servidor.”); **desativar persistência:** oferecer export → confirmação explícita → apagar dados → seguir em memória (sem quarentena oculta); ConfigExport/FullBackup; migração assistida; **gestão de quarentenas** (listar/exportar/remover; máx. 5; nunca apagar a última cópia automaticamente sem oferta de recuperação); **falha de IndexedDB:** aviso persistente “Não foi possível salvar neste navegador. Seus dados estão apenas na memória desta sessão.” + botões Exportar/Tentar novamente (retry só por ação); banner de atualização do PWA (“Nova versão disponível” → Atualizar agora/Depois).
- **Feedback:** status global `role="status" aria-live="polite"` (auto-dismiss 7 s + ações); erros por campo com `aria-describedby`; foco trap/devolução nos modais; reduced-motion; `phaseHint` anunciada como “estimativa”.

**Viewports de validação:** 320, 375, 390, 430, 768, 1024, 1440 px.

---

# 11. Persistência, histórico e migrações

- **Opt-in:** nenhuma escrita de **dados do usuário** sem consentimento explícito. Caches técnicos do PWA contêm apenas assets. Chaves: `fk:v1:consent`, `fk:v1:settings`, `fk:v1:favorites`, `fk:v1:recipes` (localStorage); IndexedDB `farmakit(v1)` stores `scenarios|protocols|history|custom`.
- **Desativar persistência:** (1) oferecer export; (2) confirmar; (3) apagar dados do app; (4) continuar em memória. **Sem quarentena** nesse caminho.
- **Corrupção (quarentena):** parse/zod falho ⇒ copiar bruto para `fk:v1:corrupted-<ts>` (IndexedDB store próprio ou localStorage se pequeno) ⇒ estado limpo ⇒ status informativo. **Retenção:** máximo `QUARANTINE_ITEMS_MAX=5`; ao exceder, a mais antiga é removida **após** o usuário ter sido notificado e tido chance de exportar; a UI de Ajustes lista/exporta/remove quarentenas.
- **Falha de IndexedDB (formal):** manter sessão em memória; aviso persistente; oferecer Exportar; retry somente por ação; **nunca** fallback silencioso para localStorage com datasets grandes; nunca fingir salvamento.
- **Exportação (dois contratos):** `ConfigExportBundle` (configuração: settings, favoritos, customs, receitas, cenários, protocolos) e `FullBackupBundle` (= config + **histórico** completo + contagens). Ambos carregam `datasetVersion` + `EngineVersions`. **Consentimento não é exportado/restaurado**: importar em outro dispositivo deixa a persistência DESLIGADA até consentimento local explícito (o flag pode aparecer apenas como metadado informativo `sourceHadConsent`, sem efeito).
- **Importação:** valida zod + LIMITS (bytes/contagens); substitui após prévia e confirmação; erros sempre por código→mensagem amigável (nunca texto cru de parser).
- **Histórico:** gravação automática para análises concluídas (Comparador/Protocolos) e **somente por botão** na Reconstituição; FIFO 500; registros tipados (seção 6), imutáveis; recalcular-após-nova-versão nunca reescreve registro antigo — sugere “parâmetros mais novos disponíveis (dataset vX / engine y)”.
- **Migrações (não destrutivas):**
  - `hormoTrackerProtocols`: envelope v2 ou array legado; **N sub-protocolos irmãos com mesmo `groupId` ⇒ 1 `Protocol` canônico com N `components`** (dose total somada, proporções = dose_componente/dose_total, `blendRef` quando aplicável, snapshots preenchidos com os valores legados); `groupId` existe APENAS dentro do migrador; registros inválidos descartados com contagem.
  - `meiavida:v2:data`: cenários validados; `halfLifeValue/unit` etc. ⇒ `SelectedPkParameters` + instante por dose convertido do datetime-local **no fuso do dispositivo na importação**, registrado em `InstantIso`.
  - `meiavida:v2:persistence-enabled`: lido apenas como sugestão na tela de migração; consentimento novo é sempre ato explícito.
  - Política: copiar, jamais apagar originais; marca `fk:v1:migrated-from=<origem>`; remoção dos originais só por ação manual posterior.
  - **Contexto de origem:** localStorage isola por **origem** (não por path) — as apps antigas e a nova sob `masselorc.github.io` compartilham origem, logo o migrador lê as chaves existentes diretamente; isso vale enquanto a nova app for publicada no mesmo domínio (ver seção 36/transição).

---

# 12. Estrutura final de pastas (ESPECIFICAÇÃO — não criar)

```
farmakit/
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ eslint.config.js
├─ index.html                                  # CSP meta + root
├─ public/
│  ├── manifest.webmanifest
│  └── icons/
├─ .github/workflows/
│  ├── ci.yml
│  └── pages.yml
└─ src/
   ├─ main.tsx
   ├─ app/
   │  ├── router.tsx
   │  ├── AppShell.tsx
   │  ├── providers.tsx
   │  ├── config/basePath.ts                   # ÚNICA constante de deploy (pendente do proprietário)
   │  └── i18n/pt-BR.messages.ts               # códigos de domínio → textos pt-BR (catálogo UI)
   ├─ domain/                                  # puro — sem React/DOM/storage
   │  ├── shared/
   │  │  ├── types.datetime.ts                 # LocalDate/LocalTime/InstantIso/TimeZoneId
   │  │  ├── datetime.ts                       # civilToInstant + política DST (IANA/Intl)
   │  │  ├── errors.ts                         # DomainError/codes
   │  │  ├── tolerances.ts                     # RTOLs/ABS_TOLs oficiais
   │  │  └── result.ts
   │  ├── units/
   │  │   ├── convert.ts                       # tempo/massa (ms/mg centrais)
   │  │   ├── decimal.ts                       # parseLocaleDecimal
   │  │   └── format.ts                        # Intl pt-BR (apresentação)
   │  ├── pk/
   │  │   ├── rates.ts                         # ke + solver espaço-y (ka>ke, ka<ke, ≈, 0)
   │  │   ├── bateman.ts                       # amount/depoimento/clamp/degênero
   │  │   ├── state.ts                         # stateAt/superposição/conservação
   │  │   ├── analysis.ts                      # curva-análise, pico, marcos, horizonte 10,5
   │  │   ├── cutoff.ts                        # CONTRIBUTION_HALF_LIVES=40 (política única)
   │  │   ├── warnings.ts
   │  │   └── version.ts
   │  ├── recurrence/
   │  │   ├── generate.ts                      # generateOccurrences POR JANELA
   │  │   ├── shift.ts                         # deslocamento + rotação de weekdays
   │  │   └── validate.ts
   │  ├── reconstitution/
   │  │   └── calculate.ts                     # calculateReconstitution
   │  ├── simulation/
   │  │   └── assemble.ts                      # Scenario/Protocol(+Occurrence[]) → SimulationInput
   │  └── version.ts                           # ENGINE_VERSIONS {pk, recurrence, reconstitution}
   ├─ data/
   │  ├── substances/
   │  │   ├── legacy.dataset.ts                # DATASET_VERSION=1 (tabela da seção 9)
   │  │   ├── palette.allowed.ts               # PALETTE_MODERN ∪ LEGACY_COLORS
   │  │   └── index.ts
   │  └── sources/                             # vazio por ora (schema pronto; nada inventado)
   ├─ validation/
   │   ├── limits.ts                           # DOMAIN/SAFETY/UX_LIMITS (fonte única de bounds)
   │   ├── boundsFromLimits.ts                 # LIMITS → props HTML
   │   └── schemas/*.ts                        # zod (consomem LIMITS)
   ├─ storage/
   │   ├── consent.ts
   │   ├── localStorage.ts
   │   ├── idb.ts                              # + detecção de falha (seção 11)
   │   ├── history.ts                          # FIFO 500
   │   └── quarantine.ts                       # retenção máx. 5 + gestão
   ├─ migrations/
   │   ├── registry.ts
   │   ├── fromHormoTracker.ts                 # irmãos(groupId) → Protocol canônico c/ components
   │   ├── fromMeiavida.ts
   │   └── fixtures/*.json                     # golden fixtures
   ├─ stores/
   │   ├── libraryCustom.store.ts
   │   ├── scenarios.store.ts
   │   ├── protocols.store.ts
   │   ├── history.store.ts
   │   └── settings.store.ts
   ├─ features/
   │   ├── library/pages/LibraryPage.tsx  (+ SubstanceCard, SubstanceSheet, RangeSelector)
   │   ├── comparator/
   │   │   ├── pages/{EditPage,AnalysisPage}.tsx
   │   │   ├── components/{ScenarioForm,DoseEditor,QuickDose,MetricsPanel,MilestonesTable,ModelDetails}
   │   │   └── lib/phaseHint.ts                # heurística de apresentação
   │   ├── charts/
   │   │   ├── CompareChart.tsx                # eixo X rotulado; absoluto/normalizado; log c/ política de zeros
   │   │   ├── KineticChart.tsx                # guias segundas/HOJE/💉/▲Tmax/futuro tracejado
   │   │   ├── temporalGuides.ts
   │   │   ├── sampling.ts                     # analysis × display sampling
   │   │   ├── chartSummary.ts
   │   │   └── fallback.ts
   │   ├── reconstitution/
   │   │   ├── pages/ReconstitutePage.tsx
   │   │   └── components/{ResultPanel,SyringeGauge,CopyButton,SaveToHistoryButton}
   │   ├── protocols/
   │   │   ├── pages/{CalendarPage,ChartsPage}.tsx
   │   │   ├── components/{MonthGrid,DaySheet,AgendaList,WeekStrip,AdminCard,QuickMenu,
   │   │   │              ProtocolDialog,DragController,KeyboardMove,EstimateChips,
   │   │   │              RangeControls,InfoPanel,UndoBar}
   │   │   └── hooks/{useWindowOccurrences,useReschedule}.ts
   │   ├── history/pages/HistoryPage.tsx       (+ RecordItem, RecordDetail)
   │   └── settings/pages/SettingsPage.tsx     (+ DataControls, MigrationWizard, QuarantineManager, UpdateBanner)
   ├─ components/ui/{Button,Field,NumberField(parseLocaleDecimal),PalettePicker,Select,Checkbox,
   │                Modal(focus-trap),StatusRegion,EmptyState,ErrorBox,Tabs,Badge}.tsx
   ├─ styles/tokens.css                        # paleta/tokens (classes .tone-*; zero estilo inline dinâmico)
   └─ tests/
      ├── domain/**/*.test.ts                  # co-localizados + golden
      └── e2e/*.spec.ts                        # playwright (multi-viewport)
```

Regras estruturais: motores fora de componentes; `domain/recurrence` fora de `domain/pk`; UI nunca é fonte de regra matemática; contratos compartilhados em `domain/shared` + `validation`.

---

# 13. Estratégia de testes

Convenção global: usar as tolerâncias da seção 4 (`tolerances.ts`); proibido `toBe`/“diff 0”/“exato” em operações com exp/log/solvers — usar `toBeCloseTo(x, precisão derivada da rtol)` ou comparadores de tolerância explícitos. Migração estrutural usa igualdade exata onde aplicável (campos civis, contagens).

## Unitários (Vitest — domínio primeiro)
- **Solver pela equação:** ∀(T½,Tmax) amostrados: `|ln(ka/ke)/(ka−ke) − Tmax| ≤ TMAX_RECOMPOSITION_RTOL·Tmax`; Tmax=0 ⇒ null; `Tmax=T½/ln2` ⇒ ramo degenerado; `Tmax>T½/ln2` ⇒ ka<ke + warning FLIP_FLOP; âncoras (rtol 1e-4, detector de regressão): T½ 6 d/Tmax 2 d ⇒ ka∈1,34159±tol; **ka=0,36 ⇒ Tmax∈4,649224±tol** (corrige “≈10,9”); paridade meiavida 24 h/4 h [TESTE portado].
- Bateman/estado: queda 50% @1 T½ (instantânea, AMOUNT_RTOL); pico em Tmax; conservação CONSERVATION_RTOL; clamp; NaN⇒0; percentuais zerados sem doses administradas; doses futuras fora do estado.
- Análise: horizonte `max(10,5·T½term,2·Tmax,2·T½)` (caso exato por construção + verificação com tolerância); marcos: `targetMg=peak·pct/100` (rtol 1e-12), `time≥peak−PEAK_TIME_ABS_TOL`, tempos não decrescentes com % decrescentes; 0,1% entre 9,9–10,1 T½ [TESTE portado]; cutoff 40 T½ ⇒ erro de truncamento < AMOUNT_RTOL (caso adversarial com dose velha).
- **Datas/fuso:** `civilToInstant` fixtures IANA: horário normal; gap (inexistente ⇒ offset posterior); overlap (ambíguo ⇒ instante anterior); mudança de TZ do dispositivo não altera instante de protocolo salvo (fixture com America/New_York ⇄ America/Sao_Paulo); `parseLocaleDecimal`: `"0,5"→0,5`, `"0.5"→0,5`, rejeita `"1.234,56"`, `"1,234.56"`, `""`, `"1,2,3"`.
- **Recorrência por janela:** única; semanal (1..520; multi-dias); fim inclusivo; rotação Δ=+1,+7,−1,−8; janelas parciais retornam só ocorrências ∈ janela (assert de fronteira); blend Σ proporções=1 (erro de domínio caso contrário).
- Reconstituição: âncora 5/2/250/U-100(g=1); A/B 240/480 U; `DOSE_EXCEEDS_VIAL_CONTENT` bloqueia; `LOW_SYRINGE_PRECISION` com g=1/u=9 (erro≈5,6%>5%) dispara, com u=10 (5%) dispara na borda conforme implementação (definir: dispara quando > threshold estrito), com g=0,5 ajusta-se; inválidos/caps.
- Schemas zod × LIMITS: aceitação/rejeição nas fronteiras; `boundsFromLimits` reflete LIMITS (teste de sincronia).

## Propriedade (fast-check)
- Diluente↑ ⇒ unidades↑; dose↑ ⇒ unidades↑; massa↑ ⇒ unidades↓ (AMOUNT_RTOL).
- Superposição comutativa/aditiva.
- Solver: identidade de Tmax em amostras amplas (incl. flip-flop e vizinhança degênero).
- Marcos: ordenação temporal condizente com % decrescentes.
- Janela: nº de ocorrências = esperado por contagem combinatória para janelas aleatórias.

## Integração (Testing Library)
Formulário⇄zod⇄simulate; Registrar-dose atualiza métricas; consent off ⇒ zero escrita (inspeção); on ⇒ escreve; desligar ⇒ export-oferecido/confirmação/apaga/sem-quarentena; export Config vs FullBackup (histórico incluído); round-trip fiel; import com consent ausente ⇒ persistência segue off; caps bloqueiam; IDB failure simulado ⇒ aviso+memória+export; quarentena >5 poda a mais antiga com notificação; SW prompt-banner aparece em update simulado.

## E2E (Playwright — 320/375/390/430/768/1024/1440)
Comparador feliz+erro; Reconstituição: feliz, capacidade excedida (240 U), dose>frasco bloqueada, salvar-no-histórico, copiar; Protocolos: criar/editar/excluir (modal próprio), criar via célula, mover por teclado e drag, Desfazer restaura, foco-no-gráfico, mês; Biblioteca→Comparador com faixa exigindo seleção e sem preencher doses; Histórico registra (pk com engineVersions; recon só via botão) e reabre; offline: reload airplane-mode; update flow: banner→confirmar→reload.

## Acessibilidade
axe-core sem serious/critical nas 6 rotas (CI); teclado completo (criar protocolo, mover administração, Comparador, seleção de faixa); focus-trap/devolução; aria-live em resultados e status; NVDA checklist manual arquivado como pré-condição de declaração de conformidade; contraste nos 2 temas; reduced-motion.

## Migração
Golden fixtures: hormo v2 envelope; array legado com blends (irmãos→canônico: asserts de dose total, proporções, components, snapshots); meiavida v2 válido/inválido/schema≠2/corrompido (quarentena criada); originais intactos; idempotência.

## Desempenho
Budget CI: inicial gzip ≤300 kB; **janela:** gerar 1 ano de ocorrências p/ 200 protocolos ≤50 ms e memória proporcional à janela (instrumentação de contagem de objetos); análise 200 protocolos × 520 semanas < 2 s; display sampling ≤1200 pts/série (adaptativo) sem alterar pico/marcos (diff científico dentro de tolerâncias); histórico 500 itens fluido (virtualização se necessário).

---

# 14. Critérios de aceite

- **Biblioteca:** 16 entradas no seletor (15 singles + 1 blend); todas com badge “legado_sem_fonte” e reviewStatus visível; busca por alias; ficha mostra T½/Tmax **com unidade** e faixa quando houver; CTA→Comparador exige seleção explícita em faixa e não preenche doses.
- **Meia-vida:** caso 6 d/2 d aceito; Detalhes exibem ka≈1,3416/d (rtol 1e-3); flip-flop com warning educacional; 5 testes portados verdes; gráfico com datas no eixo X; marcos idênticos aos do meiavida dentro de MILESTONE_TIME_ABS_TOL (golden).
- **Reconstituição:** âncora 5/2/250/U-100 ⇒ 2500 mcg/mL; 0,1 mL; 10 U; 20 doses teóricas (todas com tolerâncias); 5/2/6000 ⇒ 240 U com mensagem neutra (sem instrução de preparo); dose 6000 mcg/frasco 5 mg ⇒ erro `DOSE_EXCEEDS_VIAL_CONTENT` bloqueando resultado; seringa g=1 U com pedido de 9 U ⇒ alerta de precisão; histórico criado **somente** via botão.
- **Protocolos:** golden de datas idêntico ao HormoTracker (única/semanal); blend ⇒ 1 protocolo com 3 componentes (0,2/0,4/0,4); mover +3 d desloca e rotaciona; Desfazer restaura; chips 20:00 filtram <0,01 mg; instrumentação comprova materialização por janela (contagem de objetos ∝ janela); timezone: protocolo 08:00 America/Sao_Paulo mantém significado com dispositivo em outro fuso (fixture E2E).
- **Histórico:** todo registro com `versions` completas do que usou; `protocol-analysis` reabre/reexecuta idêntico mesmo após editar/apagar o protocolo original (snapshot+inputs); recon só via botão.
- **Persistência:** sem consentimento ⇒ zero escrita de dados do usuário (caches de assets permitidos e documentados); corrupção ⇒ quarentena (≤5) + início limpo + status; desligar persistência não cria quarentena; ConfigExport não contém history; FullBackup contém; importar backup não liga persistência.
- **Migração:** fixtures das 2 fontes com contagens corretas; irmãos→canônico verificado; originais intactos; idempotente.
- **PWA:** instalável; offline funcional; atualização somente via banner+confirmação; nenhuma sessão mistura assets de versões (guard).
- **Mobile:** 320–430 px sem scroll horizontal de grade (Agenda/Semana/Mês); alvos ≥44 px.
- **Acessibilidade:** axe CI zero serious/critical; checklist NVDA arquivado; declaração WCAG 2.2 AA condicionada a esse relatório.
- **Segurança:** CSP meta sem promessa de frame-ancestors (limitação documentada na tela “Sobre”); cores restritas à paleta (tentativa de cor fora ⇒ rejeitada no picker e no zod); zero requisições externas em runtime (audit no CI).

---

# 15. Plano de implementação futura (APENAS DESCREVER — NÃO EXECUTAR)

| Etapa | Objetivo | Módulos | Dependências | Trabalho futuro (spec) | Testes previstos | Aceite | Risco | Resultado |
|---|---|---|---|---|---|---|---|---|
| E0 Pendências do proprietário | Fechar repo/slug/URL (BASE_PATH) | app/config | — | decidir nome/repositório | — | constante definida | — | deploy parametrizado |
| E1 Scaffold | Vite+React+TS, ESLint, CI/Pages, CSP meta efetiva, PWA base (prompt), tokens/paleta | transversal | E0 | estrutura seção 12 | smoke CI | pipeline verde + página publicada | CSP×HMR | fundação |
| E2 Unidades/tempo/decimal | units(ms/mg), civilToInstant+DST, parseLocaleDecimal | domain/shared,units | E1 | seções 4/5 | unit+property+fusos | tolerâncias ok | bugs de DST | base de medidas |
| E3 Motores | pk (solver espaço-y+cutoff único+analysis), recurrence (janela), reconstitution, simulation.assemble | domain/* | E2 | seções 4/7/8 | unitários+propriedades (incl. regressões ka e 4,6492) | invariantes verdes | divergência numérica → tolerâncias | motores aprovados |
| E4 Validação/limites | LIMITS categorizado → zod + boundsFromLimits; códigos de erro; catálogo pt-BR | validation,domain/shared,app/i18n | E3 | seções 5/6/18 | schemas+fronteiras+sincronia | contrato único | drift | contratos congelados |
| E5 Persistência/migração | consent, idb+fallback, quarentena c/ retenção, exports Config/FullBackup, migradores (irmãos→canônico) | storage,migrations,data.legacy | E4 | seção 11 | golden fixtures+integração | não destrutivo+idempotente | variantes legadas | dados assimiláveis |
| E6 Reconstituição | tela completa, régua, salvar-no-histórico, mensagens neutras/erros | features/reconstitution | E3–E5 | seções 8/10 | unit+E2E+propriedade | critérios 14 | leitura da mensagem | módulo 100% |
| E7 Comparador | forms/análise/dashboard/CompareChart (eixo-X, modos, log-zeros, sampling) | comparator,charts | E3–E5 | seção 10 | portados+integração+E2E+a11y | paridade+novos requisitos | escala log indevida | módulo 100% |
| E8 Biblioteca | dataset legado v1 bundled, faixas, fichas, CTAs c/ seleção | library | E4,E5 | seção 9 | integração CTAs | critério 14 | tentativa de “corrigir” legado → reviewStatus | catálogo vivo |
| E9 Protocolos | entidade canônica c/ components+snapshots, calendário desktop/mobile, modal, drag+teclado, Desfazer, KineticChart, janela-only | protocols,charts,recurrence | E3–E5 | seção 10 | unit+E2E+golden datas+perf janela | critérios 14 | complexidade drag→teclado primário | módulo 100% |
| E10 Histórico/integrações | registros tipados, reabrir, favoritos+receitas, share-URL, tabela comparativa | history,todos | E6–E9 | seção 3/11 | integração+E2E | critérios 14 | payload URL→cap | produto integrado |
| E11 Endurecimento+transição | a11y real (axe+NVDA), perf budgets, PWA polish, docs; preparar Fase 2 (banners) das URLs antigas | transversal | todos | seções 13/36 | suítes completas | critérios totais | falsa conformidade → relatório NVDA | v1.0 candidata |

---

# 16. Ordem recomendada de implementação futura

Etapa 0 decisão do proprietário (repo/slug) → 1 scaffold+CI → 2 unidades/tempo/decimal → 3 motores (pk/recurrence/reconstitution/assemble) → 4 testes matemáticos críticos (gate verde) → 5 LIMITS+zod+i18n de erros → 6 persistência/quarentena/exports → 7 migrações com fixtures → 8 Reconstituição → 9 Comparador → 10 Biblioteca → 11 Protocolos → 12 Histórico/integrações → 13 PWA/offline/atualização controlada → 14 a11y+performance → 15 release + Fases 2–4 da transição das URLs antigas. **NADA disto deve ser executado nesta tarefa.**

---

# 17. Riscos técnicos restantes

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Parâmetros legados implausíveis (sem fonte) | Média | Alto | badges/reviewStatus; datasetVersion; histórico imutável |
| Interpretação errada do flip-flop (ka<ke) | Média | Médio | warning educacional + Detalhes do modelo |
| Variantes imprevistas nos storages legados | Média | Alto | migrador tolerante; descartes reportados; quarentena; nunca destruir |
| Bugs de DST/conversão civil→instante | Média | Alto | fixtures IANA; proibição de `new Date(string)` civil; property tests com fusos |
| IndexedDB indisponível/quota | Baixa | Médio | comportamento formal (memória+aviso+export+retry) |
| Budget de bundle | Média | Médio | code-splitting; budget no CI; zero CDN |
| Flakiness de drag tests | Média | Baixo | teclado primário; viewport fixo |
| Sessão mista de versões (SW) | Baixa | Alto | registerType:'prompt' + guard de versão |
| CSP meta sem frame-ancestors (framing possível) | Certa (limitação) | Baixo | documentado; mitigação futura exigiria hosting com headers |
| Threshold de graduação mal calibrado | Baixa | Baixo | configurável (UX_LIMITS), revisável pós-feedback |
| Escopo inflar durante execução | Alta | Alto | seções 3/18 vinculantes |

---

# 18. Decisões que NÃO devem ficar a cargo do agente implementador

**Congeladas (vinculantes):**
1. Aplicação única React + TypeScript + Vite; GitHub Pages na V1; sem backend.
2. Persistência de dados do usuário opt-in (off por padrão); “zero persistência” = dados do usuário; caches PWA técnicos.
3. UM PK Engine (espaço-y, sem restrição artificial de Tmax); Recurrence Engine independente (geração por janela); Reconstitution Engine independente; camada `simulation.assemble` como única ponte.
4. Protocolo = entidade lógica única com `components[]`; sem sub-protocolos irmãos; `groupId` apenas no migrador.
5. Blend como `BlendSubstance` (variante canônica), não grupo artificial.
6. Camadas separadas: ScientificProfile (biblioteca) → SelectedPkParameters (escolhas) → SimulationInput (números); PK nunca consome perfil/dataset.
7. Timezone explícito em protocolos; tipos `LocalDate/LocalTime/InstantIso/TimeZoneId` distintos; política DST da seção 4.
8. Snapshots (`profileReference`+`pkParametersSnapshot`/`componentPkSnapshots`) para reprodutibilidade; histórico imutável e tipado (sem `unknown` interno).
9. `EngineVersions{pk,recurrence,reconstitution}`; `datasetVersion` só muda com conteúdo científico.
10. Arredondamento apenas na apresentação; tolerâncias oficiais da seção 4; proibida igualdade bit-a-bit em floating point.
11. Validação centralizada: LIMITS→Zod e LIMITS→HTML; erros de domínio por códigos+params (pt-BR só no catálogo de UI).
12. PWA com atualização controlada (prompt); CSP meta efetiva; `frame-ancestors` documentado como ineficaz em GH Pages; cores por paleta fechada.
13. `bioavailability` metadado (F≡1 na V1); `DurationRange` exige escolha explícita; nenhuma dose sugerida; linguagem educacional/matemática.
14. Dados legados ≠ validados; vias não codificadas = `'unknown'`; nenhuma referência inventada; contagem 16 entradas (15+1).
15. Migração não destrutiva; quarentena só para corrupção/import/falha (nunca ao desativar persistência) e com retenção ≤5.
16. Export em dois contratos (Config/FullBackup); backup nunca restaura autorização.
17. Testes matemáticos do domínio ANTES da migração de UI; tolerâncias da seção 4 em toda estratégia de testes.
18. Mobile-first com Agenda/Semana/Mês <768 px; viewports fixos; WCAG 2.2 AA com verificação real.

**DECISÕES PENDENTES CONTROLADAS (não congeladas — dependem de informação externa/benchmarks):**
- **DECISÃO PENDENTE DO PROPRIETÁRIO (única bloqueadora, antes da Etapa 1):** repositório final, slug/path e URL pública (ex.: `https://masselorc.github.io/<slug>/`) e nome de exibição definitivo. Toda a aplicação já está parametrizada por `app/config/basePath.ts` (Vite base, manifest start_url/scope, escopo do SW, canonical). Impacto: define deploy, deep-links e plano de transição; nada mais depende disso.
- Caps de segurança (`SAFETY_LIMITS`) e defaults de UX (`GRADUATION_ERROR_WARN_THRESHOLD=0,05`): valores defaults especificados, mas explicitamente ajustáveis pós-benchmark — não são verdades farmacêuticas nem decisões eternas.

---

# 19. Itens ainda não confirmados

1. **HormoTracker — trechos não transcritíveis** (presença/ausência verificadas em profundidade; redação literal não): corpo de `updateDashboard`; mensagem exata de sucesso do reagendamento (sabe-se que inclui ação “Desfazer”) e callback; corpos de `enterMoveMode`/`commitMoveMode`; objeto `options` integral e frase de resumo dos gráficos individuais (contém “pico”); texto completo pós-remoção; forma sintática do registro de `pointercancel` (função recuperada verbatim).
2. **Fontes bibliográficas dos presets legados** — inexistentes na aplicação atual (“Fonte bibliográfica não disponível na aplicação atual.”).
3. **Existência/quantidade de dados reais de usuários** nos storages atuais — indeterminável desta máquina (afeta prioridade operacional da migração, não a spec).
4. **Comportamento do HormoTracker em navegadores muito antigos** (ramos fallback UUID/structuredClone) — não exercitado.
5. **Motivo da divergência 0,23 vs 5,5/24** no Tmax do propionato entre presets legados — intenção do autor [N/C]; ambos preservados com flag de revisão.
6. **Via de administração dos compostos legados** — não codificada na app original; modelo adota `'unknown'` universal no dataset legado (decisão tomada; registro aqui para rastreabilidade).

---

# 20. Checklist final de consistência

[ ] ka=0,36 produz Tmax≈4,649224 d no exemplo corrigido — ✔ seções 1.B/4/13 [CALC]
[ ] ka≈1,34158/d para T½=6d/Tmax=2d — ✔ seções 1.A/4/13 (1,34158755; verificação 2,000000000000) [CALC]
[ ] Protocol não utiliza sub-protocolos irmãos como modelo canônico — ✔ seção 6 (`components[]`)
[ ] groupId existe somente na migração legada — ✔ seções 6/11/15(E5)
[ ] Recurrence Engine independente do PK Engine — ✔ seções 5/7/12
[ ] PK Engine recebe doses materializadas — ✔ `SimulationInput.doses`
[ ] Recorrências geradas por janela — ✔ `generateOccurrences(schedule,start,end)` + testes de fronteira/performance
[ ] Timezone explícito — ✔ `Schedule.timeZone`
[ ] LocalDate/LocalTime/Instant distintos — ✔ seção 6
[ ] DurationRange exige escolha explícita — ✔ seções 3/6/9/10/14
[ ] bioavailability não participa do cálculo V1 — ✔ comentário no tipo + seções 4/9
[ ] Histórico de protocolos salva SimulationInput/snapshot suficiente — ✔ `CalculationRecord.protocol-analysis`
[ ] Backup completo inclui histórico — ✔ `FullBackupBundle`
[ ] Favoritos de reconstituição possuem entidade válida — ✔ `ReconstitutionRecipe` + `favorites.recipeIds`
[ ] Dataset oficial não é copiado para persisted state — ✔ `PersistedStateV1` (apenas customs)
[ ] Custom profile possui vínculo com Substance — ✔ `CustomProfile.substanceId`
[ ] Blend possui modelo canônico único — ✔ `SingleSubstance|BlendSubstance`
[ ] reviewStatus definido — ✔ `ReviewStatus` (uso único em todo o doc)
[ ] Precisão de seringa usa graduação real — ✔ `graduationUnits` + fórmula do erro relativo
[ ] Dose maior que conteúdo do vial é erro — ✔ `DOSE_EXCEEDS_VIAL_CONTENT`
[ ] Mensagens de reconstituição matemáticas e não prescritivas — ✔ texto neutro da seção 8
[ ] DomainError usa codes/params, não pt-BR — ✔ seções 5/6/7/8
[ ] Testes floating point usam tolerâncias — ✔ seção 4/13 (proibição de “exato/diff 0”)
[ ] milestone.time ≥ peak.time — ✔ invariante formal (com PEAK/MILESTONE_ABS_TOL)
[ ] milestone.amount ≤ peak.amount — ✔ invariante formal (igualdade por construção com rtol 1e-12)
[ ] phase da UI identificada como heurística — ✔ `phaseHint` fora do output físico
[ ] Cutoff PK centralizado — ✔ `domain/pk/cutoff.ts` (40 T½, derivação < AMOUNT_RTOL)
[ ] Desativar persistência não cria quarentena escondida — ✔ seção 11
[ ] “Zero persistência” refere-se a dados do usuário — ✔ seções 2/11
[ ] CSP não promete frame-ancestors via meta — ✔ seção 5 (limitação documentada)
[ ] Cores dinâmicas compatíveis com CSP — ✔ paleta fechada, classes tone-*, zero inline
[ ] PWA usa atualização controlada — ✔ registerType:'prompt' + fluxo da seção 10
[ ] Vias não confirmadas = unknown — ✔ seção 9
[ ] Contagem de presets corrigida — ✔ 16 entradas (15+1) em 9/14
[ ] Limites possuem categoria e justificativa — ✔ DOMAIN/SAFETY/UX na seção 6
[ ] LIMITS alimenta Zod e UI — ✔ direção única; introspecção proibida
[ ] Reconstituição possui caps próprios — ✔ RECON_* em SAFETY_LIMITS
[ ] Parsing aceita decimal pt-BR — ✔ `parseLocaleDecimal` + testes
[ ] Histórico de reconstituição não registra keystroke — ✔ só botão “Salvar no histórico”
[ ] URL/path final definido ou pendente — ✔ **DECISÃO PENDENTE DO PROPRIETÁRIO** (única externa)
[ ] Estratégia de transição das 3 URLs antigas — ✔ seção 15(E11)/16 + fases 1–4 (banner→coexistência→redirecionamento/página legada); nota técnica: localStorage é por origem, não por path — migração lê chaves diretamente no mesmo domínio
[ ] Protocolos/scenarios salvam snapshot dos parâmetros escolhidos — ✔ `profileReference`+`pkParametersSnapshot`+`componentPkSnapshots`
[ ] ScientificProfile separado de SelectedPkParameters — ✔ seção 6/7
[ ] SimulationInput usa apenas números resolvidos — ✔ tipo da seção 6
[ ] Nenhum `unknown` em contrato interno conhecido — ✔ `unknown` só na borda pré-validação de import
[ ] Análise e renderização com resoluções separadas — ✔ `analysisCurveSteps` × `sampling.ts`
[ ] Escala log com política para zeros — ✔ LOG_EPSILON/clip/início após 1ª contribuição
[ ] Versões dos motores explícitas — ✔ `EngineVersions` + metadata por resultado
[ ] datasetVersion muda só com dataset científico — ✔ política na seção 6
[ ] Importar backup não restaura consentimento automaticamente — ✔ seção 11
[ ] Falha do IndexedDB tem comportamento definido — ✔ seção 11/10/13
[ ] Quarentena tem política de retenção — ✔ máx. 5 + gestão + proteção da última cópia
[ ] Linguagem da Reconstituição educacional/matemática — ✔ seções 2/8
[ ] Árvore de pastas revisada — ✔ seção 12 (recurrence fora de pk; public/ correto)
[ ] Nenhuma contradição interna permaneceu — ✔ varredura da correção 50 concluída (tipos↔texto↔testes↔aceite conferidos)
[ ] Nenhum código foi implementado — ✔ este documento contém apenas especificação
[ ] Nenhum arquivo de projeto foi alterado — ✔ somente este documento de planejamento foi escrito
[ ] Nenhuma etapa de desenvolvimento foi iniciada — ✔ todas marcadas como trabalho futuro

---

## Declaração final

**(B) ESPECIFICAÇÃO AGUARDANDO DECISÕES DO PROPRIETÁRIO.**

Única decisão externa necessária antes da implementação:

1. **Repositório/slug/URL pública final** (e nome de exibição definitivo do produto) — ex.: `https://masselorc.github.io/farmakit/` é apenas exemplo; o nome não foi inventado nesta especificação. Impacto: `BASE_PATH` (Vite base), `manifest.start_url/scope`, escopo do Service Worker, links canônicos e detalhamento das Fases 2–4 da transição das URLs antigas. Todos esses pontos já estão isolados numa única constante (`src/app/config/basePath.ts`), portanto a decisão é de baixo custo técnico e não bloqueia nenhuma outra seção desta spec.

Não há outras pendências estruturais. Os demais pontos não congelados (caps de segurança, threshold de graduação) foram deliberadamente classificados como ajustáveis pós-benchmark, com defaults especificados.

**FIM DO DOCUMENTO — versão 3.** A implementação deverá ser solicitada em tarefa separada, seguindo a ordem da seção 16 e as decisões congeladas da seção 18.
