import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, TrendingUp, Zap, Users, Lock, BarChart3, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";

export default function Home() {
  const [forexPairs] = useState([
    { symbol: "EUR/USD", price: "1.0850", change: "+0.25%" },
    { symbol: "GBP/USD", price: "1.2650", change: "+0.18%" },
    { symbol: "USD/JPY", price: "149.50", change: "-0.12%" },
    { symbol: "USD/CHF", price: "0.8850", change: "+0.08%" },
    { symbol: "AUD/USD", price: "0.6550", change: "-0.15%" },
    { symbol: "USD/CAD", price: "1.3650", change: "+0.22%" },
  ]);

  const features = [
    {
      icon: TrendingUp,
      title: "28 Forex Pairs",
      description: "Trade major, minor, and exotic currency pairs with instant execution"
    },
    {
      icon: Zap,
      title: "High Leverage",
      description: "Up to 1:500 leverage on major pairs for maximum trading power"
    },
    {
      icon: DollarSign,
      title: "Tight Spreads",
      description: "Competitive spreads from 2 pips on EUR/USD and other major pairs"
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Margin call protection, stop out at 50%, and negative balance protection"
    },
    {
      icon: Lock,
      title: "Secure Trading",
      description: "KYC verification, 2FA authentication, and encrypted communications"
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Live P&L updates, margin monitoring, and position management"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            Professional Forex Trading Platform
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Trade Forex with
            <span className="block text-primary mt-2">High Leverage</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access 28 forex pairs with leverage up to 1:500. Instant execution, tight spreads, and professional risk management tools.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Trading <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Forex Prices */}
      <section className="container mx-auto px-4 py-12">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Live Forex Rates</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {forexPairs.map((pair) => (
                <div key={pair.symbol} className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-sm text-muted-foreground mb-1">{pair.symbol}</div>
                  <div className="text-lg font-bold">{pair.price}</div>
                  <div className={`text-xs ${pair.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {pair.change}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why Choose Capital Forex</h2>
          <p className="text-xl text-muted-foreground">
            Professional trading platform built for serious forex traders
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all">
              <CardContent className="p-6">
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Account Types */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Choose Your Account Type</h2>
          <p className="text-xl text-muted-foreground">
            Select the account that matches your trading style
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-2">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Standard</h3>
              <div className="text-4xl font-bold text-primary my-4">1:100</div>
              <p className="text-muted-foreground mb-6">Leverage</p>
              <ul className="space-y-3 text-left mb-8">
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>2.0 pip spread</span>
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>Ideal for beginners</span>
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>Min deposit: $100</span>
                </li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full">Open Account</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary shadow-lg scale-105">
            <CardContent className="p-8 text-center">
              <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full mb-2">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">ECN</h3>
              <div className="text-4xl font-bold text-primary my-4">1:200</div>
              <p className="text-muted-foreground mb-6">Leverage</p>
              <ul className="space-y-3 text-left mb-8">
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>1.5 pip spread</span>
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>For active traders</span>
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>Min deposit: $500</span>
                </li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full">Open Account</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold text-primary my-4">1:500</div>
              <p className="text-muted-foreground mb-6">Leverage</p>
              <ul className="space-y-3 text-left mb-8">
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>1.0 pip spread</span>
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>For professionals</span>
                </li>
                <li className="flex items-center">
                  <div className="h-2 w-2 bg-primary rounded-full mr-3"></div>
                  <span>Min deposit: $2,000</span>
                </li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full">Open Account</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">28+</div>
                <div className="text-primary-foreground/80">Forex Pairs</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">1:500</div>
                <div className="text-primary-foreground/80">Max Leverage</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">2 pips</div>
                <div className="text-primary-foreground/80">From Spread</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">24/5</div>
                <div className="text-primary-foreground/80">Trading Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Start Trading?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of traders who trust Capital Forex for their forex trading needs
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="text-lg px-12 py-6">
              Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Risk Warning */}
      <section className="container mx-auto px-4 py-8">
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              <strong>Risk Warning:</strong> Forex trading involves significant risk of loss and is not suitable for all investors. 
              Leverage can magnify both profits and losses. Only trade with money you can afford to lose.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
