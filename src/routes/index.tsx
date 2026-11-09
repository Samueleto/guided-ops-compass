import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/ui";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Domain Manager AI" }, { name: "description", content: "Dashboard in Domain Manager AI." }, { property: "og:title", content: "Dashboard — Domain Manager AI" }, { property: "og:description", content: "Dashboard in Domain Manager AI." }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Dashboard" />
      <EmptyState title="This page is not built yet" body="The building blocks are ready; this screen still needs to be finished." />
    </div>
  );
}
