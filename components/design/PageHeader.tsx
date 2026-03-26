import { SectionLabel } from "@/components/design/SectionLabel";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  label: string;
  children: React.ReactNode;
  description?: string;
  className?: string;
};

/**
 * Display headline is fully composable (use GradientText inside children).
 */
export function PageHeader({
  label,
  children,
  description,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      <SectionLabel>{label}</SectionLabel>
      <div className="space-y-3">
        <h1 className="font-display text-[2.75rem] font-normal leading-[1.05] tracking-[-0.02em] text-foreground sm:text-5xl lg:text-[3.25rem]">
          {children}
        </h1>
        {description && (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
