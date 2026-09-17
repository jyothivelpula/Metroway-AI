import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { HomePage } from "./pages/HomePage";
import { StationsPage } from "./pages/StationsPage";
import { StationDetailsPage } from "./pages/StationDetailsPage";
import { MetroMapPage } from "./pages/MetroMapPage";
import { NavigationPage } from "./pages/NavigationPage";
import { CurrentLocationPage } from "./pages/CurrentLocationPage";
import { ImLostPage } from "./pages/ImLostPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="stations" element={<StationsPage />} />
        <Route path="stations/:stationId" element={<StationDetailsPage />} />
        <Route path="metro-map" element={<MetroMapPage />} />
        <Route path="navigation" element={<NavigationPage />} />
        <Route path="location" element={<CurrentLocationPage />} />
        <Route path="im-lost" element={<ImLostPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
