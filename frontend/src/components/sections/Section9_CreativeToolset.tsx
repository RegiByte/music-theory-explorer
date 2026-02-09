import { useTranslation, Trans } from 'react-i18next'
import {
  Section,
  KnowledgeBlock,
  DeepDive,
} from '@/components/ui/section'
import { ProgressionExplorerRoot } from '@/components/ProgressionExplorer/ProgressionExplorerRoot'
import { MelodyExplorerRoot } from '@/components/MelodyExplorer'
import {
  ChordFrequencyChart,
  GenreFingerprintsChart,
  TransitionHeatmap,
  GCentricUniverse,
} from '@/components/DataInsights'

export function Section9_CreativeToolset() {
  const { t } = useTranslation(['sections', 'deepdives'])

  return (
    <Section
      id="section-9"
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
  )
}
