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
import PipelineInspector from "./pages/PipelineInspector";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import EvaluationLab from "./pages/EvaluationLab";
import ModelReport, { ModelReportPage } from "./pages/ModelReport";
import DesignSystemPreview from "./pages/DesignSystemPreview";
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      {/* Temporary Step 1 Clinical component gallery — review only */}
      <Route path="/design-system" element={<DesignSystemPreview />} />

      {/* Protected routes — require token */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireRole="end_user">
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireRole="end_user">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/skin-analysis"
          element={
            <ProtectedRoute requireRole="end_user">
              <SkinAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product-scanner"
          element={
            <ProtectedRoute requireRole="end_user">
              <ProductScanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute requireRole="end_user">
              <Recommendations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/skin-tracking"
          element={
            <ProtectedRoute requireRole="end_user">
              <SkinTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chatbot"
          element={
            <ProtectedRoute requireRole="end_user">
              <Chatbot />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute requireRole="end_user">
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector"
          element={
            <ProtectedRoute requireRole="evaluator">
              <PipelineInspector />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluation"
          element={
            <ProtectedRoute requireRole="evaluator">
              <EvaluationLab />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute requireRole="evaluator">
              <ModelReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report/:model"
          element={
            <ProtectedRoute requireRole="evaluator">
              <ModelReportPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
