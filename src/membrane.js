import { prop, attr, bool, string, formDisabled, listen, trigger, NO_VALUE } from "@sirpepe/ornament";
export * from "@sirpepe/ornament";

const CONFIG_KEY = Symbol();

const INTERNALS_MAP = new WeakMap();

const defaultConfig = {
  getElementInternals(element) {
    let internals = INTERNALS_MAP.get(element);
    if (internals) {
      return internals;
    }
    internals = element.attachInternals();
    INTERNALS_MAP.set(element, internals);
    return internals;
  },
};

globalThis[CONFIG_KEY] ||= Object.create(defaultConfig);

// Allow elements to specify how the form decorator can access element internals
export const configure = {
  getElementInternals(fn) {
    globalThis[CONFIG_KEY].getElementInternals = fn;
  },
}

// Composes a validity state from one or more source inputs and a possible
// overriding validation message. The cause (an Event) may or may not exist, and
// may or may not have a target.
function composeValidity(sourceInputs) {
  for (const sourceInput of sourceInputs) {
    if (!sourceInput.validity.valid) {
      const anchor = sourceInput.isConnected ? sourceInput : undefined;
      return [
        sourceInput.validity,
        sourceInput.validationMessage ?? "",
        anchor
      ];
    }
  }
  return [{}, "", undefined];
}

function isFormValue(input) {
  return (
    input instanceof File ||
    input instanceof FormData ||
    typeof input === "string"
  );
}

// Symbol for the getter that returns the current value state. Defaults to
// grabbing the value of the first form-associated element in the shadow DOM.
// Publicly accessible as a property on the @formElement decorator function.
const CURRENT_VALUE_STATE = Symbol();

// Default implementation for CURRENT_VALUE_STATE
function defaultCurrentValueState(options) {
  const internals = globalThis[CONFIG_KEY].getElementInternals(this);
  return internals.shadowRoot.querySelectorAll(options.source)[0].value;
}

// Symbol for the method that serializes a value state to a submission state.
// Defaults to the identity function. Publicly accessible as a property on the
// @formElement decorator function.
const VALUE_STATE_TO_SUBMISSION_STATE = Symbol();

// Default implementation for VALUE_STATE_TO_SUBMISSION_STATE
function defaultValueStateToSubmissionState(input) {
  return input;
}

// Symbol for the method that deserializes a submission state to a value state.
// Defaults to the identity function. Publicly accessible as a property on the
// @formElement decorator function.
const SUBMISSION_STATE_TO_VALUE_STATE = Symbol();

// Default implementation for SUBMISSION_STATE_TO_VALUE_STATE
function defaultSubmissionStateToValueState(input) {
  return input;
}

// Symbol for the callback that notifies the base class about updates to the
// value state via IDL attribute, content attribute, or lifecycle callback (eg.
// form reset). Defaults to updating the first form-associated element in the
// shadow DOM. Publicly accessible as a property on the @formElement decorator
// function.
const VALUE_STATE_UPDATE_CALLBACK = Symbol();

// Default implementation for VALUE_STATE_UPDATE_CALLBACK
function defaultValueStateUpdateCallback(options, valueState) {
  const internals = globalThis[CONFIG_KEY].getElementInternals(this);
  const submissionValue = this[VALUE_STATE_TO_SUBMISSION_STATE](valueState);
  if (isFormValue(submissionValue)) {
    internals
      .shadowRoot
      .querySelectorAll(options.source)[0]
      .value = submissionValue;
    return true;
  }
  return false;
}

