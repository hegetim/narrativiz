/* SPDX-FileCopyrightText: 2025 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState } from "react";
import { ClassNames, cls } from "../model/Utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation, faToggleOff } from "@fortawesome/free-solid-svg-icons";
import "./InputWidgets.css"

export const SelectButton = <K extends string>(props: {
  labels: { [_ in K]: string },
  value: K,
  setValue: (k: K) => void,
  additionalClassNames?: ClassNames,
}) => {
  const buttons: React.ReactElement[] = []
  for (let k in props.labels) {
    buttons.push(
      <span key={k} {...cls('select-button-option', { 'select-button-selected': props.value === k })}
        onClick={() => props.setValue(k)}>{props.labels[k]}</span>
    );
  }
  return <div {...cls("select-button-container", ...(props.additionalClassNames ?? []))}>{buttons}</div>;
}

export const IntegerInput = (props: {
  value: number,
  isValid: (n: number) => boolean,
  setValue: (n: number) => void,
  unitString?: string,
  disabled?: boolean,
  classNames?: ClassNames,
}) => {
  const [shadowValue, setShadowValue] = useState(props.value.toString());
  useEffect(() => { if (props.value) { setShadowValue(props.value.toString()); } }, [props.value]);

  const valid = props.isValid(parseInt(shadowValue));
  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setShadowValue(ev.target.value);
    const parsed = parseInt(ev.target.value);
    if (props.isValid(parsed)) { props.setValue(parsed); }
  }

  return <div {...cls(...props.classNames ?? [])}>
    <input type="number" value={shadowValue} onChange={handleChange} disabled={props.disabled} />
    <span>{props.unitString}</span>
    {valid ? "" : <FontAwesomeIcon className="numeric-input-invalid" icon={faCircleExclamation} />}
  </div>
}

export const BinarySelect = <K extends string>(props: {
  options: { left: readonly [K, string], right: readonly [K, string] },
  value: K,
  toggle: () => void,
  classNames?: ClassNames,
}) => {
  const selectRight = props.value === props.options.right[0];
  return <div onClick={() => props.toggle()} {...cls('click-me', 'binary-select', ...props.classNames ?? [])}>
    <span>{props.options.left[1]}</span>
    <FontAwesomeIcon icon={faToggleOff} {...(selectRight ? { flip: 'horizontal' } : {})} />
    <span>{props.options.right[1]}</span>
  </div>;
}
