// src/App.jsx
import { useEffect, useState } from "react";
import "./styles/globals.css";
import LoginScreen    from "./features/auth/LoginScreen";
import RegisterScreen from "./features/auth/RegisterScreen";
import VoterApp       from "./features/voter/VoterApp";
import AdminApp       from "./features/admin/AdminApp";
import { api } from "./lib/api";

const SESSION_KEY = "pickpal.session";

const loadSession = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

    if (saved?.screen && saved?.user) {
      return saved;
    }
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }

  return { screen: "login", user: null };
};

export default function App() {
  // screen: "login" | "register" | "voter" | "admin"
  const [session, setSession] = useState(loadSession);
  const screen = session.screen;
  const currentUser = session.user;

  useEffect(() => {
    if (!session.token || screen === "login" || screen === "register") return;

    let cancelled = false;

    api.me()
      .then((result) => {
        if (cancelled) return;
        const nextSession = {
          screen: result.role === "voter" ? "voter" : "admin",
          user: result.user,
          token: session.token,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(SESSION_KEY);
        setSession({ screen: "login", user: null, token: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = (role, user = null, token = null) => {
    const nextSession = {
      screen: role === "voter" ? "voter" : "admin",
      user: user ? { ...user, role } : { role },
      token,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = async () => {
    try {
      if (session.token) {
        await api.logout();
      }
    } catch {
      // Local logout should still complete if the token is already invalid.
    }

    localStorage.removeItem(SESSION_KEY);
    setSession({ screen: "login", user: null, token: null });
  };

  return (
    <>
      {screen === "login"    && <LoginScreen    onLogin={handleLogin} onRegister={() => setSession({ screen: "register", user: null, token: null })} />}
      {screen === "register" && <RegisterScreen onDone={() => setSession({ screen: "login", user: null, token: null })} />}
      {screen === "voter"    && <VoterApp       user={currentUser} onLogout={handleLogout} />}
      {screen === "admin"    && <AdminApp        user={currentUser} onLogout={handleLogout} />}
    </>
  );
}
