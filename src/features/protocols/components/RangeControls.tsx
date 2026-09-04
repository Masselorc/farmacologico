import { messages } from '../../../app/i18n/pt-BR.messages'
import type { LocalDate, Protocol } from '../../../domain/types'

export type ChartDisplayMode = 'combined' | 'individual'

export interface RangeControlsProps {
  startDate: LocalDate
  endDate: LocalDate
  displayMode: ChartDisplayMode
  protocols: ReadonlyArray<Protocol>
  selectedProtocolIds: ReadonlySet<string>
  onStartDateChange: (val: LocalDate) => void
  onEndDateChange: (val: LocalDate) => void
  onDisplayModeChange: (mode: ChartDisplayMode) => void
  onToggleProtocol: (protocolId: string) => void
  onSelectAllProtocols: () => void
}

export function RangeControls({
  startDate,
  endDate,
  displayMode,
  protocols,
  selectedProtocolIds,
  onStartDateChange,
  onEndDateChange,
  onDisplayModeChange,
  onToggleProtocol,
  onSelectAllProtocols,
}: RangeControlsProps) {
  return (
    <div className="protocol-range-controls" role="region" aria-label="Controles de exibição do gráfico">
      <div className="range-controls-row">
        <div className="range-inputs-group">
          <div className="range-field">
            <label htmlFor="range-start-date">{messages.protocols.rangeStart}</label>
            <input
              id="range-start-date"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value as LocalDate)}
            />
          </div>

          <div className="range-field">
            <label htmlFor="range-end-date">{messages.protocols.rangeEnd}</label>
            <input
              id="range-end-date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value as LocalDate)}
            />
          </div>
        </div>

        <div className="chart-mode-group">
          <span className="chart-mode-label">{messages.protocols.chartModeLabel}</span>
          <div className="chart-mode-toggle" role="radiogroup">
            <label className="protocol-radio-label">
              <input
                type="radio"
                name="chartMode"
                value="combined"
                checked={displayMode === 'combined'}
                onChange={() => onDisplayModeChange('combined')}
              />
              {messages.protocols.chartCombined}
            </label>
            <label className="protocol-radio-label">
              <input
                type="radio"
                name="chartMode"
                value="individual"
                checked={displayMode === 'individual'}
                onChange={() => onDisplayModeChange('individual')}
              />
              {messages.protocols.chartIndividual}
            </label>
          </div>
        </div>
      </div>

      {protocols.length > 0 && (
        <div className="protocol-selection-row">
          <div className="protocol-selection-header">
            <span>{messages.protocols.selectProtocols}</span>
            <button
              type="button"
              className="protocol-btn-link"
              onClick={onSelectAllProtocols}
            >
              Todos
            </button>
          </div>

          <div className="protocol-checkboxes-list">
            {protocols.map((p) => {
              const isChecked = selectedProtocolIds.has(p.id)
              return (
                <label key={p.id} className="protocol-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleProtocol(p.id)}
                  />
                  <span>{p.name}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
