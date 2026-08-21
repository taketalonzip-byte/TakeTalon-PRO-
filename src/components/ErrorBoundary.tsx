import React, { Component } from "react";

interface Props {
  children: React.ReactNode;
  lang?: "en" | "fr" | "sw";
}
interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  handleReload = () => {
    (this as any).setState({ hasError: false });
    window.location.reload();
  };

  render() {
    const { hasError } = (this as any).state || {};
    if (hasError) {
      const lang = (this as any).props?.lang || "sw";
      const title = lang === "sw" ? "Hitilafu Imetokea" : lang === "fr" ? "Une erreur est survenue" : "Something went wrong";
      const msg = lang === "sw" ? "Samahani, kuna tatizo la kiufundi. Bonyeza kuanzisha upya." : lang === "fr" ? "Désolé, un problème technique est survenu." : "Sorry, a technical issue occurred.";
      return (
        <div style={{ background: "#0c1425", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "sans-serif" }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>{title}</h2>
            <p style={{ opacity: 0.7, marginBottom: 20, fontSize: 14 }}>{msg}</p>
            <button onClick={this.handleReload} style={{ background: "#38bdf8", color: "#000", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, cursor: "pointer" }}>
              {lang === "sw" ? "Anzisha Upya" : lang === "fr" ? "Recharger" : "Reload"}
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props?.children;
  }
}
