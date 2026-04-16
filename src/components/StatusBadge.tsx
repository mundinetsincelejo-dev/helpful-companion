import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { TicketStatus, TicketPriority } from '@/lib/mock-data';
import { statusLabels, priorityLabels } from '@/lib/mock-data';

const statusStyles: Record<TicketStatus, string> = {
  abierto: 'bg-info/15 text-info border-info/30',
  en_proceso: 'bg-warning/15 text-warning-foreground border-warning/30',
  pausado: 'bg-muted text-muted-foreground border-border',
  cerrado: 'bg-success/15 text-success border-success/30',
};

const priorityStyles: Record<TicketPriority, string> = {
  baja: 'bg-muted text-muted-foreground border-border',
  media: 'bg-info/15 text-info border-info/30',
  alta: 'bg-warning/15 text-warning-foreground border-warning/30',
  critica: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', priorityStyles[priority])}>
      {priorityLabels[priority]}
    </Badge>
  );
}
