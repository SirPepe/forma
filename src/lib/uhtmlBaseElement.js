import { reactive, init } from "@sirpepe/ornament";
import { render, html } from "uhtml";

export class BaseElement extends HTMLElement {
  #shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });
  #form = document.createElement("form");

  constructor() {
    super();
    this.#form.noValidate = true;
    this.#shadow.append(this.#form);
  }

  html(...args) {
    return html(...args);
  }

  @init()
  @reactive()
  #render() {
    return render(this.#form, this.render());
  }
}
