import type { ComponentType } from 'react'
import { Section1_PhysicsOfSound } from './Section1_PhysicsOfSound'
import { Section2_PitchAndCents } from './Section2_PitchAndCents'
import { Section3_Harmonics } from './Section3_Harmonics'
import { Section4_Intervals } from './Section4_Intervals'
import { Section5_Scales } from './Section5_Scales'
import { Section6_Chords } from './Section6_Chords'
import { Section7_KeysAndCircleOfFifths } from './Section7_KeysAndCircleOfFifths'
import { Section8_ChordProgressions } from './Section8_ChordProgressions'
import { Section9_CreativeToolset } from './Section9_CreativeToolset'

export interface SectionEntry {
  id: string
  number: number
  titleKey: string
  Component: ComponentType
}

export const SECTIONS: SectionEntry[] = [
  { id: 'section-1', number: 1, titleKey: 's1.title', Component: Section1_PhysicsOfSound },
  { id: 'section-2', number: 2, titleKey: 's2.title', Component: Section2_PitchAndCents },
  { id: 'section-3', number: 3, titleKey: 's3.title', Component: Section3_Harmonics },
  { id: 'section-4', number: 4, titleKey: 's4.title', Component: Section4_Intervals },
  { id: 'section-5', number: 5, titleKey: 's5.title', Component: Section5_Scales },
  { id: 'section-6', number: 6, titleKey: 's6.title', Component: Section6_Chords },
  { id: 'section-7', number: 7, titleKey: 's7.title', Component: Section7_KeysAndCircleOfFifths },
  { id: 'section-8', number: 8, titleKey: 's8.title', Component: Section8_ChordProgressions },
  { id: 'section-9', number: 9, titleKey: 's9.title', Component: Section9_CreativeToolset },
]
