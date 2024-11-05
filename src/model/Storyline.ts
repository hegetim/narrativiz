/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface Storyline {
  layers: StorylineLayer[]
}

export interface StorylineLayer {
  meetings: string[][]
}

export interface StorylineRealization {
  layers: RealizedLayer[]
}

export interface RealizedLayer {
  groups: { type: 'active' | 'inactive', ordered: string[] }[]
}

export interface StorylineDrawing {
  layers: { character: string, y: number, groupId: number }[][]
}

export interface StorylineMetadata {
  characterDescriptions: Map<string, string>
  layerDescriptions: string[]
  meetingDescriptions: string[][]
}

export const realization2storyline = (r: StorylineRealization) =>
  ({ layers: r.layers.map(l => ({ meetings: l.groups.filter(g => g.type === 'active').map(g => g.ordered) })) });
