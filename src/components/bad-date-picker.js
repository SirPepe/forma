import { defineFormElement, reactive } from "../lib/defineFormElement.js";
import { BaseElement } from "../lib/lib.js";

function listYears(from = new Date().getFullYear()) {
  return Array.from({ length: 101 }, (_, i) => from - 100 + i);
}

function listMonths() {
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

function listDays(currentYear, currentMonth) {
  if (
    typeof currentYear !== "undefined" &&
    typeof currentMonth !== "undefined"
  ) {
    const number = new Date(currentYear, currentMonth, 0).getDate();
    return Array.from({ length: number }, (_, i) => i + 1);
  }
  return [];
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
