import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Clock,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGetMyProfile } from "@workspace/api-client-react";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: profile } = useGetMyProfile();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Schedule", href: "/schedule", icon: CalendarDays },
    { name: "Jobs", href: "/jobs", icon: ClipboardList },
    { name: "Time Tracking", href: "/time-tracking", icon: Clock },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Quotes", href: "/quotes", icon: FileText },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const mobileNav = [
    { name: "Dash", href: "/dashboard", icon: LayoutDashboard },
    { name: "Schedule", href: "/schedule", icon: CalendarDays },
    { name: "Jobs", href: "/jobs", icon: ClipboardList },
    { name: "Time", href: "/time-tracking", icon: Clock },
  ];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navigation.map((item) => {
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClick}
            className={`group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
              isActive
                ? "bg-slate-800 text-orange-500"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <item.icon
              className={`h-6 w-6 shrink-0 ${
                isActive ? "text-orange-500" : "text-slate-400 group-hover:text-white"
              }`}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50 flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 bg-slate-900 border-r border-slate-800">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="ServRedi" className="h-8" />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  <NavLinks />
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-white bg-slate-800/50 rounded-md">
                  {user?.imageUrl && (
                    <img
                      className="h-8 w-8 rounded-full bg-slate-800"
                      src={user.imageUrl}
                      alt=""
                    />
                  )}
                  <div className="flex flex-col">
                    <span aria-hidden="true">{user?.fullName || "User"}</span>
                    <span className="text-xs text-slate-400 font-normal capitalize">{profile?.role || "Loading..."}</span>
                  </div>
                  <button onClick={() => signOut()} className="ml-auto text-slate-400 hover:text-orange-500">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Top Header */}
      <div className="md:hidden flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sticky top-0 z-40">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="ServRedi" className="h-6" />
        <div className="flex items-center gap-4">
          {user?.imageUrl && (
            <img
              className="h-8 w-8 rounded-full bg-slate-800"
              src={user.imageUrl}
              alt=""
            />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 overflow-y-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 pb-safe">
        <div className="flex justify-around items-center h-16">
          {mobileNav.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? "text-orange-500" : "text-slate-400"
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}

          {/* Mobile Menu Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-white">
                <Menu className="h-6 w-6" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-slate-900 border-slate-800 p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-800">
                  <h2 className="text-lg font-semibold text-white">Menu</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <ul className="space-y-2">
                    <NavLinks />
                  </ul>
                </div>
                <div className="p-4 border-t border-slate-800">
                  <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => signOut()}>
                    <LogOut className="mr-2 h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
