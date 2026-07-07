import { useEffect, useState } from "react";
import { connectDashboard } from "./ws";
import { Header, type Tab } from "./components/Header";
import { Footer } from "./components/Footer";
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

// Conteneur commun aux onglets : carte vitrée violette pleine hauteur.
function TabCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-full rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid rgba(139,92,246,0.2)",
        boxShadow:
          "0 0 0 1px rgba(0,0,0,0.5), 0 8px 32px rgba(139,92,246,0.08), inset 0 0 40px rgba(0,0,0,0.45)",
      }}
    >
      {children}
    </div>
  );
}

export function App() {
  const route = useHashRoute();
  const [tab, setTab] = useState<Tab>("ops");
  useEffect(() => connectDashboard(), []);

  if (route === "admin") return <AdminProjects />;

  return (
    <div className="h-full w-full flex flex-col gap-3 p-4">
      <Header tab={tab} onTab={setTab} />

      <main className="flex-1 min-h-0">
        <TabCard>
          {tab === "ops" ? <ProjectsPanel /> : <MonitoringPage />}
        </TabCard>
      </main>

      <Footer />
      <JarvisFloat />
    </div>
  );
}
