// Wrapper component over a native input. Useful for pattern libraries or simple
// abstractions over exiting elements, like this input for integers built on top
// of a regular input[type=number]. The component only fixes some attributes of
// the native input (step, type) and exposes other attributes (min, max) through
// the abstraction. This results in a proper form-associated custom element with
// all form APIs, automatic internal state management (dirty flag for value,
// disabled state, form reset etc.), form validation and everything else.

// Notable complications:
//   * built with Preact
//   * the Preact base class triggers the first render _after_ the initial
//     element set-up, but everything remains properly synced up

import { define, attr, int } from "@sirpepe/ornament";
import { forma, FormLore } from "../../src";
import { BaseElement } from "../preactBaseElement.js";

@define("integer-input")
@forma()
export class IntegerInput extends BaseElement {
  @attr(int({ nullable: true }))
  accessor min = null;

  @attr(int({ nullable: true }))
  accessor max = null;

  [forma.ATTRIBUTE_VALUE_TO_VALUE_STATE](value) {
    return FormLore.fromEntries([
      ["input", Number.parseInt(value, 10) || 0],
    ]);
  }

  render() {
    return (
      <input
        name="input"
        step="1"
        type="number"
        min={this.min ?? ""}
        max={this.max ?? ""}
        value={this[forma.VALUE_STATE].get("input")}
        defaultValue={this.defaultValue}
        readOnly={this.readonly}
        disabled={this[forma.DISABLED_STATE]}
        required={this.required} />
      );
  }
}
