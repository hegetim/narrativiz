/* SPDX-FileCopyrightText: 2025 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { AlignCriterion } from "./Align"
import { JustifyConfig } from "./Justify"

export type UserConfig = {
  layerWidth: JustifyConfig["layerStyle"],
  blockHandling: JustifyConfig["blockHandling"],
  oneDistance: number,
  alignmentMode: AlignCriterion,
  gapRatio: number,
  alignContinuedMeetings: boolean,
}

export const defaultConfig: UserConfig = {
  layerWidth: "condensed",
  blockHandling: "continuous",
  oneDistance: 20,
  alignmentMode: "sum-of-heights",
  gapRatio: 1.0,
  alignContinuedMeetings: false,
}
