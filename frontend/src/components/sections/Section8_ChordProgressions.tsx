import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
} from '@/components/ui/section'
import { ProgressionBuilder } from '@/components/ProgressionBuilder'
import { TransitionHeatmap } from '@/components/DataInsights'

export function Section8_ChordProgressions() {
  const { t } = useTranslation(['sections', 'deepdives', 'common'])

  return (
    <Section
      id="section-8"
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
                  definition={t('common:concepts.chordProgression')}
                  href="https://en.wikipedia.org/wiki/Chord_progression"
                />
              ),
              harmonicFunction: (
                <ConceptTerm
                  definition={t('common:concepts.harmonicFunction')}
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
                  definition={t('common:concepts.cadence')}
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
  )
}
