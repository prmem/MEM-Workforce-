import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <EmptyState title="Page not found">This page does not exist, or you do not have access to it.</EmptyState>
      <LinkButton href="/dashboard" variant="secondary">Go to dashboard</LinkButton>
    </div>
  );
}
