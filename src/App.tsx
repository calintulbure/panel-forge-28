import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Products from "./pages/Products";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PendingApproval from "./pages/PendingApproval";
import UserManagement from "./pages/UserManagement";
import DatabaseManager from "./pages/DatabaseManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SidebarProvider defaultOpen={false}>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <header className="h-14 md:h-14 border-b flex items-center px-3 md:px-4 bg-background sticky top-0 z-10">
                          <SidebarTrigger className="h-11 w-11 md:h-10 md:w-10" />
                        </header>
                        <main className="flex-1">
                          <Products />
                        </main>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/database"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SidebarProvider defaultOpen={false}>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <header className="h-14 md:h-14 border-b flex items-center px-3 md:px-4 bg-background sticky top-0 z-10">
                          <SidebarTrigger className="h-11 w-11 md:h-10 md:w-10" />
                        </header>
                        <main className="flex-1">
                          <DatabaseManager />
                        </main>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SidebarProvider defaultOpen={false}>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <header className="h-14 md:h-14 border-b flex items-center px-3 md:px-4 bg-background sticky top-0 z-10">
                          <SidebarTrigger className="h-11 w-11 md:h-10 md:w-10" />
                        </header>
                        <main className="flex-1">
                          <UserManagement />
                        </main>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
