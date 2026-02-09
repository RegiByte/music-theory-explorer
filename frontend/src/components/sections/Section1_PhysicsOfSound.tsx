import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
} from '@/components/ui/section'
import { Fretboard } from '@/components/Fretboard'

export function Section1_PhysicsOfSound() {
  const { t, i18n } = useTranslation(['sections', 'deepdives', 'common'])

  return (
    <Section
      id="section-1"
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
                  definition={t('common:concepts.vibration')}
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
                  definition={t('common:concepts.frequency')}
                  href="https://en.wikipedia.org/wiki/Frequency"
                />
              ),
              hertz: (
                <ConceptTerm
                  definition={t('common:concepts.hertz')}
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
  )
}
