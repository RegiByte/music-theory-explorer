import { createSystemManager, createSystemHooks } from 'braided-react'
import { audioResource } from './audioResource'
import { progressionExplorerResource } from './progressionExplorerResource'
import { recommenderResource } from './recommenderResource'
import { melodyExplorerResource } from './melodyExplorerResource'

// System configuration - single source of truth
export const systemConfig = {
  audio: audioResource,
  progressionExplorer: progressionExplorerResource,
  recommender: recommenderResource,
  melodyExplorer: melodyExplorerResource,
}

// Create manager and hooks ONCE (module singleton)
// This lives in closure space (Z-axis) - React observes it
export const manager = createSystemManager(systemConfig)

// Create typed hooks for the system
export const { useSystem, useResource, useSystemStatus, SystemProvider } =
  createSystemHooks(manager)

// Export types for convenience
export type SystemConfig = typeof systemConfig
export type AudioResource = Awaited<ReturnType<typeof audioResource.start>>
