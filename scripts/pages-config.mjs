export const pagesBasePath = `/${(process.env.PAGES_BASE_PATH || "/hotwire-sheets/").split("/").filter(Boolean).join("/")}/`.replace(/^\/\/$/, "/");
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(pagesBasePath)) {
  throw new Error("PAGES_BASE_PATH must be a URL path such as /hotwire-sheets/ or /.");
}
