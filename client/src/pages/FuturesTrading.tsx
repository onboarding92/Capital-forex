import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Clock, DollarSign, BarChart3, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function FuturesTrading() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");

  const { data: contracts } = trpc.futures.getContracts.useQuery();
  const { data: contract } = trpc.futures.getContract.useQuery({ symbol: selectedSymbol });
  const { data: fundingHistory } = trpc.futures.getFundingHistory.useQuery({ symbol: selectedSymbol, limit: 24 });
  const { data: contractStats } = trpc.futures.getContractStats.useQuery({ symbol: selectedSymbol });
  const { data: myPositions } = trpc.futures.getMyFuturesPositions.useQuery();

  const formatFundingRate = (rate: string) => {
    const rateNum = parseFloat(rate) * 100;
    return `${rateNum >= 0 ? "+" : ""}${rateNum.toFixed(4)}%`;
  };

  const getTimeUntilFunding = (nextFundingTime: Date) => {
    return formatDistanceToNow(new Date(nextFundingTime), { addSuffix: true });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Futures Trading</h1>
          <p className="text-muted-foreground">Trade perpetual contracts with funding rates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contract List */}
        <Card>
          <CardHeader>
            <CardTitle>Contracts</CardTitle>
            <CardDescription>Available perpetual contracts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {contracts?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedSymbol(c.symbol)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  selectedSymbol === c.symbol
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{c.symbol}</span>
                  <Badge variant="outline">{c.maxLeverage}x</Badge>
                </div>
                <div className="text-sm mt-1">
                  <span className="text-muted-foreground">Mark: </span>
                  <span className="font-medium">${parseFloat(c.markPrice).toFixed(2)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Contract Details */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{contract?.symbol}</CardTitle>
                <CardDescription>{contract?.baseAsset}/{contract?.quoteAsset} Perpetual Contract</CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                Max {contract?.maxLeverage}x
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="funding">Funding</TabsTrigger>
                <TabsTrigger value="positions">My Positions</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Mark Price</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${parseFloat(contract?.markPrice || "0").toFixed(2)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Index Price</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${parseFloat(contract?.indexPrice || "0").toFixed(2)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Funding Rate</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${parseFloat(contract?.fundingRate || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatFundingRate(contract?.fundingRate || "0")}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next Funding
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-semibold">
                        {contract?.nextFundingTime ? getTimeUntilFunding(contract.nextFundingTime) : "N/A"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Open Interest
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{parseFloat(contract?.openInterest || "0").toFixed(2)} {contract?.baseAsset}</div>
                      <p className="text-xs text-muted-foreground mt-1">Total open positions</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        24h Volume
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${parseFloat(contract?.volume24h || "0").toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Trading volume</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maker Fee:</span>
                        <span className="font-medium">{(parseFloat(contract?.makerFeeRate || "0") * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taker Fee:</span>
                        <span className="font-medium">{(parseFloat(contract?.takerFeeRate || "0") * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maintenance Margin:</span>
                        <span className="font-medium">{(parseFloat(contract?.maintenanceMarginRate || "0") * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="funding" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Funding Rate History
                    </CardTitle>
                    <CardDescription>Last 24 funding periods (3 days)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {fundingHistory && fundingHistory.length > 0 ? (
                      <div className="space-y-2">
                        {fundingHistory.map((funding, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(funding.fundingTime).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`font-semibold ${parseFloat(funding.fundingRate) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatFundingRate(funding.fundingRate)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Total: ${parseFloat(funding.totalFunding).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No funding history available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="positions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>My Futures Positions</CardTitle>
                    <CardDescription>Your open perpetual contract positions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {myPositions && myPositions.length > 0 ? (
                      <div className="space-y-3">
                        {myPositions.map((position) => (
                          <div key={position.id} className="p-4 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant={position.side === "long" ? "default" : "destructive"}>
                                  {position.side.toUpperCase()}
                                </Badge>
                                <span className="font-semibold">{position.symbol}</span>
                                <Badge variant="outline">{position.leverage}x</Badge>
                              </div>
                              <Badge variant="secondary">{position.marginMode}</Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Size:</span>{" "}
                                <span className="font-medium">{position.size}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Entry:</span>{" "}
                                <span className="font-medium">${position.entryPrice}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Unrealized PnL:</span>{" "}
                                <span className={`font-medium ${parseFloat(position.unrealizedPnL) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {parseFloat(position.unrealizedPnL) >= 0 ? "+" : ""}{position.unrealizedPnL}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Funding Fee:</span>{" "}
                                <span className="font-medium">{position.fundingFee}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No open positions</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Average Funding Rate</CardTitle>
                      <CardDescription>Last 8 periods</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${parseFloat(contractStats?.avgFundingRate || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatFundingRate(contractStats?.avgFundingRate || "0")}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Price Deviation</CardTitle>
                      <CardDescription>Mark vs Index</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {contractStats ? (
                          <>
                            {((parseFloat(contractStats.markPrice) - parseFloat(contractStats.indexPrice)) / parseFloat(contractStats.indexPrice) * 100).toFixed(2)}%
                          </>
                        ) : "0%"}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
