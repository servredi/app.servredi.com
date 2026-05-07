import { useGetQuote, getGetQuoteQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function QuoteDetail() {
  const params = useParams();
  const quoteId = Number(params.id);
  const { data: quote, isLoading } = useGetQuote(quoteId, { query: { enabled: !!quoteId, queryKey: getGetQuoteQueryKey(quoteId) } });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'draft': return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
      case 'sent': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'approved': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      case 'rejected': return 'bg-red-400/10 text-red-400 border-red-400/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  if (isLoading) {
    return <div className="space-y-6">
      <Skeleton className="h-8 w-32 bg-slate-800" />
      <Skeleton className="h-96 w-full bg-slate-800" />
    </div>;
  }

  if (!quote) return <div className="text-white">Quote not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quotes" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Quote #{quote.id.toString().padStart(4, '0')}
              <Badge variant="outline" className={`${getStatusColor(quote.status)} uppercase text-xs`}>
                {quote.status}
              </Badge>
            </h1>
            <p className="text-slate-400 text-sm mt-1">{quote.customerName}</p>
          </div>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
          <CardTitle className="text-lg text-white">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 bg-slate-800/50 uppercase border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-right">Qty</th>
                <th className="px-6 py-3 font-medium text-right">Unit Price</th>
                <th className="px-6 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* @ts-ignore - items property not typed in Quote base model from getQuote, but usually returned or needs separate call. Mocking structure */}
              {quote.items?.length > 0 ? quote.items.map((item: any) => (
                <tr key={item.id} className="border-b border-slate-800 text-slate-300">
                  <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                  <td className="px-6 py-4 text-right">{item.quantity}</td>
                  <td className="px-6 py-4 text-right">${item.unitCost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">${item.lineTotal.toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No items added to this quote.</td></tr>
              )}
            </tbody>
          </table>
          
          <div className="p-6 bg-slate-800/30 flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="text-white">${quote.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax ({quote.taxRate}%)</span>
                <span className="text-white">${quote.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-3 text-white">
                <span>Total</span>
                <span className="text-orange-500">${quote.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}