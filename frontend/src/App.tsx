import { useEffect } from "react";
import { connectDashboard } from "./ws";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { TicketsPanel } from "./components/panels/TicketsPanel";
import { ProjectsPanel } from "./components/panels/ProjectsPanel";
import { ServicesPanel } from "./components/panels/ServicesPanel";
import { JarvisPanel } from "./components/panels/JarvisPanel";

export function App() {
  useEffect(() => connectDashboard(), []);

  return (
    <div className="h-full w-full p-3 flex flex-col gap-3">
      <Header />

      {/* Grille modulaire 16:9 : 2 colonnes, 2 rangées de panneaux. */}
      <main className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-3">
        <TicketsPanel />
        <ServicesPanel />
        <ProjectsPanel />
        <JarvisPanel />
      </main>

      <Footer />
    </div>
  );
}
