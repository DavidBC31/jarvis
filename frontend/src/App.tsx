import { useEffect, useState } from "react";
import { connectDashboard } from "./ws";
import { Header, type Tab } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProjectsPanel } from "./components/panels/ProjectsPanel";
import { TicketsPanel } from "./components/panels/TicketsPanel";
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

      <main className="flex-1 min-h-0 p-4">
        <div
          className="h-full rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          {tab === "ops" ? <ProjectsPanel />
            : tab === "support" ? <TicketsPanel />
            : <MonitoringPage />}
        </div>
      </main>

      <Footer />
      <JarvisFloat />
    </div>
  );
}
