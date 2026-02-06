import { useState } from 'react'
import { useResource } from '@/system'
import { getNoteAtPosition, getFrequencyAtPosition } from '@/core/fretboard'
import type { UkuleleString, Note } from '@/schemas'

// Enhanced position type with metadata
export interface FretboardPosition {
  string: UkuleleString
  fret: number
  label?: string // Optional label (e.g., "R" for root, "3" for third)
  color?: 'primary' | 'secondary' | 'accent' | 'muted'
  emphasis?: 'normal' | 'strong' // Visual weight
}

interface FretboardProps {
  // Flexible highlighting - can be used for scales, chords, or custom
  highlightedPositions?: FretboardPosition[]

  // Optional callback when position is clicked
  onPositionClick?: (string: UkuleleString, fret: number, note: Note) => void

  // Visual mode (affects default styling)
  visualMode?: 'default' | 'educational' | 'minimal'
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

  // Nut (fret 0) configuration
  nutWidth: number

  // Derived dimensions (calculated from viewport and padding)
  fretboardWidth: number
  fretboardHeight: number
  fretboardStartX: number
  fretboardStartY: number
  fretboardEndX: number
  fretboardEndY: number

  // String configuration
  numStrings: number
  stringSpacing: number

  // Fret configuration
  numFrets: number
  fretSpacing: number

  // Visual sizes
  positionCircleRadius: number
  positionCircleRadiusHovered: number
  positionCircleRadiusStrong: number
  fretMarkerRadius: number
  stringLabelSize: number
  noteLabelSize: number
  noteLabelSizeHovered: number
  fretNumberSize: number
  degreeLabeSize: number
}

function createFretboardLayout(): FretboardLayout {
  // Viewport dimensions
  const viewportWidth = 950
  const viewportHeight = 280

  // Padding configuration
  const paddingLeft = 40 // Room for string labels
  const paddingRight = 20
  const paddingTop = 10 // Room at top
  const paddingBottom = 20 // Room for fret numbers

  // Nut configuration
  const nutWidth = 40 // Space for open strings (fret 0)

  // String and fret configuration
  const numStrings = 4
  const numFrets = 13 // 0-12

  // Calculate available space for fretboard
  // Fretboard boundaries
  const fretboardPaddingTop = 20
  const fretboardPaddingBottom = 20
  const fretboardPaddingLeft = 4
  const fretboardPaddingRight = 4
  const fretboardWidth =
    viewportWidth -
    paddingLeft -
    paddingRight -
    nutWidth -
    fretboardPaddingLeft -
    fretboardPaddingRight
  const fretboardHeight =
    viewportHeight -
    paddingTop -
    paddingBottom -
    fretboardPaddingTop -
    fretboardPaddingBottom
  const fretboardStartX = paddingLeft + fretboardPaddingLeft
  const fretboardStartY = paddingTop + fretboardPaddingTop
  const fretboardEndX = viewportWidth - paddingRight - fretboardPaddingRight
  const fretboardEndY = viewportHeight - paddingBottom - fretboardPaddingBottom

  // String spacing (divide height by number of gaps between strings)
  const stringSpacing = fretboardHeight / (numStrings - 1)

  // Fret spacing (divide width by number of frets, excluding fret 0)
  const fretSpacing = fretboardWidth / (numFrets - 1)

  // Visual sizes
  const positionCircleRadius = 12
  const positionCircleRadiusHovered = 14
  const positionCircleRadiusStrong = 13
  const fretMarkerRadius = 6
  const stringLabelSize = 16
  const noteLabelSize = 12
  const noteLabelSizeHovered = 14
  const fretNumberSize = 13
  const degreeLabeSize = 9

  return {
    viewportWidth,
    viewportHeight,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    nutWidth,
    fretboardWidth,
    fretboardHeight,
    fretboardStartX,
    fretboardStartY,
    fretboardEndX,
    fretboardEndY,
    numStrings,
    stringSpacing,
    numFrets,
    fretSpacing,
    positionCircleRadius,
    positionCircleRadiusHovered,
    positionCircleRadiusStrong,
    fretMarkerRadius,
    stringLabelSize,
    noteLabelSize,
    noteLabelSizeHovered,
    fretNumberSize,
    degreeLabeSize,
  }
}

