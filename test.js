import { render, html } from "uhtml";
import { define, formElement, prop, attr, int, number, reactive, debounce, subscribe } from "./src/membrane.js";

@define("int-input")
@formElement()
export class IntInput extends HTMLElement {
  #root = this.attachShadow({ mode: "closed", delegatesFocus: true });

  @attr(int({ nullable: true })) accessor min = null;
  @attr(int({ nullable: true })) accessor max = null;

  @reactive()
  @debounce({ fn: debounce.raf() })
  render() {
    render(
      this.#root,
      html`
        <input
          step="1"
          type="number"
          value="${this.defaultValue}"
          min=${this.max ?? ""}
          min=${this.max ?? ""}
          ?readonly=${this.readonly}
          ?disabled=${this.disabledState}
          ?required=${this.required} />`
    );
  }
}

@define("bad-date-picker")
@formElement()
export class BadDatePicker extends HTMLElement {
  #root = this.attachShadow({ mode: "open", delegatesFocus: true });

  // Datums-Komponenten. Änderungen lösen Updates im Shadow DOM aus
  @prop(number()) accessor #year = 0;
  @prop(number()) accessor #month = 0;
  @prop(number()) accessor #day = 0;

  // Event Handler für Eingaben an den <select> im Shadow DOM. Verwendet
  // Capturing um das Update vor der Input Change Detection anzubringen.
  @subscribe((instance) => instance.shadowRoot, "input", { capture: true })
  #handleSelection(evt) {
    if (evt.target.name === "year") {
      this.#year = evt.target.value;
    }
    if (evt.target.name === "month") {
      this.#month = evt.target.value;
    }
    if (evt.target.name === "day") {
      this.#day = evt.target.value;
    }
  }

  // Liefert den aktuellen Value State. Wird in Folge der Input Change Detection
  // abgefragt
  get [formElement.CURRENT_VALUE_STATE]() {
    if (!this.#year || !this.#month || !this.#day) {
      return null;
    }
    const valueState = new FormData();
    valueState.set("year", this.#year);
    valueState.set("month", this.#month);
    valueState.set("day", this.#day);
    return valueState;
  }

  // Transformiert Value State zu Submission State
  [formElement.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    if (!valueState) { // ggf. null bei unültigem Input
      return "";
    }
    const year = valueState.get("year");
    const month = String(valueState.get("month")).padStart(2, "0");
    const day = String(valueState.get("day")).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Transformiert Submission State zu Value State
  [formElement.SUBMISSION_STATE_TO_VALUE_STATE](submissionState) {
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(submissionState);
    if (!match) {
      return null;
    }
    const valueState = new FormData();
    valueState.append("year", match[1]);
    valueState.append("month", match[2]);
    valueState.append("day", match[3]);
    return valueState;
  }

  // Reagiert auf Updates via IDL-Attribut, Content-Attribut und
  // Lifecycle-Callbacks (z.B. bei Reset)
  [formElement.VALUE_STATE_UPDATE_CALLBACK](valueState) {
    if (valueState) {
      console.log("vcuc", valueState);
      this.#year = Number(valueState.get("year"));
      this.#month = Number(valueState.get("month"));
      this.#day = Number(valueState.get("day"));
    }
  }

  // Rendert das Shadow DOM mit den drei <select> (Details egal)
  @reactive()
  render() {
    console.log("Render", this.#year, this.#month, this.#day);
    const years = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - 100 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = (this.#year && this.#month)
      ? Array.from({ length: new Date(this.#year, this.#month, 0).getDate() }, (_, i) => i + 1)
      : [];
    render(
      this.#root,
      html`
        <select name="year" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required} .value="${Number(this.#year) || ""}">
          <option value="">--</option>
          ${years.map((year) => html`<option ?selected=${year === Number(this.#year)}>${year}</option>`)}
        </select>
        /
        <select name="month" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required} .value="${Number(this.#month) || ""}">
          <option value="">--</option>
          ${months.map((month) => html`<option ?selected=${month === Number(this.#month)}>${month}</option>`)}
        </select>
        /
        <select name="day" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required} .value="${Number(this.#day) || ""}">
          <option value="">--</option>
          ${days.map((day) => html`<option ?selected=${day === Number(this.#day)}>${day}</option>`)}
        </select>`
    );
  }
}
