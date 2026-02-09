import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
} from '@/components/ui/section'
import { ChordBuilder } from '@/components/ChordBuilder'
import { ChordVoicingFinder } from '@/components/ChordVoicingFinder'

export function Section6_Chords() {
  const { t } = useTranslation(['sections', 'deepdives', 'common'])

  return (
    <Section
      id="section-6"
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
                  definition={t('common:concepts.chord')}
                  href="https://en.wikipedia.org/wiki/Chord_(music)"
                />
              ),
              triad: (
                <ConceptTerm
                  definition={t('common:concepts.triad')}
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
                  definition={t('common:concepts.voicing')}
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
  )
}
