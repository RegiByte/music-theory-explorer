import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
  SectionDivider,
} from '@/components/ui/section'

// Tools & Visualizations
import { Fretboard } from '@/components/Fretboard'
import { FrequencyPlot } from '@/components/FrequencyPlot'
import { CentsCalculator } from '@/components/CentsCalculator'
import { HarmonicSeries } from '@/components/HarmonicSeries'
import { HarmonicOverlap } from '@/components/HarmonicOverlap'
import { IntervalExplorer } from '@/components/IntervalExplorer'
import { ScaleExplorer } from '@/components/ScaleExplorer'
import { ChordBuilder } from '@/components/ChordBuilder'
import { ChordVoicingFinder } from '@/components/ChordVoicingFinder'
import { CircleOfFifths } from '@/components/CircleOfFifths'
import { ProgressionBuilder } from '@/components/ProgressionBuilder'
import { ProgressionExplorerRoot } from '@/components/ProgressionExplorer/ProgressionExplorerRoot'
import { MelodyExplorerRoot } from '@/components/MelodyExplorer'
import {
  ChordFrequencyChart,
  GenreFingerprintsChart,
  TransitionHeatmap,
  GCentricUniverse,
} from '@/components/DataInsights'

export function App() {
  const [started, setStarted] = useState(false)
  const { t, i18n } = useTranslation(['common', 'sections', 'deepdives'])

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('mte-language', lng)
  }

  if (!started) {
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

          <Button size={'xl'} onClick={() => setStarted(true)}>
            {t('landing.getStarted')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100">
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

        {/* ================================================================
            Section 1: The Physics of Sound
            ================================================================ */}
        <Section
          number={1}
          title={t('sections:s1.title')}
          subtitle={t('sections:s1.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s1.kb.p1"
                components={{
                  vibration: (
                    <ConceptTerm
                      definition={t('concepts.vibration')}
                      href="https://en.wikipedia.org/wiki/Vibration"
                    />
                  ),
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s1.kb.p2"
                components={{
                  frequency: (
                    <ConceptTerm
                      definition={t('concepts.frequency')}
                      href="https://en.wikipedia.org/wiki/Frequency"
                    />
                  ),
                  hertz: (
                    <ConceptTerm
                      definition={t('concepts.hertz')}
                      href="https://en.wikipedia.org/wiki/Hertz"
                    />
                  ),
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s1.kb.p3"
                components={{ b: <strong /> }}
              />
            </p>
            <p>{t('sections:s1.kb.p4')}</p>
          </KnowledgeBlock>

          {/* Notation disclaimer — only visible in Portuguese */}
          {i18n.language === 'pt' && (
            <div className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50/50 p-5 space-y-3">
              <h4 className="font-semibold text-amber-900 text-sm">
                {t('sections:s1.notationDisclaimer.title')}
              </h4>
              <p className="text-sm text-amber-800">
                {t('sections:s1.notationDisclaimer.description')}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center">
                {[
                  ['C', 'Dó'],
                  ['D', 'Ré'],
                  ['E', 'Mi'],
                  ['F', 'Fá'],
                  ['G', 'Sol'],
                  ['A', 'Lá'],
                  ['B', 'Si'],
                ].map(([letter, solfege]) => (
                  <div
                    key={letter}
                    className="rounded-md bg-white border border-amber-200 px-2 py-1.5"
                  >
                    <div className="text-base font-bold text-gray-900">
                      {letter}
                    </div>
                    <div className="text-xs text-amber-700">{solfege}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-amber-700 space-y-1">
                <p>{t('sections:s1.notationDisclaimer.sharp')}</p>
                <p>{t('sections:s1.notationDisclaimer.flat')}</p>
                <p className="font-medium">
                  {t('sections:s1.notationDisclaimer.example')}
                </p>
              </div>
              <p className="text-xs text-amber-600 italic">
                {t('sections:s1.notationDisclaimer.note')}
              </p>
            </div>
          )}

          <Fretboard />

          <DeepDive title={t('deepdives:s1.d1.title')}>
            <p>{t('deepdives:s1.d1.p1')}</p>
            <p>{t('deepdives:s1.d1.p2')}</p>
          </DeepDive>

          <DeepDive title={t('deepdives:s1.d2.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s1.d2.p1"
                components={{ b: <strong /> }}
              />
            </p>
            <p>
              <Trans i18nKey="deepdives:s1.d2.p2" components={{ i: <em /> }} />
            </p>
          </DeepDive>
        </Section>

        <SectionDivider />

        {/* ================================================================
            Section 2: Pitch Perception & Cents
            ================================================================ */}
        <Section
          number={2}
          title={t('sections:s2.title')}
          subtitle={t('sections:s2.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s2.kb.p1"
                components={{ b: <strong /> }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s2.kb.p2"
                components={{
                  ratios: (
                    <ConceptTerm
                      definition={t('concepts.ratios')}
                      href="https://en.wikipedia.org/wiki/Pitch_(music)"
                    />
                  ),
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s2.kb.p3"
                components={{
                  cents: (
                    <ConceptTerm
                      definition={t('concepts.cents')}
                      href="https://en.wikipedia.org/wiki/Cent_(music)"
                    />
                  ),
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s2.kb.p4"
                components={{ b: <strong /> }}
              />
            </p>
          </KnowledgeBlock>

          <FrequencyPlot />

          <KnowledgeBlock>
            <p>{t('sections:s2.kb.p5')}</p>
          </KnowledgeBlock>

          <CentsCalculator />

          <DeepDive title={t('deepdives:s2.d1.title')}>
            <p>
              <Trans i18nKey="deepdives:s2.d1.p1" components={{ i: <em /> }} />
            </p>
            <p>
              <Trans
                i18nKey="deepdives:s2.d1.p2"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>

          <DeepDive title={t('deepdives:s2.d2.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s2.d2.p1"
                components={{ b: <strong /> }}
              />
            </p>
            <p>
              <Trans
                i18nKey="deepdives:s2.d2.p2"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>
        </Section>

        <SectionDivider />

        {/* ================================================================
            Section 3: Harmonics & Consonance
            ================================================================ */}
        <Section
          number={3}
          title={t('sections:s3.title')}
          subtitle={t('sections:s3.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s3.kb.p1"
                components={{
                  fundamental: (
                    <ConceptTerm
                      definition={t('concepts.fundamental')}
                      href="https://en.wikipedia.org/wiki/Fundamental_frequency"
                    />
                  ),
                  overtones: (
                    <ConceptTerm
                      definition={t('concepts.overtones')}
                      href="https://en.wikipedia.org/wiki/Overtone"
                    />
                  ),
                  harmonicSeries: (
                    <ConceptTerm
                      definition={t('concepts.harmonicSeries')}
                      href="https://en.wikipedia.org/wiki/Harmonic_series_(music)"
                    />
                  ),
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s3.kb.p2"
                components={{ b: <strong /> }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s3.kb.p3"
                components={{
                  consonance: (
                    <ConceptTerm
                      definition={t('concepts.consonance')}
                      href="https://en.wikipedia.org/wiki/Consonance_and_dissonance"
                    />
                  ),
                  dissonance: (
                    <ConceptTerm
                      definition={t('concepts.dissonance')}
                      href="https://en.wikipedia.org/wiki/Consonance_and_dissonance"
                    />
                  ),
                }}
              />
            </p>
          </KnowledgeBlock>

          <HarmonicSeries />

          <KnowledgeBlock>
            <p>{t('sections:s3.kb.p4')}</p>
          </KnowledgeBlock>

          <HarmonicOverlap />

          <DeepDive title={t('deepdives:s3.d1.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s3.d1.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>

          <DeepDive title={t('deepdives:s3.d2.title')}>
            <p>{t('deepdives:s3.d2.p1')}</p>
          </DeepDive>
        </Section>

        <SectionDivider />

        {/* ================================================================
            Section 4: Intervals
            ================================================================ */}
        <Section
          number={4}
          title={t('sections:s4.title')}
          subtitle={t('sections:s4.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s4.kb.p1"
                components={{
                  interval: (
                    <ConceptTerm
                      definition={t('concepts.interval')}
                      href="https://en.wikipedia.org/wiki/Interval_(music)"
                    />
                  ),
                  b: <strong />,
                }}
              />
            </p>
            <p>{t('sections:s4.kb.p2')}</p>
            <ul>
              <li>
                <Trans
                  i18nKey="sections:s4.kb.li1"
                  components={{ b: <strong /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="sections:s4.kb.li2"
                  components={{ b: <strong /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="sections:s4.kb.li3"
                  components={{ b: <strong /> }}
                />
              </li>
            </ul>
            <p>
              <Trans
                i18nKey="sections:s4.kb.p3"
                components={{ b: <strong /> }}
              />
            </p>
          </KnowledgeBlock>

          <IntervalExplorer />

          <DeepDive title={t('deepdives:s4.d1.title')}>
            <p>{t('deepdives:s4.d1.p1')}</p>
          </DeepDive>

          <DeepDive title={t('deepdives:s4.d2.title')}>
            <p>{t('deepdives:s4.d2.p1')}</p>
          </DeepDive>
        </Section>

        <SectionDivider />

        {/* ================================================================
            Section 5: Scales
            ================================================================ */}
        <Section
          number={5}
          title={t('sections:s5.title')}
          subtitle={t('sections:s5.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s5.kb.p1"
                components={{
                  scale: (
                    <ConceptTerm
                      definition={t('concepts.scale')}
                      href="https://en.wikipedia.org/wiki/Scale_(music)"
                    />
                  ),
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s5.kb.p2"
                components={{ b: <strong /> }}
              />
            </p>
            <p>{t('sections:s5.kb.p3')}</p>
          </KnowledgeBlock>

          <ScaleExplorer />

          <DeepDive title={t('deepdives:s5.d1.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s5.d1.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>

          <DeepDive title={t('deepdives:s5.d2.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s5.d2.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>
        </Section>

        <SectionDivider />

        {/* ================================================================
            Section 6: Chords
            ================================================================ */}
        <Section
          number={6}
          title={t('sections:s6.title')}
          subtitle={t('sections:s6.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s6.kb.p1"
                components={{
                  chord: (
                    <ConceptTerm
                      definition={t('concepts.chord')}
                      href="https://en.wikipedia.org/wiki/Chord_(music)"
                    />
                  ),
                  triad: (
                    <ConceptTerm
                      definition={t('concepts.triad')}
                      href="https://en.wikipedia.org/wiki/Triad_(music)"
                    />
                  ),
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s6.kb.p2"
                components={{ b: <strong /> }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s6.kb.p3"
                components={{ b: <strong /> }}
              />
            </p>
          </KnowledgeBlock>

          <ChordBuilder />

          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s6.kb.p4"
                components={{
                  voicing: (
                    <ConceptTerm
                      definition={t('concepts.voicing')}
                      href="https://en.wikipedia.org/wiki/Voicing_(music)"
                    />
                  ),
                }}
              />
            </p>
          </KnowledgeBlock>

          <ChordVoicingFinder />

          <DeepDive title={t('deepdives:s6.d1.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s6.d1.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>

          <DeepDive title={t('deepdives:s6.d2.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s6.d2.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>
        </Section>

        <SectionDivider />

        {/* ================================================================
            Section 7: Keys & The Circle of Fifths
            ================================================================ */}
        <Section
          number={7}
          title={t('sections:s7.title')}
          subtitle={t('sections:s7.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s7.kb.p1"
                components={{
                  key: (
                    <ConceptTerm
                      definition={t('concepts.key')}
                      href="https://en.wikipedia.org/wiki/Key_(music)"
                    />
                  ),
                  tonic: (
                    <ConceptTerm
                      definition={t('concepts.tonic')}
                      href="https://en.wikipedia.org/wiki/Tonic_(music)"
                    />
                  ),
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s7.kb.p2"
                components={{
                  circleOfFifths: (
                    <ConceptTerm
                      definition={t('concepts.circleOfFifths')}
                      href="https://en.wikipedia.org/wiki/Circle_of_fifths"
                    />
                  ),
                  b: <strong />,
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s7.kb.p3"
                components={{
                  diatonic: (
                    <ConceptTerm
                      definition={t('concepts.diatonic')}
                      href="https://en.wikipedia.org/wiki/Diatonic_and_chromatic"
                    />
                  ),
                }}
              />
            </p>
          </KnowledgeBlock>

          <CircleOfFifths />

          <DeepDive title={t('deepdives:s7.d1.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s7.d1.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>

          <DeepDive title={t('deepdives:s7.d2.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s7.d2.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>
        </Section>

        <SectionDivider />

        {/* ================================================================
            Section 8: Chord Progressions
            ================================================================ */}
        <Section
          number={8}
          title={t('sections:s8.title')}
          subtitle={t('sections:s8.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s8.kb.p1"
                components={{
                  progression: (
                    <ConceptTerm
                      definition={t('concepts.chordProgression')}
                      href="https://en.wikipedia.org/wiki/Chord_progression"
                    />
                  ),
                  harmonicFunction: (
                    <ConceptTerm
                      definition={t('concepts.harmonicFunction')}
                      href="https://en.wikipedia.org/wiki/Function_(music)"
                    />
                  ),
                }}
              />
            </p>
            <ul>
              <li>
                <Trans
                  i18nKey="sections:s8.kb.li1"
                  components={{ b: <strong /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="sections:s8.kb.li2"
                  components={{ b: <strong /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="sections:s8.kb.li3"
                  components={{ b: <strong /> }}
                />
              </li>
            </ul>
            <p>
              <Trans
                i18nKey="sections:s8.kb.p2"
                components={{
                  cadence: (
                    <ConceptTerm
                      definition={t('concepts.cadence')}
                      href="https://en.wikipedia.org/wiki/Cadence"
                    />
                  ),
                  b: <strong />,
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="sections:s8.kb.p3"
                components={{ b: <strong /> }}
              />
            </p>
          </KnowledgeBlock>

          <ProgressionBuilder />

          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s8.kb.p4"
                components={{ i: <em />, b: <strong /> }}
              />
            </p>
          </KnowledgeBlock>

          <TransitionHeatmap mode="single-chord" />

          <DeepDive title={t('deepdives:s8.d1.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s8.d1.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>

          <DeepDive title={t('deepdives:s8.d2.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s8.d2.p1"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>
        </Section>

        <SectionDivider />

        {/* ================================================================
            Section 9: The Creative Toolset
            ================================================================ */}
        <Section
          number={9}
          title={t('sections:s9.title')}
          subtitle={t('sections:s9.subtitle')}
        >
          <KnowledgeBlock>
            <p>
              <Trans
                i18nKey="sections:s9.kb.p1"
                components={{ b: <strong /> }}
              />
            </p>
            <p>
              <Trans i18nKey="sections:s9.kb.p2" components={{ i: <em /> }} />
            </p>
          </KnowledgeBlock>

          {/* 9a: Progression Explorer */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                {t('sections:s9.progressionExplorer.title')}
              </h3>
              <p className="text-muted-foreground max-w-3xl">
                {t('sections:s9.progressionExplorer.description')}
              </p>
            </div>
            <ProgressionExplorerRoot />
          </div>

          {/* 9b: Melody Explorer */}
          <div className="space-y-4 pt-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                {t('sections:s9.melodyExplorer.title')}
              </h3>
              <p className="text-muted-foreground max-w-3xl">
                {t('sections:s9.melodyExplorer.description')}
              </p>
            </div>
            <MelodyExplorerRoot />
          </div>

          {/* 9c: Data Insights */}
          <div className="space-y-6 pt-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                {t('sections:s9.dataInsights.title')}
              </h3>
              <p className="text-muted-foreground max-w-3xl">
                {t('sections:s9.dataInsights.description')}
              </p>
            </div>

            <KnowledgeBlock>
              <p>
                <Trans
                  i18nKey="sections:s9.dataInsights.chordFrequency"
                  components={{ b: <strong /> }}
                />
              </p>
            </KnowledgeBlock>

            <ChordFrequencyChart />

            <KnowledgeBlock>
              <p>{t('sections:s9.dataInsights.genreFingerprints')}</p>
            </KnowledgeBlock>

            <GenreFingerprintsChart />

            <KnowledgeBlock>
              <p>{t('sections:s9.dataInsights.transitionMatrix')}</p>
            </KnowledgeBlock>

            <TransitionHeatmap mode="matrix" />

            <KnowledgeBlock>
              <p>
                <Trans
                  i18nKey="sections:s9.dataInsights.gCentric"
                  components={{ b: <strong /> }}
                />
              </p>
            </KnowledgeBlock>

            <GCentricUniverse />
          </div>

          <DeepDive title={t('deepdives:s9.d1.title')}>
            <p>
              <Trans
                i18nKey="deepdives:s9.d1.p1"
                components={{ b: <strong /> }}
              />
            </p>
            <p>{t('deepdives:s9.d1.p2')}</p>
            <p>
              <Trans
                i18nKey="deepdives:s9.d1.p3"
                components={{ b: <strong /> }}
              />
            </p>
          </DeepDive>
        </Section>

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
