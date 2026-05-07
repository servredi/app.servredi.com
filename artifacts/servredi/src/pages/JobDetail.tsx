import { useGetJob, useUpdateJobStatus, getGetJobQueryKey, UpdateJobStatusBodyStatus } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, User, ArrowLeft, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function JobDetail() {
  const params = useParams();
  const jobId = Number(params.id);
  const { data: job, isLoading } = useGetJob(jobId, { query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId) } });
  const updateStatus = useUpdateJobStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ 
      id: jobId, 
      data: { status: newStatus as UpdateJobStatusBodyStatus } 
    }, {
      onSuccess: (updatedJob) => {
        toast({
          title: "Status updated",
          description: `Job status changed to ${newStatus.replace('_', ' ')}`,
        });
        queryClient.setQueryData(getGetJobQueryKey(jobId), updatedJob);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update job status",
          variant: "destructive"
        });
      }
    });
  };

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

  if (isLoading) {
    return <div className="space-y-6">
      <Skeleton className="h-8 w-32 bg-slate-800" />
      <Skeleton className="h-40 w-full bg-slate-800" />
    </div>;
  }

  if (!job) return <div className="text-white">Job not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jobs" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {job.title}
            <Badge variant="outline" className={`${getStatusColor(job.status)} uppercase text-xs`}>
              {job.status.replace('_', ' ')}
            </Badge>
          </h1>
        </div>
        <div className="w-48">
          <Select value={job.status} onValueChange={handleStatusChange} disabled={updateStatus.isPending}>
            <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white">
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.description && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-1">Description</h4>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
              {job.notes && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-1">Notes</h4>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-800/50 p-3 rounded-md">{job.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-orange-500" />
                Tasks
              </CardTitle>
              <Button variant="outline" size="sm" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {/* @ts-ignore - tasks might not be populated in basic getJob, might need getJobWithTasks or task list endpoint, using placeholder for design task */}
              <div className="text-center py-6 text-slate-500 text-sm">No tasks added yet.</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Customer</p>
                  <Link href={`/customers/${job.customerId}`} className="text-sm text-orange-400 hover:underline">
                    {job.customerName}
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Location</p>
                  <p className="text-sm text-slate-400">{job.address || 'No address provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Schedule</p>
                  <p className="text-sm text-slate-400">
                    {job.scheduledDate ? format(new Date(job.scheduledDate), 'MMM d, yyyy') : 'Unscheduled'}
                    {job.startTime && ` at ${format(new Date(`2000-01-01T${job.startTime}`), 'h:mm a')}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Time Estimate</p>
                  <p className="text-sm text-slate-400">{job.estimatedHours ? `${job.estimatedHours} hours` : 'Not estimated'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-300">Assigned Tech</p>
                  <p className="text-sm text-slate-400">{job.technicianName || 'Unassigned'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}