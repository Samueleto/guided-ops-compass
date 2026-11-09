import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/ui";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity — Domain Manager AI" }, { name: "description", content: "Activity in Domain Manager AI." }, { property: "og:title", content: "Activity — Domain Manager AI" }, { property: "og:description", content: "Activity in Domain Manager AI." }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Activity" />
      <EmptyState title="This page is not built yet" body="The building blocks are ready; this screen still needs to be finished." />
    </div>
  );
}
