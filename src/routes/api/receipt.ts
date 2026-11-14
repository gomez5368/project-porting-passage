import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/receipt")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleReceipt } = await import("@/lib/receipt.server");
    return handleReceipt(request);
  } } },
});