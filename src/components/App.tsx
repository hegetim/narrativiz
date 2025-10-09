/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState } from "react";
import { align } from "../model/Align";
import { Storyline, WithAlignedGroups, WithLayerDescriptions, WithRealizedGroups } from "../model/Storyline";
import { DrawingFrag, justifyLayers } from "../model/Justify";
import { StorylineComponent } from "./StorylineComponent";
import { masterFiles, SelectFile } from "./StorylineFromFile";
import { defaultConfig, UserConfig } from "../model/Config";
import { SettingsComponent } from "./SettingsComponent";
import { printMetrics } from "../model/Metrics";
import "./PKColors.css";
import "./App.css";

type Props = {};
type State = { kind: 'ready' }
  | { kind: 'processing', story: Storyline<WithRealizedGroups, WithLayerDescriptions> }
  | {
    kind: 'show',
    story: Storyline<WithAlignedGroups, WithLayerDescriptions>,
    fragments: DrawingFrag[],
  };


export const App = ({ }: Props) => {
  const [state, setState] = useState<State>({ kind: 'ready' });
  const [config, setConfig] = useState<UserConfig>(defaultConfig)

  useEffect(() => {
    if (state.kind === 'processing') {
      align(state.story, config.alignmentMode, config.gapRatio, config.alignContinuedMeetings)
        .then(aligned =>
          justifyLayers(aligned!, { blockHandling: config.blockHandling, layerStyle: config.layerWidth })
            .then(frags => [aligned, frags] as const)
        )
        .then(([aligned, fragments]) => setState({ kind: 'show', story: aligned!, fragments }));
    }
  }, [state]);

  useEffect(() => {
    if (state.kind === 'show') {
      setState({ kind: 'processing', story: state.story })
    }
  }, [config.alignmentMode, config.gapRatio, config.alignContinuedMeetings, config.blockHandling, config.layerWidth]);

  if (state.kind === 'ready') {
    return <SelectFile handler={masterFiles(story => setState({ kind: 'processing', story }))} />;
  } if (state.kind === 'show') {
    printMetrics(state.story, state.fragments);
    return <React.Fragment>
      <SettingsComponent config={config} setConfig={setConfig} />
      <StorylineComponent fragments={state.fragments} oneDistance={config.oneDistance} />
    </React.Fragment>
  } else {
    return "";
  }
}
