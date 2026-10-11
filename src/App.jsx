import { lazy, Suspense } from "react";
import Game from "./Game.jsx";

const Admin = lazy(() => import("./admin/Admin.jsx"));

// Old links used /#/admin — send them to /admin.
if (location.hash.startsWith("#/admin")) history.replaceState(null, "", "/admin");

const isAdminRoute = () => /^\/admin\/?$/.test(location.pathname);

export default function App() {
  if (isAdminRoute()) {
    return (
      <Suspense fallback={<div className="adm-loading">Loading admin…</div>}>
        <Admin />
      </Suspense>
    );
  }
  return <Game />;
}
