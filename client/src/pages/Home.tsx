import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, TrendingUp, Zap, Users, Lock, BarChart3, Wallet } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [cryptoPrices, setCryptoPrices] = useState<any[]>([]);
  
  const { data: prices } = trpc.prices.getAll.useQuery(undefined, {
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (prices) {
      setCryptoPrices(prices.slice(0, 6));
    }
  }, [prices]);

  const features = [
    {
      icon: TrendingUp,
      title: "Advanced Trading",
      description: "Trade 10+ crypto pairs with limit orders and real-time order book"
    },
    {
      icon: Lock,
      title: "Secure Staking",
      description: "Earn up to 15% APR with flexible and locked staking plans"
    },
    {
      icon: Wallet,
      title: "Multi-Currency Wallets",
      description: "Personal wallet addresses for BTC, ETH, USDT and 12+ cryptocurrencies"
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "KYC verification, encrypted storage, and 2FA protection"
    },
    {
      icon: Zap,
      title: "Instant Deposits",
      description: "8 payment gateways including MoonPay, Simplex, and Transak"
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Live price feeds, trading history, and portfolio tracking"
    },
  ];

  const stats = [
    { value: "100+", label: "Daily Users" },
    { value: "$1M+", label: "Trading Volume" },
    { value: "15+", label: "Cryptocurrencies" },
    { value: "99.9%", label: "Uptime" },
  ];

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BitChange Pro</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                Sign In
              </button>
            </Link>
            <Link href="/auth/register">
              <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 gradient-primary">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 border-b border-border">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
              <Zap className="h-4 w-4 text-primary" />
              Professional Cryptocurrency Exchange
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Trade, Stake, and Grow{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-primary">
                Your Crypto Portfolio
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional cryptocurrency exchange with advanced trading features, 
              secure staking, and instant deposits. Start trading with confidence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 px-8 gradient-primary text-lg group">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/trading">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-11 px-8 text-lg">
                  View Markets
                </button>
              </Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Live Prices Ticker */}
          {cryptoPrices.length > 0 && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {cryptoPrices.map((crypto) => (
                <Card key={crypto.asset} className="glass border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{crypto.asset}/USDT</span>
                      <span className={`text-xs font-medium ${crypto.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {crypto.change24h >= 0 ? "+" : ""}{crypto.change24h.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xl font-bold">
                      ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
                  {stat.value}
                </div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need to Trade Crypto
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional-grade features designed for both beginners and experienced traders
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="glass border-border/50 hover:border-primary/50 transition-all group">
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-purple-500/10 to-primary/10">
        <div className="container">
          <Card className="glass border-primary/20">
            <CardContent className="p-12 text-center space-y-6">
              <Users className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold">
                Join 100+ Daily Traders
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Start trading cryptocurrency with confidence. Secure, fast, and professional.
              </p>
              <Link href="/auth/register">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 px-12 gradient-primary text-lg">
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container text-center text-muted-foreground">
          <p>© 2024 BitChange Pro. Professional Cryptocurrency Exchange.</p>
        </div>
      </footer>
    </div>
  );
}
