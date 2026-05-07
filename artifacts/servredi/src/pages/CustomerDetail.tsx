import { useGetCustomer, useGetCustomerJobs, getGetCustomerQueryKey, getGetCustomerJobsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, Phone, Mail, MapPin, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function CustomerDetail() {
  const params = useParams();
  const customerId = Number(params.id);
  
  const { data: customer, isLoading } = useGetCustomer(customerId, { query: { enabled: !!customerId, queryKey: getGetCustomerQueryKey(customerId) } });
  const { data: jobs, isLoading: jobsLoading } = useGetCustomerJobs(customerId, { query: { enabled: !!customerId, queryKey: getGetCustomerJobsQueryKey(customerId) } });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'scheduled': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'in_progress': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
      case 'completed': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      case 'cancelled': return 'bg-red-400/10 text-red-400 border-red-400/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  if (isLoading) {
    return <div className="space-y-6">
      <Skeleton className="h-8 w-32 bg-slate-800" />
      <Skeleton className="h-40 w-full bg-slate-800" />
    </div>;
  }

  if (!customer) return <div className="text-white">Customer not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {customer.name}
          </h1>
          {customer.company && (
            <p className="text-slate-400 flex items-center mt-1 text-sm">
              <Building2 className="h-4 w-4 mr-1.5" />
              {customer.company}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.phone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 text-slate-400 mr-3" />
                  <a href={`tel:${customer.phone}`} className="text-orange-400 hover:underline">{customer.phone}</a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 text-slate-400 mr-3" />
                  <a href={`mailto:${customer.email}`} className="text-orange-400 hover:underline">{customer.email}</a>
                </div>
              )}
              <div className="flex items-start text-sm">
                <MapPin className="h-4 w-4 text-slate-400 mr-3 mt-0.5 shrink-0" />
                <span className="text-slate-300">
                  {[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ') || 'No address provided'}
                </span>
              </div>
            </CardContent>
          </Card>

          {customer.notes && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-orange-500" />
                Job History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="space-y-3">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-slate-800" />)}
                </div>
              ) : jobs?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No jobs for this customer yet.</div>
              ) : (
                <div className="space-y-3">
                  {jobs?.map(job => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block p-4 bg-slate-800 rounded-lg hover:bg-slate-700/80 transition-colors border border-slate-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white">{job.title}</h4>
                        <Badge variant="outline" className={`${getStatusColor(job.status)} uppercase text-[10px]`}>
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{job.scheduledDate ? format(new Date(job.scheduledDate), 'MMM d, yyyy') : 'No date'}</span>
                        <span>Tech: {job.technicianName || 'Unassigned'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}