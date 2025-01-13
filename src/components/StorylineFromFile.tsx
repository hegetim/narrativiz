/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useRef, useState } from "react";
import { cls, matchByKind, unimplemented } from "../model/Utils";
import { master2storyline, MasterStoryline, sgbFile } from "../io/sgb";
import { formatError } from "parsimmon";
import './StorylineFromFile.css';

type Props = { onSuccess: (story: MasterStoryline) => void };
type State = { kind: 'calm' | 'active' } | { kind: 'error', msg: string };

export const SelectFile = ({ onSuccess }: Props) => {
  const hiddenInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: 'calm' });

  const handleFiles = async (files: FileList | null) => {
    const checked = await checkFiles(files);
    matchByKind(checked, {
      error: err => setState(err),
      pass: pass => matchByKind(parseMaster(pass.str), {
        error: err => setState(err),
        pass: pass => onSuccess(pass.story),
      })
    });
  };

  const handleDrop = useCallback((ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    ev.stopPropagation();
    handleFiles(ev.dataTransfer.files);
  }, [handleFiles]);

  const handleDrag = useCallback((ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    ev.stopPropagation();
    setState({ kind: 'active' });
  }, [setState]);

  return <div {...cls("nv__file-select-container", { "nv__file-select-active": state.kind === 'active' })}
    onDrop={handleDrop} onDragEnter={handleDrag} onDragOver={handleDrag}
    onClick={() => hiddenInput.current?.click()}
    onDragLeave={() => setState({ kind: 'calm' })}
  >
    <input ref={hiddenInput} type='file' className="nv__hidden" onChange={ev => handleFiles(ev.target.files)} />
    {state.kind === 'error' ? <span className="nv__file-select-error">{state.msg}</span> : ""}
    <span className="nv__file-select-label">Drop files here or click to upload</span>
  </div>;
}

const checkFiles = async (files: FileList | null) => {
  if (!files?.length) { return { kind: 'error' as const, msg: "something went wrong" }; }
  else if (files.length !== 1) { return { kind: 'error' as const, msg: "please upload only one file at a time" }; }
  else { return files[0]!.text().then(str => ({ kind: 'pass' as const, str })); }
}

const parseMaster = (raw: string) => {
  const parsed = sgbFile('loose', 'master').parse(raw);
  if (!parsed.status) {
    return { kind: 'error' as const, msg: `Could not parse masster file: ${formatError(raw, parsed)}` };
  }
  const story = master2storyline(parsed.value);
  console.log(story);
  return { kind: 'pass' as const, story };
}
