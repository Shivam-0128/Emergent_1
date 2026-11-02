import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Field, inputCls, primaryBtn } from "@/components/Field";

export default function AuthPage({ mode }) {
  const isSignUp = mode === "signup";
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = isSignUp ? form : { email: form.email, password: form.password };
      const { data } = await api.post(isSignUp ? "/auth/register" : "/auth/login", body);
      saveSession(data);
      navigate("/habits");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const title = isSignUp ? "Sign up" : "Sign in";
  return (
    <div className="flex min-h-screen items-center bg-[#FDFBF7] px-6 text-[#2C302E]">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center gap-2 font-heading text-lg font-extrabold">
          <Sprout className="h-5 w-5 text-[#5C7C5A]" /> Habit Circle
        </div>
        <h1 className="font-heading text-4xl font-extrabold tracking-tight" data-testid="auth-title">{title}</h1>
        <p className="mt-2 text-sm text-[#757A77]">Track daily habits with your friends and colleagues.</p>
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-[#E1DED8] bg-white p-8" data-testid={`${mode}-form`}>
          {isSignUp && (
            <Field id="display_name" label="Display name">
              <input id="display_name" required value={form.display_name} onChange={set("display_name")} className={inputCls} data-testid="display-name-input" />
            </Field>
          )}
          <Field id="email" label="Email">
            <input id="email" type="email" required value={form.email} onChange={set("email")} className={inputCls} data-testid="email-input" />
          </Field>
          <Field id="password" label="Password">
            <input id="password" type="password" required minLength={isSignUp ? 6 : undefined} value={form.password} onChange={set("password")} className={inputCls} data-testid="password-input" />
          </Field>
          {error && <p className="text-sm text-[#B4574A]" data-testid="auth-error">{error}</p>}
          <button type="submit" disabled={busy} className={`${primaryBtn} w-full`} data-testid={`${mode}-submit-button`}>{title}</button>
        </form>
        <p className="mt-6 text-sm text-[#757A77]">
          {isSignUp ? "Already have an account? " : "New here? "}
          <Link to={isSignUp ? "/signin" : "/signup"} className="font-medium text-[#5C7C5A] underline-offset-4 hover:underline" data-testid="auth-switch-link">
            {isSignUp ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </div>
    </div>
  );
}
