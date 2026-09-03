import { describe, expect, it } from 'vitest'
import {
  OFFICIAL_DATASET_V1,
  DATASET_METADATA_V1,
  getVisibleSubstances,
  LEGACY_SUBSTANCE_COLORS,
} from '../../data/substances'
import { CURRENT_DATASET_VERSION } from '../../domain/version'
import { proportionSumClose } from '../../domain/shared/tolerances'
import { isAllowedPaletteColor } from '../../domain/shared/colors'
import type { SingleSubstance, BlendSubstance } from '../../domain/library/types'

describe('E10 — Dataset Oficial V1 Golden Tests', () => {
  it('contagem golden de entidades: 19 internas, 16 visíveis, 3 componentOnly, 1 blend, 15 singles visíveis', () => {
    const substances = OFFICIAL_DATASET_V1.substances
    expect(substances).toHaveLength(19)

    const visible = getVisibleSubstances(OFFICIAL_DATASET_V1)
    expect(visible).toHaveLength(16)

    const componentOnly = substances.filter((s) => s.kind === 'single' && s.componentOnly === true)
    expect(componentOnly).toHaveLength(3)

    const blends = substances.filter((s) => s.kind === 'blend')
    expect(blends).toHaveLength(1)

    const visibleSingles = visible.filter((s) => s.kind === 'single')
    expect(visibleSingles).toHaveLength(15)
  })

  it('metadata determinística: datasetVersion=1, updatedAt fixo, substanceCount=19, idMigrations=[]', () => {
    expect(DATASET_METADATA_V1.datasetVersion).toBe(CURRENT_DATASET_VERSION)
    expect(DATASET_METADATA_V1.datasetVersion).toBe(1)
    expect(DATASET_METADATA_V1.substanceCount).toBe(19)
    expect(DATASET_METADATA_V1.idMigrations).toEqual([])
    expect(typeof DATASET_METADATA_V1.updatedAt).toBe('string')
    expect(DATASET_METADATA_V1.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('todos os perfis oficiais v1 usam route="unknown" e origin={kind:"legacy_unattributed", reviewStatus:"legacy_unreviewed"}', () => {
    for (const substance of OFFICIAL_DATASET_V1.substances) {
      if (substance.kind === 'single') {
        expect(substance.profiles.length).toBeGreaterThan(0)
        for (const p of substance.profiles) {
          expect(p.route).toBe('unknown')
          expect(p.origin.kind).toBe('legacy_unattributed')
          if (p.origin.kind === 'legacy_unattributed') {
            expect(p.origin.reviewStatus).toBe('legacy_unreviewed')
          }
        }
      } else if (substance.kind === 'blend') {
        expect(substance.origin.kind).toBe('legacy_unattributed')
        if (substance.origin.kind === 'legacy_unattributed') {
          expect(substance.origin.reviewStatus).toBe('legacy_unreviewed')
        }
      }
    }
  })

  it('fontes oficiais v1 estão vazias (nenhuma fonte inventada)', () => {
    expect(OFFICIAL_DATASET_V1.sources).toEqual([])
  })

  it('golden de parâmetros PK para todas as 18 SingleSubstances', () => {
    interface GoldenSingleExpected {
      id: string
      name: string
      componentOnly?: boolean
      ester?: string
      formulation?: string
      halfLifeDays: number
      tmaxDays: number
    }

    const expectedSingles: GoldenSingleExpected[] = [
      { id: 'retatrutida', name: 'Retatrutida', halfLifeDays: 6, tmaxDays: 2 },
      { id: 'landergold-propionato', name: 'LANDERGOLD — Propionato', componentOnly: true, ester: 'propionato', halfLifeDays: 2, tmaxDays: 0.229167 },
      { id: 'landergold-fenilpropionato', name: 'LANDERGOLD — Fenilpropionato', componentOnly: true, ester: 'fenilpropionato', halfLifeDays: 3, tmaxDays: 2 },
      { id: 'landergold-isocaproato', name: 'LANDERGOLD — Isocaproato', componentOnly: true, ester: 'isocaproato', halfLifeDays: 8, tmaxDays: 1.5 },
      { id: 'testosterona-enantato', name: 'Enantato de Testosterona', ester: 'enantato', halfLifeDays: 6, tmaxDays: 1.5 },
      { id: 'trembolona-enantato', name: 'Enantato de Trembolona', ester: 'enantato', halfLifeDays: 6, tmaxDays: 1.5 },
      { id: 'masteron-enantato', name: 'Enantato de Masteron', ester: 'enantato', halfLifeDays: 6, tmaxDays: 1.5 },
      { id: 'testosterona-cipionato', name: 'Cipionato de Testosterona', ester: 'cipionato', halfLifeDays: 7, tmaxDays: 2 },
      { id: 'testosterona-propionato', name: 'Propionato de Testosterona', ester: 'propionato', halfLifeDays: 2, tmaxDays: 0.23 },
      { id: 'testosterona-undecanoato', name: 'Undecanoato de Testosterona', ester: 'undecanoato', halfLifeDays: 21, tmaxDays: 4 },
      { id: 'trembolona-acetato', name: 'Acetato de Trembolona', ester: 'acetato', halfLifeDays: 2, tmaxDays: 0.5 },
      { id: 'nandrolona-decanoato', name: 'Decanoato de Nandrolona', ester: 'decanoato', halfLifeDays: 7, tmaxDays: 2 },
      { id: 'primobolan-enantato', name: 'Primobolan (Enantato)', ester: 'enantato', halfLifeDays: 6, tmaxDays: 1.5 },
      { id: 'boldenona-undecilenato', name: 'Boldenona (Undecilenato)', ester: 'undecilenato', halfLifeDays: 14, tmaxDays: 3 },
      { id: 'oxandrolona', name: 'Oxandrolona', formulation: 'oral', halfLifeDays: 0.4, tmaxDays: 0.1 },
      { id: 'hemogenin', name: 'Hemogenin', formulation: 'oral', halfLifeDays: 0.4, tmaxDays: 0.1 },
      { id: 'dianabol', name: 'Dianabol', formulation: 'oral', halfLifeDays: 0.2, tmaxDays: 0.1 },
      { id: 'clembuterol', name: 'Clembuterol', halfLifeDays: 1.5, tmaxDays: 0.15 },
    ]

    expect(expectedSingles).toHaveLength(18)

    for (const exp of expectedSingles) {
      const substance = OFFICIAL_DATASET_V1.substances.find((s) => s.id === exp.id) as SingleSubstance
      expect(substance, `Substância ${exp.id} deve existir`).toBeDefined()
      expect(substance.kind).toBe('single')
      expect(substance.name).toBe(exp.name)
      expect(substance.componentOnly ?? false).toBe(exp.componentOnly ?? false)

      const profile = substance.profiles[0]
      expect(profile, `Perfil de ${exp.id} deve existir`).toBeDefined()
      expect(profile.id).toBe('legacy-v1')
      if (exp.ester) expect(profile.ester).toBe(exp.ester)
      if (exp.formulation) expect(profile.formulation).toBe(exp.formulation)

      // HalfLife
      expect(profile.halfLife).toEqual({ value: exp.halfLifeDays, unit: 'days' })

      // Tmax
      expect(profile.tmaxSpec).toEqual({
        kind: 'value',
        value: { value: exp.tmaxDays, unit: 'days' },
      })
    }
  })

  it('diferença crucial de Tmax: LANDERGOLD Propionato (0.229167 d) vs Propionato de Testosterona (0.23 d)', () => {
    const componentProp = OFFICIAL_DATASET_V1.substances.find((s) => s.id === 'landergold-propionato') as SingleSubstance
    const standaloneProp = OFFICIAL_DATASET_V1.substances.find((s) => s.id === 'testosterona-propionato') as SingleSubstance

    expect(componentProp.profiles[0].tmaxSpec).toEqual({
      kind: 'value',
      value: { value: 0.229167, unit: 'days' },
    })
    expect(standaloneProp.profiles[0].tmaxSpec).toEqual({
      kind: 'value',
      value: { value: 0.23, unit: 'days' },
    })
    expect(componentProp.profiles[0].tmaxSpec).not.toEqual(standaloneProp.profiles[0].tmaxSpec)
  })

  it('golden do Blend: Durateston LANDERGOLD possui 3 componentes resolvíveis, proporções 0.2/0.4/0.4, sem perfis próprios', () => {
    const blend = OFFICIAL_DATASET_V1.substances.find((s) => s.id === 'durateston-landergold') as BlendSubstance
    expect(blend).toBeDefined()
    expect(blend.kind).toBe('blend')
    expect(blend.name).toBe('Durateston LANDERGOLD')
    // Não tem profiles
    expect('profiles' in blend).toBe(false)

    expect(blend.components).toHaveLength(3)
    const [c1, c2, c3] = blend.components
    expect(c1.substanceId).toBe('landergold-propionato')
    expect(c1.profileId).toBe('legacy-v1')
    expect(c1.proportion).toBe(0.2)

    expect(c2.substanceId).toBe('landergold-fenilpropionato')
    expect(c2.profileId).toBe('legacy-v1')
    expect(c2.proportion).toBe(0.4)

    expect(c3.substanceId).toBe('landergold-isocaproato')
    expect(c3.profileId).toBe('legacy-v1')
    expect(c3.proportion).toBe(0.4)

    expect(proportionSumClose(blend.components.map((c) => c.proportion))).toBe(true)

    // Cada componente resolve para SingleSubstance componentOnly
    for (const c of blend.components) {
      const target = OFFICIAL_DATASET_V1.substances.find((s) => s.id === c.substanceId) as SingleSubstance
      expect(target).toBeDefined()
      expect(target.kind).toBe('single')
      expect(target.componentOnly).toBe(true)
      const targetProfile = target.profiles.find((p) => p.id === c.profileId)
      expect(targetProfile).toBeDefined()
    }
  })

  it('golden de cores: todas as 19 entidades possuem cores exatas mapeadas e pertencentes a PALETTE_ALLOWED', () => {
    const expectedColors: Record<string, string> = {
      retatrutida: '#9b59b6',
      'durateston-landergold': '#27ae60',
      'landergold-propionato': '#1abc9c',
      'landergold-fenilpropionato': '#2ecc71',
      'landergold-isocaproato': '#27ae60',
      'testosterona-enantato': '#2ecc71',
      'trembolona-enantato': '#e74c3c',
      'masteron-enantato': '#3498db',
      'testosterona-cipionato': '#27ae60',
      'testosterona-propionato': '#1abc9c',
      'nandrolona-decanoato': '#f1c40f',
      'trembolona-acetato': '#c0392b',
      'testosterona-undecanoato': '#2c3e50',
      'primobolan-enantato': '#8e44ad',
      'boldenona-undecilenato': '#e67e22',
      oxandrolona: '#d35400',
      hemogenin: '#ff7979',
      dianabol: '#f39c12',
      clembuterol: '#ff9f43',
    }

    expect(Object.keys(expectedColors)).toHaveLength(19)

    for (const [id, hex] of Object.entries(expectedColors)) {
      expect(LEGACY_SUBSTANCE_COLORS[id]).toBe(hex)
      expect(isAllowedPaletteColor(hex)).toBe(true)
    }
  })
})
