import { Card } from "./Card";

export function EmptyState({ title, description, action }) {
  return (
    <Card className="p-8 text-center">
      <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}
