import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
} from '@/components/ui/section'
import { ScaleExplorer } from '@/components/ScaleExplorer'

export function Section5_Scales() {
  const { t } = useTranslation(['sections', 'deepdives', 'common'])

  return (
    <Section
      id="section-5"
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
                  definition={t('common:concepts.scale')}
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
  )
}
