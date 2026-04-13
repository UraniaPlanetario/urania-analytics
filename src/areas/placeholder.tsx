import { Construction } from 'lucide-react';

export default function AreaPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Construction size={48} className="text-muted-foreground mb-4" />
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-2">Em desenvolvimento</p>
    </div>
  );
}
