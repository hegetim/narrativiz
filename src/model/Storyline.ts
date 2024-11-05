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
  layersOrdered: string[][]
}

export interface StorylineMetadata {
  characterDescriptions: Map<string, string>
  layerDescriptions: string[]
  meetingDescriptions: string[][]
}
