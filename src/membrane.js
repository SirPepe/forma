import { prop, attr, bool, string, formDisabled, listen } from "@sirpepe/ornament";
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
  return [{ valid: true }, "", undefined];
}

function setFormState(options, element, newValue) {
  const internals = globalThis[CONFIG_KEY].getElementInternals(element);
  internals.setFormValue(newValue);
  const sourceElements = internals.shadowRoot.querySelectorAll(options.source);
  const [validity, message, anchor] = composeValidity(sourceElements);
  internals.setValidity(validity, message, anchor);
}

const DIRTY_VALUE_FLAG = Symbol();
const VALUE_CONTENT_ATTRIBUTE = Symbol();

function value(options) {
  return function (target, context) {
    const decorator = prop(string())(target, context);
    context.addInitializer(function() {
      // React to updates to the content attribute "value" while the dirty flag
      // is false
      listen(this, "prop", (name) => {
        if (!this[DIRTY_VALUE_FLAG] && name === VALUE_CONTENT_ATTRIBUTE) {
          decorator.set.call(this, this[VALUE_CONTENT_ATTRIBUTE]);
          setFormState(options, this, context.access.get(this));
        }
      });
      // React to form resets by using the content attribute "value" as the
      // value and unsetting the dirty flag
      listen(this, "formReset", () => {
        decorator.set.call(this, this[VALUE_CONTENT_ATTRIBUTE]);
        this[DIRTY_VALUE_FLAG] = false;
        setFormState(options, this, context.access.get(this));
      });
      // Copy form state on shadow root instantiation
      listen(this, "init", () => {
        const source = globalThis[CONFIG_KEY]
          .getElementInternals(this)
          .shadowRoot
          .querySelectorAll(options.source);
        setFormState(options, this, source.value);
      });
      // Handle user inputs
      globalThis[CONFIG_KEY]
        .getElementInternals(this)
        .shadowRoot
        .addEventListener("input", (evt) => {
          decorator.set.call(this, evt.target.value);
          this[DIRTY_VALUE_FLAG] = true;
          setFormState(options, this, context.access.get(this));
        });
    });
    // Augmented prop decorator with special provisions for keeping the dirty
    // flag and the form value up to date.
    return {
      // Sets the initial form value
      init(defaultValue) {
        const initialValue = decorator.init.call(this, defaultValue);
        setFormState(options, this, initialValue);
        return initialValue;
      },
      // Keeps the form value and the dirty flag up to date on setter
      // invocations.
      set(newValue) {
        decorator.set.call(this, newValue);
        this[DIRTY_VALUE_FLAG] = true;
        setFormState(options, this, context.access.get(this));
      },
      // The getter can remain unchanged
      get: decorator.get,
    };
  }
}

// Decorator for turning custom elements into form elements
export function formElement(options = {}) {
  options.source ??= "input, select, textarea";
  if (typeof options.source !== "string") {
    throw new Error("Missing a selector for the source element");
  }
  return function(Target) {
    return class FormMixin extends Target {
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

      // Only true when the element hast been interacted with by the user since
      // the form was created or reset. When true, changes to the content
      // attribute "value" must update the IDL attribute "value" as well as the
      // form value. Stored behind a symbol because this state must be shared
      // with the @value decorator.
      // see https://html.spec.whatwg.org/#the-input-element:concept-fe-dirty
      [DIRTY_VALUE_FLAG] = false;

      // Keeps track of the current content attribute "value". This value is
      // only really important when a form resets or when the content attribute
      // gets updated while the dirty state is false. It is really only one of
      // multiple inputs to the (actual) "value" IDL property/form value. Stored
      // behind a symbol because this state must be shared with the @value
      // decorator.
      @attr(string(), { as: "value" })
      accessor [VALUE_CONTENT_ATTRIBUTE] = "";

      // Tie value input sources together with a custom @prop
      @value(options)
      accessor value = this[VALUE_CONTENT_ATTRIBUTE];

      // Expose the current default value as a readonly IDL attribute for
      // completeness' sake (a la React)
      get defaultValue() {
        return this[VALUE_CONTENT_ATTRIBUTE];
      }

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

      // Public setter for the IDL attribute "disabled", which need to reflect
      // ONLY the content attribute's state.
      get disabled() {
        return this.#attrDisabled;
      }

      // The actual "disabled" state composed from the IDL attribute and the
      // formDisabled state.
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
