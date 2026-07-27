import { useEffect, useState } from "react";
import { connectDashboard } from "./ws";
import { Atlas } from "./atlas/Atlas";
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
  useEffect(() => connectDashboard(), []);

  if (route === "admin") return <AdminProjects />;
  return <Atlas />;
}
