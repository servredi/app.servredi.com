import { useGetEmployeeHoursReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export function Reports() {
  const startDate = startOfMonth(new Date());
  const endDate = endOfMonth(new Date());
  
  const { data: hoursReport, isLoading } = useGetEmployeeHoursReport({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  const chartData = hoursReport?.map(row => ({
    name: row.technicianName,
    netHours: Number(row.netHours.toFixed(1)),
    breakHours: Number(row.breakHours.toFixed(1)),
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400">Metrics for {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Technician Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full bg-slate-800" />
          ) : chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-slate-500">No data available for this period.</div>
          ) : (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar dataKey="netHours" name="Net Hours" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="breakHours" name="Break Hours" fill="#334155" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}