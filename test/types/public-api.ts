import { Sheet, Scroll, Outlet, SheetStack, AutoFocusTarget, Island, ExternalOverlay, Fixed, VisuallyHidden, createComponentId, observeMediaQuery, getPageScrollData, observePageScrollData, createThemeColorDimmingOverlay, updateThemeColor, animate, animationPresets, type SheetOptions } from '../../src/index.js';
import { registerSheets, SheetController, ScrollController } from '../../src/stimulus/index.js';
import { Application } from '@hotwired/stimulus';
const root = document.createElement('div');
const options: SheetOptions = {
  componentId: createComponentId(), contentPlacement: 'center', tracks: ['top', 'bottom'],
  detentMode: 'silk', detents: ['calc(100dvh - 20px)'],
  onClickOutside: event => event.changeDefault({ dismiss: false }),
  onTravel: ({ progress, range }) => console.log(progress, range.end),
  enteringAnimationSettings: { preset: 'smooth', contentMove: false, delay: 10 },
  stackingAnimation: { scale: ({ progress, tween }) => tween(1, .9) }
};
const sheet = new Sheet(root, options);
void sheet.setActiveDetent(1);
void sheet.setOptions({ swipe: false, presented: true });
sheet.presented = false;
void sheet.setOptions({ travelAnimation: null });
const scroll = new Scroll(root, { onScrollStart: event => event.changeDefault({ dismissKeyboard: true }), scrollGestureTrap: { yStart: true }, scrollTimelineName: '--story' });
scroll.scrollBy({ progress: .1, animationSettings: { skip: 'auto' } });
const scroller: HTMLElement = scroll.scroller;
new Outlet(root, { forComponent: sheet, travelAnimation: { opacity: [0, 1] } });
new SheetStack(root).outlet(root, { stackingAnimation: { scale: [1, .9] } });
new AutoFocusTarget(root, { timing: ['present', 'dismiss'] }).destroy();
new Island(root, { forComponent: [sheet], contentGetter: () => root }).destroy();
new ExternalOverlay(root, { selfManagedInertOutside: false }).destroy();
new Fixed(root).destroy(); new VisuallyHidden(root).destroy();
observeMediaQuery('(min-width: 800px)', matches => console.log(matches));
observePageScrollData(data => console.log(data.pageScrollContainer));
getPageScrollData(); updateThemeColor('#ffffff');
createThemeColorDimmingOverlay({ element: root }).animateDimmingOverlayOpacity({ keyframes: [0, .5] });
animate(root, { opacity: [0, 1] }, { duration: 120 });
animationPresets.elastic.mass;
registerSheets(Application.start());
const controllers: [typeof SheetController, typeof ScrollController] = [SheetController, ScrollController];
void controllers; void scroller;
// @ts-expect-error Invalid travel direction is caught at compile time.
new Sheet(root, { edge: 'diagonal' });
// @ts-expect-error Invalid scrolling axis is caught at compile time.
new Scroll(root, { axis: 'z' });
