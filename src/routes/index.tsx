import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";

// Kick off the App chunk fetch at module scope so it starts downloading
// as soon as this route module is parsed, not after the component mounts.
const appPromise = typeof window !== "undefined" ? import("../App") : null;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TakeTalon PRO — Live Sports Tips, Wallet & Games" },
      {
        name: "description",
        content:
          "Follow live football fixtures, unlock expert tipster picks, manage your wallet and play provably-fair simulation games in TakeTalon PRO.",
      },
      { property: "og:title", content: "TakeTalon PRO — Live Sports Tips, Wallet & Games" },
      {
        property: "og:description",
        content:
          "Live fixtures, verified tipsters, wallet and provably-fair simulation games in one mobile-first app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});


function Index() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    document.body.style.background = "#1f3d5c";

    (appPromise ?? import("../App"))
      .then((m) => {
        if (!cancelled) setApp(() => m.default);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div
        style={{
          background: "#0a1628",
          color: "#fff",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>App failed to load</h2>
          <pre
            style={{
              background: "#111",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              textAlign: "left",
              overflowX: "auto",
            }}
          >
            {error}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              background: "#38bdf8",
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Show themed background while App chunk loads — prevents white flash
  if (!App) {
    return <div style={{ background: "#1f3d5c", width: "100vw", height: "100vh" }} />;
  }

  return <App />;
}
