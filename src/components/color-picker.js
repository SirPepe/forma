// More complex use case: a FACE composed from two native elements (in this
// case: input[type=color] + input[type=number] = input for colors with an alpha
// channel. This element uses no libraries or base classes, but needs to access
// its element internals - hence the manual configuration of the form decorator.

import { defineFormElement, FormLore, subscribe } from "../lib/defineFormElement.js";

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
const INT_KEY = Symbol();

// Override the default getElementInternals() to make the decorator work with
// the element's own internals
@defineFormElement("color-picker", {
  getElementInternals: (el) => el[INT_KEY],
})
export class ColorPicker extends HTMLElement {
  #shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });
  [INT_KEY] = this.attachInternals();

  constructor() {
    super();
    const form = Object.assign(document.createElement("form"), { noValidate: true });
    const rgb = Object.assign(document.createElement("input"), {
      name: "rgb",
      type: "color",
      style: "block-size: inherit; inline-size: inherit",
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

  [defineFormElement.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    return toString(valueState);
  }

  [defineFormElement.SUBMISSION_STATE_TO_VALUE_STATE](submissionState) {
    return fromString(submissionState);
  }

  [defineFormElement.VALUE_STATE_TO_ATTRIBUTE_VALUE](valueState) {
    return toString(valueState);
  }

  [defineFormElement.ATTRIBUTE_VALUE_TO_VALUE_STATE](input) {
    return fromString(input);
  }

  // readOnly does not work on [type=color], but we can force it to...
  @subscribe((el) => el[INT_KEY].shadowRoot, "input click", { capture: true })
  enforceReadonly(evt) {
    if (this.readOnly) {
      evt.preventDefault();
    }
  }

  render() {
    Object.assign(this.shadow.querySelector("input[type=color]"), {
      readOnly: this.readOnly,
      disabled: this.disabledState,
      required: this.required,
      value: this.valueState.get("rgb") ?? "#000000",
    });
    Object.assign(this.shadow.querySelector("input[type=number]"), {
      readOnly: this.readOnly,
      disabled: this.disabledState,
      required: this.required,
      value: this.valueState.get("alpha") ?? "255",
    });
  }
}
