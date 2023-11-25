import { define, formElement, BaseElement, attr, int, bool } from "./fw.js";

@define("int-input")
@formElement({ source: "input" })
export class IntInput extends BaseElement {
  @attr(bool()) accessor required = false;
  @attr(int({ nullable: true })) accessor min = null;
  @attr(int({ nullable: true })) accessor max = null;

  render(state) {
    return this.html`
      <input
        .value="${state.value || ""}"
        min=${state.max ?? ""}
        min=${state.max ?? ""}
        step="1"
        type="number"
        ?disabled=${state.disabled}
        ?required=${state.required} />`;
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
