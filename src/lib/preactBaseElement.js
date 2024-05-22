import { reactive, init } from "@sirpepe/ornament";
import { render as preactRender } from "preact";

export class BaseElement extends HTMLElement {
  #shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });
  #form = document.createElement("form");

  constructor() {
    super();
    this.#form.noValidate = true;
    this.#shadow.append(this.#form);
  }

  @init()
  @reactive()
  #render() {
    preactRender(this.render(), this.#form);
  }
}
