import { reactive, connected } from "@sirpepe/ornament";
import { render } from "preact";

export class BaseElement extends HTMLElement {
  #shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });
  #form = document.createElement("form");

  constructor() {
    super();
    this.#form.noValidate = true;
    this.#shadow.append(this.#form);
  }

  @connected()
  @reactive()
  #render() {
    render(this.render(), this.#form);
  }
}
