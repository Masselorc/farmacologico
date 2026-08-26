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
