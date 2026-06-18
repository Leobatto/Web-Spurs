export function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-4xl font-black tracking-tight text-zinc-950">{value}</p>
      {helper ? <p className="mt-2 text-sm text-zinc-500">{helper}</p> : null}
    </div>
  );
}
