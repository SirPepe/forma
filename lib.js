import { subscribe } from "@sirpepe/ornament";
import { SHADOW_ROOT_SLOT } from "./symbols";

//
export function capture(eventNames, ...selectors) {
  return subscribe(
    (instance) => instance[SHADOW_ROOT_SLOT],
    eventNames,
    {
      capture: true,
      predicate: (evt) => selectors.some((s) => evt.target?.matches?.(s)),
    },
  );
}

export function fail(message = "", Ctor = Error) {
  throw new Ctor(message);
}

const nope = () => fail("Illegal Operation");

export function createReadonlyProxy(obj, redirectMap) {
  return new Proxy(obj, {
    apply: nope,
    construct: nope,
    defineProperty: nope,
    deleteProperty: nope,
    get(target, property) {
      if (redirectMap && property in redirectMap) {
        property = redirectMap[property];
      }
      const result = Reflect.get(target, property)
      if (result !== null && typeof result === "object") {
        return createReadonlyProxy(result, null);
      }
      return result;
    },
    getOwnPropertyDescriptor(target, property) {
      if (redirectMap && property in redirectMap) {
        property = redirectMap[property];
      }
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
    getPrototypeOf: nope,
    has: nope,
    isExtensible: nope,
    ownKeys: nope,
    preventExtensions: nope,
    set: nope,
    setPrototypeOf: nope,
  });
}
