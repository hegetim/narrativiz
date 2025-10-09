/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from "react";
import { Storyline, WithAlignedGroups, WithLayerDescriptions } from "../model/Storyline";
import { DrawingFrag, justifyLayers } from "../model/Justify";
import { parseMaster, SelectFile } from "./StorylineFromFile";
import { fakeAlign } from "../model/Align";
import { printMetrics } from "../model/Metrics";
import { StorylineComponent } from "./StorylineComponent";
import { assertNever } from "../model/Utils";
import "./PKColors.css";
import "./App.css";

type Props = {};
type State = { kind: 'ready' } | {
  kind: 'show',
  story: Storyline<WithAlignedGroups, WithLayerDescriptions>,
  fragments: DrawingFrag[],
};

export const OneShot = ({ }: Props) => {
  const [state, setState] = useState<State>({ kind: 'ready' });

  const fileHandler = async (file: File) => {
    const json: OneShotFile = await file.text().then(JSON.parse)
    console.log({ mode: json.mode, compact: json.compact });
    const story = parseMaster(json.story);
    if (story.kind === 'error') { return story; }
    const aligned = await fakeAlign(story.story, json);
    if (aligned === undefined) { return { kind: "error" as const, msg: "could not align storyline" }; }
    const fragments = await justifyLayers(aligned, { blockHandling: 'continuous', layerStyle: 'condensed' });
    setState({ kind: 'show', story: aligned, fragments });
    return { kind: "pass" as const, };
  }

  if (state.kind === 'ready') {
    return <SelectFile handler={fileHandler} />;
  } else if (state.kind === 'show') {
    printMetrics(state.story, state.fragments);
    return <StorylineComponent fragments={state.fragments} oneDistance={20} />;
  } else { return assertNever(state); }
}

export type OneShotFile = {
  story: string,
  mode: "wc" | "lwh" | "qwh",
  compact: boolean,
  solution: { [s: string]: number },
}

