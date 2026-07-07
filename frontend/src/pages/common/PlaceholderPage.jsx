import { EmptyState } from "../../components/ui/EmptyState";
import { SectionHeading } from "../../components/ui/SectionHeading";

export function PlaceholderPage({ title }) {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Workspace"
        title={title}
        description="This workspace section is reserved for the next stage of the product journey."
      />
      <EmptyState title={title} description="This module is coming soon." />
    </div>
  );
}
