import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { statusLabels, type Ticket, type TicketStatus } from '@/lib/mock-data';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { Link } from '@tanstack/react-router';
import { ClipboardList, CalendarClock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTickets } from '@/hooks/use-tickets';

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: 'Dashboard — ServiTech' },
      { name: 'description', content: 'Panel operativo de gestión de servicio técnico' },
    ],
  }),
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { data: tickets = [], isLoading } = useTickets(user.role === 'technician' ? user.technicianId : undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const open = tickets.filter((t) => t.status === 'abierto').length;
  const inProgress = tickets.filter((t) => t.status === 'en_proceso').length;
  const paused = tickets.filter((t) => t.status === 'pausado').length;
  const closed = tickets.filter((t) => t.status === 'cerrado').length;
  const today = new Date().toISOString().split('T')[0];
  const todayScheduled = tickets.filter((t) => t.scheduled_date === today);
  const criticalOrHigh = tickets.filter(
    (t) => (t.priority === 'alta' || t.priority === 'critica') && t.status !== 'cerrado'
  );

  const statusData = [
    { name: 'Abierto', value: open, fill: 'oklch(0.55 0.15 240)' },
    { name: 'En Proceso', value: inProgress, fill: 'oklch(0.7 0.18 75)' },
    { name: 'Pausado', value: paused, fill: 'oklch(0.7 0.02 240)' },
    { name: 'Cerrado', value: closed, fill: 'oklch(0.55 0.17 150)' },
  ];

  const techLoad = tickets
    .filter((t) => t.status !== 'cerrado')
    .reduce<Record<string, number>>((acc, t) => {
      const techName = t.technicians?.name || 'Sin asignar';
      acc[techName] = (acc[techName] || 0) + 1;
      return acc;
    }, {});

  const techData = Object.entries(techLoad).map(([name, count]) => ({
    name: name === 'Sin asignar' ? name : name.split(' ')[0],
    tickets: count,
  }));

  const kpis = [
    { label: 'Pendientes', value: open + inProgress + paused, icon: ClipboardList, accent: 'text-info' },
    { label: 'Agendados Hoy', value: todayScheduled.length, icon: CalendarClock, accent: 'text-warning-foreground' },
    { label: 'Alta Prioridad', value: criticalOrHigh.length, icon: AlertTriangle, accent: 'text-destructive' },
    { label: 'Cerrados', value: closed, icon: CheckCircle2, accent: 'text-success' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-lg bg-muted p-2.5 ${kpi.accent}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado de Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Carga por Técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={techData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="oklch(0.45 0.15 250)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Cliente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 5).map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-xs">#{t.id}</td>
                    <td className="max-w-[200px] truncate px-4 py-3">
                      <Link to="/tickets" className="hover:text-primary transition-colors">{t.title}</Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{t.clients?.company}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="hidden px-4 py-3 md:table-cell"><PriorityBadge priority={t.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
