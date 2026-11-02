export const inputCls =
  "w-full rounded-xl border border-[#E1DED8] bg-[#FDFBF7] px-4 py-2.5 text-sm transition-colors focus:border-[#5C7C5A] focus:outline-none focus:ring-2 focus:ring-[#5C7C5A]/30";

export const primaryBtn =
  "rounded-xl bg-[#5C7C5A] px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#4A6649] focus:outline-none focus:ring-2 focus:ring-[#5C7C5A] focus:ring-offset-2 disabled:opacity-60";

export const Field = ({ id, label, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    {children}
  </div>
);
