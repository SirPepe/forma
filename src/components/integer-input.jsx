import { defineFormElement, FormLore, attr, int } from "../lib/defineFormElement.js";
import { BaseElement } from "../lib/preactBaseElement.js";

// Einfachster Use Case: Wrapper-Komponente über _ein_ form-associated Element.
// Nützlich für Pattern Libraries oder Varianten von anderen Elementen (wie in
// diesem Beispiel: int-Input aus normalem number-Input) Legt ein paar Attribute
// des gewrappten Inputs fest (step, type) und reicht andere (min, max) aus den
// eigenen Attributen an das gewrappte Input durch. Liefert ein komplettes FACE
// mit allen Form-APIs, vollautomatischem internem State-Management (Dirty Flag,
// Disabled-State via Fieldset, Form-Reset etc.) Formular-Validierung etc.
// Umsetzung hier mit Preact, einfach weil's geht.

@defineFormElement("integer-input")
export class IntegerInput extends BaseElement {
  @attr(int({ nullable: true }))
  accessor min = null;

  @attr(int({ nullable: true }))
  accessor max = null;

  [defineFormElement.ATTRIBUTE_VALUE_TO_VALUE_STATE](attributeValue) {
    return FormLore.fromEntries([
      ["input", Number.parseInt(attributeValue, 10) || 0],
    ]);
  }

  render() {
    console.log("Rönder");
    return (
      <input
        name="input"
        step="1"
        type="number"
        min={this.min ?? ""}
        max={this.max ?? ""}
        value={this.valueState.get("input")}
        defaultValue={this.defaultValue}
        readOnly={this.readonly}
        disabled={this.disabledState}
        required={this.required} />
      );
  }
}

// Boilerplate, kann mit besserem Buildprozess eliminiert werden
import { h, Fragment } from "preact";
