import { render, html } from "uhtml";
import {
  configure,
  define,
  formElement,
  attr,
  int,
  bool,
  reactive,
  debounce,
} from "./src/membrane.js";

//
const SHADOW_ROOT_SLOT = Symbol();

//
configure.getRenderRoot((instance) => instance[SHADOW_ROOT_SLOT]);

//
class BaseElement extends HTMLElement {
  //
  [SHADOW_ROOT_SLOT] = this.attachShadow(
    this.shadowRootInit ?? { mode: "closed", delegatesFocus: true },
  );

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
    if (!("template" in this)) {
      return;
    }
    if ("css" in this) {
      render(
        this[SHADOW_ROOT_SLOT],
        this.html`${this.template}<style>${this.css}</style>`,
      );
    } else {
      render(this[SHADOW_ROOT_SLOT], this.html`${this.template}`);
    }
  }
}

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
