import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/app/ui";
import { VehicleSettings } from "@/components/app/VehicleSettings";
import { ServiceSettings } from "@/components/app/ServiceSettings";

export const Route = createFileRoute("/_authenticated/nastavenia")({
  head: () => ({
    meta: [
      { title: "Nastavenia vozidla – Spotreba auta" },
      { name: "description", content: "Technické údaje, typ paliva, STK, EK, poistenie, diaľničná známka a výmena oleja pre každé auto." },
      { property: "og:title", content: "Nastavenia vozidla – Spotreba auta" },
      { property: "og:description", content: "Technické údaje, typ paliva, STK, EK, poistenie, diaľničná známka a výmena oleja pre každé auto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <ScreenHeader title="Nastavenia vozidla" subtitle="Technické údaje, palivo a servisné termíny pre každé auto." />
      <VehicleSettings />
      <ServiceSettings />
    </>
  );
}
