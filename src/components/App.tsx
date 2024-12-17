import React, { useEffect, useState } from "react";
import { master2storyline, sgbFile } from "../io/sgb"
import { align } from "../model/Align";
import { backToTheFuture, flintstones, stair, superSmall } from "../model/Data";
import { DebugAlignedComponent } from "./DebugAligned";
import { Storyline, WithAlignedGroups } from "../model/Storyline";

export const App = (props: {}) => {
  const sample = master2storyline(sgbFile('loose', 'master').tryParse(flintstones));
  console.log(sample);

  const [story, setStory] = useState<Storyline<WithAlignedGroups> | undefined>(undefined);
  useEffect(() => {
    align(sample, 'sum-of-heights', 1).then(setStory);
  }, []);

  console.log({ story });

  if (story) {
    return <DebugAlignedComponent story={story} />;
  } else {
    return "";
  }
}
