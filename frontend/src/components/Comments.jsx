import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";
import { inputCls, primaryBtn } from "@/components/Field";

export const Comments = ({ habitId }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/habits/${habitId}/comments`).then((r) => setComments(r.data)).catch(() => {});
  }, [habitId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/habits/${habitId}/comments`, { text });
      setComments((c) => [...c, data]);
      setText("");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#E1DED8] bg-white p-6 md:p-8" data-testid="comments-section">
      <h2 className="font-heading text-lg font-bold">Comments</h2>
      <ul className="mt-4 space-y-4" data-testid="comments-list">
        {comments.length === 0 && <li className="text-sm text-[#757A77]">No comments yet.</li>}
        {comments.map((c) => (
          <li key={c.id} className="border-l-2 border-[#C67C6D] pl-4" data-testid={`comment-${c.id}`}>
            <p className="text-sm font-semibold" data-testid={`comment-author-${c.id}`}>{c.author_name}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm" data-testid={`comment-text-${c.id}`}>{c.text}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label htmlFor="comment" className="block text-sm font-medium">Comment</label>
        <textarea id="comment" rows={3} value={text} onChange={(e) => setText(e.target.value)} className={inputCls} data-testid="comment-input" />
        <button type="submit" disabled={busy || !text.trim()} className={primaryBtn} data-testid="post-comment-button">Post comment</button>
      </form>
    </section>
  );
};
