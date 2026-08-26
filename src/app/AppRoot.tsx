import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { Providers } from './providers'

export function AppRoot() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
