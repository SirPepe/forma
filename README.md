# forma

A slightly unhinged approach to **custom form-associated elements** (specifically inputs) based upon [@sirpepe/ornament](https://www.npmjs.com/package/@sirpepe/ornament). Assuming that you intend to _build a new form control by abstracting over existing form controls_ (eg. to constrain an `<input type="number">` to integers, to build a bad `YYYY-MM-DD` date picker from three `<select>`, or simply to attach some CSS for your UI library) while _using shadow DOM_ it works like this:

1. Build your basic custom form control (class, lifecycle handling, attributes) with [@sirpepe/ornament](https://www.npmjs.com/package/@sirpepe/ornament)
2. Place all the form-associated elements that you use to compose your custom form control in a `<form>` element in the shadow tree with `novalidate` set to true. Use whatever client-side rendering technology you prefer.
3. Apply the `@forma()` decorator to the component class. This automagically adds _all_ public behaviors that form controls need (getters, setters, constraint validation) and sets up the data flow explained in the flowchart below
4. Augment your class with a few data transformation methods as needed. A form control can submit strings, Blobs or FormData (= multiple strings and/or blobs), but its `value` content attribute can only be a string, while its `value` IDL attribute can be anything. **This library turns your inner form element into an internal FormData change on every change** from which you can derive the every other value... and the other way around works too

Forma's main insight is that transforming a form controls' various states to/from FormData is a useful generalization that requires the component authors to only build a form and provide some data transformation functions.

The following table describes the available data transformations. Note that the term _"value state"_ refers to the internal FormData object that gets built from the inner form element and represents the form control's state:

| Data transformation             | Use case                                                                                | Signature                                                    | Default                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| VALUE_STATE_TO_SUBMISSION_STATE | Derive the submission state from the value state                                        | `(valueState: FormData) => FormData \| string  \| Blob`      | Stringifies the first entry in the value state                                                                                                   |
| SUBMISSION_STATE_TO_VALUE_STATE | Derive a value state from a submission state (eg. for form resets)                      | `(submissionState: FormData \| string  \| Blob) => FormData` | Use the submission state as the first entry in the value state, with the nested form's first first form-associated descendant's name as the key. |
| VALUE_STATE_TO_ATTRIBUTE_VALUE  | Serialize a value state to an attribute value                                           | `(valueState: FormData) => string \| null`                   | Stringifies the first entry in the value state                                                                                                   |
| ATTRIBUTE_VALUE_TO_VALUE_STATE  | Derive a value state from an attribute value (eg. getter and content attribute `value`) | `(attributeValue: string  \| null) => FormData`              | Use the attribute value as the first entry in the value state, with the nested form's first first form-associated descendant's name as the key.  |

![forma explained as a flowchart](https://github.com/SirPepe/forma/raw/main/form-flow-simplified.png)

This process works thanks to the following assumptions/conventions:

1. `<form>` elements can always be serialized to FormData (this is guaranteed by web standards)
2. FormData can be converted into the appropriate data for form submission, resets, and attribute handling (this is the component author's job)
3. Given a FormData object, the inner form can be kept in sync by looping over the form data's entries and updating the matching elements in the inner form, going by name and/or order (this requires the component's shadow DOM to be largely static)

An example using preact:

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
  // reasonable defaults covering many simple use cases (such as most of this).
  // ATTRIBUTE_VALUE_TO_VALUE_STATE only needs defining because it needs to
  // apply parseInt to its input, rather than just stringifying it.
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

Check out more examples in `demo/components`!

## List of automatically provided form control behaviors

Forma aims to make custom form-associated elements behave _identical_ to built in form controls and therefore implements _every_ API and behavior of standard form controls:

- Accessors **`value`** and **`defaultValue`**
- Getters **`type`**, **`form`**, **`labels`**, **`willValidate`**, **`validity`**, **`validationMessage`**
- Content attributes **`name`**, **`required`**, **`disabled`**, and **`readonly`** with matching accessors **`name`**, **`required`**, **`disabled`**, and **`readOnly`**
- Methods **`checkValidity`**, **`reportValidity`**, **`setCustomValidity`**
- **Always-synchronized state** between the inner form, and the host element value state, submission state, and attribute values
- **Constraint validity paricipation** via composing a validity state from the inner form's elements
- [**Dirty state tracking**](https://html.spec.whatwg.org/#concept-fe-dirty) to properly handle the effects of updating the content attribute `value`
- **Disabled state handling** based on the form control's own `disabled` attribute _and_ [the `disabled` state of `<fieldset>` ancestors](https://html.spec.whatwg.org/#enabling-and-disabling-form-controls:-the-disabled-attribute)

## API summary

| API                                     | Description                                                                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `@forma()`                              | **Class decorator** for form control components                                                                                                 |
| `forma.VALUE_STATE_TO_SUBMISSION_STATE` | **Symbol**; name for a data transformation method                                                                                               |
| `forma.SUBMISSION_STATE_TO_VALUE_STATE` | **Symbol**; name for a data transformation method                                                                                               |
| `forma.VALUE_STATE_TO_ATTRIBUTE_VALUE`  | **Symbol**; name for a data transformation method                                                                                               |
| `forma.ATTRIBUTE_VALUE_TO_VALUE_STATE`  | **Symbol**; name for a data transformation method                                                                                               |
| `forma.VALUE_STATE`                     | **Symbol**; name for a private API that allows access to the form control's value state                                                         |
| `forma.DISABLED_STATE`                  | **Symbol**; name for a private API that allows access to the form control's disabled state (taking ancestor `<fieldset>` elements into account) |

## Caveats

0. This is more of an ongoing experiment, than a finished piece of software.
1. If you don't explicitly need an convention-based way to ease the process of writing form-associated custom elements, than this is probably not the library for you
2. HTML dislikes nested forms (even when separated by shadow DOM boundaries) to such an extent the compliant parsers ([not Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=1877971)) remove nested form tags in their entirety. Therefore `myShadowRoot.innerHTML = "<form>...</form>""` won't fly for this approach, while any client-side rendering technology that relies on the DOM without invoking the browser's HTML parser in a context-aware fashion works fine. Use Preact, uhtml, whatever.
3. Be aware that your inner form controls value states will be handled by the library. Better not to touch them!
4. textarea-like form controls (where the value is provided by the content between the tags) are currently not supported

## Troubleshooting

### Uncaught TypeError: can't access private field or method: object is not the right class

Depending on when your first render the form, the mixin class may not yet have finished setup. Ensure that the order of decorators is as follows:

```js
@define("my-component")
@forma()
class MyComponent extends HTMLElement {}
```
