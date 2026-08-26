import { describe, expect, it } from 'vitest'
import { appConfig } from '../../../app.config'
import { BASE_PATH, PRODUCT_NAME } from '../../app/config/basePath'

describe('fonte única de configuração', () => {
  it('mantém os valores provisionais centralizados (E0 aberta)', () => {
    expect(appConfig.productName).toBe('FARMakit')
    expect(appConfig.basePath).toBe('/farmacologico/')
  })

  it('runtime reexporta exatamente a fonte única', () => {
    expect(BASE_PATH).toBe(appConfig.basePath)
    expect(PRODUCT_NAME).toBe(appConfig.productName)
  })
})
