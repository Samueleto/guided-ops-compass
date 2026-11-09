import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/ui";

export const Route = createFileRoute("/buy")({
  head: () => ({ meta: [{ title: "Buy & Prepare — Domain Manager AI" }, { name: "description", content: "Buy & Prepare in Domain Manager AI." }, { property: "og:title", content: "Buy & Prepare — Domain Manager AI" }, { property: "og:description", content: "Buy & Prepare in Domain Manager AI." }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Buy & Prepare" />
      <EmptyState title="This page is not built yet" body="The building blocks are ready; this screen still needs to be finished." />
    </div>
  );
}
