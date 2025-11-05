export default function StatCard({ title, value, hint }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-sm text-slate-500 dark:text-slate-400">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs mt-1 text-slate-500">{hint}</div>}
    </div>
  );
}
