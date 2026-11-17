export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1>{title}</h1>
      <p className="mt-1 text-ink-muted">{description}</p>
      <div className="mt-8 rounded-card-mobile border border-dashed border-outline bg-mist p-8 text-center md:rounded-card">
        <p className="text-lg font-semibold text-navy">Coming soon</p>
        <p className="mt-1 text-ink-muted">This page isn&apos;t built yet.</p>
      </div>
    </div>
  );
}
