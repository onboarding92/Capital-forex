import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { NotificationToast } from "@/components/NotificationToast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Eager load critical pages (auth, home, 404)
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import NotFound from "./pages/NotFound";

// Lazy load heavy/admin pages for code-splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Trading = lazy(() => import("./pages/Trading"));
const Staking = lazy(() => import("./pages/Staking"));
const Deposit = lazy(() => import("./pages/Deposit"));
const Withdrawal = lazy(() => import("./pages/Withdrawal"));
const KYC = lazy(() => import("./pages/KYC"));
const Support = lazy(() => import("./pages/Support"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Setup2FA = lazy(() => import("./pages/Setup2FA"));
const HotWallets = lazy(() => import("./pages/admin/HotWallets"));
const TransactionLogs = lazy(() => import("./pages/admin/TransactionLogs"));
const WalletManagement = lazy(() => import("./pages/admin/WalletManagement"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const UsersManagement = lazy(() => import("./pages/admin/Users"));
const Trade = lazy(() => import("./pages/Trade"));
const Profile = lazy(() => import("./pages/Profile"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const ReferralDashboard = lazy(() => import("./pages/ReferralDashboard"));
const KYCSubmission = lazy(() => import("./pages/KYCSubmission"));
const KYCReview = lazy(() => import("./pages/admin/KYCReview"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const WebSocketDashboard = lazy(() => import("./pages/admin/WebSocketDashboard"));
const APIKeys = lazy(() => import("./pages/APIKeys"));
const CopyTrading = lazy(() => import("./pages/CopyTrading"));
const MarginTrading = lazy(() => import("./pages/MarginTrading"));
const FuturesTrading = lazy(() => import("./pages/FuturesTrading"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth/login" component={Login} />
        <Route path="/auth/register" component={Register} />
        <Route path="/auth/verify-email" component={VerifyEmail} />
        <Route path="/auth/forgot-password" component={ForgotPassword} />
        <Route path="/auth/reset-password" component={ResetPassword} />
        <Route path="/setup-2fa" component={Setup2FA} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/trading" component={Trading} />
        <Route path="/trade" component={Trade} />
        <Route path="/staking" component={Staking} />
        <Route path="/deposit" component={Deposit} />
        <Route path="/withdrawal" component={Withdrawal} />
        <Route path="/kyc" component={KYC} />
        <Route path="/kyc/submit" component={KYCSubmission} />
        <Route path="/support" component={Support} />
        <Route path="/profile" component={Profile} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/settings" component={AccountSettings} />
        <Route path="/api-keys" component={APIKeys} />
        <Route path="/copy-trading" component={CopyTrading} />
        <Route path="/margin-trading" component={MarginTrading} />
        <Route path="/futures" component={FuturesTrading} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/analytics" component={AdvancedAnalytics} />
        <Route path="/transactions" component={TransactionHistory} />
        <Route path="/referrals" component={ReferralDashboard} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/panel" component={AdminPanel} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/system-health" component={SystemHealth} />
        <Route path="/admin/hot-wallets" component={HotWallets} />
        <Route path="/admin/wallet-management" component={WalletManagement} />
        <Route path="/admin/logs" component={TransactionLogs} />
        <Route path="/admin/users" component={UsersManagement} />
        <Route path="/admin/kyc-review" component={KYCReview} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/websocket" component={WebSocketDashboard} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <NotificationToast />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
