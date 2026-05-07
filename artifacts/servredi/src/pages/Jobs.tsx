import { useListJobs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function Jobs() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: jobs, isLoading } = useListJobs({
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'scheduled': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'in_progress': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
      case 'completed': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      case 'cancelled': return 'bg-red-400/10 text-red-400 border-red-400/20';
      case 'on_hold': return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'low': return 'text-slate-400';
      case 'medium': return 'text-blue-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-500 font-bold';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-slate-400">Manage and track all service jobs.</p>
        </div>
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Link
            href="/jobs/new"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 h-10 px-4 py-2 transition-colors"
          >
            New Job
          </Link>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4 bg-slate-800" />
                    <Skeleton className="h-4 w-1/2 bg-slate-800" />
                  </div>
                </div>
              ))
            ) : jobs?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No jobs found.</div>
            ) : (
              jobs?.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-800/50 transition-colors gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                      <Badge variant="outline" className={`${getStatusColor(job.status)} uppercase text-[10px]`}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{job.customerName} {job.address ? `• ${job.address}` : ''}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">Tech:</span>
                        <span className="text-slate-300">{job.technicianName || 'Unassigned'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">Priority:</span>
                        <span className={`capitalize ${getPriorityColor(job.priority)}`}>{job.priority}</span>
                      </span>
                      {job.scheduledDate && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400">Date:</span>
                          <span className="text-slate-300">{format(new Date(job.scheduledDate), 'MMM d, yyyy')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
