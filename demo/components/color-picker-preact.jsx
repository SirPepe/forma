import { define } from "@sirpepe/ornament";
import { BaseElement } from "../preactBaseElement.js";
import { forma } from "../../src";

const COLOR_RE = /^(?<rgb>#[a-fA-F0-9]{6})(?<a>[a-fA-F0-9]{2})$/;

function toString(valueState = new FormData()) {
  const a = Number(valueState.get("alpha") ?? "255").toString(16).padStart(2, "0");
  return `${valueState.get("rgb")}${a}`;
}

function fromString(input = "") {
  const { rgb = "#000000", a = "FF" } = COLOR_RE.exec(input)?.groups ?? {};
  let valueState = new FormData();
  valueState.append("rgb", rgb);
  valueState.append("a", Number.parseInt(a, 16));
  return valueState;
}

@define("color-picker")
@forma()
export class ColorPicker extends BaseElement {
  [forma.VALUE_STATE_TO_SUBMISSION_STATE] = toString;
  [forma.SUBMISSION_STATE_TO_VALUE_STATE] = fromString;
  [forma.VALUE_STATE_TO_ATTRIBUTE_VALUE] = toString;
  [forma.ATTRIBUTE_VALUE_TO_VALUE_STATE] = fromString;

  render() {

    const commonAttributes = {
      disabled: this[forma.DISABLED_STATE],
      required: this.required,
    };
    return (
      <div>
        <input
          name="rgb"
          type="color"
          value={this[forma.VALUE_STATE].get("rgb")}
          {...commonAttributes} />
        <input
          name="a"
          type="number"
          step={1}
          min={0}
          max={255}
          value={this[forma.VALUE_STATE].get("a")}
          {...commonAttributes} />
      </div>
    );
  }
}
