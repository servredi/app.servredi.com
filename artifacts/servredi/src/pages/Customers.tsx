import { useListCustomers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Search, Building2, Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Customers() {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useListCustomers({
    search: search.length > 2 ? search : undefined
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-slate-400">Manage client directory.</p>
        </div>
        <div className="flex gap-4">
          <Button className="bg-orange-500 text-white hover:bg-orange-600">
            New Customer
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-900 border-slate-800 text-white w-full"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl bg-slate-900 border border-slate-800" />
          ))
        ) : customers?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
            No customers found.
          </div>
        ) : (
          customers?.map((customer) => (
            <Link key={customer.id} href={`/customers/${customer.id}`} className="block group">
              <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors h-full">
                <CardContent className="p-5">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg text-white group-hover:text-orange-400 transition-colors">{customer.name}</h3>
                    {customer.company && (
                      <div className="flex items-center text-slate-400 text-sm mt-1">
                        <Building2 className="h-3 w-3 mr-1.5" />
                        {customer.company}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-slate-400">
                    {customer.phone && (
                      <div className="flex items-center">
                        <Phone className="h-3.5 w-3.5 mr-2 text-slate-500" />
                        {customer.phone}
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center truncate">
                        <Mail className="h-3.5 w-3.5 mr-2 text-slate-500 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {(customer.address || customer.city) && (
                      <div className="flex items-start">
                        <MapPin className="h-3.5 w-3.5 mr-2 text-slate-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-tight">
                          {[customer.address, customer.city, customer.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Total Jobs</span>
                    <span className="font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full">{customer.totalJobs}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
