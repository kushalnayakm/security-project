import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { SectionHeading } from "../../components/ui/SectionHeading";

export function EntityCertificatesPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Entity"
        title="Certificates"
        description="Manage certificate-related work for completed customer registrations."
      />
      <Card className="p-6">
        <EmptyState title="Certificates coming soon" description="This module will be available in an upcoming release." />
      </Card>
    </div>
  );
}
