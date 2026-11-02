import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";
import { Field, inputCls, primaryBtn } from "@/components/Field";

const AddHabitForm = ({ onAdded }) => {
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/habits", { name, when_i_do_it: when, shared });
      onAdded(data);
      setName(""); setWhen(""); setShared(false);
      toast.success("Habit added");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[#E1DED8] bg-white p-6 md:p-8" data-testid="add-habit-form">
      <Field id="habit-name" label="Habit name">
        <input id="habit-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} data-testid="habit-name-input" />
      </Field>
      <Field id="habit-when" label="When I do it">
        <textarea id="habit-when" rows={3} value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls}
          placeholder="e.g. Right after my morning coffee, when the house is still quiet" data-testid="habit-when-input" />
      </Field>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)}
          className="h-4 w-4 accent-[#5C7C5A]" data-testid="habit-share-checkbox" />
        Share with the community
      </label>
      <button type="submit" disabled={busy} className={primaryBtn} data-testid="add-habit-button">Add habit</button>
    </form>
  );
};

const HabitRow = ({ h }) => (
  <li className="flex items-center justify-between gap-4 rounded-2xl border border-[#E1DED8] bg-white px-6 py-4" data-testid={`habit-row-${h.id}`}>
    <Link to={`/habits/${h.id}`} className="font-heading text-lg font-bold text-[#2C302E] underline-offset-4 hover:text-[#5C7C5A] hover:underline" data-testid={`habit-link-${h.id}`}>
      {h.name}
    </Link>
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${h.shared ? "bg-[#5C7C5A]/10 text-[#4A6649]" : "bg-[#F3F1EC] text-[#757A77]"}`} data-testid={`habit-visibility-${h.id}`}>
      {h.shared ? "Shared" : "Private"}
    </span>
  </li>
);

export default function MyHabits() {
  const [habits, setHabits] = useState(null);

  useEffect(() => {
    api.get("/habits/mine").then((r) => setHabits(r.data)).catch((e) => toast.error(errorText(e)));
  }, []);

  return (
    <div className="space-y-10">
      <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="my-habits-title">My habits</h1>
      <AddHabitForm onAdded={(h) => setHabits((prev) => [h, ...(prev || [])])} />
      <section>
        {habits && habits.length === 0 && <p className="text-sm text-[#757A77]" data-testid="no-habits-message">No habits yet. Add your first one above.</p>}
        <ul className="space-y-3" data-testid="my-habits-list">
          {(habits || []).map((h) => <HabitRow key={h.id} h={h} />)}
        </ul>
      </section>
    </div>
  );
}
