import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vozidla")({
  beforeLoad: () => {
    throw redirect({ to: "/nastavenia", replace: true });
  },
});
