# tools/spike-csp — GATE E1 (temporário)

Spike obrigatório da E1: provar que **Chart.js 4 bundled** renderiza gráfico real,
responsivo, no build de produção, sob a **CSP final** (meta), sem CDN, sem
`unsafe-eval`/`unsafe-inline`, sem violações e sem diretivas desconhecidas.

- Componente da rota de inspeção: `src/tools/spike-csp/SpikeCspPage.tsx`
  (rota hash `#/dev/spike-csp`).
- Smoke automatizado contra `vite preview`: `src/tests/e2e/smoke-e1.spec.ts`.
- Dados 100% fictícios; nenhum gráfico farmacocinético (isso pertence a E9+).

Esta pasta é temporária e poderá ser removida após a validação da E1.
