import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/ui";

export const Route = createFileRoute("/domains/")({
  head: () => ({ meta: [{ title: "Domains — Domain Manager AI" }, { name: "description", content: "Domains in Domain Manager AI." }, { property: "og:title", content: "Domains — Domain Manager AI" }, { property: "og:description", content: "Domains in Domain Manager AI." }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Domains" />
      <EmptyState title="This page is not built yet" body="The building blocks are ready; this screen still needs to be finished." />
    </div>
  );
}
