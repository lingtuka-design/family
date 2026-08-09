import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { homeRoute } from "./routes/home";
import { bookRoute } from "./routes/book";
import { adminRoute } from "./routes/admin";

const routeTree = rootRoute.addChildren([homeRoute, bookRoute, adminRoute]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
