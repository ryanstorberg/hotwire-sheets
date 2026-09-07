export { default as SheetController } from "./sheet_controller.js";
import SheetController from "./sheet_controller.js";
import { ScrollController, SheetStackController, OutletController, IslandController, ExternalOverlayController, FixedController, AutoFocusTargetController } from "./primitive_controllers.js";
export { ScrollController, SheetStackController, OutletController, IslandController, ExternalOverlayController, FixedController, AutoFocusTargetController };
export function registerSheets(application, identifier = "sheet") {
  application.register(identifier, SheetController);
  for (const [name, controller] of Object.entries({ "sheet-scroll": ScrollController, "sheet-stack": SheetStackController, "sheet-outlet": OutletController, "sheet-island": IslandController, "sheet-external-overlay": ExternalOverlayController, "sheet-fixed": FixedController, "sheet-auto-focus": AutoFocusTargetController })) application.register(name, controller);
}
