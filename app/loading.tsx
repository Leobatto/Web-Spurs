export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f3f1ec] text-zinc-950">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-zinc-200 bg-white px-8 py-7 shadow-sm">
        <a
          aria-label="Ver referencia del loading"
          className="basketball-loading relative h-16 w-16 rounded-full border-4 border-amber-500 bg-[radial-gradient(circle_at_35%_35%,#ffd9ad_0_14%,#f59e0b_15_70%,#b45309_71_100%)] transition hover:-translate-y-0.5 hover:scale-105"
          href="https://www.linkedin.com/posts/angelalojacono_compliance-madness-activity-7177032771419222016-jHdD"
          rel="noreferrer noopener"
          target="_blank"
        />
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Cargando</p>
      </div>
    </div>
  );
}
