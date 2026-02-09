import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface LandingPageProps {
  onStart: () => void
  changeLanguage: (lng: string) => void
}

export function LandingPage({ onStart, changeLanguage }: LandingPageProps) {
  const { t, i18n } = useTranslation('common')

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="container mx-auto p-8 max-w-6xl flex flex-col items-center justify-center">
        <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {t('appTitle')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl text-center mb-8">
          {t('landing.subtitle')}
        </p>

        {/* Language selector */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant={i18n.language === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeLanguage('en')}
          >
            {t('language.en')}
          </Button>
          <Button
            variant={i18n.language === 'pt' ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeLanguage('pt')}
          >
            {t('language.pt')}
          </Button>
        </div>

        <Button size={'xl'} onClick={onStart}>
          {t('landing.getStarted')}
        </Button>
      </div>
    </div>
  )
}
