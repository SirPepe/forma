# forma

Decorators for composing form-associated custom elements from existing elements.

## Troubleshooting

### Uncaught TypeError: can't access private field or method: object is not the right class

Depending on when your first render the form, the mixin class may not yet have finished setup. Ensure that the order of decorators is as follows:

```js
@define("my-component")
@forma()
class MyComponent extends HTMLElement {}
```
