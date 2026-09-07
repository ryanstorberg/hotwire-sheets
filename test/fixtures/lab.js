import { Application } from "@hotwired/stimulus";
import * as Turbo from "@hotwired/turbo";
import DemoController from "/test/fixtures/demo_controller.js";
const built = new URL(location.href).searchParams.get("assets") === "built";
const { Sheet } = await import(built ? "hotwire-sheets" : "/src/index.js");
const { registerSheets } = await import(built ? "hotwire-sheets/stimulus" : "/src/stimulus/index.js");
const application = Application.start();
registerSheets(application);
application.register("demo", DemoController);
window.lab = { Sheet, Turbo, application, get: (id) => Sheet.get(document.getElementById(id)) };
function populateList() {
  const list = document.getElementById("long-list");
  if (list && !list.children.length) for (let i = 1; i <= 35; i++) {
    const item = document.createElement("li");
    item.textContent = `A little room for idea ${String(i).padStart(2, "0")}`;
    list.append(item);
  }
  const chapters = [
    ["Start with a little space", "A quiet morning, an open window, a path that takes a different turn. Sometimes a change of pace begins with the smallest choice."],
    ["Follow the light", "Take the longer way around. Notice the patterns on the water and the shapes in the trees. There is more to find when there is less to hurry toward."],
    ["Find a place to pause", "A good view does not need an itinerary. Stay for a moment, let the scene settle, and give your thoughts a little room to wander."],
    ["Bring something back", "Keep a note, a sketch, or a story from the day. The details you remember are often the ones you did not plan to find."]
  ];
  for (const container of document.querySelectorAll("[data-demo-chapters]")) {
    if (container.children.length) continue;
    const count = Number(container.dataset.demoChapters || 12);
    for (let i = 0; i < count; i++) {
      const section = document.createElement("section"), heading = document.createElement("h3"), paragraph = document.createElement("p");
      const [title, text] = chapters[i % chapters.length];
      heading.textContent = `${String(i + 1).padStart(2, "0")} / ${title}`;
      paragraph.textContent = text;
      section.append(heading, paragraph);
      container.append(section);
    }
  }
}
document.addEventListener("turbo:load", populateList);
populateList();
