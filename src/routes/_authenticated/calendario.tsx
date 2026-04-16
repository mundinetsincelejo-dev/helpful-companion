import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { serviceTypeLabels, type Ticket } from '@/lib/mock-data';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isSameDay, getDay, parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, MapPin, Loader2 } from 'lucide-react';
import { useTickets } from '@/hooks/use-tickets';

export const Route = createFileRoute('/_authenticated/calendario')({
  component: CalendarioPage,
  head: () => ({
    meta: [
      { title: 'Calendario — ServiTech' },
      { name: 'description', content: 'Agendamiento de servicios técnicos' },
    ],
  }),
});

function CalendarioPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { user } = Route.useRouteContext();
  const { data: tickets = [], isLoading } = useTickets(user.role === 'technician' ? user.id : undefined);

  const scheduledTickets = tickets.filter((t) => t.scheduled_date);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = getDay(monthStart);
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  const getTicketsForDay = (date: Date) =>
    scheduledTickets.filter((t) => t.scheduled_date && isSameDay(parseISO(t.scheduled_date), date));

  const selectedDayTickets = selectedDate ? getTicketsForDay(selectedDate) : [];

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-heading font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const dayTickets = getTicketsForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center rounded-lg p-1.5 text-sm transition-colors hover:bg-accent ${
                    isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
                  } ${isToday && !isSelected ? 'ring-1 ring-primary' : ''}`}
                >
                  <span className="font-medium">{format(day, 'd')}</span>
                  {dayTickets.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayTickets.slice(0, 3).map((_, i) => (
                        <span key={i} className={`h-1 w-1 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-sm">
          {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
        </h3>

        {selectedDayTickets.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin servicios agendados</p>
        )}

        {selectedDayTickets
          .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))
          .map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.clients?.company}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {t.scheduled_time && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.scheduled_time}</span>
                  )}
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.clients?.address}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{serviceTypeLabels[t.service_type]}</span>
                  <PriorityBadge priority={t.priority} />
                  <span className="text-muted-foreground ml-auto">{t.technicians?.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
