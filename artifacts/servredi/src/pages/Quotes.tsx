import { useListQuotes } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export function Quotes() {
  const { data: quotes, isLoading } = useListQuotes();

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'draft': return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
      case 'sent': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'approved': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      case 'rejected': return 'bg-red-400/10 text-red-400 border-red-400/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
          <p className="text-slate-400">Estimates and proposals for customers.</p>
        </div>
        <Button className="bg-orange-500 text-white hover:bg-orange-600">
          Create Quote
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-4"><Skeleton className="h-16 bg-slate-800" /></div>
              ))
            ) : quotes?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No quotes found.</div>
            ) : (
              quotes?.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-800/50 transition-colors gap-4"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-slate-500">#{quote.id.toString().padStart(4, '0')}</span>
                      <h3 className="font-medium text-white">{quote.customerName}</h3>
                      <Badge variant="outline" className={`${getStatusColor(quote.status)} uppercase text-[10px]`}>
                        {quote.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">Created on {format(new Date(quote.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-lg">${quote.total.toFixed(2)}</div>
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
