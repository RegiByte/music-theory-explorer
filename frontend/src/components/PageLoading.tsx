import { useTranslation } from 'react-i18next'

export function PageLoadingFallback() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-2xl font-bold mb-2">{t('loading.title')}</div>
        <div className="text-sm text-gray-600">{t('loading.subtitle')}</div>
      </div>
    </div>
  )
}
