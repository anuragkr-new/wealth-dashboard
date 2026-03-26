import { cn } from "@/lib/utils";

type SectionLabelProps = {
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
};

export function SectionLabel({
  children,
  className,
  pulse = true,
}: SectionLabelProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-accent/30 bg-accent/5 px-5 py-2",
        className
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full bg-accent",
          pulse && "motion-safe:animate-pulse-dot"
        )}
        aria-hidden
      />
      <span className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-accent">
        {children}
      </span>
    </div>
  );
}
