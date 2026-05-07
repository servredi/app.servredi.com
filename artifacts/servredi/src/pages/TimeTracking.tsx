import { useGetActiveTimeEntry, useClockOut, useCreateTimeEntry, useUpdateBreak, getGetActiveTimeEntryQueryKey, useListJobs } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Coffee, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TimeTracking() {
  const { data: activeEntryObj, isLoading } = useGetActiveTimeEntry();
  const activeEntry = activeEntryObj?.entry;
  
  const createTimeEntry = useCreateTimeEntry();
  const clockOut = useClockOut();
  const updateBreak = useUpdateBreak();
  const { data: jobs } = useListJobs({ status: "in_progress" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedJob, setSelectedJob] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeEntry && activeEntry.isActive) {
      // Calculate initial elapsed time based on clockInAt, assuming not on break
      // For a real app, need to account for past breaks accurately
      const updateTimer = () => {
        const start = new Date(activeEntry.clockInAt).getTime();
        const now = new Date().getTime();
        const breakSeconds = (activeEntry.breakMinutes || 0) * 60;
        setElapsedSeconds(Math.floor((now - start) / 1000) - breakSeconds);
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  const handleClockIn = () => {
    if (!selectedJob) {
      toast({ title: "Select a job", description: "Please select a job to clock into.", variant: "destructive" });
      return;
    }
    
    // Fake GPS for MVP
    const lat = 37.7749;
    const lng = -122.4194;

    createTimeEntry.mutate({
      data: {
        jobId: Number(selectedJob),
        latitude: lat,
        longitude: lng,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveTimeEntryQueryKey() });
        toast({ title: "Clocked In", description: "Your time is now being tracked." });
      }
    });
  };

  const handleClockOut = () => {
    if (!activeEntry) return;

    clockOut.mutate({
      id: activeEntry.id,
      data: {
        notes: "Completed shift",
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveTimeEntryQueryKey() });
        toast({ title: "Clocked Out", description: "Your time has been saved." });
        setSelectedJob("");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 mt-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Time Clock</h1>
        <p className="text-slate-400">Track your time accurately for payroll and billing.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 shadow-2xl">
        <CardContent className="p-8 md:p-12 text-center space-y-8">
          
          <div className="font-mono text-7xl font-bold tracking-tight text-white tabular-nums">
            {formatDuration(elapsedSeconds)}
          </div>

          {!activeEntry ? (
            <div className="space-y-6 max-w-sm mx-auto">
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium text-slate-300">Select Job</label>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-12">
                    <SelectValue placeholder="Choose a job..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {jobs?.map(j => (
                      <SelectItem key={j.id} value={j.id.toString()}>{j.title}</SelectItem>
                    ))}
                    {jobs?.length === 0 && <SelectItem value="none" disabled>No active jobs found</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleClockIn}
                disabled={createTimeEntry.isPending || !selectedJob}
                className="w-full h-16 text-lg bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all active:scale-95"
              >
                <Play className="mr-2 h-6 w-6" />
                Clock In
              </Button>
            </div>
          ) : (
            <div className="space-y-6 max-w-sm mx-auto">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-left">
                <div className="text-sm text-slate-400 mb-1">Currently Tracking</div>
                <div className="font-medium text-white text-lg truncate">{activeEntry.jobTitle || "General Time"}</div>
                <div className="flex items-center text-xs text-slate-500 mt-2">
                  <MapPin className="h-3 w-3 mr-1" /> GPS Location Captured
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline"
                  className="h-16 text-base bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  Break
                </Button>
                <Button 
                  onClick={handleClockOut}
                  disabled={clockOut.isPending}
                  className="h-16 text-base bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                >
                  <Square className="mr-2 h-5 w-5" />
                  Clock Out
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}