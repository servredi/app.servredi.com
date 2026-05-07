import { useGetDashboardSummary, useGetRecentActivity, useGetJobsToday } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, Briefcase, CheckCircle2, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: jobsToday, isLoading: jobsLoading } = useGetJobsToday();

  const stats = [
    { name: "Jobs Today", value: summary?.jobsToday, icon: Briefcase, color: "text-blue-500" },
    { name: "In Progress", value: summary?.jobsInProgress, icon: Activity, color: "text-amber-500" },
    { name: "Completed", value: summary?.jobsCompleted, icon: CheckCircle2, color: "text-emerald-500" },
    { name: "Active Techs", value: summary?.activeTechnicians, icon: Users, color: "text-purple-500" },
    { name: "Hours Today", value: summary?.hoursToday?.toFixed(1), icon: Clock, color: "text-orange-500" },
    { name: "Open Quotes ($)", value: `$${summary?.openQuotesValue?.toLocaleString() || 0}`, icon: DollarSign, color: "text-slate-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Overview of today's field operations.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {summaryLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-slate-800" />)
        ) : (
          stats.map((stat) => (
            <Card key={stat.name} className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-400">{stat.name}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value || 0}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-slate-800" />)}
              </div>
            ) : jobsToday?.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No jobs scheduled for today.</div>
            ) : (
              <div className="space-y-4">
                {jobsToday?.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-white">{job.title}</p>
                      <p className="text-sm text-slate-400">{job.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{job.startTime ? format(new Date(`2000-01-01T${job.startTime}`), 'h:mm a') : 'TBD'}</p>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        job.status === 'in_progress' ? 'bg-amber-400/10 text-amber-400 ring-amber-400/20' :
                        job.status === 'completed' ? 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/20' :
                        'bg-blue-400/10 text-blue-400 ring-blue-400/20'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 bg-slate-800" />)}
              </div>
            ) : activity?.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No recent activity.</div>
            ) : (
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {activity?.map((item, itemIdx) => (
                    <li key={item.id}>
                      <div className="relative pb-8">
                        {itemIdx !== (activity?.length ?? 0) - 1 ? (
                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-800" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center ring-8 ring-slate-900">
                              <Activity className="h-4 w-4 text-orange-500" />
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-slate-300">{item.description}</p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-slate-500">
                              {format(new Date(item.timestamp), 'h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
