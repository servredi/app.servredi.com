import { useGetSchedule, useGetTechniciansList, ScheduleEntry } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek, addDays } from "date-fns";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function Schedule() {
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const endDate = addDays(startDate, 6);

  const { data: schedule, isLoading } = useGetSchedule({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    technicianId: selectedTech !== "all" ? Number(selectedTech) : undefined
  });

  const { data: techs } = useGetTechniciansList();

  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-slate-400">Week of {format(startDate, "MMM d, yyyy")}</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedTech} onValueChange={setSelectedTech}>
            <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="All Technicians" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white">
              <SelectItem value="all">All Technicians</SelectItem>
              {techs?.map(tech => (
                <SelectItem key={tech.id} value={tech.id.toString()}>{tech.firstName} {tech.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((day) => {
          const dayJobs = schedule?.filter(j => j.scheduledDate?.startsWith(format(day, 'yyyy-MM-dd'))) || [];
          
          return (
            <Card key={day.toISOString()} className="bg-slate-900 border-slate-800 h-full flex flex-col">
              <CardHeader className="p-3 border-b border-slate-800 flex-shrink-0">
                <CardTitle className="text-center text-sm">
                  <div className="text-slate-400">{format(day, 'EEE')}</div>
                  <div className={`text-xl mt-1 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-orange-500 font-bold' : 'text-white'}`}>
                    {format(day, 'd')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 flex-grow overflow-y-auto space-y-2 min-h-[200px]">
                {isLoading ? (
                  <Skeleton className="h-20 w-full bg-slate-800" />
                ) : dayJobs.length > 0 ? (
                  dayJobs.map(job => (
                    <div key={job.jobId} className="bg-slate-800 p-2 rounded-md border border-slate-700 text-xs">
                      <div className="font-semibold text-white truncate">{job.title}</div>
                      <div className="text-slate-400 truncate">{job.customerName}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-slate-300">{job.startTime ? format(new Date(`2000-01-01T${job.startTime}`), 'h:mm a') : 'TBD'}</span>
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-slate-600 text-slate-300">
                          {job.technicianName || 'Unassigned'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 text-xs py-4">No jobs</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}