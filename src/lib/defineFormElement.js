import {
  prop,
  attr,
  bool,
  string,
  formDisabled,
  listen,
  subscribe,
  formReset,
  trigger,
  define,
} from "@sirpepe/ornament";
export * from "@sirpepe/ornament";

const INTERNALS_MAP = new WeakMap();

const defaultOptions = {
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

// Lore = Data + some extra features
export class FormLore extends FormData {
  static fromEntries(entries = []) {
    const instance = new FormLore();
    for (const [key, value] of entries) {
      instance.append(key, value);
    }
    return instance;
  }
}

function type(x) {
  if (x === null) {
    return "null";
  }
  if (typeof x === "object") {
    return Object.prototype.toString.call(x).slice(1, -1);
  }
  return typeof x;
}

function assertFormState(input, description = "form state") {
  if (
    !(input instanceof File) &&
    !(input instanceof FormData) &&
    typeof input !== "string"
  ) {
    throw new TypeError(
      `Expected ${description} to be File, FormData, or string, but got ${type(input)}`,
    );
  }
}

// Symbol for the method that serializes a value state to a submission state.
// Publicly accessible as a property on the @formElement decorator function.
const VALUE_STATE_TO_SUBMISSION_STATE = Symbol();

// Symbol for the method that deserializes a submission state to a value state.
// Publicly accessible as a property on the @formElement decorator function.
const SUBMISSION_STATE_TO_VALUE_STATE = Symbol();

// Symbol for the method that serializes a value state to an attribute value.
// Used to define the IDL attribute getter. Publicly accessible as a property on
// the @formElement decorator function.
const VALUE_STATE_TO_ATTRIBUTE_VALUE = Symbol();

// Symbol for the method that deserializes an attribute value to a value state.
// Used to define the IDL attribute getter. Publicly accessible as a property on
// the @formElement decorator function.
const ATTRIBUTE_VALUE_TO_VALUE_STATE = Symbol();

// Decorator for turning custom elements into form elements
export function defineFormElement(tagName, options = defaultOptions) {
  return function (target) {
    @define(tagName)
    class FormMixin extends target {
      // The main idea behind this decorator is that custom form elements are
      // small nested forms, which may or may not have additional logic (for eg.
      // submit value serialization) attached to them. Therefore the shadow DOM
      // must always contain a form element, which this getter makes easily
      // accessible.
      get #innerForm() {
        return options.getElementInternals(this).shadowRoot.querySelector("form");
      }

      // Only true when the element has been interacted with by the user since
      // the form was created or reset. When true, changes to the content
      // attribute "value" must update the IDL attribute "value" as well as the
      // form value.
      // see https://html.spec.whatwg.org/#the-input-element:concept-fe-dirty
      #DIRTY_VALUE_FLAG = false;

      // An update cycle works as follows:
      // 1. a new valueState is computed or entered by users
      // 2. #nextValueState is set to the new value state and a prop event gets
      //    dispatched. This allows form rendering to update in a reactive
      //    fashion.
      // 3. the actual form state (eg. what's visible to the element's form) is
      //    set afterwards to reflect the updated state.
      #nextValueState = new FormData();

      // Composes a validity state from one or more source inputs and a possible
      // overriding validation message.
      #composeValidity() {
        // Depending on how rendering is implemented, an inner form may not be
        // available when this method is first called.
        if (!this.#innerForm) {
          return [{}, "", undefined];
        }
        for (const sourceInput of this.#innerForm.elements) {
          if (!sourceInput.validity.valid) {
            const anchor = sourceInput.isConnected ? sourceInput : undefined;
            return [
              sourceInput.validity,
              sourceInput.validationMessage ?? "",
              anchor,
            ];
          }
        }
        return [{}, "", undefined];
      }

      // Useful when rendering shadow DOM
      get valueState() {
        return this.#nextValueState;
      }

      // The inner form can technically be submitted by itself, eg. if the user
      // hits enter while an input element is focussed. The following turns
      // nested form submission into submitting the element's form owner.
      @subscribe((el) => options.getElementInternals(el).shadowRoot, "submit")
      handleInnerSubmit(evt) {
        evt.preventDefault();
        if (this.form?.reportValidity()) {
          this.form?.submit();
        }
      }

      // Input value change detection. Whenever something in the shadow root
      // receives new input, the form value for this elements gets an update.
      @subscribe((el) => options.getElementInternals(el).shadowRoot, "input")
      handleInnerInputEvents(evt) {
        console.groupCollapsed(
          `Input event on <${evt.target.tagName.toLowerCase()} name="${evt.target.name}">`,
        );
        this.#runUpdateCycle();
        this.#DIRTY_VALUE_FLAG = true;
        console.groupEnd();
      }

      // Form resets must reset the value (possibly falling back to the content
      // attribute, if it exists) and reset the dirty flag.
      @formReset()
      handleFormReset() {
        console.groupCollapsed(`Form reset`);
        const valueState = this[SUBMISSION_STATE_TO_VALUE_STATE](
          this.getAttribute("value"),
        );
        this.#runUpdateCycle(valueState);
        this.#DIRTY_VALUE_FLAG = false;
      }

      // The initial form state needs to be set as soon as the element's inner
      // DOM initializes. Because this uses ornament to render shadow DOM, the
      // right moment for this is when the init event gets dispatched (that is,
      // right after the constructor has returned).
      constructor() {
        super();
        listen(this, "init", () => {
          console.groupCollapsed(`Component ${target.name} init`);
          console.log("Copying initial form state");
          this.#runUpdateCycle();
          console.groupEnd();
        });
      }

      // Internal value state getter. Uses the entire inner form state as this
      // input's value state. If this getter is used before a form has been
      // rendered, #innerForm may be undefined, which needs to be handled.
      get #currentValueState() {
        if (this.#innerForm) {
          return new FormData(this.#innerForm);
        }
        return new FormData();
      }

      // Serialize internal value state to attribute value. Used to create the
      // value IDL getter's value. For consistency's sake, this must return a
      // string or null (which is turned into an empty string).
      [VALUE_STATE_TO_ATTRIBUTE_VALUE](valueState) {
        // Defer to base class implementation, if available
        if (VALUE_STATE_TO_ATTRIBUTE_VALUE in target.prototype) {
          const attributeValue =
            super[VALUE_STATE_TO_ATTRIBUTE_VALUE](valueState) ?? "";
          if (typeof attributeValue !== "string") {
            throw new TypeError(
              `Expected attribute value to be a string, but got ${type(attributeValue)}`,
            );
          }
          return attributeValue;
        }
        // Default: stringify the first entry in the value state
        return String(valueState.entries().next().value?.[1] ?? "");
      }

      // Deserialize attribute value to internal value state.
      [ATTRIBUTE_VALUE_TO_VALUE_STATE](attributeValue) {
        // Defer to base class implementation, if available
        if (ATTRIBUTE_VALUE_TO_VALUE_STATE in target.prototype) {
          const valueState =
            super[ATTRIBUTE_VALUE_TO_VALUE_STATE](attributeValue) ??
            new FormData();
          assertFormState(valueState);
          return valueState;
        }
        // Default: use as the first entry in the value state, with the first
        // form-associated element's name as the key.
        const valueState = new FormData();
        valueState.set(this.#innerForm.elements[0].name, attributeValue);
        return valueState;
      }

      // Internal value state serializer.
      [VALUE_STATE_TO_SUBMISSION_STATE](valueState) {
        // Defer to base class implementation, if available
        if (VALUE_STATE_TO_SUBMISSION_STATE in target.prototype) {
          const submissionState = super[VALUE_STATE_TO_SUBMISSION_STATE](
            valueState,
          );
          assertFormState(submissionState, "submission state");
          return submissionState;
        }
        // Default: stringify the first entry in the value state
        return String(valueState.entries().next().value?.[1] ?? "");
      }

      // Internal value state deserializer
      [SUBMISSION_STATE_TO_VALUE_STATE](submissionState) {
        // Defer to base class implementation, if available
        if (SUBMISSION_STATE_TO_VALUE_STATE in target.prototype) {
          const valueState =
            super[SUBMISSION_STATE_TO_VALUE_STATE](submissionState) ??
            new FormData();
          assertFormState(valueState, "value state");
          return valueState;
        }
        // Default: use as the first entry in the value state, with the first
        // form-associated element's name as the key.
        const valueState = new FormData();
        valueState.set(this.#innerForm.elements[0].name, submissionState);
        return valueState;
      }

      // Actually sets the form state and takes care of validation
      #runUpdateCycle(valueState = this.#currentValueState ?? new FormData()) {
        console.groupCollapsed("Update cycle");
        console.log("New value state:", valueState);
        // Set the form value for the next re-render
        this.#nextValueState = valueState;
        // Trigger re-renders
        console.log("Trigger view update");
        trigger(this, "prop", "@formValue", valueState);
        // Update externally-visible validation state and form value
        const submissionState =
          this[VALUE_STATE_TO_SUBMISSION_STATE](valueState);
        console.log("Compute submission state", submissionState);
        const internals = options.getElementInternals(this);
        console.log("Set value state, submission state, and validity");
        internals.setFormValue(submissionState, valueState);
        const [validity, message, anchor] = this.#composeValidity();
        internals.setValidity(validity, message, anchor);
        console.groupEnd();
      }

      // The content attribute "value" gets a manual implementation because it
      // is too dissimilar from what @attr() usually does to benefit from what
      // Ornament can provide.
      static get observedAttributes() {
        return ["value"];
      }

      // Only for the "value" content attribute
      attributeChangedCallback(name, _, newValue) {
        // Only handle "value"
        if (name !== "value") {
          return;
        }
        console.groupCollapsed("Update to content attribute 'value'");
        // Do nothing if the dirty flag is set - user inputs have priority
        if (this.#DIRTY_VALUE_FLAG) {
          console.info("Ignore, dirty flag is true");
          console.groupEnd();
          return;
        }
        console.log("Attribute value:", newValue);
        const valueState = newValue
          ? this[SUBMISSION_STATE_TO_VALUE_STATE](newValue)
          : this.#currentValueState;
        console.log("Value state:", valueState);
        this.#runUpdateCycle(valueState);
        console.groupEnd();
      }

      // This assumes that the value IDL attribute should return the submission
      // state. Maybe this should be configurable.
      get value() {
        return this[VALUE_STATE_TO_ATTRIBUTE_VALUE](this.#currentValueState);
      }

      // This assumes that the value IDL attribute should work with submission
      // states. Maybe this should be configurable.
      set value(newAttributeValue) {
        console.groupCollapsed("Update to IDL attribute 'value'");
        this.#DIRTY_VALUE_FLAG = true;
        const valueState =
          this[ATTRIBUTE_VALUE_TO_VALUE_STATE](newAttributeValue);
        this.#runUpdateCycle(valueState);
        console.groupEnd();
      }

      // Expose the current "default value" (content attribute "value") as an
      // IDL attribute
      get defaultValue() {
        return this.getAttribute("value");
      }

      set defaultValue(value) {
        return this.setAttribute("value", String(value));
      }

      // Required for all form elements
      static formAssociated = true;

      // All form-associated elements with the exception of <img> have an IDL
      // attribute type - even <textarea> and <select>! This enables authors to
      // distinguish form controls by a single common property and to keep this
      // working, custom form controls should also support this. The following
      // is just a default implementation that every form element can override
      // when needed.
      get type() {
        return this.tagName.toLowerCase();
      }

      // Any respectable form element needs a name content attribute
      @attr(string())
      accessor name = "";

      // Any respectable form element can have its mutability state revoked
      @attr(bool(), { as: "readonly" })
      accessor readOnly = false;

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
      // state and the derived overall disabled state. This lifecycle callback
      // fires also when the element is moved into or out of a disabled fieldset
      // ancestor, not just when an already-existing ancestor get enabled or
      // disabled.
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

      // Public getter for the IDL attribute "disabled", which must only reflect
      // the content attribute's state.
      get disabled() {
        return this.#attrDisabled;
      }

      // The actual "disabled" state composed from the IDL attribute and the
      // formDisabled state. This is a non-standard API extension.
      get disabledState() {
        return this.#disabledState;
      }

      // This is actually just a getter, with the content attribute "form"
      // working implicitly
      get form() {
        return options.getElementInternals(this).form;
      }

      get labels() {
        return options.getElementInternals(this).labels;
      }

      get willValidate() {
        return options.getElementInternals(this).willValidate;
      }

      get validity() {
        return options.getElementInternals(this).validity;
      }

      get validationMessage() {
        return options.getElementInternals(this)
          .validationMessage;
      }

      checkValidity() {
        return options.getElementInternals(this).checkValidity();
      }

      reportValidity() {
        return options.getElementInternals(
          this,
        ).reportValidity();
      }

      setCustomValidity(message) {
        return options.getElementInternals(this).setValidity(
          { customError: true },
          message,
        );
      }
    }
    return FormMixin;
  };
}

defineFormElement.VALUE_STATE_TO_SUBMISSION_STATE =
  VALUE_STATE_TO_SUBMISSION_STATE;
defineFormElement.SUBMISSION_STATE_TO_VALUE_STATE =
  SUBMISSION_STATE_TO_VALUE_STATE;
defineFormElement.VALUE_STATE_TO_ATTRIBUTE_VALUE =
  VALUE_STATE_TO_ATTRIBUTE_VALUE;
defineFormElement.ATTRIBUTE_VALUE_TO_VALUE_STATE =
  ATTRIBUTE_VALUE_TO_VALUE_STATE;
