import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vozidla")({
  beforeLoad: () => {
    throw redirect({ to: "/nastavenia", replace: true });
  },
});
