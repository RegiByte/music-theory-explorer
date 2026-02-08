/**
 * ScalePicker — Scale type selection with 3 grouping tiers.
 *
 * - 'minimal': 2 inline pills (Major, Minor)
 * - 'common': ~7 inline pills (most used scales)
 * - 'full': Tabbed groups with pill rows inside each tab
 */

import { getScaleGroups, type ScaleGroupTier } from '@/core/musicData'
import { PillGroup, Pill } from '@/components/ui/pill-group'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ScaleType } from '@/schemas'

interface ScalePickerProps {
  value: ScaleType
  onValueChange: (scale: ScaleType) => void
  /** Controls how many scales are shown and how they're organized */
  grouping?: ScaleGroupTier
  size?: 'xs' | 'sm' | 'default'
  className?: string
}

export function ScalePicker({
  value,
  onValueChange,
  grouping = 'common',
  size = 'sm',
  className,
}: ScalePickerProps) {
  const groups = getScaleGroups(grouping)

  // For 'full' grouping, use Tabs to organize the groups
  if (grouping === 'full') {
    // Find which tab the current value belongs to
    const activeTab =
      groups.find((g) => g.scales.some((s) => s.value === value))?.label ??
      groups[0].label

    return (
      <div className={className}>
        <Tabs key={activeTab} defaultValue={activeTab}>
          <TabsList variant="line" className="mb-2">
            {groups.map((group) => (
              <TabsTrigger key={group.label} value={group.label}>
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((group) => (
            <TabsContent key={group.label} value={group.label}>
              <PillGroup
                value={value}
                onValueChange={(v) => onValueChange(v as ScaleType)}
                size={size}
                colorScheme="scale"
              >
                {group.scales.map((s) => (
                  <Pill key={s.value} value={s.value}>
                    {s.label}
                  </Pill>
                ))}
              </PillGroup>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  // For 'minimal' and 'common', render a flat pill row
  // These tiers have a single group (or can be flattened)
  const allScales = groups.flatMap((g) => g.scales)

  return (
    <PillGroup
      value={value}
      onValueChange={(v) => onValueChange(v as ScaleType)}
      size={size}
      colorScheme="scale"
      className={className}
    >
      {allScales.map((s) => (
        <Pill key={s.value} value={s.value}>
          {s.label}
        </Pill>
      ))}
    </PillGroup>
  )
}
