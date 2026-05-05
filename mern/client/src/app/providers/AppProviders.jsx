import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../features/auth/context/AuthContext";
import { ThemeProvider } from "../../shared/context/ThemeContext";
import { ToastProvider } from "../../shared/context/ToastContext";
import queryClient from "../../shared/lib/queryClient";

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
