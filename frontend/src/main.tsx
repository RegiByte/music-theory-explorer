import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { PageLoadingFallback } from '@/components/PageLoading.tsx'
import App from './App.tsx'
import './i18n'
import './index.css'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<PageLoadingFallback />}>
      <App />
    </Suspense>
  </StrictMode>
)
