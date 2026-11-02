import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText, lastSevenDays } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Comments } from "@/components/Comments";

const LastSevenDays = ({ habit, canEdit, onChange }) => {
  const done = new Set(habit.completions);
  const toggle = async (day, checked) => {
    try {
      const { data } = await api.put(`/habits/${habit.id}/ticks`, { date: day, done: checked });
      onChange(data);
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  return (
    <section className="rounded-2xl border border-[#E1DED8] bg-white p-6 md:p-8">
      <h2 className="font-heading text-lg font-bold">Last 7 days</h2>
      <ul className="mt-4 space-y-2" data-testid="last-7-days-list">
        {lastSevenDays().map((day) => (
          <li key={day}>
            <label className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${canEdit ? "cursor-pointer hover:bg-[#F3F1EC]" : "cursor-not-allowed opacity-80"}`}>
              <input type="checkbox" checked={done.has(day)} disabled={!canEdit} onChange={(e) => toggle(day, e.target.checked)}
                className="h-4 w-4 accent-[#5C7C5A]" data-testid={`day-checkbox-${day}`} />
              <span className="font-mono">{day}</span>
            </label>
          </li>
        ))}
      </ul>
      {!canEdit && <p className="mt-3 text-xs text-[#757A77]" data-testid="owner-only-note">Only the owner can change these boxes.</p>}
    </section>
  );
};

export default function HabitPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [habit, setHabit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/habits/${id}`).then((r) => setHabit(r.data)).catch((e) => setError(errorText(e)));
  }, [id]);

  if (error) return <p className="text-sm text-[#B4574A]" data-testid="habit-error">{error}</p>;
  if (!habit) return <p className="text-sm text-[#757A77]">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[#757A77]" data-testid="habit-owner">{habit.shared ? "Shared" : "Private"} · by {habit.owner_name}</p>
        <h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="habit-name">{habit.name}</h1>
        <p className="mt-4 text-xs uppercase tracking-widest text-[#757A77]">When I do it</p>
        <p className="mt-1 whitespace-pre-wrap" data-testid="habit-when">{habit.when_i_do_it || "—"}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="rounded-2xl bg-[#F3F1EC] px-6 py-4 font-semibold" data-testid="habit-days-done">Days done: {habit.days_done}</div>
        <div className="rounded-2xl bg-[#F3F1EC] px-6 py-4 font-semibold" data-testid="habit-current-streak">Current streak: {habit.current_streak}</div>
      </div>
      <LastSevenDays habit={habit} canEdit={user && user.id === habit.owner_id} onChange={setHabit} />
      <Comments habitId={habit.id} />
    </div>
  );
}
