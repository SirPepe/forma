import { render, html } from "uhtml";
import { define, formElement, prop, attr, int, number, reactive, debounce, subscribe } from "./src/membrane.js";

/*

//
class BaseElement extends HTMLElement {
  //
  #root = this.attachShadow({ mode: "closed", delegatesFocus: true });

  // Nothing more than a nicer string tag out of the box, derived from the
  // element's tag name.
  get [Symbol.toStringTag]() {
    const stringTag = this.tagName
      .split("-")
      .map((s) => s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase())
      .join("");
    return "HTML" + stringTag + "Element";
  }

  // Wraps uhtml to make this.html work as expected
  html(...args) {
    return html(...args);
  }

  @reactive()
  @debounce({ fn: debounce.raf() })
  #render() {
    render(this[SHADOW_ROOT_SLOT], this.html`${this.template ?? ""}`);
  }
}

/*
@define("int-input")// 👍 Ornament-Decorator für CE-Definition
@formElement() // 👍 ein Decorator macht name + value + disabled + Form-Resets
export class IntInput extends BaseElement { // 👍 nicht vorgegebene Basisklasse
  // 👍 Ornament-Decorators für Attribute
  @attr(bool()) accessor required = false;
  @attr(int({ nullable: true })) accessor min = null;
  @attr(int({ nullable: true })) accessor max = null;

  get template() { // 👍 nicht vorgegebene Render-Logik
    // 👎 Content- und IDL-Attribute für "value" müssen unterschieden werden (defaultValue/Value)
    // 👎 Lokales und gesamter Disabled- und IDL-Attribute für "value" müssen unterschieden werden (defaultValue/Value)
    return this.html`
      <input
        value="${this.defaultValue}"
        min=${this.max ?? ""}
        min=${this.max ?? ""}
        step="1"
        type="number"
        ?disabled=${this.disabledState}
        ?required=${this.required} />`;
  }
}*/


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

  // Datums-Komponenten; Änderungen lösen Updates im Shadow DOM aus
  @prop(number()) accessor #year = new Date().getFullYear();
  @prop(number()) accessor #month = new Date().getMonth() + 1;
  @prop(number()) accessor #day = new Date().getDate();

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
    const valueState = new FormData();
    valueState.set("year", this.#year);
    valueState.set("month", this.#month);
    valueState.set("day", this.#day);
    return valueState;
  }

  // Transformiert Value State zu Submission State
  [formElement.VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
    if (valueState) { // ggf. null bei unültigem Input
      const year = valueState.get("year");
      const month = String(valueState.get("month")).padStart(2, "0");
      const day = String(valueState.get("day")).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
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
      this.#year = Number(valueState.get("year"));
      this.#month = Number(valueState.get("month"));
      this.#day = Number(valueState.get("day"));
    }
  }

  // Rendert das Shadow DOM mit den drei <select> (Details egal)
  @reactive()
  @debounce({ fn: debounce.raf() })
  render() {
    const days = Array.from({ length: new Date(this.#year, this.#month, 0).getDate() }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - 100 + i);
    render(
      this.#root,
      html`
        <select name="year" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required}>
          ${years.map((year) => html`<option value="${year}" ?selected=${year === this.#year}>${year}</option>`)}
        </select>
        /
        <select name="month" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required}>
          ${months.map((month) => html`<option value="${month}" ?selected=${month === this.#month}>${month}</option>`)}
        </select>
        /
        <select name="day" ?readonly=${this.readonly} ?disabled=${this.disabledState} ?required=${this.required}>
          ${days.map((day) => html`<option value="${day}" ?selected=${day === this.#day}>${day}</option>`)}
        </select>`
    );
  }
}



/*

@component("custom-input", { formElement: true, source: "input" })
export class CustomInput extends FalseworkElement {
  @attr(string()) accessor placeholder = "";
  @attr(bool()) accessor required = false;

  get template() {
    return this.html`<input value="${this.value}" type="text" placeholder=${this.placeholder} ?required=${this.required} />`;
  }
}

@component("custom-checkbox", {
  formElement: true,
  source: "input",
  valueTransformer: string(),
})
export class CustomCheckbox extends FalseworkElement {
  @attr(bool()) accessor checked = false;
  @attr(bool()) accessor required = false;

  get template() {
    return this.html`<input value=${this.value} type="checkbox" ?checked=${this.checked} ?required=${this.required} />`;
  }
}

@component("confirmed-password", {
  formElement: true,
  source: "[name=password]",
  validate: "input",
  valueTransformer: string(),
})
export class ConfirmedPassword extends FalseworkElement {
  @attr(bool()) accessor required = false;

  @capture("input", "[name=password]", "[name=confirm]")
  enforceSameValue() {
    const password = this[SHADOW_ROOT].querySelector("[name=password]");
    const confirm = this[SHADOW_ROOT].querySelector("[name=confirm]");
    if (password.value === confirm.value) {
      confirm.setCustomValidity("");
    } else {
      confirm.setCustomValidity("Passwords do not match");
    }
  }

  get template() {
    return this.html`
      <label>
        <slot name="label-password"></slot>
        <input name="password" value=${this.value} type="password" ?required=${this.required} />
      </label>
      <label>
      <slot name="label-confirm"></slot>
        <input name="confirm" value=${this.value} type="password" ?required=${this.required} />
      </label>
    `;
  }
}

@component("size-select", {
  formElement: true,
  source: "input:checked",
  valueTransformer: literal({ values: ["S", "M", "L", "XL"], transform: string() }),
})
export class SizeSelect extends FalseworkElement {
  get template() {
    return this.html`
      <label>S <input name="size" value="S" type="radio" ?checked=${this.value === "S"} /></label>
      <label>M <input name="size" value="M" type="radio" ?checked=${this.value === "M"} /></label>
      <label>L <input name="size" value="L" type="radio" ?checked=${this.value === "L"} /></label>
      <label>XL <input name="size" value="XL" type="radio" ?checked=${this.value === "XL"} /></label>
    `;
  }
}

*/
