import { createFileRoute } from "@tanstack/react-router";

// Returns public Square credentials needed by the Web Payments SDK.
// Application ID and Location ID are NOT secrets — Square documents that
// they're embedded in client code. Access token stays server-side.
export const Route = createFileRoute("/api/public/square-config")({
  server: {
    handlers: {
      GET: async () => {
        const applicationId = process.env.SQUARE_APPLICATION_ID;
        const locationId = process.env.SQUARE_LOCATION_ID;
        if (!applicationId || !locationId) {
          return Response.json({ error: "Square not configured" }, { status: 500 });
        }
        return Response.json({
          applicationId,
          locationId,
          // We are running in live mode (no sandbox). The SDK URL is chosen
          // on the client based on this flag.
          environment: "production" as const,
          depositCents: 2000, // $20 flat
        });
      },
    },
  },
});
