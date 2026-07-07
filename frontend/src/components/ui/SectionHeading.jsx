export function SectionHeading({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.35em] text-orange-500">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-blue-900">{title}</h1>
      {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}
