import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { hzToCents } from '@/core/musicTheory'
import { useResource } from '@/system'
import {
  CENTS_BARELY_NOTICEABLE,
  CENTS_CLEARLY_OFF,
  C4_FREQUENCY,
} from '@/constants'

export function CentsCalculator() {
  const { t } = useTranslation('tools')
  const [freq1, setFreq1] = useState(C4_FREQUENCY) // C4
  const [freq2, setFreq2] = useState(277.18) // C#4

  const audio = useResource('audio')

  const cents = hzToCents(freq1, freq2)
  const absDeviation = Math.abs(cents)

  // Determine status
  const status =
    absDeviation < CENTS_BARELY_NOTICEABLE
      ? 'perfect'
      : absDeviation < CENTS_CLEARLY_OFF
        ? 'acceptable'
        : 'off'

  const statusConfig = {
    perfect: {
      color: 'text-green-600',
      bg: 'bg-green-50',
      text: t('centsCalculator.perfectTuning'),
    },
    acceptable: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      text: t('centsCalculator.acceptableRange'),
    },
    off: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      text: t('centsCalculator.outOfTune'),
    },
  }

  const config = statusConfig[status]

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {t('centsCalculator.title')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('centsCalculator.description')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <Label htmlFor="freq1">{t('centsCalculator.frequency1')}</Label>
          <Input
            id="freq1"
            type="number"
            step="0.01"
            value={freq1}
            onChange={(e) => setFreq1(Number(e.target.value))}
            className="font-mono"
          />
          <Button
            onClick={() => audio.playFrequency(freq1)}
            variant="outline"
            className="w-full"
          >
            {t('centsCalculator.play')}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="freq2">{t('centsCalculator.frequency2')}</Label>
          <Input
            id="freq2"
            type="number"
            step="0.01"
            value={freq2}
            onChange={(e) => setFreq2(Number(e.target.value))}
            className="font-mono"
          />
          <Button
            onClick={() => audio.playFrequency(freq2)}
            variant="outline"
            className="w-full"
          >
            {t('centsCalculator.play')}
          </Button>
        </div>
      </div>

      <div className={`text-center p-6 rounded-lg ${config.bg}`}>
        <div className={`text-5xl font-bold mb-2 ${config.color}`}>
          {t('centsCalculator.cents', { value: cents.toFixed(2) })}
        </div>
        <div className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Button
          onClick={() => audio.playFrequencies([freq1, freq2], 2)}
          className="w-full"
        >
          {t('centsCalculator.playBothTogether')}
        </Button>
        <div className="text-xs text-center text-gray-500">
          {cents > 0
            ? t('centsCalculator.sharpBy', { value: cents.toFixed(2) })
            : t('centsCalculator.flatBy', {
                value: Math.abs(cents).toFixed(2),
              })}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t">
        <h3 className="font-semibold mb-2">
          {t('centsCalculator.quickReference')}
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• {t('centsCalculator.ref5cents')}</li>
          <li>• {t('centsCalculator.ref10cents')}</li>
          <li>• {t('centsCalculator.ref20cents')}</li>
          <li>• {t('centsCalculator.ref100cents')}</li>
          <li>• {t('centsCalculator.ref1200cents')}</li>
        </ul>
      </div>
    </Card>
  )
}
