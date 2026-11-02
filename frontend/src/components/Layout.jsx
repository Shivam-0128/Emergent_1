import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Sprout, Users, LogOut, ListChecks } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const linkCls = ({ isActive }) =>
  `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C7C5A] ${
    isActive ? "bg-[#5C7C5A] text-white" : "text-[#2C302E] hover:bg-[#F3F1EC]"
  }`;

export const Layout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C302E]">
      <header className="sticky top-0 z-20 border-b border-[#E1DED8] bg-[#FDFBF7]/90 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight">
            <Sprout className="h-5 w-5 text-[#5C7C5A]" /> Habit Circle
          </div>
          <nav className="flex items-center gap-1" data-testid="top-nav">
            <NavLink to="/habits" end className={linkCls} data-testid="top-nav-my-habits-link">My habits</NavLink>
            <NavLink to="/community" className={linkCls} data-testid="top-nav-community-link">Community</NavLink>
            <button onClick={handleSignOut} data-testid="sign-out-button"
              className="ml-2 flex items-center gap-2 rounded-xl border border-[#E1DED8] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#F3F1EC] focus:outline-none focus:ring-2 focus:ring-[#5C7C5A]">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-[#E1DED8] md:block md:min-h-[calc(100vh-61px)]" data-testid="sidebar">
          <div className="sticky top-[61px] p-5">
          <p className="mb-3 px-2 text-xs uppercase tracking-widest text-[#757A77]">Signed in as</p>
          <p className="mb-6 px-2 font-heading font-bold" data-testid="sidebar-user-name">{user?.display_name}</p>
          <div className="flex flex-col gap-2">
            <NavLink to="/habits" end className={linkCls} data-testid="sidebar-my-habits-button">
              <ListChecks className="h-4 w-4" /> My habits
            </NavLink>
            <NavLink to="/community" className={linkCls} data-testid="sidebar-community-button">
              <Users className="h-4 w-4" /> Community
            </NavLink>
          </div>
          </div>
        </aside>
        <main className="mx-auto w-full max-w-4xl p-6 md:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
