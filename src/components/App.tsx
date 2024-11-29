import React, { useEffect, useState } from "react";
import { master2storyline, sgbFile } from "../io/sgb"
import { align } from "../model/Align";
import { backToTheFuture, flintstones, superSmall } from "../model/Data";
import { qpNum, qpVar, stringify } from "../model/QPSupport";
import { DebugAlignedComponent } from "./DebugAligned";
import { Storyline, WithAlignedGroups } from "../model/Storyline";

export const App = (props: {}) => {
  console.log(master2storyline(sgbFile('loose', 'master').tryParse(flintstones)))
  console.log(stringify(qpVar('x').plus(qpVar('y').scale(4).minus(qpNum(3))).squared()));
  console.log(stringify(qpNum(1)
    .plus(qpVar('x').plus(qpVar('y').scale(4).minus(qpNum(3))).squared())
    .plus(qpVar("x").scale(5))
    .plus(qpVar('z').minus(qpVar('y').scale(2)).squared())
  ));
  console.log(stringify(qpVar('z').minus(qpVar('y').scale(2)).squared()));
  console.log(stringify(qpVar('x').scale(8).greaterThanOrEqual(qpVar('y').plus(qpNum(3)).scale(-1.5))))
  const sample = master2storyline(sgbFile('loose', 'master').tryParse(backToTheFuture));
  console.log(sample);

  const [story, setStory] = useState<Storyline<WithAlignedGroups> | undefined>(undefined);
  useEffect(() => {
    align(sample, 'sum-of-heights', 3).then(setStory);
  }, []);

  console.log({ story });

  if (story) {
    return <DebugAlignedComponent story={story} />;
  } else {
    return "";
  }
}
