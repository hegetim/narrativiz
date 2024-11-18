/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type Storyline<G = {}, L = {}, S = {}> = {
  layers: (StorylineLayer<G> & L)[]
} & S;

export interface StorylineLayer<G> {
  groups: (StorylineGroup & G)[]
}

export interface StorylineGroup {
  characters: string[]
}

export type WithRealizedGroups = { kind: 'active' | 'inactive', charactersOrdered: string[] };

export type WithAlignedGroups = WithRealizedGroups & { atY: number };

export type WithCharacterDescriptions<T = string> = {
  characterDescriptions: Map<string, T>
}

export type WithLayerDescriptions = {
  layerDescription: string;
}

export type WithGroupDescriptions = {
  groupDescription: string
}

// export const realization2storyline = (r: StorylineRealization): Storyline =>
//   ({ layers: r.layers.map(l => ({ groups: l.groups.filter(g => g.kind === 'active').map(g => g.ordered) })) });
