import React, { useEffect, useState } from "react";
import { align } from "../model/Align";
import { Storyline, WithAlignedGroups, WithLayerDescriptions, WithRealizedGroups } from "../model/Storyline";
import { StorylineComponent } from "./StorylineComponent";
import { SelectFile } from "./StorylineFromFile";
import { defaultConfig, UserConfig } from "../model/Config";
import { SettingsComponent } from "./SettingsComponent";
import "./PKColors.css";
import "./App.css";

type Props = {};
type State = { kind: 'ready' }
  | { kind: 'processing', story: Storyline<WithRealizedGroups, WithLayerDescriptions> }
  | { kind: 'show', story: Storyline<WithAlignedGroups, WithLayerDescriptions>; };


export const App = ({ }: Props) => {
  const [state, setState] = useState<State>({ kind: 'ready' });
  const [config, setConfig] = useState<UserConfig>(defaultConfig)

  useEffect(() => {
    if (state.kind === 'processing') {
      align(state.story, config.alignmentMode, config.gapRatio, config.alignContinuedMeetings)
        .then(aligned => setState({ kind: 'show', story: aligned! }));
    }
  }, [state]);

  useEffect(() => {
    if (state.kind === 'show') {
      setState({ kind: 'processing', story: state.story })
    }
  }, [config.alignmentMode, config.gapRatio, config.alignContinuedMeetings]);

  if (state.kind === 'ready') {
    return <SelectFile onSuccess={story => setState({ kind: 'processing', story })} />;
  } if (state.kind === 'show') {
    return <React.Fragment>
      <SettingsComponent config={config} setConfig={setConfig} />
      <StorylineComponent story={state.story} blockHandling={config.blockHandling} layerStyle={config.layerWidth}
        oneDistance={config.oneDistance} />
    </React.Fragment>
  } else {
    return "";
  }
}
