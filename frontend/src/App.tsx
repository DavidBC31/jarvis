import { useEffect, useState } from "react";
import { connectDashboard } from "./ws";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { TicketsPanel } from "./components/panels/TicketsPanel";
import { ProjectsPanel } from "./components/panels/ProjectsPanel";
import { ServicesPanel } from "./components/panels/ServicesPanel";
import { JarvisPanel } from "./components/panels/JarvisPanel";
import { AdminProjects } from "./components/admin/AdminProjects";
import { MonitoringPage } from "./components/MonitoringPage";

// Routage minimal par hash : "#admin" → admin, sinon dashboard.
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
  useEffect(() => connectDashboard(), []);

  if (route === "admin") {
    return <AdminProjects />;
  }
  if (route === "monitoring") {
    return <MonitoringPage />;
  }

  return (
    <div className="h-full w-full p-4 flex flex-col gap-4">
      <Header />

      {/* Grille modulaire 16:9 : 2 colonnes, 2 rangées de panneaux. */}
      <main className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-4">
        <TicketsPanel />
        <ServicesPanel />
        <ProjectsPanel />
        <JarvisPanel />
      </main>

      <Footer />
    </div>
  );
}
