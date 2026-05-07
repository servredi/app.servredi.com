import { useGetMyProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function Settings() {
  const { data: profile, isLoading } = useGetMyProfile();

  if (isLoading) {
    return <div className="space-y-6 max-w-2xl">
      <Skeleton className="h-8 w-32 bg-slate-800" />
      <Skeleton className="h-64 w-full bg-slate-800" />
    </div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Manage your profile and preferences.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400">First Name</label>
              <p className="text-white mt-1">{profile?.firstName || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Last Name</label>
              <p className="text-white mt-1">{profile?.lastName || '-'}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-400">Email Address</label>
              <p className="text-white mt-1">{profile?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Phone</label>
              <p className="text-white mt-1">{profile?.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Role</label>
              <p className="text-white mt-1 capitalize">{profile?.role}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-400">Organization</label>
              <p className="text-white mt-1">{profile?.organizationName || 'Not assigned'}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-800">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Edit via Clerk
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}