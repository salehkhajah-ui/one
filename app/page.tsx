export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <h1 style={{ fontSize: "3rem", margin: 0 }}>One</h1>
      <p style={{ color: "#666", margin: 0 }}>Project One is live. Time to build.</p>
    </main>
  );
}
