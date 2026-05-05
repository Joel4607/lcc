import { createContext, useContext, useEffect, useState } from "react";
import api from "../../../shared/api/client";
import { clearStoredToken, getApiErrorMessage, getStoredToken, setStoredToken } from "../../../shared/lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      if (!token) {
        if (!ignore) {
          setUser(null);
          setIsBootstrapping(false);
        }

        return;
      }

      try {
        const response = await api.get("/auth/me");

        if (!ignore) {
          setUser(response.data.user);
        }
      } catch (_error) {
        if (!ignore) {
          clearStoredToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setIsBootstrapping(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, [token]);

  async function login(credentials) {
    const response = await api.post("/auth/login", credentials);

    setStoredToken(response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    setIsBootstrapping(false);

    return response.data.user;
  }

  function logout() {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setIsBootstrapping(false);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isBootstrapping,
        login,
        logout,
        getApiErrorMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
