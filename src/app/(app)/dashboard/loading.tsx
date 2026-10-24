import { ListPageSkeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <ListPageSkeleton />
    </div>
  );
}
