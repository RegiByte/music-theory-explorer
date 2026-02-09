import { Handle, Position } from '@xyflow/react'

const hiddenStyle = {
  opacity: 0,
  width: 1,
  height: 1,
  pointerEvents: 'none' as const,
}

export interface GravityNodeData {
  chord: string
  frequency: number
  maxFrequency: number
  isHighlighted: boolean
  onPlay: (chord: string) => void
  onHover: (chord: string | null) => void
  [key: string]: unknown
}

export function GravityNode({ data }: { data: GravityNodeData }) {
  const { chord, frequency, maxFrequency, isHighlighted, onPlay, onHover } =
    data
  const relSize = Math.max(0.4, frequency / Math.max(maxFrequency, 0.001))
  const size = 30 + relSize * 30

  const hue = 240
  const saturation = 60 + relSize * 30
  const lightness = 70 - relSize * 35

  return (
    <div
      className="flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        opacity: isHighlighted ? 1 : 0.85,
        border: isHighlighted
          ? '2px solid #312e81'
          : '1.5px solid rgba(255,255,255,0.7)',
        boxShadow: isHighlighted
          ? '0 0 12px rgba(99, 102, 241, 0.5)'
          : '0 2px 6px rgba(0, 0, 0, 0.15)',
        transform: isHighlighted ? 'scale(1.12)' : 'scale(1)',
        zIndex: isHighlighted ? 20 : 1,
      }}
      onClick={() => onPlay(chord)}
      onMouseEnter={() => onHover(chord)}
      onMouseLeave={() => onHover(null)}
    >
      <span
        className="font-bold text-center leading-tight"
        style={{
          fontSize: Math.max(9, size * 0.3),
          color: lightness < 50 ? '#fff' : '#1e1b4b',
        }}
      >
        {chord}
      </span>
      {/* Single center handle — used as position reference only.
          Edges compute their own perimeter connection points. */}
      <Handle
        id="center"
        type="source"
        position={Position.Top}
        style={{ ...hiddenStyle, left: '50%', top: '50%' }}
      />
      <Handle
        id="center-target"
        type="target"
        position={Position.Top}
        style={{ ...hiddenStyle, left: '50%', top: '50%' }}
      />
    </div>
  )
}
