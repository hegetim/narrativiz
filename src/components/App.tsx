import React, { useState } from "react";
import { MasterStoryline } from "../io/sgb"
import { align } from "../model/Align";
import { Storyline, WithAlignedGroups, WithLayerDescriptions } from "../model/Storyline";
import { StorylineComponent } from "./StorylineComponent";
import { SelectFile } from "./StorylineFromFile";
import "./PKColors.css";

type Props = {};
type State = { kind: 'ready' | 'processing' } | { kind: 'show', story: Storyline<WithAlignedGroups, WithLayerDescriptions> };


export const App = ({ }: Props) => {
  const [state, setState] = useState<State>({ kind: 'ready' });

  const handleStory = (story: MasterStoryline) => {
    setState({ kind: 'processing' });
    align(story, 'strict-center', 1).then(aligned => setState({ kind: 'show', story: aligned! }));
  }

  if (state.kind === 'ready') {
    return <SelectFile onSuccess={handleStory} />;
  } if (state.kind === 'show') {
    return <StorylineComponent story={state.story} />;
  } else {
    return "";
  }
}
