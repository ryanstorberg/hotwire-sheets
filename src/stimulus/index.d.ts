import { Controller, Application } from "@hotwired/stimulus";
import { Sheet, Scroll, SheetStack, Outlet, Island, ExternalOverlay, Fixed, AutoFocusTarget } from "../index.js";
export class SheetController extends Controller {
  sheet: Sheet | null;
  open(event?: Event): Promise<boolean> | undefined;
  close(event?: Event): Promise<boolean> | undefined;
  toggle(event?: Event): Promise<boolean> | undefined;
}
export class ScrollController extends Controller { scroll: Scroll | null; to(event: Event & { params: object }): void; by(event: Event & { params: object }): void }
export class SheetStackController extends Controller { primitive: SheetStack | null }
export class OutletController extends Controller { primitive: Outlet | null }
export class IslandController extends Controller { primitive: Island | null }
export class ExternalOverlayController extends Controller { primitive: ExternalOverlay | null }
export class FixedController extends Controller { primitive: Fixed | null }
export class AutoFocusTargetController extends Controller { primitive: AutoFocusTarget | null }
export function registerSheets(application: Application, identifier?: string): void;
