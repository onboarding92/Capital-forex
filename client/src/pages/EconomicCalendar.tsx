import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, AlertCircle, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

export default function EconomicCalendar() {
  const [impactFilter, setImpactFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");

  const { data: events, isLoading } = trpc.forex.getEconomicEvents.useQuery({
    impact: impactFilter === "all" ? undefined : impactFilter,
    currency: currencyFilter === "all" ? undefined : currencyFilter,
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-red-600 text-white";
      case "medium": return "bg-yellow-600 text-white";
      case "low": return "bg-green-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Economic Calendar</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track major economic events that impact forex markets
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Impact Level</label>
                <Select value={impactFilter} onValueChange={(v: any) => setImpactFilter(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Impacts</SelectItem>
                    <SelectItem value="high">🔴 High Impact</SelectItem>
                    <SelectItem value="medium">🟡 Medium Impact</SelectItem>
                    <SelectItem value="low">🟢 Low Impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    {currencies.map((curr) => (
                      <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <CardDescription>
              Economic events scheduled for the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : events && events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getImpactColor(event.impact)}>
                            {getImpactIcon(event.impact)} {event.impact.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{event.currency}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.eventTime), "MMM dd, yyyy HH:mm")}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-base md:text-lg">{event.title}</h3>
                        
                        {event.description && (
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-2">
                          {event.forecast && (
                            <div>
                              <span className="text-muted-foreground">Forecast:</span>
                              <span className="ml-2 font-medium">{event.forecast}</span>
                            </div>
                          )}
                          {event.previous && (
                            <div>
                              <span className="text-muted-foreground">Previous:</span>
                              <span className="ml-2 font-medium">{event.previous}</span>
                            </div>
                          )}
                          {event.actual && (
                            <div>
                              <span className="text-muted-foreground">Actual:</span>
                              <span className="ml-2 font-medium text-primary">{event.actual}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {event.affectedPairs && (
                        <div className="flex flex-wrap gap-1">
                          {event.affectedPairs.split(',').map((pair, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {pair.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No economic events found for the selected filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">How to use the Economic Calendar</p>
                <p className="text-xs text-muted-foreground">
                  High-impact events (🔴) can cause significant market volatility. Plan your trades accordingly and consider using stop-loss orders during major announcements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
