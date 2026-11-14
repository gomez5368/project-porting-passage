import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/terminy")({
  beforeLoad: () => {
    throw redirect({ to: "/nastavenia", replace: true });
  },
});
