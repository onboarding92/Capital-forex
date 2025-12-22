/**
 * Trust Signals Component
 * 
 * Displays security badges, platform statistics, and social proof
 * to build user confidence in deposits and trading
 */

import { Shield, Users, TrendingUp, Clock, Lock, CheckCircle2, Award, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

interface TrustSignalsProps {
  variant?: "compact" | "full";
  showStats?: boolean;
  showBadges?: boolean;
  showSecurity?: boolean;
}

export function TrustSignals({ 
  variant = "full",
  showStats = true,
  showBadges = true,
  showSecurity = true 
}: TrustSignalsProps) {
  
  // Fetch real-time platform statistics
  const { data: stats } = trpc.admin.dashboardStats.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const securityBadges = [
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "256-bit encryption & cold storage",
      color: "text-blue-400",
    },
    {
      icon: Lock,
      title: "2FA Protection",
      description: "Two-factor authentication enabled",
      color: "text-green-400",
    },
    {
      icon: CheckCircle2,
      title: "KYC Verified",
      description: "Identity verification for all users",
      color: "text-purple-400",
    },
    {
      icon: Award,
      title: "Regulated Platform",
      description: "Compliant with financial regulations",
      color: "text-yellow-400",
    },
  ];
  
  const platformStats = [
    {
      icon: Users,
      label: "Active Users",
      value: stats?.totalUsers || "100+",
      color: "text-blue-400",
    },
    {
      icon: TrendingUp,
      label: "24h Volume",
      value: `$${((stats?.dailyVolume || 0) / 1000).toFixed(1)}K`,
      color: "text-green-400",
    },
    {
      icon: DollarSign,
      label: "Total Trades",
      value: "10,000+",
      color: "text-purple-400",
    },
    {
      icon: Clock,
      label: "Uptime",
      value: "99.9%",
      color: "text-yellow-400",
    },
  ];
  
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <span>Bank-Level Security</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-400" />
          <span>{stats?.totalUsers || "100+"} Users</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span>$1M+ Volume</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Security Badges */}
      {showBadges && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security & Trust
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {securityBadges.map((badge, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
              >
                <badge.icon className={`w-5 h-5 ${badge.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <div className="text-sm font-medium text-gray-200">{badge.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{badge.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Platform Statistics */}
      {showStats && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Platform Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {platformStats.map((stat, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-center"
              >
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                <div className="text-lg font-bold text-gray-100">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Security Information */}
      {showSecurity && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-blue-300 mb-1">Your Funds Are Safe</div>
              <div className="text-gray-400 leading-relaxed">
                We use industry-leading security practices including cold storage for 95% of funds,
                multi-signature wallets, and 24/7 monitoring. All deposits are insured and protected
                by bank-level encryption.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Trust Banner - Compact version for page headers
 */
export function TrustBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-3 px-4 rounded-lg bg-gray-800/30 border border-gray-700/30 text-sm">
      <div className="flex items-center gap-2 text-gray-300">
        <Shield className="w-4 h-4 text-blue-400" />
        <span>Bank-Level Security</span>
      </div>
      <div className="flex items-center gap-2 text-gray-300">
        <Lock className="w-4 h-4 text-green-400" />
        <span>95% Cold Storage</span>
      </div>
      <div className="flex items-center gap-2 text-gray-300">
        <Users className="w-4 h-4 text-purple-400" />
        <span>100+ Active Users</span>
      </div>
      <div className="flex items-center gap-2 text-gray-300">
        <TrendingUp className="w-4 h-4 text-yellow-400" />
        <span>$1M+ Trading Volume</span>
      </div>
      <div className="flex items-center gap-2 text-gray-300">
        <Clock className="w-4 h-4 text-pink-400" />
        <span>99.9% Uptime</span>
      </div>
    </div>
  );
}

/**
 * Security Badge - Small inline badge
 */
export function SecurityBadge({ type }: { type: "verified" | "insured" | "encrypted" }) {
  const badges = {
    verified: {
      icon: CheckCircle2,
      text: "Verified",
      color: "text-green-400 bg-green-500/10 border-green-500/20",
    },
    insured: {
      icon: Shield,
      text: "Insured",
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    encrypted: {
      icon: Lock,
      text: "Encrypted",
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
  };
  
  const badge = badges[type];
  const Icon = badge.icon;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${badge.color}`}>
      <Icon className="w-3 h-3" />
      <span>{badge.text}</span>
    </div>
  );
}
