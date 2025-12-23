import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RiskCalculator() {
  // Position Size Calculator
  const [accountBalance, setAccountBalance] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("2");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [pipValue, setPipValue] = useState("10"); // Standard lot

  // Pip Calculator
  const [pipPair, setPipPair] = useState("EUR/USD");
  const [pipLotSize, setPipLotSize] = useState("1");

  // Margin Calculator
  const [marginPair, setMarginPair] = useState("EUR/USD");
  const [marginLots, setMarginLots] = useState("1");
  const [leverage, setLeverage] = useState("100");
  const [currentPrice, setCurrentPrice] = useState("1.0850");

  // Risk/Reward Calculator
  const [rrEntry, setRrEntry] = useState("");
  const [rrStopLoss, setRrStopLoss] = useState("");
  const [rrTakeProfit, setRrTakeProfit] = useState("");

  const calculatePositionSize = () => {
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercent);
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);

    if (!balance || !risk || !entry || !sl) return null;

    const riskAmount = (balance * risk) / 100;
    const pips = Math.abs(entry - sl) * 10000; // For 4 decimal pairs
    const positionSize = riskAmount / (pips * parseFloat(pipValue) / 100);

    return {
      riskAmount: riskAmount.toFixed(2),
      pips: pips.toFixed(1),
      positionSize: positionSize.toFixed(2),
      lots: (positionSize / 100000).toFixed(2),
    };
  };

  const calculatePipValue = () => {
    const lots = parseFloat(pipLotSize);
    if (!lots) return null;

    const standardLotValue = 10; // $10 per pip for standard lot
    const value = lots * standardLotValue;

    return {
      perPip: value.toFixed(2),
      per10Pips: (value * 10).toFixed(2),
      per50Pips: (value * 50).toFixed(2),
      per100Pips: (value * 100).toFixed(2),
    };
  };

  const calculateMargin = () => {
    const lots = parseFloat(marginLots);
    const lev = parseFloat(leverage);
    const price = parseFloat(currentPrice);

    if (!lots || !lev || !price) return null;

    const contractSize = lots * 100000; // Standard lot size
    const marginRequired = (contractSize * price) / lev;

    return {
      contractSize: contractSize.toLocaleString(),
      marginRequired: marginRequired.toFixed(2),
      leverage: lev,
    };
  };

  const calculateRiskReward = () => {
    const entry = parseFloat(rrEntry);
    const sl = parseFloat(rrStopLoss);
    const tp = parseFloat(rrTakeProfit);

    if (!entry || !sl || !tp) return null;

    const risk = Math.abs(entry - sl) * 10000;
    const reward = Math.abs(tp - entry) * 10000;
    const ratio = reward / risk;

    return {
      riskPips: risk.toFixed(1),
      rewardPips: reward.toFixed(1),
      ratio: ratio.toFixed(2),
      isGood: ratio >= 2,
    };
  };

  const positionResult = calculatePositionSize();
  const pipResult = calculatePipValue();
  const marginResult = calculateMargin();
  const rrResult = calculateRiskReward();

  const majorPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD"];

  return (
    <DashboardLayout>
      <div className="container max-w-5xl py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Risk Calculator</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Professional trading calculators for risk management
          </p>
        </div>

        <Tabs defaultValue="position" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="position" className="text-xs sm:text-sm">Position Size</TabsTrigger>
            <TabsTrigger value="pip" className="text-xs sm:text-sm">Pip Value</TabsTrigger>
            <TabsTrigger value="margin" className="text-xs sm:text-sm">Margin</TabsTrigger>
            <TabsTrigger value="rr" className="text-xs sm:text-sm">Risk/Reward</TabsTrigger>
          </TabsList>

          {/* Position Size Calculator */}
          <TabsContent value="position" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Position Size Calculator
                </CardTitle>
                <CardDescription>
                  Calculate optimal position size based on your risk tolerance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Balance ($)</Label>
                    <Input
                      type="number"
                      value={accountBalance}
                      onChange={(e) => setAccountBalance(e.target.value)}
                      placeholder="10000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Risk Per Trade (%)</Label>
                    <Input
                      type="number"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(e.target.value)}
                      placeholder="2"
                      step="0.1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Entry Price</Label>
                    <Input
                      type="number"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      placeholder="1.0850"
                      step="0.0001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Stop Loss</Label>
                    <Input
                      type="number"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      placeholder="1.0800"
                      step="0.0001"
                    />
                  </div>
                </div>

                {positionResult && (
                  <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-semibold mb-3">Results</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Risk Amount</div>
                        <div className="text-lg font-bold text-red-600">${positionResult.riskAmount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Stop Loss Pips</div>
                        <div className="text-lg font-bold">{positionResult.pips}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Position Size</div>
                        <div className="text-lg font-bold text-green-600">${positionResult.positionSize}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Lot Size</div>
                        <div className="text-lg font-bold">{positionResult.lots} lots</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pip Calculator */}
          <TabsContent value="pip" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pip Value Calculator
                </CardTitle>
                <CardDescription>
                  Calculate the monetary value of pips for your position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency Pair</Label>
                    <Select value={pipPair} onValueChange={setPipPair}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {majorPairs.map((pair) => (
                          <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Lot Size</Label>
                    <Input
                      type="number"
                      value={pipLotSize}
                      onChange={(e) => setPipLotSize(e.target.value)}
                      placeholder="1.0"
                      step="0.01"
                    />
                  </div>
                </div>

                {pipResult && (
                  <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-semibold mb-3">Pip Values</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Per 1 Pip</div>
                        <div className="text-lg font-bold">${pipResult.perPip}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Per 10 Pips</div>
                        <div className="text-lg font-bold">${pipResult.per10Pips}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Per 50 Pips</div>
                        <div className="text-lg font-bold">${pipResult.per50Pips}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Per 100 Pips</div>
                        <div className="text-lg font-bold text-green-600">${pipResult.per100Pips}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Margin Calculator */}
          <TabsContent value="margin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Margin Calculator
                </CardTitle>
                <CardDescription>
                  Calculate required margin for your position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency Pair</Label>
                    <Select value={marginPair} onValueChange={setMarginPair}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {majorPairs.map((pair) => (
                          <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Lot Size</Label>
                    <Input
                      type="number"
                      value={marginLots}
                      onChange={(e) => setMarginLots(e.target.value)}
                      placeholder="1.0"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Leverage</Label>
                    <Select value={leverage} onValueChange={setLeverage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">1:50</SelectItem>
                        <SelectItem value="100">1:100</SelectItem>
                        <SelectItem value="200">1:200</SelectItem>
                        <SelectItem value="500">1:500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Current Price</Label>
                    <Input
                      type="number"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      placeholder="1.0850"
                      step="0.0001"
                    />
                  </div>
                </div>

                {marginResult && (
                  <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-semibold mb-3">Margin Required</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Contract Size</div>
                        <div className="text-lg font-bold">${marginResult.contractSize}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Leverage</div>
                        <div className="text-lg font-bold">1:{marginResult.leverage}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Margin</div>
                        <div className="text-lg font-bold text-blue-600">${marginResult.marginRequired}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk/Reward Calculator */}
          <TabsContent value="rr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Risk/Reward Ratio Calculator
                </CardTitle>
                <CardDescription>
                  Calculate risk/reward ratio for your trade setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Entry Price</Label>
                    <Input
                      type="number"
                      value={rrEntry}
                      onChange={(e) => setRrEntry(e.target.value)}
                      placeholder="1.0850"
                      step="0.0001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Stop Loss</Label>
                    <Input
                      type="number"
                      value={rrStopLoss}
                      onChange={(e) => setRrStopLoss(e.target.value)}
                      placeholder="1.0800"
                      step="0.0001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Take Profit</Label>
                    <Input
                      type="number"
                      value={rrTakeProfit}
                      onChange={(e) => setRrTakeProfit(e.target.value)}
                      placeholder="1.0950"
                      step="0.0001"
                    />
                  </div>
                </div>

                {rrResult && (
                  <div className={`mt-6 p-4 rounded-lg border ${rrResult.isGood ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <h3 className="font-semibold mb-3">Risk/Reward Analysis</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Risk (Pips)</div>
                        <div className="text-lg font-bold text-red-600">{rrResult.riskPips}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Reward (Pips)</div>
                        <div className="text-lg font-bold text-green-600">{rrResult.rewardPips}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">R:R Ratio</div>
                        <div className={`text-2xl font-bold ${rrResult.isGood ? 'text-green-600' : 'text-red-600'}`}>
                          1:{rrResult.ratio}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm">
                      {rrResult.isGood ? (
                        <p className="text-green-600">✓ Good risk/reward ratio (≥ 1:2)</p>
                      ) : (
                        <p className="text-red-600">⚠ Risk/reward ratio below recommended 1:2</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Risk Management Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Never risk more than 1-2% of your account per trade</li>
                  <li>Aim for a minimum risk/reward ratio of 1:2</li>
                  <li>Always use stop-loss orders to limit potential losses</li>
                  <li>Monitor your margin level to avoid margin calls</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
