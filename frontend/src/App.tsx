import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StickyNav } from '@/components/StickyNav'
import { SectionDivider } from '@/components/ui/section'
import { SECTIONS, LandingPage } from '@/components/sections'

export function App() {
  const [started, setStarted] = useState(false)
  const { t, i18n } = useTranslation('common')

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('mte-language', lng)
  }

  if (!started) {
    return (
      <LandingPage
        onStart={() => setStarted(true)}
        changeLanguage={changeLanguage}
      />
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100">
      <StickyNav sections={SECTIONS} />

      <div className="container mx-auto px-8 py-12 max-w-6xl">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('appTitle')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('header.subtitle')}
          </p>
        </header>

        {/* Sections */}
        {SECTIONS.map(({ id, Component }, i) => (
          <Fragment key={id}>
            <Component />
            {i < SECTIONS.length - 1 && <SectionDivider />}
          </Fragment>
        ))}

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>{t('footer.builtWith')}</p>
          <p className="mt-1">{t('footer.data')}</p>
        </footer>
      </div>
    </div>
  )
}

export default App
