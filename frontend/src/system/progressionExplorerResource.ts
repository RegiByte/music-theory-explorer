import { defineResource } from 'braided'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { useSyncExternalStore } from 'react'
import { buildProgressionMap, getHarmonicMovement } from '@/core/progressionMap'
import {
  getChromaticDiverseTrunks,
  getSuggestedNextChords,
  getScoredCandidatesV2,
} from '@/core/trunkExplorer'
import { categorizeRecommendations } from '@/core/recommendationCategorizer'
import {
  combineScores,
  type ContextualBoostMap,
} from '@/core/hybridScoring'
import { categorizeByGenre } from '@/core/genreCategorizer'
import { createSyntheticCandidates } from '@/core/syntheticCandidates'
import {
  normalizeChordId,
  enharmonicChordEqual,
  type NotationPreference,
} from '@/core/enharmonic'
import type {
  ProgressionMap,
  ProgressionNode,
  ScaleType,
  StatisticalRecommendation,
  TrunkEdge,
  TrunkNode,
  Note,
  CategorizedRecommendations,
  Genre,
  GenreCategorizedRecommendations,
} from '@/schemas'
import type { RecommenderResource } from '@/system/recommenderResource'

interface CandidateSuggestion {
  node: ProgressionNode
  score: number
  matchedProgressions: string[]
  transitionStrength: number
}

interface ExplorerState {
  key: Note
  scaleType: ScaleType
  selectedGenre: Genre
  notationPreference: NotationPreference
  map: ProgressionMap | null
  trunkNodes: TrunkNode[]
  trunkEdges: TrunkEdge[]
  nodeCandidates: Record<string, CandidateSuggestion[]>
  nodeCandidatesV2: Record<string, CategorizedRecommendations>
  genreCandidates: Record<
    string,
    Record<Genre, GenreCategorizedRecommendations>
  >
  // Registry of all ProgressionNodes we've ever created (map + synthetic).
  // Keyed by chord ID. Persists across candidate deletions so we can always
  // look up a node when expanding FROM a synthetic chord.
  nodeRegistry: Record<string, ProgressionNode>
  activeTrunks: number
  mutedNodes: Set<string>
  practiceMode: boolean
  practicePathNodeId: string | null
}

interface ExplorerActions {
  initialize: (key: Note, scaleType: ScaleType) => void
  setGenre: (genre: Genre) => void
  setNotationPreference: (pref: NotationPreference) => void
  expandNode: (nodeId: string) => void
  selectCandidate: (parentNodeId: string, chordId: string) => void
  clearCandidates: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  toggleMute: (nodeId: string) => void
  enterPracticeMode: (leafNodeId: string) => void
  exitPracticeMode: () => void
}

type ExplorerStore = ExplorerState & ExplorerActions

export type ProgressionExplorerStore = StoreApi<ExplorerStore>

export interface ProgressionExplorerApi extends StoreApi<ExplorerStore> {
  /** React hook — returns the full reactive explorer state (closes over the store) */
  useExplorer: () => ExplorerStore
}

const DEFAULT_KEY: Note = 'C'
const DEFAULT_SCALE: ScaleType = 'major'
const DEFAULT_GENRE: Genre = 'pop'