// Decorator for turning custom elements into form elements
export function formElement(options = {}) {
  options.source ??= "input, select, textarea";
  if (typeof options.source !== "string") {
    throw new Error("Missing a selector for the source element");
  }
  return function(Target) {
    return class FormMixin extends Target {
      constructor() {
        super();
        // Input value change detection
        globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .shadowRoot
          .addEventListener("input", () => this.#updateFormState());
        // The initial form state needs to be set once the element initializes.
        // Because this uses ornament to render shadow DOM, the right moment for
        // this is probably when the init event gets dispatched.
        listen(this, "init", () => this.#updateFormState());
        // Form reset
        listen(this, "formReset", () => {
          this[VALUE_STATE_UPDATE_CALLBACK](
            this[SUBMISSION_STATE_TO_VALUE_STATE](this.getAttribute("value"))
          );
          console.log("Form reset", this[CURRENT_VALUE_STATE]);
          this.#updateFormState();
          this.#DIRTY_VALUE_FLAG = false;
        });
      }

      // Internal value state getter, can be overridden by the base class
      get [CURRENT_VALUE_STATE]() {
        if (CURRENT_VALUE_STATE in Target.prototype) {
          return super[CURRENT_VALUE_STATE];
        }
        return defaultCurrentValueState.call(this, options);
      }

      // Internal value state serializer, can be overridden by the base class
      [VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
        if (VALUE_STATE_TO_SUBMISSION_STATE in Target.prototype) {
          const submissionState = super[VALUE_STATE_TO_SUBMISSION_STATE](valueState);
          if (isFormValue(submissionState)) {
            return submissionState;
          }
        }
        return defaultValueStateToSubmissionState.call(this, valueState);
      }

      // Internal value state deserializer, can be overridden by the base class
      [SUBMISSION_STATE_TO_VALUE_STATE](submissionState) {
        if (SUBMISSION_STATE_TO_VALUE_STATE in Target.prototype) {
          return super[SUBMISSION_STATE_TO_VALUE_STATE](submissionState)
        }
        return defaultSubmissionStateToValueState.call(this, submissionState);
      }

      // Internal value state deserializer, can be overridden by the base class
      [VALUE_STATE_UPDATE_CALLBACK](input) {
        if (VALUE_STATE_UPDATE_CALLBACK in Target.prototype) {
          return super[VALUE_STATE_UPDATE_CALLBACK](input)
        }
        return defaultValueStateUpdateCallback.call(this, options, input);
      }

      // Actually sets the form state and takes care of validation
      #updateFormState() {
        let valueState = this[CURRENT_VALUE_STATE];
        console.log("ufs", valueState);
        let submissionState;
        // The CURRENT_VALUE_STATE getter ensures that valueState can only be
        // File, FormData or string
        if (typeof valueState === "object") {
          submissionState = this[VALUE_STATE_TO_SUBMISSION_STATE](valueState);
        } else {
          submissionState = valueState;
          valueState = undefined;
        }
        const internals = globalThis[CONFIG_KEY].getElementInternals(this);
        internals.setFormValue(submissionState, valueState);
        const sourceElements = internals.shadowRoot.querySelectorAll(options.source);
        const [validity, message, anchor] = composeValidity(sourceElements);
        internals.setValidity(validity, message, anchor);
      }

      // Only true when the element has been interacted with by the user since
      // the form was created or reset. When true, changes to the content
      // attribute "value" must update the IDL attribute "value" as well as the
      // form value.
      // see https://html.spec.whatwg.org/#the-input-element:concept-fe-dirty
      #DIRTY_VALUE_FLAG = false;

      // The value content attribute gets a manual implementation because it is
      // too dissimilar from what @attr() usually does to benefit from what
      // Ornament can provide.
      static get observedAttributes() {
        return ["value"];
      }

      // Only for the "value" content attribute
      attributeChangedCallback(name, _, newValue) {
        if (name !== "value" || this.#DIRTY_VALUE_FLAG) {
          return;
        }
        const valueState = newValue
          ? this[SUBMISSION_STATE_TO_VALUE_STATE](newValue)
          : this[CURRENT_VALUE_STATE];
        const performUpdate = this[VALUE_STATE_UPDATE_CALLBACK](valueState);
        if (performUpdate === false) {
          return;
        }
        this.#updateFormState();
      }

      get value() {
        return this[VALUE_STATE_TO_SUBMISSION_STATE].call(this, this[CURRENT_VALUE_STATE]);
      }

      set value(newValue) {
        const acceptUpdate = this[VALUE_STATE_UPDATE_CALLBACK]?.call(
          this,
          this[SUBMISSION_STATE_TO_VALUE_STATE](newValue)
        );
        if (acceptUpdate === false) {
          return;
        }
        this.#DIRTY_VALUE_FLAG = true;
        this.#updateFormState();
      }

      // Expose the current "default value" as a readonly IDL attribute for
      // completeness' sake (a la React)
      get defaultValue() {
        return this[SUBMISSION_STATE_TO_VALUE_STATE].call(this.getAttribute("value"));
      }

      // Required for all form elements
      static formAssociated = true;

      // Any respectable form element needs a name content attribute
      @attr(string())
      accessor name = "";

      // Any respectable form element can have its mutability state revoked
      @attr(bool())
      accessor readonly = false;

      // Any respectable form element can be a required field
      @attr(bool())
      accessor required = false;

      // A form element can be disabled by setting the disabled attribute on the
      // element itself or by setting it on one of its ancestor fieldset
      // elements. The IDL attribute "disabled" just reflects the content
      // attribute so we need an extra field for the actual disabled state. This
      // in turn must (for now) be a decorated accessor to cause render updates
      // whenever it changes its value.
      @prop(bool())
      accessor #disabledState = false;

      // Captures formDisabled lifecycle reactions to update the formDisabled
      // state and the derived overall disabled state.
      #formDisabled = false;
      @formDisabled()
      setFormDisabled(newState) {
        this.#formDisabled = newState;
        this.#disabledState = this.#formDisabled || this.attrDisabled;
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
        this.#disabledState = this.#formDisabled || this.#attrDisabled;
      }

      // Public setter for the IDL attribute "disabled", which must only reflect
      // the content attribute's state.
      get disabled() {
        return this.#attrDisabled;
      }

      // The actual "disabled" state composed from the IDL attribute and the
      // formDisabled state. This is a non-standard API extension.
      get disabledState() {
        return this.#disabledState;
      }

      get labels() {
        return globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .labels;
      }

      get form() {
        return globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .form;
      }

      get willValidate() {
        return globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .willValidate;
      }

      get validity() {
        return globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .validity;
      }

      get validationMessage() {
        return globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .validationMessage;
      }

      checkValidity() {
        return globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .checkValidity();
      }

      reportValidity() {
        return globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .reportValidity();
      }

      setCustomValidity(message) {
        return globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .setValidity({ customError: true }, message);
      }
    }
  };
}

formElement.CURRENT_VALUE_STATE = CURRENT_VALUE_STATE;
formElement.VALUE_STATE_TO_SUBMISSION_STATE = VALUE_STATE_TO_SUBMISSION_STATE;
formElement.SUBMISSION_STATE_TO_VALUE_STATE = SUBMISSION_STATE_TO_VALUE_STATE;
formElement.VALUE_STATE_UPDATE_CALLBACK = VALUE_STATE_UPDATE_CALLBACK;
