import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
} from '@/components/ui/section'
import { CircleOfFifths } from '@/components/CircleOfFifths'

export function Section7_KeysAndCircleOfFifths() {
  const { t } = useTranslation(['sections', 'deepdives', 'common'])

  return (
    <Section
      id="section-7"
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
                  definition={t('common:concepts.key')}
                  href="https://en.wikipedia.org/wiki/Key_(music)"
                />
              ),
              tonic: (
                <ConceptTerm
                  definition={t('common:concepts.tonic')}
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
                  definition={t('common:concepts.circleOfFifths')}
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
                  definition={t('common:concepts.diatonic')}
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
  )
}
