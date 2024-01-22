import { defineFormElement, attr, int, reactive } from "./defineFormElement.js";
import { BaseElement, listDays, listMonths, listYears } from "./lib.js";

// Einfachster Use Case: Wrapper-Komponente über _ein_ form-associated Element.
// Nützlich für Pattern Libraries oder Varianten von anderen Elementen (wie in
// diesem Beispiel: int-Input aus normalem number-Input) Legt ein paar Attribute
// des gewrappten Inputs fest (step, type) und reicht andere (min, max) aus den
// eigenen Attributen an das gewrappte Input durch. Liefert ein komplettes FACE
// mit allen Form-APIs, vollautomatischem internem State-Management (Dirty Flag,
// Disabled-State via Fieldset, Form-Reset etc.) Formular-Validierung etc.
@defineFormElement("integer-input")
export class IntegerInput extends BaseElement {
  @attr(int({ nullable: true }))
  accessor min = null;

  @attr(int({ nullable: true }))
  accessor max = null;

  @reactive()
  #render() {
    return this.render(
      this.html`
        <input
          name="input"
          step="1"
          type="number"
          min=${this.max ?? ""}
          min=${this.max ?? ""}
          value=${this.defaultValue}
          ?readonly=${this.readonly}
          ?disabled=${this.disabledState}
          ?required=${this.required} />`
    );
  }
}

// Komplexerer Use Case: FACE durch Komposition aus mehreren form-associated
// Elements (in diesem Beispiel: Color-Input + Number-Input = Color-Input mit
// Alphakanal). Die Values der zwei gewrappten Inputs werden intern als FormData
// repräsentiert, die für die Value-Attribute und den Submission value zu
// Strings serialisiert werden müssen - daher die zwei
// Transformations-Funktionen. Liefert _ein_ komplettes FACE, dessen innerer
// Aufbau aus zwei Inputs komplett wegabstrahiert ist.
@defineFormElement("color-picker")
export class ColorPicker extends BaseElement {
  static ALPHA_COLOR_RE = /^(?<rgb>#[a-fA-F0-9]{6})(?<alpha>[a-fA-F0-9]{2})$/;

  // Transformiert Value State (FormData) zu Submission State (String)
  [defineFormElement.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    if (!valueState) {
      return "";
    }
    const alpha = Number(valueState.get("alpha")).toString(16).padStart(2, "0");
    return `${valueState.get("rgb")}${alpha}`;
  }

  // Transformiert Submission State (String) zu Value State (FormData)
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
  #render() {
    const currentRgb = this.valueState.get("rgb") || "#000000";
    const currentAlpha = this.valueState.get("alpha") || "255";
    this.render(
      this.html`
        <input
          name="rgb"
          type="color"
          .value=${currentRgb}
          ?readonly=${this.readonly}
          ?disabled=${this.disabledState}
          ?required=${this.required} />
        <input
          name="alpha"
          type="number"
          .value=${currentAlpha}
          min="0"
          max="255"
          ?readonly=${this.readonly}
          ?disabled=${this.disabledState}
          ?required=${this.required} />`
    );
  }
}

// Komplexerer Use Case: FACE durch Komposition aus mehreren form-associated
// Elements (in diesem Beispiel: drei Selects) mit Wechselwirkungen - die Anzahl
// der Tage im dritten Select hängt von den Werten der beiden anderen Selects
// ab! Trotzdem ist die API identisch und wir erhalten wieder ein komplettes
// FACE mit allem, was ein Formular-Element braucht.
@defineFormElement("bad-date-picker")
export class BadDatePicker extends BaseElement {
  static DATE_RE = /^0*([0-9]{1,4})-0?([0-9]{1,2})-0?([0-9]{1,2})$/;

  // Transformiert Value State (FormData) zu Submission State (String)
  [defineFormElement.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    if (!valueState) { // ggf. null bei unültigem Input
      return "";
    }
    const year = String(valueState.get("year")).padStart(4, "0");
    const month = String(valueState.get("month")).padStart(2, "0");
    const day = String(valueState.get("day")).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Transformiert Submission State (String) zu Value State (FormData)
  [defineFormElement.SUBMISSION_STATE_TO_VALUE_STATE](submissionState) {
    if (!submissionState) {
      return null;
    }
    const match = BadDatePicker.DATE_RE.exec(submissionState);
    if (!match) {
      return null;
    }
    const valueState = new FormData();
    valueState.set("year", match[1]);
    valueState.set("month", match[2]);
    valueState.set("day", match[3]);
    return valueState;
  }

  @reactive()
  #render() {
    const valueState = this.valueState;
    const currentYear = Number(valueState.get("year"));
    const currentMonth = Number(valueState.get("month"));
    const currentDay = Number(valueState.get("day"));
    const years = listYears();
    const months = listMonths();
    const days = listDays(currentYear, currentMonth);
    return this.render(
    this.html`
      <select
        name="year"
        ?readonly=${this.readonly}
        ?disabled=${this.disabledState}
        ?required=${this.required}
        .value="${currentYear || ""}">
        <option value="">--</option>
        ${years.map((year) =>
          this.html`<option ?selected=${year === currentYear}>${year}</option>`
        )}
      </select>
      /
      <select
        name="month"
        ?readonly=${this.readonly}
        ?disabled=${this.disabledState}
        ?required=${this.required}
        .value="${currentMonth || ""}">
        <option value="">--</option>
        ${months.map((month) =>
          this.html`<option ?selected=${month === currentMonth}>${month}</option>`
        )}
      </select>
      /
      <select
        name="day"
        ?readonly=${this.readonly}
        ?disabled=${this.disabledState}
        ?required=${this.required}
        .value="${currentDay || ""}">
        <option value="">--</option>
        ${days.map((day) =>
          this.html`<option ?selected=${day === currentDay}>${day}</option>`
        )}
      </select>`
    );
  }
}
