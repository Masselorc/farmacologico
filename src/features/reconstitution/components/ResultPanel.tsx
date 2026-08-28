import { messages } from '../../../app/i18n/pt-BR.messages'
import type { ReconstitutionInput, ReconstitutionResult } from '../../../domain/types'
import { formatReconstitutionNumber, formatReconstitutionWarningText } from '../lib/presentation'
import { SyringeGauge } from './SyringeGauge'

interface ResultPanelProps {
  input: ReconstitutionInput
  result: ReconstitutionResult
}

export function ResultPanel({ input, result }: ResultPanelProps) {
  return (
    <section className="reconstitution-result" aria-labelledby="reconstitution-result-title">
      <h2 id="reconstitution-result-title">{messages.reconstitution.resultTitle}</h2>
      <div className="reconstitution-result__main">
        <span className="reconstitution-result__label">{messages.reconstitution.mainResultLabel}</span>
        <strong className="reconstitution-result__value">
          {formatReconstitutionNumber(result.syringeUnits)} {messages.reconstitution.unitsSuffix}
        </strong>
        <span className="reconstitution-result__unit">{messages.reconstitution.mainResultUnit}</span>
      </div>

      <dl className="reconstitution-details">
        <div>
          <dt>{messages.reconstitution.doseResultLabel}</dt>
          <dd>{formatReconstitutionNumber(input.desiredDoseMcg)} {messages.reconstitution.doseUnit}</dd>
        </div>
        <div>
          <dt>{messages.reconstitution.concentrationResultLabel}</dt>
          <dd>{formatReconstitutionNumber(result.concentrationMcgPerMl)} {messages.reconstitution.mcgPerMlSuffix}</dd>
        </div>
        <div>
          <dt>{messages.reconstitution.volumeResultLabel}</dt>
          <dd>{formatReconstitutionNumber(result.doseVolumeMl, 6)} {messages.reconstitution.mlSuffix}</dd>
        </div>
        <div>
          <dt>{messages.reconstitution.capacityResultLabel}</dt>
          <dd>{formatReconstitutionNumber(input.syringe.capacityUnits)} {messages.reconstitution.unitsSuffix}</dd>
        </div>
        <div>
          <dt>{messages.reconstitution.yieldResultLabel}</dt>
          <dd>{formatReconstitutionNumber(result.theoreticalMaxDoses)} {messages.reconstitution.completeDosesSuffix}</dd>
        </div>
      </dl>

      <SyringeGauge
        syringeUnits={result.syringeUnits}
        capacityUnits={input.syringe.capacityUnits}
      />

      <section className="reconstitution-warnings" aria-labelledby="reconstitution-warnings-title">
        <h3 id="reconstitution-warnings-title">{messages.reconstitution.warningsTitle}</h3>
        <ul>
          {result.warnings.map((warning) => (
            <li
              className={warning === 'THEORETICAL_YIELD' ? 'reconstitution-warning reconstitution-warning--info' : 'reconstitution-warning'}
              key={warning}
            >
              {formatReconstitutionWarningText(warning, input, result)}
              {warning === 'THEORETICAL_YIELD' ? (
                <span className="reconstitution-warning__detail"> {messages.reconstitution.theoreticalYieldExplanation}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
