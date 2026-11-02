import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import AuthPage from "@/pages/AuthPage";
import MyHabits from "@/pages/MyHabits";
import Community from "@/pages/Community";
import HabitPage from "@/pages/HabitPage";

const Protected = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return <div className="min-h-screen bg-[#FDFBF7]" />;
  return user ? children : <Navigate to="/signin" replace />;
};

const GuestOnly = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return <div className="min-h-screen bg-[#FDFBF7]" />;
  return user ? <Navigate to="/habits" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<GuestOnly><AuthPage mode="signup" /></GuestOnly>} />
          <Route path="/signin" element={<GuestOnly><AuthPage mode="signin" /></GuestOnly>} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/habits" element={<MyHabits />} />
            <Route path="/habits/:id" element={<HabitPage />} />
            <Route path="/community" element={<Community />} />
          </Route>
          <Route path="*" element={<Navigate to="/habits" replace />} />
        </Routes>
        <Toaster position="bottom-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
