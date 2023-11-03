import {
  FalseworkElement,
  SHADOW_ROOT,
  component as baseComponent,
  reactive,
  attr,
  string,
  bool,
  capture,
  literal,
} from "@sirpepe/falsework";

const sheet = new CSSStyleSheet();
sheet.replaceSync(":invalid { box-shadow: 0 0 0.333em red }");

function getValidity(sources) {
  for (const source of sources) {
    if (!source.validity.valid) {
      const anchor = source.isConnected ? source : undefined;
      return [source.validity, source.validationMessage ?? "", anchor];
    }
  }
  return [{ valid: true }, "", undefined];
}

function exposeValidity(sources, target) {
  const [validity, validationMessage, anchor] = getValidity(sources);
  console.log(`Validity on "${target.name}":`, validity.valid, validationMessage);
  target[INTERNALS_KEY].setValidity(validity, validationMessage, anchor);
}

function exposeValue(source, target) {
  if (source.type === "checkbox" && !source.checked) {
    console.log(`Value on "${target.name}": unchecked`);
    target[INTERNALS_KEY].setFormValue(new FormData()); // unset form value
  } else {
    console.log(`Value on "${target.name}":`, source.value);
    target[INTERNALS_KEY].setFormValue(source.value);
  }
}

const INTERNALS_KEY = Symbol();

function component(tagName, options) {
  if (!options?.formElement) {
    return baseComponent(tagName);
  }
  if (typeof options.source !== "string") {
    throw new Error("Missing a selector for the source element");
  }
  return function(Target) {
    @baseComponent(tagName)
    class FormMixin extends Target {
      static formAssociated = true;
      [INTERNALS_KEY] = this.attachInternals();

      get shadowRootInit() {
        return { mode: "open", delegatesFocus: true };
      }

      constructor() {
        super();
        this[SHADOW_ROOT].adoptedStyleSheets = [sheet];
      }

      @reactive()
      @capture("input", options.source, options.validate)
      exposeInternals() {
        exposeValue(
          this[SHADOW_ROOT].querySelector(options.source),
          this,
        );
        exposeValidity(
          this[SHADOW_ROOT].querySelectorAll(options.validate ?? options.source),
          this,
        );
      };

      get form() {
        return this[INTERNALS_KEY].form;
      }

      get willValidate() {
        return this[INTERNALS_KEY].willValidate;
      }

      get validity() {
        return this[INTERNALS_KEY].validity;
      }
    }
    return FormMixin;
  };
}

@component("custom-input", { formElement: true, source: "input" })
export class CustomInput extends FalseworkElement {
  @attr(string()) accessor name = "";
  @attr(string()) accessor value = "";
  @attr(string()) accessor placeholder = "";
  @attr(bool()) accessor required = false;
  get template() {
    return this.html`<input value="${this.value}" type="text" placeholder=${this.placeholder} ?required=${this.required} />`;
  }
}

@component("custom-checkbox", { formElement: true, source: "input" })
export class CustomCheckbox extends FalseworkElement {
  @attr(string()) accessor name = "";
  @attr(string()) accessor value = "";
  @attr(bool()) accessor checked = false;
  @attr(bool()) accessor required = false;
  get template() {
    return this.html`<input value=${this.value} type="checkbox" ?checked=${this.checked} ?required=${this.required} />`;
  }
}

@component("confirmed-password", {
  formElement: true,
  source: "[name=password]",
  validate: "input"
})
export class ConfirmedPassword extends FalseworkElement {
  @attr(string()) accessor name = "";
  @attr(string()) accessor value = "";
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

@component("size-select", { formElement: true, source: "input:checked" })
export class SizeSelect extends FalseworkElement {
  @attr(string()) accessor name = "";
  @attr(literal({ values: ["S", "M", "L", "XL"], transform: string() })) accessor value = "S";
  get template() {
    return this.html`
      <label>S <input name="size" value="S" type="radio" ?checked=${this.value === "S"} /></label>
      <label>M <input name="size" value="M" type="radio" ?checked=${this.value === "M"} /></label>
      <label>L <input name="size" value="L" type="radio" ?checked=${this.value === "L"} /></label>
      <label>XL <input name="size" value="XL" type="radio" ?checked=${this.value === "XL"} /></label>
    `;
  }
}
