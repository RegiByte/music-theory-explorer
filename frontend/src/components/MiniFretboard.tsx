import type { ChordVoicing, UkuleleString } from '@/schemas'

interface MiniFretboardProps {
  voicing: ChordVoicing
  compact?: boolean
}

// Layout configuration - all dimensions relative to viewport
interface FretboardLayout {
  // Viewport dimensions
  viewportWidth: number
  viewportHeight: number
  
  // Padding around the fretboard
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  paddingBottom: number
  
  // Derived dimensions (calculated from viewport and padding)
  fretboardPaddingTop: number
  fretboardPaddingBottom: number
  fretboardWidth: number
  fretboardHeight: number
  fretboardStartX: number
  fretboardStartY: number
  fretboardEndX: number
  fretboardEndY: number
  
  // String spacing
  stringSpacing: number
  
  // Font sizes
  stringLabelSize: number
  fretNumberSize: number
  positionIndicatorSize: number
  positionMarkerRadius: number
  fretMarkerRadius: number
}

function createLayout(compact: boolean): FretboardLayout {
  // Viewport dimensions
  const viewportWidth = compact ? 225 : 280
  const viewportHeight = compact ? 110 : 140
  
  // Padding configuration
  const paddingLeft = 26
  const paddingRight = 16
  const paddingTop = 10
  const paddingBottom = 12

  // Fretboard boundaries
  const fretboardPaddingTop = compact ? 10 : 20
  const fretboardPaddingBottom = compact ? 10 : 16
  const fretboardPaddingLeft = 4
  const fretboardPaddingRight = 4
  const fretboardWidth = viewportWidth - paddingLeft - paddingRight - fretboardPaddingLeft - fretboardPaddingRight
  const fretboardHeight = viewportHeight - paddingTop - paddingBottom - fretboardPaddingTop - fretboardPaddingBottom
  const fretboardStartX = paddingLeft + fretboardPaddingLeft
  const fretboardStartY = paddingTop + fretboardPaddingTop
  const fretboardEndX = viewportWidth - paddingRight - fretboardPaddingRight
  const fretboardEndY = viewportHeight - paddingBottom - fretboardPaddingBottom

  
  
  // String spacing (divide height by number of strings - 1)
  const stringSpacing = fretboardHeight / 3 // 4 strings = 3 gaps
  
  // Font sizes (proportional to viewport)
  const stringLabelSize = compact ? 11 : 15
  const fretNumberSize = compact ? 9 : 11
  const positionIndicatorSize = compact ? 10 : 13
  const positionMarkerRadius = compact ? 7 : 8
  const fretMarkerRadius = compact ? 4 : 5
  
  return {
    viewportWidth,
    viewportHeight,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    fretboardPaddingTop,
    fretboardPaddingBottom,
    fretboardWidth,
    fretboardHeight,
    fretboardStartX,
    fretboardStartY,
    fretboardEndX,
    fretboardEndY,
    stringSpacing,
    stringLabelSize,
    fretNumberSize,
    positionIndicatorSize,
    positionMarkerRadius,
    fretMarkerRadius,
  }
}

