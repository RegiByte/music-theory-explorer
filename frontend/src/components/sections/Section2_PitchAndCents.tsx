import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
} from '@/components/ui/section'
import { FrequencyPlot } from '@/components/FrequencyPlot'
import { CentsCalculator } from '@/components/CentsCalculator'

export function Section2_PitchAndCents() {
  const { t } = useTranslation(['sections', 'deepdives', 'common'])

  return (
    <Section
      id="section-2"
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
                  definition={t('common:concepts.ratios')}
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
                  definition={t('common:concepts.cents')}
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
  )
}
