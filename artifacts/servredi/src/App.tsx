import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
  },
  variables: {
    colorPrimary: "#F97316",
    colorForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#ef4444",
    colorBackground: "#1e293b",
    colorInput: "#0f172a",
    colorInputForeground: "#f1f5f9",
    colorNeutral: "#334155",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-slate-800 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-100",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-slate-200",
    formFieldLabel: "text-slate-300",
    footerActionLink: "text-orange-400",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-orange-400",
    formFieldSuccessText: "text-green-400",
    alertText: "text-red-400",
    logoBox: "mb-2",
    logoImage: "h-10",
    socialButtonsBlockButton: "bg-slate-700 border-slate-600",
    formButtonPrimary: "bg-orange-500 hover:bg-orange-600",
    formFieldInput: "bg-slate-900 border-slate-600 text-slate-100",
    footerAction: "bg-slate-900",
    dividerLine: "bg-slate-600",
    alert: "bg-red-950 border-red-800",
    otpCodeFieldInput: "bg-slate-900 border-slate-600 text-slate-100",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 text-center">
      <img src={`${basePath}/logo.png`} alt="ServRedi" className="h-16 mb-8" />
      <h1 className="text-4xl font-bold tracking-tight text-slate-100 sm:text-6xl">
        Command Center for <span className="text-orange-500">Field Ops</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
        A tight, operational cockpit for field service teams. Dispatch technicians, track time, and manage jobs with speed and precision.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a href={`${basePath}/sign-in`} className="rounded-md bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">
          Sign In
        </a>
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

import { Dashboard } from "./pages/Dashboard";
import { Schedule } from "./pages/Schedule";
import { Jobs } from "./pages/Jobs";
import { JobDetail } from "./pages/JobDetail";
import { TimeTracking } from "./pages/TimeTracking";
import { Customers } from "./pages/Customers";
import { CustomerDetail } from "./pages/CustomerDetail";
import { Quotes } from "./pages/Quotes";
import { QuoteDetail } from "./pages/QuoteDetail";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Shell } from "./components/layout/Shell";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useUser();
  
  if (!isLoaded) return <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-400">Loading...</div>;
  if (!isSignedIn) return <Redirect to="/" />;
  
  return (
    <Shell>
      <Component />
    </Shell>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
            <Route path="/schedule" component={() => <ProtectedRoute component={Schedule} />} />
            <Route path="/jobs" component={() => <ProtectedRoute component={Jobs} />} />
            <Route path="/jobs/:id" component={() => <ProtectedRoute component={JobDetail} />} />
            <Route path="/time-tracking" component={() => <ProtectedRoute component={TimeTracking} />} />
            <Route path="/customers" component={() => <ProtectedRoute component={Customers} />} />
            <Route path="/customers/:id" component={() => <ProtectedRoute component={CustomerDetail} />} />
            <Route path="/quotes" component={() => <ProtectedRoute component={Quotes} />} />
            <Route path="/quotes/:id" component={() => <ProtectedRoute component={QuoteDetail} />} />
            <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
            <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
            <Route>
              <div className="flex min-h-[100dvh] items-center justify-center bg-background text-slate-400">404 Not Found</div>
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;