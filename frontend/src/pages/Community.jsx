import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";

const CommunityCard = ({ h }) => (
  <li className="rounded-2xl border border-[#E1DED8] bg-white p-6 transition-shadow hover:shadow-sm" data-testid={`community-habit-${h.id}`}>
    <Link to={`/habits/${h.id}`} className="font-heading text-xl font-bold underline-offset-4 hover:text-[#5C7C5A] hover:underline" data-testid={`community-habit-link-${h.id}`}>
      {h.name}
    </Link>
    <p className="mt-1 text-sm text-[#757A77]" data-testid={`community-habit-owner-${h.id}`}>by {h.owner_name}</p>
    {h.when_i_do_it && <p className="mt-3 whitespace-pre-wrap text-sm" data-testid={`community-habit-when-${h.id}`}>{h.when_i_do_it}</p>}
    <p className="mt-4 text-sm font-semibold text-[#4A6649]" data-testid={`community-habit-days-done-${h.id}`}>Days done: {h.days_done}</p>
  </li>
);

export default function Community() {
  const [habits, setHabits] = useState(null);

  useEffect(() => {
    api.get("/habits/community").then((r) => setHabits(r.data)).catch((e) => toast.error(errorText(e)));
  }, []);

  return (
    <div className="space-y-10">
      <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="community-title">Community</h1>
      {habits && habits.length === 0 && <p className="text-sm text-[#757A77]" data-testid="no-community-habits">No shared habits yet.</p>}
      <ul className="space-y-4" data-testid="community-list">
        {(habits || []).map((h) => <CommunityCard key={h.id} h={h} />)}
      </ul>
    </div>
  );
}
