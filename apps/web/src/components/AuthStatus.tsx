import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

interface AccessUser {
  email: string;
  exp?: number;
}

/**
 * Reads the Cloudflare Access session (CF_Authorization JWT cookie) that
 * Access sets on this domain after a successful login, and shows the
 * signed-in email + a logout button. The login itself happens on the
 * Cloudflare side (visiting /admin without a session redirects to the
 * Access login page).
 */
function decodeAccessUser(): AccessUser | null {
  const match = document.cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  if (!match) return null;
  try {
    const payload = match[1].split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (json && typeof json.email === "string") {
      return { email: json.email, exp: json.exp };
    }
  } catch {
    /* not a valid JWT - treat as signed out */
  }
  return null;
}

function clearAccessCookies() {
  const host = window.location.hostname;
  const paths = ["/", "/admin"];
  for (const path of paths) {
    document.cookie = `CF_Authorization=; Max-Age=0; path=${path}; domain=${host}; Secure; SameSite=None`;
    document.cookie = `CF_Authorization=; Max-Age=0; path=${path}`;
  }
}

export function AuthStatus() {
  const [user, setUser] = useState<AccessUser | null>(() => decodeAccessUser());

  useEffect(() => {
    const update = () => setUser(decodeAccessUser());
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("pageshow", update);
    };
  }, []);

  function handleLogout() {
    clearAccessCookies();
    // Let Cloudflare revoke the session and clear its cookie too.
    // (This endpoint exists as soon as an Access application protects the domain.)
    window.location.href = `${window.location.origin}/cdn-cgi/access/logout`;
  }

  if (user) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        <span className="hidden sm:inline">Signed in as {user.email}</span>
        <span className="sm:hidden">Signed in</span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full bg-emerald-600 px-2.5 py-0.5 font-bold text-white transition hover:bg-emerald-700"
        >
          Log out
        </button>
      </span>
    );
  }

  return (
    <Link
      to="/admin"
      className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600"
    >
      Admin sign in
    </Link>
  );
}
