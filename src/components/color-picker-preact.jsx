import { defineFormElement } from "../lib/defineFormElement.js";
import { PreactBaseElement as BaseElement } from "../lib/lib.js";

@defineFormElement("alpha-color-picker")
export class AlphaColorPicker extends BaseElement {
  render() {
    return (
      <>
        <input name="rgb" type="color" />
        <input name="a" type="number" />
      </>
    );
  }
}

// Boilerplate, kann mit besserem Buildprozess eliminiert werden
import { h, Fragment } from "preact";