export const progressionExplorerResource = defineResource({
  dependencies: ['recommender'],
  start: ({ recommender }: { recommender: RecommenderResource }) => {
    let currentMap: ProgressionMap | null = null

    const store = createStore<ExplorerStore>((set, get) => ({
      key: DEFAULT_KEY,
      scaleType: DEFAULT_SCALE,
      selectedGenre: DEFAULT_GENRE,
      notationPreference: 'auto' as NotationPreference,
      map: null,
      trunkNodes: [],
      trunkEdges: [],
      nodeCandidates: {},
      nodeCandidatesV2: {},
      genreCandidates: {},
      nodeRegistry: {},
      activeTrunks: 0,
      mutedNodes: new Set(),
      practiceMode: false,
      practicePathNodeId: null,

      initialize: (key, scaleType) => {
        currentMap = buildProgressionMap(key, scaleType)
        const map = currentMap

        console.log('Initializing progression explorer:', { key, scaleType })
        console.log(
          'Map nodes:',
          map.nodes.length,
          map.nodes.map((n) => ({ id: n.id, roman: n.romanNumeral })),
        )

        // Find tonic: 'I' for major, 'i' for minor
        const tonicRomanNumeral = scaleType === 'major' ? 'I' : 'i'
        const rootChordId =
          map.nodes.find((n) => n.romanNumeral === tonicRomanNumeral)?.id || key

        console.log('Root chord:', { tonicRomanNumeral, rootChordId })

        const rootNode: TrunkNode = {
          id: `root-${rootChordId}`,
          chordId: rootChordId,
          trunkId: -1,
          depth: 0,
          isLeaf: false,
          isRoot: true,
          isTrunkHead: false,
          parentId: null,
        }

        const path = [rootChordId]
        const suggestions = getChromaticDiverseTrunks(rootChordId, path, map, 5)

        console.log(
          'Trunk suggestions:',
          suggestions.length,
          suggestions.map((s) => s.node.id),
        )

        const trunkHeadNodes: TrunkNode[] = suggestions.map(
          (suggestion, idx) => ({
            id: `trunk-${idx}-depth-1-${suggestion.node.id}`,
            chordId: suggestion.node.id,
            trunkId: idx,
            depth: 1,
            isLeaf: true,
            isRoot: false,
            isTrunkHead: true,
            parentId: rootNode.id,
          }),
        )

        const trunkEdges: TrunkEdge[] = trunkHeadNodes.map((trunkNode, idx) => {
          const fromNode = map.nodes.find((n) => n.id === rootChordId)!
          const toNode = map.nodes.find((n) => n.id === trunkNode.chordId)!

          return {
            id: `edge-root-to-trunk-${idx}`,
            source: rootNode.id,
            target: trunkNode.id,
            trunkId: idx,
            harmonicMovement: getHarmonicMovement(fromNode, toNode),
            strength: suggestions[idx]?.transitionStrength ?? 0.5,
            isChromatic: toNode.category !== 'diatonic',
            matchedProgressions: suggestions[idx]?.matchedProgressions ?? [],
          }
        })

        // Build node registry from all map nodes
        const registry: Record<string, ProgressionNode> = {}
        for (const mapNode of map.nodes) {
          registry[mapNode.id] = mapNode
        }

        set({
          key,
          scaleType,
          map,
          trunkNodes: [rootNode, ...trunkHeadNodes],
          trunkEdges,
          nodeCandidates: {},
          nodeRegistry: registry,
          activeTrunks: 5,
        })
      },

      setGenre: (genre) => {
        set({ selectedGenre: genre })
      },

      setNotationPreference: (pref) => {
        set({ notationPreference: pref })
      },

      expandNode: async (nodeId) => {
        const state = get()
        const map = currentMap ?? state.map
        if (!map) return

        const node = state.trunkNodes.find((n) => n.id === nodeId)
        if (!node) return

        const path = getPathToNode(state.trunkNodes, nodeId)

        // Get harmonic candidates (existing logic)
        const harmonicCandidates = getScoredCandidatesV2(
          node.chordId,
          path,
          map,
        )
        console.log(
          `Harmonic candidates from map for ${node.chordId}:`,
          harmonicCandidates.length,
        )

        // Get statistical recommendations for ALL genres,
        // enhanced with contextual pattern matching from the progression history
        const genres = recommender.getGenres()
        const genreRecommendations: Record<
          Genre,
          GenreCategorizedRecommendations
        > = {} as Record<Genre, GenreCategorizedRecommendations>

        for (const genre of genres) {
          // Build context: all chords BEFORE the current node (excluding it).
          // The current node's chord is passed as fromChord; context is what
          // came before it. getRecommendations uses backoff: trigram → bigram → unigram.
          const context = path.length > 1 ? path.slice(0, -1) : undefined

          const { recommendations: statisticalRecs, orderUsed } =
            await recommender.getRecommendations(
              node.chordId,
              genre,
              50, // Increased from 30 to get more candidates
              context,
            )

          // --- Context-aware pattern boosting ---
          // Use the progression path to find matching n-gram patterns from
          // the trained model. Try progressively shorter suffixes of the path
          // as prefixes (last 3, last 2, last 1 chords) to maximize coverage.
          // Longer prefix matches are weighted higher (more specific context).
          let contextualBoost = await buildContextualBoostFromPatterns(
            path,
            genre,
            recommender,
          )

          // --- Markov-derived contextual boost (fallback) ---
          // The patterns model has sparse coverage for less common chord names
          // (e.g. Cm, Fm in minor keys). When pattern matching finds nothing
          // but the Markov model IS using higher-order context (order 2+),
          // the statistical probabilities already have context baked in.
          // Derive a synthetic contextual boost from those probabilities so
          // the user sees that recommendations ARE context-aware.
          if (contextualBoost.size === 0 && orderUsed >= 2) {
            contextualBoost = buildMarkovDerivedBoost(
              statisticalRecs,
              orderUsed,
            )
          }

          if (contextualBoost.size > 0) {
            console.log(
              `🎯 Contextual boost for ${genre} (path: ${path.join(' → ')}):`,
              Object.fromEntries(
                [...contextualBoost.entries()]
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5),
              ),
            )
          }

          // Create synthetic candidates for chords in statistical model but not in harmonic map
          const syntheticCandidates = createSyntheticCandidates(
            statisticalRecs,
            harmonicCandidates,
            map,
          )

          // Combine harmonic + synthetic candidates
          const allCandidates = [...harmonicCandidates, ...syntheticCandidates]
          // Combine scores with hybrid scoring (now includes contextual boost!)
          const hybridCandidates = combineScores(
            allCandidates,
            statisticalRecs,
            contextualBoost,
          )

          // Categorize by genre (canonical/spicy split)
          genreRecommendations[genre] = categorizeByGenre(
            hybridCandidates,
            genre,
          )
        }

        // Collect all new nodes from genre recommendations to register
        const newRegistryEntries: Record<string, ProgressionNode> = {}
        for (const genre of genres) {
          const recs = genreRecommendations[genre]
          if (recs) {
            for (const c of [...recs.canonical, ...recs.spicy]) {
              if (!state.nodeRegistry[c.node.id]) {
                newRegistryEntries[c.node.id] = c.node
              }
            }
          }
        }

        // Keep legacy categorization for backward compatibility
        const categorized = categorizeRecommendations(
          harmonicCandidates,
          path,
          map,
        )

        // Keep legacy suggestions for backward compatibility
        const suggestions = getSuggestedNextChords(node.chordId, path, map, 5)

        set({
          nodeCandidates: {
            ...state.nodeCandidates,
            [nodeId]: suggestions,
          },
          nodeCandidatesV2: {
            ...state.nodeCandidatesV2,
            [nodeId]: categorized,
          },
          genreCandidates: {
            ...state.genreCandidates,
            [nodeId]: genreRecommendations,
          },
          nodeRegistry: {
            ...state.nodeRegistry,
            ...newRegistryEntries,
          },
        })
      },

      selectCandidate: (parentNodeId, chordId) => {
        const state = get()
        const map = currentMap ?? state.map
        if (!map) return

        const parentNode = state.trunkNodes.find((n) => n.id === parentNodeId)
        if (!parentNode) return

        // Try to find the chord in genre candidates first (new system)
        const genreCands = state.genreCandidates[parentNodeId]
        let breakdown = undefined
        let transitionStrength = 0.5
        let matchedProgressions: string[] = []

        if (genreCands) {
          // Search all genres and categories for the selected chord
          for (const genre of Object.keys(genreCands)) {
            const genreRecs = genreCands[genre as Genre]
            const allGenreCandidates = [
              ...genreRecs.canonical,
              ...genreRecs.spicy,
            ]
            const scoredCandidate = allGenreCandidates.find(
              (c) =>
                c.node.id === chordId ||
                enharmonicChordEqual(c.node.id, chordId),
            )
            if (scoredCandidate) {
              breakdown = scoredCandidate.breakdown
              transitionStrength = scoredCandidate.breakdown.transitionStrength
              matchedProgressions =
                scoredCandidate.breakdown.matchedProgressions
              break
            }
          }
        }

        // Fallback: Try v2 candidates (legacy categorized)
        if (!breakdown) {
          const categorizedCandidates = state.nodeCandidatesV2[parentNodeId]
          if (categorizedCandidates) {
            const allCandidates = [
              ...categorizedCandidates.safe_common,
              ...categorizedCandidates.tension_building,
              ...categorizedCandidates.exploratory,
              ...categorizedCandidates.resolution,
            ]
            const scoredCandidate = allCandidates.find(
              (c) =>
                c.node.id === chordId ||
                enharmonicChordEqual(c.node.id, chordId),
            )
            if (scoredCandidate) {
              breakdown = scoredCandidate.breakdown
              transitionStrength = scoredCandidate.breakdown.transitionStrength
              matchedProgressions =
                scoredCandidate.breakdown.matchedProgressions
            }
          }
        }

        // Fallback: Try legacy candidates
        if (!breakdown) {
          const candidates = state.nodeCandidates[parentNodeId] || []
          const selectedSuggestion = candidates.find(
            (c) =>
              c.node.id === chordId || enharmonicChordEqual(c.node.id, chordId),
          )
          if (selectedSuggestion) {
            transitionStrength = selectedSuggestion.transitionStrength
            matchedProgressions = selectedSuggestion.matchedProgressions
          }
        }

        const newNode: TrunkNode = {
          id: `trunk-${parentNode.trunkId}-depth-${parentNode.depth + 1}-${chordId}`,
          chordId,
          trunkId: parentNode.trunkId,
          depth: parentNode.depth + 1,
          isLeaf: true,
          isRoot: false,
          isTrunkHead: false,
          parentId: parentNode.id,
        }

        const updatedParent: TrunkNode = {
          ...parentNode,
          isLeaf: false,
        }

        // Look up nodes: try registry first (covers both map and synthetic nodes),
        // then fall back to map lookup, then genre candidates
        const fromNode =
          state.nodeRegistry[parentNode.chordId] ??
          state.nodeRegistry[normalizeChordId(parentNode.chordId)] ??
          map.nodes.find((n) => n.id === parentNode.chordId) ??
          map.nodes.find((n) => enharmonicChordEqual(n.id, parentNode.chordId))

        let toNode: ProgressionNode | undefined =
          state.nodeRegistry[chordId] ??
          state.nodeRegistry[normalizeChordId(chordId)] ??
          map.nodes.find((n) => n.id === chordId) ??
          map.nodes.find((n) => enharmonicChordEqual(n.id, chordId))

        // For synthetic candidates not in registry/map, search genre candidates
        if (!toNode) {
          const genreCands = state.genreCandidates[parentNodeId]
          if (genreCands) {
            for (const genre of Object.keys(genreCands)) {
              const genreRecs = genreCands[genre as Genre]
              const allGenreCandidates = [
                ...genreRecs.canonical,
                ...genreRecs.spicy,
              ]
              const found = allGenreCandidates.find(
                (c) =>
                  c.node.id === chordId ||
                  enharmonicChordEqual(c.node.id, chordId),
              )
              if (found) {
                toNode = found.node
                break
              }
            }
          }
        }

        // If we still can't find either node, bail out
        if (!fromNode || !toNode) {
          console.warn(
            `Cannot find node for chord: from=${parentNode.chordId} (${!!fromNode}), to=${chordId} (${!!toNode})`,
          )
          return
        }

        // Register the toNode so future expansions FROM this chord will work
        if (!state.nodeRegistry[chordId]) {
          set({ nodeRegistry: { ...state.nodeRegistry, [chordId]: toNode } })
        }

        const newEdge: TrunkEdge = {
          id: `edge-${parentNode.id}-to-${newNode.id}`,
          source: parentNode.id,
          target: newNode.id,
          trunkId: parentNode.trunkId,
          harmonicMovement: getHarmonicMovement(fromNode, toNode),
          strength: transitionStrength,
          isChromatic: toNode.category !== 'diatonic',
          matchedProgressions: matchedProgressions,
          breakdown,
        }

        const nextCandidates = { ...state.nodeCandidates }
        delete nextCandidates[parentNodeId]

        const nextCandidatesV2 = { ...state.nodeCandidatesV2 }
        delete nextCandidatesV2[parentNodeId]

        const nextGenreCandidates = { ...state.genreCandidates }
        delete nextGenreCandidates[parentNodeId]

        set({
          trunkNodes: state.trunkNodes
            .map((n) => (n.id === parentNode.id ? updatedParent : n))
            .concat(newNode),
          trunkEdges: state.trunkEdges.concat(newEdge),
          nodeCandidates: nextCandidates,
          nodeCandidatesV2: nextCandidatesV2,
          genreCandidates: nextGenreCandidates,
        })
      },

      clearCandidates: (nodeId) => {
        const state = get()
        if (
          !state.nodeCandidates[nodeId] &&
          !state.nodeCandidatesV2[nodeId] &&
          !state.genreCandidates[nodeId]
        )
          return
        const nextCandidates = { ...state.nodeCandidates }
        delete nextCandidates[nodeId]
        const nextCandidatesV2 = { ...state.nodeCandidatesV2 }
        delete nextCandidatesV2[nodeId]
        const nextGenreCandidates = { ...state.genreCandidates }
        delete nextGenreCandidates[nodeId]
        set({
          nodeCandidates: nextCandidates,
          nodeCandidatesV2: nextCandidatesV2,
          genreCandidates: nextGenreCandidates,
        })
      },

      deleteNode: (nodeId) => {
        const state = get()
        const node = state.trunkNodes.find((n) => n.id === nodeId)
        if (!node || node.isRoot) return // Can't delete root

        // Find all descendant nodes
        const descendantIds = new Set<string>([nodeId])
        const findDescendants = (parentId: string) => {
          state.trunkNodes
            .filter((n) => n.parentId === parentId)
            .forEach((child) => {
              descendantIds.add(child.id)
              findDescendants(child.id)
            })
        }
        findDescendants(nodeId)

        // Update parent to be a leaf again if this was its only child
        const parentId = node.parentId
        const parentNode = parentId
          ? state.trunkNodes.find((n) => n.id === parentId)
          : null
        const parentHasOtherChildren = parentNode
          ? state.trunkNodes.some(
              (n) => n.parentId === parentId && !descendantIds.has(n.id),
            )
          : false

        // Remove nodes and edges
        const nextNodes = state.trunkNodes
          .filter((n) => !descendantIds.has(n.id))
          .map((n) => {
            if (n.id === parentId && !parentHasOtherChildren) {
              return { ...n, isLeaf: true }
            }
            return n
          })

        const nextEdges = state.trunkEdges.filter(
          (e) => !descendantIds.has(e.source) && !descendantIds.has(e.target),
        )

        // Clear candidates for deleted nodes
        const nextCandidates = { ...state.nodeCandidates }
        descendantIds.forEach((id) => delete nextCandidates[id])

        const nextCandidatesV2 = { ...state.nodeCandidatesV2 }
        descendantIds.forEach((id) => delete nextCandidatesV2[id])

        const nextGenreCandidates = { ...state.genreCandidates }
        descendantIds.forEach((id) => delete nextGenreCandidates[id])

        set({
          trunkNodes: nextNodes,
          trunkEdges: nextEdges,
          nodeCandidates: nextCandidates,
          nodeCandidatesV2: nextCandidatesV2,
          genreCandidates: nextGenreCandidates,
        })
      },

      toggleMute: (nodeId) => {
        const state = get()
        const nextMuted = new Set(state.mutedNodes)

        if (nextMuted.has(nodeId)) {
          nextMuted.delete(nodeId)
        } else {
          nextMuted.add(nodeId)
        }

        set({ mutedNodes: nextMuted })
      },

      enterPracticeMode: (leafNodeId) => {
        set({
          practiceMode: true,
          practicePathNodeId: leafNodeId,
        })
      },

      exitPracticeMode: () => {
        set({
          practiceMode: false,
          practicePathNodeId: null,
        })
      },
    }))

    store.getState().initialize(DEFAULT_KEY, DEFAULT_SCALE)

    return Object.assign(store, {
      useExplorer: () =>
        useSyncExternalStore(store.subscribe, store.getState, store.getState),
    }) as ProgressionExplorerApi
  },

  halt: async () => {},
})