export function Fretboard({
  highlightedPositions = [],
  onPositionClick,
  visualMode = 'default', // Reserved for future styling variations
}: FretboardProps) {
  const audio = useResource('audio')
  const layout = createFretboardLayout()

  // Suppress unused warning - visualMode is part of the public API for future use
  void visualMode
  const [hoveredPosition, setHoveredPosition] = useState<{
    string: UkuleleString
    fret: number
  } | null>(null)

  const strings: UkuleleString[] = ['A', 'E', 'C', 'G'] // Top to bottom (physical layout)
  const frets = Array.from({ length: layout.numFrets }, (_, i) => i)

  // Helper function to get X position for a fret
  const getFretX = (fret: number): number => {
    if (fret === 0) {
      // Open strings centered in the nut space
      return layout.fretboardStartX + layout.nutWidth / 2
    }
    // Frets are positioned at their center point
    return (
      layout.fretboardStartX +
      layout.nutWidth +
      (fret - 0.5) * layout.fretSpacing
    )
  }

  // Helper function to get Y position for a string
  const getStringY = (stringIndex: number): number => {
    return layout.fretboardStartY + stringIndex * layout.stringSpacing
  }

  // Helper function to get X position for a fret line (vertical line)
  const getFretLineX = (fret: number): number => {
    if (fret === 0) {
      return layout.fretboardStartX
    }
    return layout.fretboardStartX + layout.nutWidth + fret * layout.fretSpacing
  }

  const handleNoteClick = (string: UkuleleString, fret: number) => {
    const note = getNoteAtPosition(string, fret)

    // Call custom callback if provided
    if (onPositionClick) {
      onPositionClick(string, fret, note)
    }

    // Default behavior: play the note
    const frequency = getFrequencyAtPosition(string, fret)
    audio.playNote(frequency)
  }

  // Get position metadata if highlighted
  const getPositionMetadata = (
    string: UkuleleString,
    fret: number,
  ): FretboardPosition | undefined => {
    return highlightedPositions.find(
      (pos) => pos.string === string && pos.fret === fret,
    )
  }

  const isHovered = (string: UkuleleString, fret: number): boolean => {
    return hoveredPosition?.string === string && hoveredPosition?.fret === fret
  }

  // Color mapping for different highlight types
  const getHighlightColors = (
    color: FretboardPosition['color'] = 'primary',
    emphasis: FretboardPosition['emphasis'] = 'normal',
  ) => {
    const colorMap = {
      primary: {
        fill: emphasis === 'strong' ? '#2563eb' : '#3b82f6',
        stroke: emphasis === 'strong' ? '#1e3a8a' : '#1e40af',
        text: '#fff',
      },
      secondary: {
        fill: emphasis === 'strong' ? '#7c3aed' : '#a78bfa',
        stroke: emphasis === 'strong' ? '#5b21b6' : '#7c3aed',
        text: '#fff',
      },
      accent: {
        fill: emphasis === 'strong' ? '#d97706' : '#fbbf24',
        stroke: emphasis === 'strong' ? '#92400e' : '#d97706',
        text: '#78350f',
      },
      muted: {
        fill: emphasis === 'strong' ? '#6b7280' : '#9ca3af',
        stroke: emphasis === 'strong' ? '#374151' : '#6b7280',
        text: '#fff',
      },
    }
    return colorMap[color]
  }

  const viewBox = `0 0 ${layout.viewportWidth} ${layout.viewportHeight}`

  return (
    <div className="relative">
      <svg
        viewBox={viewBox}
        className="border border-gray-300 rounded-lg bg-linear-to-b from-slate-100 to-stone-200 w-full h-auto"
      >
        {/* Nut (fret 0 lines) */}
        <line
          x1={layout.fretboardStartX}
          y1={layout.fretboardStartY}
          x2={layout.fretboardStartX}
          y2={layout.fretboardEndY}
          stroke="#000"
          strokeWidth={4}
        />
        <line
          x1={layout.fretboardStartX + layout.nutWidth}
          y1={layout.fretboardStartY}
          x2={layout.fretboardStartX + layout.nutWidth}
          y2={layout.fretboardEndY}
          stroke="#000"
          strokeWidth={4}
        />

        {/* Fret lines (1-12) */}
        {frets.slice(1).map((fret) => {
          const x = getFretLineX(fret)

          return (
            <line
              key={`fret-${fret}`}
              x1={x}
              y1={layout.fretboardStartY}
              x2={x}
              y2={layout.fretboardEndY}
              stroke="#666"
              strokeWidth={1.5}
            />
          )
        })}

        {/* Fret markers (dots at 3, 5, 7, 10, 12) */}
        {[3, 5, 7, 10].map((fret) => {
          const centerY = layout.fretboardStartY + layout.fretboardHeight / 2
          return (
            <circle
              key={`marker-${fret}`}
              cx={getFretX(fret)}
              cy={centerY}
              r={layout.fretMarkerRadius}
              fill="#999"
              opacity="0.6"
            />
          )
        })}
        {/* Double dot at 12th fret */}
        <circle
          cx={getFretX(12)}
          cy={getStringY(0) + layout.stringSpacing * 0.5}
          r={layout.fretMarkerRadius}
          fill="#999"
          opacity="0.6"
        />
        <circle
          cx={getFretX(12)}
          cy={getStringY(0) + layout.stringSpacing * 2.5}
          r={layout.fretMarkerRadius}
          fill="#999"
          opacity="0.3"
        />

        {/* Strings and positions */}
        {strings.map((string, stringIdx) => {
          const y = getStringY(stringIdx)

          return (
            <g key={string}>
              {/* String line */}
              <line
                x1={layout.fretboardStartX}
                y1={y}
                x2={layout.fretboardEndX}
                y2={y}
                stroke="#333"
                strokeWidth="2"
              />

              {/* String label */}
              <text
                x={layout.fretboardStartX - layout.paddingLeft / 2}
                y={y + layout.stringLabelSize / 3}
                fontSize={layout.stringLabelSize}
                fontWeight="bold"
                fill="#9ca3af"
              >
                {string}
              </text>

              {/* Fret positions */}
              {frets.map((fret) => {
                const note = getNoteAtPosition(string, fret)
                const positionMeta = getPositionMetadata(string, fret)
                const hovered = isHovered(string, fret)
                const x = getFretX(fret)

                // Get colors based on position metadata
                const colors = positionMeta
                  ? getHighlightColors(
                      positionMeta.color,
                      positionMeta.emphasis,
                    )
                  : null

                return (
                  <g key={`${string}-${fret}`}>
                    {/* Position circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={
                        hovered
                          ? layout.positionCircleRadiusHovered
                          : positionMeta?.emphasis === 'strong'
                            ? layout.positionCircleRadiusStrong
                            : layout.positionCircleRadius
                      }
                      fill={colors ? colors.fill : hovered ? '#60a5fa' : '#fff'}
                      stroke={
                        colors ? colors.stroke : hovered ? '#3b82f6' : '#666'
                      }
                      strokeWidth={positionMeta || hovered ? 2 : 1}
                      className="cursor-pointer transition-all duration-150"
                      onClick={() => handleNoteClick(string, fret)}
                      onMouseEnter={() => setHoveredPosition({ string, fret })}
                      onMouseLeave={() => setHoveredPosition(null)}
                    />

                    {/* Optional label above note (e.g., "R" for root) */}
                    {positionMeta?.label && (
                      <>
                        <circle
                          cx={x - layout.positionCircleRadius * 0.5}
                          cy={y - layout.positionCircleRadius * 1.1}
                          r={layout.positionCircleRadius * 0.4}
                          fill={'#000'}
                          stroke={'#000'}
                          strokeWidth={2}
                        />
                        <text
                          x={x - layout.positionCircleRadius * 0.5}
                          y={y - layout.positionCircleRadius * 1}
                          fontSize={layout.degreeLabeSize * 0.8}
                          fontWeight="bold"
                          fill={colors?.text || '#333'}
                          textAnchor="middle"
                          pointerEvents="none"
                          fontFamily="monospace"
                        >
                          {positionMeta.label}
                        </text>
                      </>
                    )}

                    {/* Note label - always visible but subtle when not hovered */}
                    <text
                      x={x}
                      y={
                        y +
                        (positionMeta?.label
                          ? layout.noteLabelSize / 2.4
                          : layout.noteLabelSize / 3)
                      }
                      fontSize={
                        hovered
                          ? layout.noteLabelSizeHovered
                          : layout.noteLabelSize
                      }
                      fontWeight={hovered || positionMeta ? 'bold' : 'normal'}
                      fill={
                        colors ? colors.text : hovered ? '#1e40af' : '#9ca3af'
                      }
                      textAnchor="middle"
                      pointerEvents="none"
                      className="transition-all duration-150"
                    >
                      {note}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Fret numbers */}
        {frets.map((fret) => {
          if (fret === 0) return null

          return (
            <text
              key={`fret-num-${fret}`}
              x={getFretX(fret)}
              y={
                layout.fretboardEndY +
                layout.fretNumberSize +
                layout.paddingBottom
              }
              fontSize={layout.fretNumberSize}
              fill="#666"
              textAnchor="middle"
              fontWeight="500"
            >
              {fret}
            </text>
          )
        })}

        {/* "Open" label for fret 0 */}
        <text
          x={getFretX(0)}
          y={layout.fretboardEndY + layout.fretNumberSize * 2.2}
          fontSize={layout.fretNumberSize - 1}
          fill="#666"
          textAnchor="middle"
          fontWeight="500"
        >
          Open
        </text>
      </svg>

      {/* Fixed-position hover tooltip - no layout reflow */}
      {hoveredPosition && (
        <div className="absolute top-0 -right-6 p-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 text-sm min-w-[200px]">
          <div className="font-semibold text-gray-900 mb-1">
            {hoveredPosition.string} string • Fret {hoveredPosition.fret}
          </div>
          <div className="text-gray-700 mb-1">
            Note:{' '}
            <span className="font-mono font-bold">
              {getNoteAtPosition(hoveredPosition.string, hoveredPosition.fret)}
            </span>
          </div>
          <div className="text-gray-600 text-xs mb-2">
            {getFrequencyAtPosition(
              hoveredPosition.string,
              hoveredPosition.fret,
            ).toFixed(2)}{' '}
            Hz
          </div>
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            Click to play
          </div>
        </div>
      )}
    </div>
  )
}
