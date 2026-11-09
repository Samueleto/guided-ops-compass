import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/ui";

export const Route = createFileRoute("/rotation")({
  head: () => ({ meta: [{ title: "Rotation — Domain Manager AI" }, { name: "description", content: "Rotation in Domain Manager AI." }, { property: "og:title", content: "Rotation — Domain Manager AI" }, { property: "og:description", content: "Rotation in Domain Manager AI." }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Rotation" />
      <EmptyState title="This page is not built yet" body="The building blocks are ready; this screen still needs to be finished." />
    </div>
  );
}