function getPathToNode(nodes: TrunkNode[], nodeId: string): string[] {
  const path: string[] = []
  let currentId: string | null = nodeId

  while (currentId) {
    const node = nodes.find((n) => n.id === currentId)
    if (!node) break
    path.unshift(node.chordId)
    currentId = node.parentId
  }

  return path
}

/**
 * Build a contextual boost map by matching the progression path against
 * trained n-gram patterns for a genre.
 *
 * Strategy: try the path suffix as a prefix at decreasing lengths (3, 2, 1).
 * For each matching pattern, extract the "next chord" (the chord right after
 * the matched prefix) and accumulate its frequency as a boost score.
 *
 * Longer prefix matches contribute their raw frequency, shorter ones are
 * dampened to reflect lower confidence from less context.
 *
 * @returns Map of chord → contextual score (higher = better contextual fit)
 */
async function buildContextualBoostFromPatterns(
  path: string[],
  genre: Genre,
  recommender: RecommenderResource,
): Promise<ContextualBoostMap> {
  const boostMap: ContextualBoostMap = new Map()

  // Confidence multipliers: longer prefix = more context = higher confidence
  const prefixConfidence: Record<number, number> = {
    3: 1.0, // 3-chord prefix: full confidence
    2: 0.6, // 2-chord prefix: moderate confidence
    1: 0.2, // 1-chord prefix: low confidence (near first-order Markov)
  }

  // Try decreasing prefix lengths from the path tail
  for (const prefixLen of [3, 2, 1]) {
    if (path.length < prefixLen) continue

    const prefix = path.slice(-prefixLen)
    const patterns = await recommender.findPatterns(prefix, genre, 4)
    const confidence = prefixConfidence[prefixLen] ?? 0.2

    for (const pattern of patterns) {
      // The "next chord" is the one right after the prefix in this pattern
      const nextIndex = prefixLen
      if (nextIndex < pattern.chords.length) {
        const nextChord = pattern.chords[nextIndex]
        const current = boostMap.get(nextChord) ?? 0
        boostMap.set(nextChord, current + pattern.frequency * confidence)
      }
    }
  }

  return boostMap
}

/**
 * Derive a contextual boost map from Markov statistical probabilities.
 *
 * When the pattern model has no matching patterns (common for minor-key
 * chords like Cm, Fm that are rare in the training data), but the Markov
 * model IS using higher-order context (bigram or trigram), the statistical
 * probabilities already reflect the progression context.
 *
 * We use those probabilities directly as the contextual boost, scaled by
 * the Markov order to reflect confidence level:
 *   - Order 3 (trigram): full probability as boost
 *   - Order 2 (bigram): 70% of probability as boost
 *
 * This ensures the context bar appears whenever the system is genuinely
 * using progression context, even when the pattern model has gaps.
 */
function buildMarkovDerivedBoost(
  statisticalRecs: StatisticalRecommendation[],
  orderUsed: number,
): ContextualBoostMap {
  const boostMap: ContextualBoostMap = new Map()

  // Scale boost by Markov order confidence
  const orderConfidence = orderUsed === 3 ? 1.0 : 0.7

  for (const rec of statisticalRecs) {
    // Use the statistical probability as the contextual boost.
    // These probabilities are already context-aware when orderUsed >= 2.
    boostMap.set(rec.chord, rec.probability * orderConfidence)
  }

  return boostMap
}
