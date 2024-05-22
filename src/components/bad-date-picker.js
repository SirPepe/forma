import { defineFormElement, FormLore } from "../lib/defineFormElement.js";
import { BaseElement } from "../lib/uhtmlBaseElement.js";

const DATE_RE = /^0*([0-9]{1,4})-0?([0-9]{1,2})-0?([0-9]{1,2})$/;

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

function toString(valueState) {
  if (!valueState) {
    return "";
  }
  const year = String(valueState.get("year") ?? 0).padStart(4, "0");
  const month = String(valueState.get("month") ?? 0).padStart(2, "0");
  const day = String(valueState.get("day") ?? 0).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromString(value) {
  if (!value) {
    return null;
  }
  const match = DATE_RE.exec(String(value));
  if (!match) {
    return null;
  }
  return FormLore.fromEntries([
    ["year", match[1] ?? 0],
    ["month", match[2] ?? 0],
    ["day", match[3] ?? 0],
  ]);
}

// Komplexerer Use Case: FACE durch Komposition aus mehreren form-associated
// Elements (in diesem Beispiel: drei Selects) mit Wechselwirkungen - die Anzahl
// der Tage im dritten Select hängt von den Werten der beiden anderen Selects
// ab! Trotzdem ist die API identisch und wir erhalten wieder ein komplettes
// FACE mit allem, was ein Formular-Element braucht.
@defineFormElement("bad-date-picker")
export class BadDatePicker extends BaseElement {
  [defineFormElement.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    return toString(valueState);
  }

  [defineFormElement.VALUE_STATE_TO_ATTRIBUTE_VALUE](valueState) {
    return toString(valueState);
  }

  [defineFormElement.SUBMISSION_STATE_TO_VALUE_STATE](input) {
    return fromString(input);
  }

  [defineFormElement.ATTRIBUTE_VALUE_TO_VALUE_STATE](input) {
    return fromString(input);
  }

  render() {
    const valueState = this.valueState;
    const currentYear = Number(valueState.get("year"));
    const currentMonth = Number(valueState.get("month"));
    const currentDay = Number(valueState.get("day"));
    const years = listYears();
    const months = listMonths();
    const days = listDays(currentYear, currentMonth);
    return this.html`
      <select
        name="year"
        ?readOnly=${this.readOnly}
        ?disabled=${this.disabledState}
        ?required=${this.required}
        .value="${currentYear || ""}">
        <option value="">--</option>
        ${years.map(
          (year) =>
            this
              .html`<option ?selected=${year === currentYear}>${year}</option>`,
        )}
      </select>
      /
      <select
        name="month"
        ?readOnly=${this.readOnly}
        ?disabled=${this.disabledState}
        ?required=${this.required}
        .value="${currentMonth || ""}">
        <option value="">--</option>
        ${months.map(
          (month) =>
            this
              .html`<option ?selected=${month === currentMonth}>${month}</option>`,
        )}
      </select>
      /
      <select
        name="day"
        ?readOnly=${this.readOnly}
        ?disabled=${this.disabledState}
        ?required=${this.required}
        .value="${currentDay || ""}">
        <option value="">--</option>
        ${days.map(
          (day) =>
            this.html`<option ?selected=${day === currentDay}>${day}</option>`,
        )}
      </select>
    `;
  }
}
