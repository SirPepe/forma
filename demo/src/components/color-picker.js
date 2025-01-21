// Form component composed from two native elements, In this case an
// input[type=color] plus an input[type=number] results in an input for colors
// with an alpha channel. This element uses no libraries or base classes apart
// from Ornament and forma.

// Notable complications:
//   * built with vanilla JS
//   * custom event handling with access to ElementInternals
//   * uses class field functions instead of regular methods to define
//     transformation callbacks

import { define, reactive, subscribe } from "@sirpepe/ornament";
import { forma, FormLore } from "../../../src";

const ALPHA_COLOR_RE = /^(?<rgb>#[a-fA-F0-9]{6})(?<alpha>[a-fA-F0-9]{2})$/;

function toString(valueState) {
  if (!valueState) {
    return "";
  }
  const alpha = Number(valueState.get("alpha")).toString(16).padStart(2, "0");
  return `${valueState.get("rgb")}${alpha}`;
}

function fromString(input) {
  if (!input) {
    return null;
  }
  const match = ALPHA_COLOR_RE.exec(String(input));
  if (!match) {
    return null;
  }
  return FormLore.fromEntries([
    ["rgb", match.groups.rgb],
    ["alpha", Number.parseInt(match.groups.alpha, 16)],
  ]);
}

// The element definition needs access to its own internals, which it stores
// under this symbol
const INTERNALS_KEY = Symbol();

// Override the default getElementInternals() to make the decorator work with
// the element's own internals
@define("color-picker")
@forma({ sync: true })
export class ColorPicker extends HTMLElement {
  #shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });
  [INTERNALS_KEY] = this.attachInternals();

  constructor() {
    super();
    const form = Object.assign(document.createElement("form"), {
      noValidate: true,
    });
    const rgb = Object.assign(document.createElement("input"), {
      name: "rgb",
      type: "color",
    });
    const alpha = Object.assign(document.createElement("input"), {
      name: "alpha",
      type: "number",
      min: "0",
      max: "255",
    });
    form.append(rgb, alpha);
    this.#shadow.append(form);
  }

  [forma.VALUE_STATE_TO_SUBMISSION_STATE] = toString;
  [forma.SUBMISSION_STATE_TO_VALUE_STATE] = fromString;
  [forma.VALUE_STATE_TO_ATTRIBUTE_VALUE] = toString;
  [forma.ATTRIBUTE_VALUE_TO_VALUE_STATE] = fromString;
}
