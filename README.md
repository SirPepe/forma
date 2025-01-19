# forma

A slightly unhinged approach to **custom form-associated elements** based upon [@sirpepe/ornament](https://www.npmjs.com/package/@sirpepe/ornament). An example using preact:

```js
// Wrapper component over a native input. Useful for pattern libraries or simple
// abstractions over exiting elements, like this input for integers built on top
// of a regular input[type=number]. The component only fixes some attributes of
// the native input (step, type) and exposes other attributes (min, max) through
// the abstraction. This results in a proper form-associated custom element with
// all form APIs, automatic internal state management (dirty flag for value,
// disabled state, form reset etc.), form validation and everything else.

import { define, reactive, connected, attr, int } from "@sirpepe/ornament";
import { render } from "preact";
import { forma } from "./forma.js";

@define("integer-input") // Component registration
@forma() // Form decorator
export class IntegerInput extends HTMLElement {
  #shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });

  // Regular content attributes, defined via Ornament. These are the public API
  // for this element, plus all regular form APIs which get injected by the
  // @forma() decorator
  @attr(int({ nullable: true })) accessor min = null;
  @attr(int({ nullable: true })) accessor max = null;

  // This is the unhinged part: the element(s) that we abstract over live inside
  // a _nested form_ in the shadow DOM. The Idea behind that is that forms, not
  // matter how simple or complicated can be serialized to FormData, which can
  // in turn be turned into the value state and/or submission states that
  // form-associated elements must express. The element's overall validation
  // state can also be composed form the elements that make up the inner form.
  // "change" events on nested form elements are intercepted and trigger
  // re-computation if the elements value, submission and validity states.
  // The process of composing the value and submission state from the inner form
  // can run in reverse if the element's value state is changed eg. via JS.
  @connected()
  @reactive()
  render() {
    render(
      <form noValidate={true}>
        <input
          name="input"
          step="1"
          type="number"
          min={this.min ?? ""}
          max={this.max ?? ""}
          value={this[forma.VALUE_STATE].get("input")}
          defaultValue={this.defaultValue}
          readOnly={this.readonly}
          disabled={this[forma.DISABLED_STATE]}
          required={this.required}
        />
      </form>,
      this.#shadow,
    );
  }

  // Describes how to map attribute values (as in content attribute values) to
  // FormData (or subclasses thereof) objects. For more complex use cases, up to
  // for different serialization/deserialization methods can be defined, with
  // reasonable defaults covering many simple use cases (such as most of this):
  // VALUE_STATE_TO_SUBMISSION_STATE
  // SUBMISSION_STATE_TO_VALUE_STATE
  // VALUE_STATE_TO_ATTRIBUTE_VALUE
  // ATTRIBUTE_VALUE_TO_VALUE_STATE
  [forma.ATTRIBUTE_VALUE_TO_VALUE_STATE](value) {
    const fd = new FormData();
    fd.append("input", Number.parseInt(value, 10) || 0);
    return fd;
  }
}

// That's it! <integer-input> is now available as a full-blown form-associated
// custom element with support for all APIs that one expects from form controls.
// The element is submittable, can be programmed using JS like any other input,
// participates in constraint validation, supports attributes such as `name` and
// `required`, has proper dirty state tracking, and can be be implemented in
// whatever way you like, as long as the element has an inner form and a few
// data transformation methods.
```

In plain english:

1. Build your custom form input's shadow DOM (with whatever client-side rendering technology you prefer). Place all the form-associated elements that you use to compose your custom form control inside an inner form element with `novalidate` set to true.
2. Apply the `@forma()` decorator to the component class.
3. Add a few data transformation methods as needed.

Or as a flowchart:

![forma explained as a flowchart](https://github.com/SirPepe/forma/raw/main/form-flow-simplified.png)

Checkout the examples in `demo/components`!

## Caveats

0. This is an ongoing experiment, not a finished piece of software
1. HTML dislikes nested forms (even when separated by shadow DOM boundaries) to such an extent the compliant parsers remove nested form tags in their entirety. Therefore `myShadowRoot.innerHTML = \`\<form\>...\</form\>\`` won't fly for this approach, while any client-side rendering technology that relies on the DOM without invoking the browser's HTML parser in a context-aware fashion works fine.
2. Inner forms should probably not change the number or names of inner form controls

## Troubleshooting

### Uncaught TypeError: can't access private field or method: object is not the right class

Depending on when your first render the form, the mixin class may not yet have finished setup. Ensure that the order of decorators is as follows:

```js
@define("my-component")
@forma()
class MyComponent extends HTMLElement {}
```