export function MiniFretboard({ voicing, compact = true }: MiniFretboardProps) {
  const strings: UkuleleString[] = ['A', 'E', 'C', 'G']
  const layout = createLayout(compact)
  
  // Get fret positions for display (top to bottom: A-E-C-G)
  const fretPositions = strings.map((str) => {
    const pos = voicing.positions.find((p) => p.string === str)
    return pos ? pos.fret : null
  })

  // Calculate fret range for mini fretboard display
  const nonZeroFrets = fretPositions.filter((f) => f !== null && f > 0) as number[]
  const minFret = nonZeroFrets.length > 0 ? Math.min(...nonZeroFrets) : 0
  const maxFret = nonZeroFrets.length > 0 ? Math.max(...nonZeroFrets) : 0

  // Determine display range (show a window around the voicing)
  let displayStartFret = 0
  let displayEndFret = 5

  if (minFret > 0) {
    // Voicing is not at open position, show a window around it
    displayStartFret = Math.max(0, minFret - 1)
    displayEndFret = Math.min(12, maxFret + 1)

    // Ensure we show at least 4 frets
    if (displayEndFret - displayStartFret < 4) {
      displayEndFret = Math.min(12, displayStartFret + 4)
    }
  }

  const numFretsToShow = displayEndFret - displayStartFret
  
  // Calculate fret spacing (divide fretboard width by number of frets)
  const fretSpacing = layout.fretboardWidth / numFretsToShow
  
  // Helper function to get X position for a fret
  const getFretX = (fretIndex: number) => {
    return layout.fretboardStartX + fretIndex * fretSpacing
  }
  
  // Helper function to get Y position for a string
  const getStringY = (stringIndex: number) => {
    return layout.fretboardStartY + stringIndex * layout.stringSpacing
  }
  
  const viewBox = `0 0 ${layout.viewportWidth} ${layout.viewportHeight}`

  return (
    <div className="bg-linear-to-b from-slate-100 to-stone-200 rounded-md border border-gray-200">
      <svg viewBox={viewBox} className="w-full h-auto">
        {/* Fret position indicator at top left */}
        {displayStartFret > 0 && (
          <text
            x={layout.paddingLeft / 2}
            y={layout.fretboardStartY * .6}
            fontSize={layout.fretNumberSize + 3}
            fontWeight="bold"
            fill="#666"
          >
            {displayStartFret}fr
          </text>
        )}

        {/* Fret lines (vertical) with fret numbers below */}
        {Array.from({ length: numFretsToShow + 1 }, (_, i) => {
          const fretNum = displayStartFret + i
          const x = getFretX(i)

          return (
            <g key={fretNum}>
              {/* Fret line */}
              <line
                x1={x}
                y1={layout.fretboardStartY}
                x2={x}
                y2={layout.fretboardEndY}
                stroke={fretNum === 0 ? "#000" : "#999"}
                strokeWidth={fretNum === 0 ? 3 : 1.5}
                opacity={fretNum === 0 ? "1" : "0.5"}
              />
              {/* Fret number below each fret line */}
              {fretNum > 0 && (
                <text
                  x={x}
                  y={layout.fretboardEndY + layout.fretNumberSize + (layout.fretboardPaddingBottom * .7)}
                  fontSize={layout.fretNumberSize}
                  fill="#666"
                  textAnchor="middle"
                >
                  {fretNum}
                </text>
              )}
            </g>
          )
        })}

        {/* Fret markers (dots at 3, 5, 7, 10, 12) */}
        {[3, 5, 7, 10, 12].map((markerFret) => {
          // Only show marker if it's in the display range
          if (markerFret < displayStartFret || markerFret > displayEndFret) {
            return null
          }

          const fretIndex = markerFret - displayStartFret
          // Position marker between fret lines (at -0.5 offset)
          const x = getFretX(fretIndex - 0.5)
          // Center Y position (middle of fretboard)
          const centerY = layout.fretboardStartY + layout.fretboardHeight / 2

          // Double dot for 12th fret
          if (markerFret === 12) {
            const dotOffset = layout.stringSpacing
            return (
              <g key={markerFret}>
                <circle
                  cx={x}
                  cy={centerY - dotOffset}
                  r={layout.fretMarkerRadius}
                  fill="#999"
                  opacity="0.6"
                />
                <circle
                  cx={x}
                  cy={centerY + dotOffset}
                  r={layout.fretMarkerRadius}
                  fill="#999"
                  opacity="0.6"
                />
              </g>
            )
          }

          return (
            <circle
              key={markerFret}
              cx={x}
              cy={centerY}
              r={layout.fretMarkerRadius}
              fill="#999"
              opacity="0.6"
            />
          )
        })}

        {/* Draw 4 strings */}
        {strings.map((string, stringIdx) => {
          const y = getStringY(stringIdx)
          const fret = fretPositions[stringIdx]

          return (
            <g key={string}>
              {/* String line - full fretboard width */}
              <line
                x1={layout.fretboardStartX}
                y1={y}
                x2={layout.fretboardEndX}
                y2={y}
                stroke="#333"
                strokeWidth={1.5}
              />
              
              {/* String label (left of fretboard) */}
              <text
                x={(layout.paddingLeft / 2) }
                y={y + layout.stringLabelSize / 3}
                fontSize={layout.stringLabelSize}
                fontWeight="bold"
                fill="#666"
                textAnchor="middle"
              >
                {string}
              </text>

              {/* Fret position marker */}
              {fret !== null && fret >= displayStartFret && fret <= displayEndFret && (
                <>
                  <circle
                    cx={getFretX(fret - displayStartFret)}
                    cy={y}
                    r={layout.positionMarkerRadius}
                    fill="#3b82f6"
                    stroke="#1e40af"
                    strokeWidth={2}
                  />
                  <text
                    x={getFretX(fret - displayStartFret)}
                    y={y + layout.positionIndicatorSize / 3}
                    fontSize={layout.positionIndicatorSize}
                    fontWeight="bold"
                    fill="white"
                    textAnchor="middle"
                  >
                    {fret === 0 ? 'O' : fret}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
