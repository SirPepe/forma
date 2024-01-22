import { render as baseRender, html as baseHTML } from "uhtml";

export class BaseElement extends HTMLElement {
  #form;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });
    this.#form = document.createElement("form");
    this.#form.noValidate = true;
    shadow.append(this.#form);
  }

  render(content) {
    return baseRender(this.#form, content);
  }

  html(...args) {
    return baseHTML(...args);
  }
}

export function listYears(from = new Date().getFullYear()) {
  return Array.from({ length: 101 }, (_, i) => from - 100 + i);
}

export function listMonths() {
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

export function listDays(currentYear, currentMonth) {
  if (
    typeof currentYear !== "undefined" &&
    typeof currentMonth !== "undefined"
  ) {
    const number = new Date(currentYear, currentMonth, 0).getDate();
    return Array.from({ length: number }, (_, i) => i + 1);
  }
  return [];
}
