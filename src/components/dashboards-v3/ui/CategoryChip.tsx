import { CATEGORY_CHIP, categoryName, type CategoryId } from "@/lib/dashboards-v3/catalogue";
import { cn } from "@/lib/utils";

/** A category's coloured chip. The name is always written out, so the colour is never the only cue. */
export function CategoryChip({ category, className }: { category: CategoryId; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", CATEGORY_CHIP[category], className)}>
      {categoryName(category)}
    </span>
  );
}
