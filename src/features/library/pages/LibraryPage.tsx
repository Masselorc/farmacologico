import { useEffect, useState } from 'react'
import { messages } from '../../../app/i18n/pt-BR.messages'
import { OFFICIAL_DATASET_V1 } from '../../../data/substances'
import type { ConfigPayload } from '../../../domain/data-management/types'
import { loadConfigPayload } from '../../../storage/config'
import { LibrarySearch } from '../components/LibrarySearch'
import { OriginFilter } from '../components/OriginFilter'
import { SubstanceCard } from '../components/SubstanceCard'
import { SubstanceSheet } from '../components/SubstanceSheet'
import { buildLibraryView, libraryItemIdentity, type LibraryItemView, type OriginFilterKind } from '../lib/view'
import type { CustomProfile, CustomSubstance } from '../../../domain/data-management/types'
import '../library.css'

export interface LibraryPageProps {
  customSubstances?: CustomSubstance[]
  customProfiles?: CustomProfile[]
}

export function LibraryPage({
  customSubstances: propsSubstances,
  customProfiles: propsProfiles,
}: LibraryPageProps = {}) {
  const [config, setConfig] = useState<ConfigPayload | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [originFilter, setOriginFilter] = useState<OriginFilterKind>('all')
  const [selectedItem, setSelectedItem] = useState<LibraryItemView | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const payload = await loadConfigPayload()
        if (mounted) setConfig(payload)
      } catch {
        // Fallback defensivo: Biblioteca funciona mesmo sem storage
        if (mounted) setConfig(null)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const customSubstances = propsSubstances ?? config?.customSubstances ?? []
  const customProfiles = propsProfiles ?? config?.customProfiles ?? []

  const items = buildLibraryView(
    OFFICIAL_DATASET_V1,
    customSubstances,
    customProfiles,
    searchQuery,
    originFilter,
  )

  return (
    <section className="page library-page">
      <header className="library-header">
        <h1 className="library-title">{messages.library.title}</h1>
        <p className="library-subtitle">{messages.library.subtitle}</p>
      </header>

      <div className="library-controls">
        <LibrarySearch value={searchQuery} onChange={setSearchQuery} />
        <OriginFilter value={originFilter} onChange={setOriginFilter} />
      </div>

      <main className="library-grid" aria-label={messages.library.title}>
        {items.length === 0 ? (
          <div className="empty-results">{messages.library.noResults}</div>
        ) : (
          items.map((item) => (
            <SubstanceCard key={libraryItemIdentity(item)} item={item} onSelect={setSelectedItem} />
          ))
        )}
      </main>

      {selectedItem && (
        <SubstanceSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </section>
  )
}
