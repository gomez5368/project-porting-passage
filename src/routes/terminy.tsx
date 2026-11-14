import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/terminy")({
  beforeLoad: () => {
    throw redirect({ to: "/nastavenia", replace: true });
  },
});
