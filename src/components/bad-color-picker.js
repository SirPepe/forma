import { defineFormElement, reactive } from "../lib/defineFormElement.js";

@defineFormElement("color-picker")
export class ColorPicker extends HTMLElement {
  #shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });
  static ALPHA_COLOR_RE = /^(?<rgb>#[a-fA-F0-9]{6})(?<alpha>[a-fA-F0-9]{2})$/;

  constructor() {
    super();
    this.#shadow.innerHTML = `<form novalidate>
  <input name="rgb" type="color"/>
  <input name="alpha" type="number" min="0" max="255"/>
</form>`;
  }

  [defineFormElement.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    if (!valueState) {
      return "";
    }
    const alpha = Number(valueState.get("alpha")).toString(16).padStart(2, "0");
    return `${valueState.get("rgb")}${alpha}`;
  }

  [defineFormElement.SUBMISSION_STATE_TO_VALUE_STATE](submissionState) {
    if (!submissionState) {
      return null;
    }
    const match = ColorPicker.ALPHA_COLOR_RE.exec(submissionState);
    if (!match) {
      return null;
    }
    const valueState = new FormData();
    valueState.set("rgb", match.groups.rgb);
    valueState.set("alpha", Number.parseInt(match.groups.alpha, 16));
    return valueState;
  }

  @reactive()
  render() {
    const colorInput = this.#shadow.querySelector("input[type=color]");
    Object.assign(colorInput, {
      readonly: this.readonly,
      disabledState: this.disabledState,
      required: this.required,
      value: this.valueState.get("rgb") ?? "#000000",
    });
    const alphaInput = this.#shadow.querySelector("input[type=number]");
    Object.assign(alphaInput, {
      readonly: this.readonly,
      disabledState: this.disabledState,
      required: this.required,
      value: this.valueState.get("alpha") ?? "255",
    });
  }
}





// Komplexerer Use Case: FACE durch Komposition aus mehreren form-associated
// Elements (in diesem Beispiel: Color-Input + Number-Input = Color-Input mit
// Alphakanal). Die Values der zwei gewrappten Inputs werden intern als FormData
// repräsentiert, die für die Value-Attribute und den Submission value zu
// Strings serialisiert werden müssen - daher die zwei
// Transformations-Funktionen. Liefert _ein_ komplettes FACE, dessen innerer
// Aufbau aus zwei Inputs komplett wegabstrahiert ist. Dieses Element verwendet
// für das Shadow DOM 100% Vanilla-APIs, einfach weil's geht!
