import { html, render } from "uhtml";
import { define, debounce, reactive, formDisabled, string, attr, prop, bool, listen } from "@sirpepe/ornament";
import { createReadonlyProxy, capture } from "./lib";
import { SHADOW_ROOT_SLOT, DISABLED_STATE_SLOT, INTERNALS_SLOT } from "./symbols";
export * from "@sirpepe/ornament";

//
export class BaseElement extends HTMLElement {
  //
  [SHADOW_ROOT_SLOT];

  constructor() {
    super();
    this[SHADOW_ROOT_SLOT] = this.attachShadow(
      this.shadowRootInit ?? { mode: "closed" },
    );
  }

  // Internal APIs for (among other things) form elements
  [INTERNALS_SLOT] = HTMLElement.prototype.attachInternals.call(this);

  // Authors should be able to just call this.attachInternals() if they want to,
  // but doing so twice results in exceptions. To make this work anyway (even if
  // something in the framework needed internals access before) this class
  // simply overloads attachInternals()
  attachInternals() {
    return this[INTERNALS_SLOT];
  }

  //
  #proxy = createReadonlyProxy(this, { disabled: DISABLED_STATE_SLOT });

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

  //
  @reactive()
  @debounce({ fn: debounce.raf() })
  #render() {
    if (!("render" in this)) {
      return;
    }
    if ("css" in this) {
      render(
        this[SHADOW_ROOT_SLOT],
        this.html`${this.render(this.#proxy)}<style>${this.css}</style>`,
      );
    } else {
      render(this[SHADOW_ROOT_SLOT], this.html`${this.render(this.#proxy)}`);
    }
  }
}

// Composes a validity state from one or more source inputs and a possible
// overriding validation message. The cause (an Event) may or may not exist, and
// may or may not have a target.
function getValidity(sourceInputs, cause, overridingValidationMessage) {
  for (const sourceInput of sourceInputs) {
    if (!sourceInput.validity.valid) {
      const anchor = sourceInput.isConnected ? sourceInput : undefined;
      return [sourceInput.validity, sourceInput.validationMessage ?? "", anchor];
    }
  }
  const anchor = cause?.target?.isConnected ? cause.target : undefined;
  if (overridingValidationMessage) {
    return [{ valid: false, badInput: true }, overridingValidationMessage, anchor];
  }
  return [{ valid: true }, "", anchor];
}

//
function exposeValidity(
  sourceInputs,
  targetElement,
  cause,
  overridingValidationMessage
) {
  const [validity, message, anchor] = getValidity(
    sourceInputs,
    cause,
    overridingValidationMessage
  );
  // console.log(`Validity on "${targetElement.name}":`, validity.valid, message);
  targetElement[INTERNALS_SLOT].setValidity(validity, message, anchor);
}

// TODO: Update validity
export function value() {
  return function valueDecorator(target, context) {
    const { init, get, set } = attr(string(), { reflective: false })(target, context);
    context.addInitializer(function() {
      listen(this, "formReset", () => {
        // TODO: React to resets
      });
    });
    return {
      init,
      get,
      set(value) {
        set.call(this, value);
        this[INTERNALS_SLOT].setFormValue(context.access.get(this));
      }
    }
  };
}

export function formElement(options) {
  if (typeof options.source !== "string") {
    throw new Error("Missing a selector for the source element");
  }
  return function(Target) {
    return class FormMixin extends Target {
      // Required for form elements
      static formAssociated = true;

      // A form element can be disabled by setting the disabled attribute on the
      // element itself or by setting it on one of its ancestor fieldset
      // elements. The IDL attribute "disabled" just reflects the content
      // attribute so we need an extra field for the actual disabled state. This
      // in turn must (for now) be a decorated accessor to cause render updates
      // whenever it changes its value.
      @prop(bool())
      accessor [DISABLED_STATE_SLOT] = false;

      // Captures formDisabled lifecycle reactions to update the formDisabled
      // state and the derived overall disabled state.
      #formDisabled = false;
      @formDisabled()
      setFormDisabled(newState) {
        this.#formDisabled = newState;
        this[DISABLED_STATE_SLOT] = this.#formDisabled || this.attrDisabled;
      }

      // Boolean content attribute "disabled". Because this is just ONE input
      // into the overall disabled state, it gets a private backend so that we
      // can overload the relevant getters and setters.
      @attr(bool(), { as: "disabled" })
      accessor #attrDisabled = false;

      // Public setter for the IDL attribute "disabled", which also updates the
      // overall disabled state
      set disabled(value) {
        this.#attrDisabled = Boolean(value);
        this[DISABLED_STATE_SLOT] = this.#formDisabled || this.#attrDisabled;
      }

      // Public setter for the IDL attribute "disabled", which need to reflect
      // ONLY the content attribute's state.
      get disabled() {
        return this.#attrDisabled;
      }

      //
      @value() accessor value = "";

      //
      @attr(string()) accessor name = "";

      //
      get shadowRootInit() {
        return { mode: "open", delegatesFocus: true };
      }


      @reactive({ excludeKeys: ["value"] })
      @capture("input", options.source, options.validate)
      exposeInternals(evt) {
        console.log("Capture", evt?.target?.value);
        const source = this[SHADOW_ROOT_SLOT].querySelector(options.source);
        const newValue = (source.type === "checkbox" && !source.checked)
          ? new FormData() // unset form value for unchecking checkboxes etc.
          : source.value; // get actual value
        this.value = newValue;
        /*
        exposeValidity(
          this[SHADOW_ROOT].querySelectorAll(options.validate ?? options.source),
          this,
          evt,
          externalValidationMessage,
        );
        */
      };

      get form() {
        return this[INTERNALS_SLOT].form;
      }

      get willValidate() {
        return this[INTERNALS_SLOT].willValidate;
      }

      get validity() {
        return this[INTERNALS_SLOT].validity;
      }

      checkValidity() {
        return this[INTERNALS_SLOT].checkValidity();
      }

      reportValidity() {
        return this[INTERNALS_SLOT].reportValidity();
      }
    }
    return FormMixin;
  };
}
