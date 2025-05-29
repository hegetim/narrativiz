/* SPDX-FileCopyrightText: 2025 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import "./SettingsComponent.css"
import React from "react"
import { UserConfig } from "../model/Config"
import { cls } from "../model/Utils"
import { BinarySelect, IntegerInput, SelectButton } from "./InputWidgets"
import { AlignCriterion } from "../model/Align"
import { JustifyConfig } from "../model/Justify"

type Props = { config: UserConfig, setConfig: (c: UserConfig) => void }

export const SettingsComponent = ({ config, setConfig }: Props) => {
  const commit = (f: (c: UserConfig) => void) => {
    const copy = structuredClone(config);
    f(copy);
    setConfig(copy);
  }

  return <div {...cls("settings-container")}>
    <div {...cls("settings-label")}>alignment</div>
    <SelectButton<AlignCriterion> value={config.alignmentMode}
      labels={{ "strict-center": "center", "sum-of-heights": "wiggle-height", "least-squares": "square-height", "wiggle-count": "wiggle-count" }}
      setValue={mode => commit(c => c.alignmentMode = mode)} />

    <div {...cls("settings-label")}>block handling</div>
    <SelectButton<JustifyConfig["blockHandling"]> value={config.blockHandling}
      labels={{ continuous: "continuous", full: "full" }}
      setValue={value => commit(c => c.blockHandling = value)} />

    <div {...cls("settings-label")}>layer width</div>
    <BinarySelect<JustifyConfig["layerStyle"]> value={config.layerWidth}
      options={{ left: ["condensed", "condensed"], right: ["uniform", "uniform"] }}
      toggle={() => commit(c => c.layerWidth = (c.layerWidth === 'condensed' ? 'uniform' : 'condensed'))} />

    <div {...cls("settings-label")}>line distance</div>
    <IntegerInput isValid={x => x >= 10} value={config.oneDistance}
      setValue={value => commit(c => c.oneDistance = value)} unitString="px" />

    <div {...cls("settings-label")}>gap ratio</div>
    <SelectButton<GapCategory> value={toGapCategory(config.gapRatio)}
      labels={{ "0.5": "0.5", "1.0": "1.0", "1.5": "1.5", "2.0": "2.0" }}
      setValue={value => commit(c => c.gapRatio = fromGapCategory(value))} />

    <div {...cls("settings-label")}>continued meetings</div>
    <BinarySelect<"true" | "false"> value={`${config.alignContinuedMeetings}`}
      options={{ left: ["false", "ignore"], right: ["true", "align"] }}
      toggle={() => commit(c => c.alignContinuedMeetings = !c.alignContinuedMeetings)} />
  </div>
}

type GapCategory = "0.5" | "1.0" | "1.5" | "2.0";

const toGapCategory = (x: number) =>
  x < 0.75 ? '0.5' :
    x < 1.25 ? '1.0' :
      x < 1.75 ? '1.5' :
        '2.0';

const fromGapCategory = (c: GapCategory) => parseFloat(c)
