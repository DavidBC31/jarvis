import { useEffect, useState } from "react";
import { connectDashboard } from "./ws";
import { Header, type Tab } from "./components/Header";
import { Footer } from "./components/Footer";
import { TicketsPanel } from "./components/panels/TicketsPanel";
import { ProjectsPanel } from "./components/panels/ProjectsPanel";
import { MonitoringPage } from "./components/MonitoringPage";
import { JarvisFloat } from "./components/JarvisFloat";
import { AdminProjects } from "./components/admin/AdminProjects";

function useHashRoute() {
  const [route, setRoute] = useState(() => location.hash.replace("#", ""));
  useEffect(() => {
    const onChange = () => setRoute(location.hash.replace("#", ""));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function App() {
  const route = useHashRoute();
  const [tab, setTab] = useState<Tab>("ops");
  useEffect(() => connectDashboard(), []);

  if (route === "admin") return <AdminProjects />;

  return (
    <div className="h-full w-full flex flex-col">
      <Header tab={tab} onTab={setTab} />

      <main className="flex-1 min-h-0 p-4 pt-3">
        {tab === "ops" ? (
          <div className="h-full grid grid-cols-2 gap-4">
            <TicketsPanel />
            <ProjectsPanel />
          </div>
        ) : (
          <div
            className="h-full rounded-xl overflow-hidden"
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--neon-cyan)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4), inset 0 0 24px rgba(0,0,0,0.35)",
            }}
          >
            <MonitoringPage />
          </div>
        )}
      </main>

      <Footer />

      {/* Chatbot flottant — toujours visible, quel que soit l'onglet */}
      <JarvisFloat />
    </div>
  );
}
