import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
} from '@/components/ui/section'
import { HarmonicSeries } from '@/components/HarmonicSeries'
import { HarmonicOverlap } from '@/components/HarmonicOverlap'

export function Section3_Harmonics() {
  const { t } = useTranslation(['sections', 'deepdives', 'common'])

  return (
    <Section
      id="section-3"
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
                  definition={t('common:concepts.fundamental')}
                  href="https://en.wikipedia.org/wiki/Fundamental_frequency"
                />
              ),
              overtones: (
                <ConceptTerm
                  definition={t('common:concepts.overtones')}
                  href="https://en.wikipedia.org/wiki/Overtone"
                />
              ),
              harmonicSeries: (
                <ConceptTerm
                  definition={t('common:concepts.harmonicSeries')}
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
                  definition={t('common:concepts.consonance')}
                  href="https://en.wikipedia.org/wiki/Consonance_and_dissonance"
                />
              ),
              dissonance: (
                <ConceptTerm
                  definition={t('common:concepts.dissonance')}
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
  )
}
