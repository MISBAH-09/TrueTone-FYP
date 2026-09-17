import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import SkinAnalysis from "./pages/SkinAnalysis";
import ProductScanner from "./pages/ProductScanner";
import Recommendations from "./pages/Recommendations";
import SkinTracking from "./pages/SkinTracking";
import Chatbot from "./pages/Chatbot";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />

      {/* Protected routes — require token */}
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/skin-analysis" element={<SkinAnalysis />} />
        <Route path="/product-scanner" element={<ProductScanner />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/skin-tracking" element={<SkinTracking />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
