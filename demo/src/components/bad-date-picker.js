// Form component built from three native <select> with interdependent behavior:
// the number of days in the third <select> depends on the other two <select>,
// but the API remains comparatively simple.

// Notable complications:
//   * built with uhtml
//   * the uhtml base class triggers the first render before the initial
//     element set-up, but everything remains properly synced up

import { define } from "@sirpepe/ornament";
import { forma, FormLore } from "../../../src";
import { BaseElement } from "../uhtmlBaseElement.js";

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

@define("bad-date-picker")
@forma()
export class BadDatePicker extends BaseElement {
  [forma.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    return toString(valueState);
  }

  [forma.VALUE_STATE_TO_ATTRIBUTE_VALUE](valueState) {
    return toString(valueState);
  }

  [forma.SUBMISSION_STATE_TO_VALUE_STATE](input) {
    return fromString(input);
  }

  [forma.ATTRIBUTE_VALUE_TO_VALUE_STATE](input) {
    return fromString(input);
  }

  render() {
    const currentYear = Number(this[forma.VALUE_STATE].get("year"));
    const currentMonth = Number(this[forma.VALUE_STATE].get("month"));
    const currentDay = Number(this[forma.VALUE_STATE].get("day"));
    const years = listYears();
    const months = listMonths();
    const days = listDays(currentYear, currentMonth);
    return this.html`
      <select
        name="year"
        ?readOnly=${this.readOnly}
        ?disabled=${this[forma.DISABLED_STATE]}
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
        ?disabled=${this[forma.DISABLED_STATE]}
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
        ?disabled=${this[forma.DISABLED_STATE]}
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
