import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/StudentDashboard";
import GateDashboard from "./pages/GateDashboard";
import WardenDashboard from "./pages/WardenDashboard";
import FloorInchargeDashboard from "./pages/FloorInchargeDashboard";
import HostelInchargeDashboard from "./pages/HostelInchargeDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              {/* Update security/gate route */}
              <Route path="/dashboard/security" element={
                <ProtectedRoute allowedRoles={['security', 'gate']}>
                  <GateDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/gate" element={
                <Navigate to="/dashboard/security" replace />
              } />
              <Route path="/dashboard/floor-incharge" element={
                <ProtectedRoute allowedRoles={['floor-incharge']}>
                  <FloorInchargeDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/hostel-incharge" element={
                <ProtectedRoute allowedRoles={['hostel-incharge']}>
                  <HostelInchargeDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/warden" element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <WardenDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/student" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
