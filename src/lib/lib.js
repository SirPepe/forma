import { render as uhtmlRender, html as uhtmlHTML } from "uhtml";
import { render as preactRender } from "preact";
import { reactive } from "@sirpepe/ornament";

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
    return uhtmlRender(this.#form, content);
  }

  html(...args) {
    return uhtmlHTML(...args);
  }
}

export class PreactBaseElement extends HTMLElement {
  #form;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });
    this.#form = document.createElement("form");
    this.#form.noValidate = true;
    shadow.append(this.#form);
  }

  @reactive()
  #renderShadowForm() {
    if ("render" in this) {
      return preactRender(this.render(), this.#form);
    }
  }
}
