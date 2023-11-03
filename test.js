import {
  FalseworkElement,
  SHADOW_ROOT,
  component as baseComponent,
  reactive,
  prop,
  attr,
  string,
  bool,
  capture,
  literal,
} from "@sirpepe/falsework";

function getValidity(sources) {
  for (const source of sources) {
    if (!source.validity.valid) {
      const anchor = source.isConnected ? source : undefined;
      return [source.validity, source.validationMessage ?? "", anchor];
    }
  }
  return [{}, "", undefined];
}

function exposeValidity(sources, target) {
  const [validity, validationMessage, anchor] = getValidity(sources);
  console.log("Validity:", sources, validity, validationMessage);
  target[INTERNALS_KEY].setValidity(validity, validationMessage, anchor);
}

function exposeValue(source, target) {
  if (source.type === "checkbox" && !source.checked) {
    console.log("Exposing value:", source, new FormData())
    target[INTERNALS_KEY].setFormValue(new FormData()); // unset form value
  } else {
    console.log("Exposing value:", source, source.value)
    target[INTERNALS_KEY].setFormValue(source.value);
  }

}

const INTERNALS_KEY = Symbol();

function component(tagName, options) {
  if (!options?.formElement) {
    return baseComponent(tagName);
  }
  if (typeof options.anchor !== "string") {
    throw new Error("Missing a selector for the anchor element");
  }
  return function(Target) {
    @baseComponent(tagName)
    class FormMixin extends Target {
      static formAssociated = true;
      [INTERNALS_KEY] = this.attachInternals();

      get shadowRootInit() {
        return { mode: "open", delegatesFocus: true };
      }

      @reactive()
      @capture("input", options.anchor)
      exposeInternals() {
        exposeValue(
          this[SHADOW_ROOT].querySelector(options.anchor),
          this,
        );
        exposeValidity(
          [this[SHADOW_ROOT].querySelector(options.anchor)],
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

// Features:
// 1. Neues Formularelement als Wrapper um Standard-Elemente, ohne zu viel
//    Boilerplate
// 2. Funktioniert mit jedem beliebigen Render-Mechanismus (hier via BaseClass
//    bereitgestelltes uhtml, kann aber wirklich *alles* mögliche sein)
// 3. :valid und :invalid (:user-valid und :user-invalid sind buggy)
@component("custom-input", { formElement: true, anchor: "input" })
export class CustomInput extends FalseworkElement {
  @attr(string()) accessor name = "";
  @attr(string()) accessor value = "";
  @attr(string()) accessor placeholder = "";
  @attr(bool()) accessor required = false;
  get template() {
    return this.html`<input value="${this.value}" type="text" placeholder=${this.placeholder} ?required=${this.required} />`;
  }
}

// 4. Verhält sich 1:1 wie eine normale Checkbox, d.h. sendet nur den Payload
//    [name]="yes", wenn angehakt
@component("custom-checkbox", { formElement: true, anchor: "input" })
export class CustomCheckbox extends FalseworkElement {
  @attr(string()) accessor name = "";
  @prop(bool()) accessor checked = false;
  get template() {
    return this.html`<input value="yes" type="checkbox" ?checked=${this.checked} />`;
  }
}

@component("size-select", { formElement: true, anchor: "input:checked" })
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


@component("confirmed-password", { formElement: true, anchor: "input" })
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
      Pass: <input name="password" value=${this.value} type="password" ?required=${this.required} />
      <br>
      Confirm: <input name="confirm" value=${this.value} type="password" ?required=${this.required} />
    `;
  }
}
