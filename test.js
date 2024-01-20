import { render, html } from "uhtml";
import { define, formElement, attr, int, reactive, debounce } from "./src/membrane.js";

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
      <form novalidate>
        <input
          name="input"
          step="1"
          type="number"
          value="${this.defaultValue}"
          min=${this.max ?? ""}
          min=${this.max ?? ""}
          ?readonly=${this.readonly}
          ?disabled=${this.disabledState}
          ?required=${this.required} />
        </form>`
    );
  }
}

// TODO: Alpha-Input

@define("bad-date-picker")
@formElement()
export class BadDatePicker extends HTMLElement {
  #root = this.attachShadow({ mode: "open", delegatesFocus: true });

  // Transformiert Value State zu Submission State
  [formElement.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    if (!valueState) { // ggf. null bei unültigem Input
      return "";
    }
    const year = String(valueState.get("year")).padStart(4, "0");
    const month = String(valueState.get("month")).padStart(2, "0");
    const day = String(valueState.get("day")).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Transformiert Submission State zu Value State
  [formElement.SUBMISSION_STATE_TO_VALUE_STATE](submissionState) {
    if (!submissionState) {
      return null;
    }
    const match = /^0*([0-9]{1,4})-0?([0-9]{1,2})-0?([0-9]{1,2})$/.exec(submissionState);
    if (!match) {
      return null;
    }
    const valueState = new FormData();
    valueState.set("year", match[1]);
    valueState.set("month", match[2]);
    valueState.set("day", match[3]);
    return valueState;
  }

  // Rendert das Shadow DOM mit den drei <select> (Details egal)
  @reactive({ initial: false })
  render() {
    const valueState = this.valueState;
    const currentYear = Number(valueState.get("year"));
    const currentMonth = Number(valueState.get("month"));
    const currentDay = Number(valueState.get("day"));
    const years = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - 100 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = (currentYear && currentMonth)
      ? Array.from({ length: new Date(currentYear, currentMonth, 0).getDate() }, (_, i) => i + 1)
      : [];
    console.log("Render Shadow DOM with", { year: currentYear, month: currentMonth, day: currentDay, daysInMonth: days.length })
    render(
      this.#root,
      html`
      <form novalidate>
        <select name="year" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required} .value="${currentYear || ""}">
          <option value="">--</option>
          ${years.map((year) => html`<option ?selected=${year === currentYear}>${year}</option>`)}
        </select>
        /
        <select name="month" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required} .value="${currentMonth || ""}">
          <option value="">--</option>
          ${months.map((month) => html`<option ?selected=${month === currentMonth}>${month}</option>`)}
        </select>
        /
        <select name="day" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required} .value="${currentDay || ""}">
          <option value="">--</option>
          ${days.map((day) => html`<option ?selected=${day === currentDay}>${day}</option>`)}
        </select>
      </form>`
    );
  }
}
