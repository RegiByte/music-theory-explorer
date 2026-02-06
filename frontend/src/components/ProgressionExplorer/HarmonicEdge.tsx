import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getHarmonicMovementColor } from '@/core/progressionMap'
import { getColorClassColor, getColorClassLabel } from '@/core/colorClassifier'
import { getTensionLabel, getTensionColor } from '@/core/tensionCalculator'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
export const HarmonicEdge = memo(({ 
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: any) => {
  const { t } = useTranslation('tools')
  const [isHovered, setIsHovered] = useState(false)
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  
  const color = getHarmonicMovementColor(data.harmonicMovement)
  const strokeWidth = Math.max(2, data.strength * 4)
  const strokeDasharray = data.isChromatic ? '5,5' : undefined
  
  // Get simplified label (just the function name)
  const functionName = data.harmonicMovement === 'to-tonic' ? t('harmonicEdge.resolution') :
                       data.harmonicMovement === 'to-dominant' ? t('harmonicEdge.tension') :
                       t('harmonicEdge.departure')
  
  const breakdown = data.breakdown
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: isHovered ? strokeWidth + 2 : strokeWidth,
          strokeDasharray,
          opacity: isHovered ? 1 : 0.8,
        }}
      />
      
      <EdgeLabelRenderer>
        {/* Function label - always visible */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 20}px)`,
            pointerEvents: 'none',
          }}
          className="nodrag nopan"
        >
          <div 
            className="px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            {functionName}
          </div>
        </div>
        
        {/* Hover area and detailed breakdown card */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Invisible hover target */}
          <div className="w-24 h-8" />
          
          {/* Detailed breakdown card - shown on hover */}
          {isHovered && breakdown && (
            <Card className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 shadow-lg w-72 z-50 bg-white">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    className="text-xs text-white border-0"
                    style={{ backgroundColor: getColorClassColor(breakdown.colorClass) }}
                  >
                    {getColorClassLabel(breakdown.colorClass)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {t('harmonicEdge.score')} {breakdown.total.toFixed(3)}
                  </span>
                </div>
                
                {/* Transition strength */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 font-medium w-20">{t('harmonicEdge.transition')}</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${breakdown.transitionStrength * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-gray-500 font-mono w-10 text-right">
                    {Math.round(breakdown.transitionStrength * 100)}%
                  </span>
                </div>
                
                {/* Pattern match */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 font-medium w-20">{t('harmonicEdge.pattern')}</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{
                        width: `${breakdown.patternNorm * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-gray-500 font-mono w-10 text-right">
                    {Math.round(breakdown.patternNorm * 100)}%
                  </span>
                </div>
                
                {/* Harmonic distance */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 font-medium w-20">{t('harmonicEdge.distance')}</span>
                  <span className="font-mono text-gray-700">
                    {breakdown.harmonicDistance.toFixed(2)}
                  </span>
                  <span className="text-gray-500">
                    {breakdown.harmonicDistance < 0.5 ? t('harmonicEdge.veryClose') : 
                     breakdown.harmonicDistance < 1.5 ? t('harmonicEdge.close') : 
                     breakdown.harmonicDistance < 2.5 ? t('harmonicEdge.moderate') : t('harmonicEdge.far')}
                  </span>
                </div>
                
                {/* Tension */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 font-medium w-20">{t('harmonicEdge.tensionLabel')}</span>
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getTensionColor(breakdown.tensionLevel) }}
                    />
                    <span className="text-gray-700 font-medium">
                      {getTensionLabel(breakdown.tensionLevel)}
                    </span>
                    {breakdown.tensionDelta !== undefined && (
                      <span className="text-gray-500">
                        {breakdown.tensionDelta > 0.1 ? t('harmonicEdge.building') : 
                         breakdown.tensionDelta < -0.1 ? t('harmonicEdge.resolving') : t('harmonicEdge.stable')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Matched progressions */}
                {breakdown.matchedProgressions.length > 0 && (
                  <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                    <span className="font-medium">{t('harmonicEdge.matches')}</span>{' '}
                    {breakdown.matchedProgressions.slice(0, 2).join(', ')}
                    {breakdown.matchedProgressions.length > 2 && ` +${breakdown.matchedProgressions.length - 2} more`}
                  </div>
                )}
              </div>
            </Card>
          )}
          
          {/* Fallback: simple progression tooltip if no breakdown */}
          {isHovered && !breakdown && data.matchedProgressions && data.matchedProgressions.length > 0 && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white px-3 py-2 rounded shadow-md text-xs z-50">
              {data.matchedProgressions.join(', ')}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
})

HarmonicEdge.displayName = 'HarmonicEdge'
