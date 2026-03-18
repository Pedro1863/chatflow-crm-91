import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  className?: string;
  children?: React.ReactNode;
}

const SectionHeader = ({ icon: Icon, title, className, children }: SectionHeaderProps) => {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
};

export default SectionHeader;
