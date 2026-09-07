import { lockScroll, unlockScroll } from "../platform/scroll.js";
import { focusable, focusInitial } from "../platform/focus.js";
import { registryFor } from "./registry.js";

const stacks = new WeakMap();
export function stackFor(doc) {
  if (!stacks.has(doc)) stacks.set(doc, new SheetStack(doc));
  return stacks.get(doc);
}

class SheetStack {
  constructor(doc) { this.doc = doc; this.items = []; this.inert = new Map(); this.detected = new Set(); }
  get top() { return this.items.at(-1); }
  get modalIndex() { return this.items.findLastIndex((sheet) => sheet.options.modal); }
  canInteract(sheet) { return this.items.indexOf(sheet) >= this.modalIndex && !this.external().some(overlay => overlay.options.selfManagedInertOutside); }
  external() { return [...registryFor(this.doc).overlays].filter(overlay => overlay.active); }
  islands(sheet = this.items[this.modalIndex] || this.top) {
    return [...this.doc.querySelectorAll("[data-sheet-island]")].filter(element => element.dataset.sheetIslandDisabled !== "true" && (!element.dataset.sheetIslandFor || element.dataset.sheetIslandFor.split(/\s+/).some(id => id === sheet?.componentId || id === sheet?.stackGroup?.componentId)))
      .concat([...registryFor(this.doc).islands].filter(island => island.active && island.matches(sheet)).map(island => island.content));
  }
  externalContents() {
    return [...this.external().map(overlay => overlay.content), ...[...this.detected].filter(element => element.isConnected && element.getClientRects().length)];
  }

  add(sheet) {
    if (this.items.includes(sheet)) return;
    if (!this.items.length) {
      this.abort = new this.doc.defaultView.AbortController();
      this.doc.addEventListener("keydown", (event) => this.keydown(event), { signal: this.abort.signal });
      this.doc.addEventListener("focusin", (event) => this.focusin(event), { signal: this.abort.signal });
      this.doc.addEventListener("click", event => this.click(event), { signal: this.abort.signal, capture: true });
      this.observer = new this.doc.defaultView.MutationObserver(records => {
        for (const record of records) if (record.target === this.doc.body || record.target === this.doc.documentElement) {
          for (const element of record.addedNodes) if (element.nodeType === 1 && !element.matches("script,style,link,[data-sheet-view],[data-sheet-root],[data-sheet-clip-boundary],[data-fixed-component]") && (element.matches('[role="dialog"],[role="alertdialog"],[popover],[data-external-overlay]') || element.querySelector('[role="dialog"],[role="alertdialog"],[popover]'))) this.detected.add(element);
        }
        this.updateInert();
      });
      this.observer.observe(this.doc.body, { childList: true, subtree: true });
    }
    this.items.push(sheet);
    if (sheet.options.lockScroll) lockScroll(this.doc);
    this.update();
  }

  remove(sheet) {
    if (!this.items.includes(sheet)) return;
    this.items.splice(this.items.indexOf(sheet), 1);
    if (sheet.options.lockScroll) unlockScroll(this.doc);
    this.update();
    if (!this.items.length) { this.abort.abort(); this.observer.disconnect(); this.detected.clear(); }
  }

  optionsChanged(sheet, previous) {
    if (this.items.includes(sheet) && previous.lockScroll !== sheet.options.lockScroll) sheet.options.lockScroll ? lockScroll(this.doc) : unlockScroll(this.doc);
    this.update();
  }

  update() {
    this.items.forEach((sheet, index) => {
      sheet.view.style.setProperty("--sheet-stack-index", index);
      const depth = this.items.slice(index + 1).filter(next => !sheet.stackGroup || next.stackGroup === sheet.stackGroup).reduce((total, next) => total + next.progress, 0);
      sheet.view.style.setProperty("--sheet-stack-depth", depth.toFixed(4));
    });
    this.updateInert();
  }

  updateInert() {
    for (const [element, value] of this.inert) element.inert = value;
    this.inert.clear();
    const modal = this.modalIndex;
    if (modal < 0 || !this.items[modal].options.inert || this.external().some(overlay => overlay.options.selfManagedInertOutside)) return;
    const allowed = [...this.items.slice(modal).map((sheet) => sheet.view), ...this.islands(), ...this.externalContents()];
    const visit = (parent) => {
      for (const element of parent.children) {
        if (allowed.includes(element) || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(element.tagName)) continue;
        if (allowed.some((node) => element.contains(node))) visit(element);
        else { this.inert.set(element, element.inert); element.inert = true; }
      }
    };
    visit(this.doc.body);
  }

  focusScopes() {
    const modal = this.modalIndex;
    if (modal < 0 || !this.items[modal].options.trapFocus || this.external().some(overlay => overlay.options.selfManagedInertOutside)) return [];
    return [...this.items.slice(modal).map((sheet) => sheet.content), ...this.islands(), ...this.externalContents()];
  }

  focusin(event) {
    const scopes = this.focusScopes();
    if (scopes.length && !scopes.some((scope) => scope.contains(event.target))) focusInitial(this.top);
  }

  keydown(event) {
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && !this.externalContents().length) {
      for (const sheet of [...this.items].reverse()) if (sheet.outside(event, "escape")) break;
    }
    if (event.key !== "Tab") return;
    const scopes = this.focusScopes();
    if (!scopes.length) return;
    const targets = scopes.flatMap(focusable);
    const first = targets[0], last = targets.at(-1), active = this.doc.activeElement;
    if (!first) { event.preventDefault(); this.top.content.focus({ preventScroll: true }); }
    else if (event.shiftKey && (active === first || !targets.includes(active))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || !targets.includes(active))) { event.preventDefault(); first.focus(); }
  }

  click(event) {
    if (this.externalContents().some(element => element.contains(event.target))) return;
    // Capture protects outside detection from stopPropagation in third-party content.
    // The composed path also survives removal of the clicked node during its handler.
    const path = event.composedPath();
    for (const sheet of [...this.items].reverse()) {
      if (path.includes(sheet.content) || this.islands(sheet).some(element => path.includes(element))) break;
      if (event.detail && sheet.doc.defaultView.performance.now() < sheet.gesture.suppressClickUntil) break;
      if (path.includes(sheet.view) && event.detail && !sheet.outsidePointerDown) break;
      if (sheet.outside(event)) break;
    }
  }
}
