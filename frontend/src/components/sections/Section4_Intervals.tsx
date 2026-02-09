import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
  ConceptTerm,
} from '@/components/ui/section'
import { IntervalExplorer } from '@/components/IntervalExplorer'

export function Section4_Intervals() {
  const { t } = useTranslation(['sections', 'deepdives', 'common'])

  return (
    <Section
      id="section-4"
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
                  definition={t('common:concepts.interval')}
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
  )
}
