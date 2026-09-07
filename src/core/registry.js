const registries = new WeakMap();
let sequence = 0;

/** A serializable ID, suitable for Rails data attributes as well as JavaScript. */
export function createComponentId(prefix = "sheets") { return `${prefix}-${++sequence}`; }

export function registryFor(doc) {
  if (!registries.has(doc)) registries.set(doc, { components: new Map(), outlets: new Set(), islands: new Set(), overlays: new Set(), focusTargets: new Set() });
  return registries.get(doc);
}

export function register(instance, kind, id) {
  const registry = registryFor(instance.doc);
  instance.componentId = id || instance.root.id || createComponentId(kind);
  if (registry.components.has(instance.componentId)) throw new Error(`Duplicate componentId: ${instance.componentId}`);
  instance.root.dataset[`${kind}Component`] = instance.componentId;
  registry.components.set(instance.componentId, instance);
  return () => {
    if (registry.components.get(instance.componentId) === instance) registry.components.delete(instance.componentId);
    delete instance.root.dataset[`${kind}Component`];
  };
}

export function resolveComponent(doc, reference, element, kind = "sheet") {
  if (reference && reference !== "closest") return typeof reference === "string" ? registryFor(doc).components.get(reference) : reference;
  const attribute = kind.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  const root = element?.closest(`[data-${attribute}-component]`);
  return root && registryFor(doc).components.get(root.dataset[`${kind}Component`]);
}

export function getElement(doc, value, fallback) {
  return typeof value === "function" ? value() : typeof value === "string" ? doc.querySelector(value) : value || fallback;
}

/** Cancellable behavior hooks share one shape across sheets, scrolling and triggers. */
export function behavior(target, name, handler, defaults, nativeEvent = null, detail = {}) {
  const values = { ...defaults };
  const event = { ...detail, ...values, nativeEvent, changeDefault(changes) { Object.assign(values, changes); Object.assign(event, changes); } };
  if (typeof handler === "function") handler(event);
  else if (handler) event.changeDefault(handler);
  const win = target.ownerDocument.defaultView;
  target.dispatchEvent(new win.CustomEvent(name, { bubbles: true, detail: event }));
  return values;
}

export function jsonAttribute(element, name, fallback) {
  const value = element.getAttribute(name);
  if (value == null || value === "") return fallback;
  try { return JSON.parse(value); } catch { return value; }
}
