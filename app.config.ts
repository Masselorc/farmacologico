export interface AppConfig {
  productName: string
  basePath: string
}

// FONTE ÚNICA de configuração de build/runtime da FARMakit.
// Valores provisionais até o congelamento da E0/deploy.
export const appConfig: AppConfig = {
  productName: 'FARMakit',
  basePath: '/farmacologico/',
}
