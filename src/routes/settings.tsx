import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/ui";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Domain Manager AI" }, { name: "description", content: "Settings in Domain Manager AI." }, { property: "og:title", content: "Settings — Domain Manager AI" }, { property: "og:description", content: "Settings in Domain Manager AI." }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Settings" />
      <EmptyState title="This page is not built yet" body="The building blocks are ready; this screen still needs to be finished." />
    </div>
  );
}
