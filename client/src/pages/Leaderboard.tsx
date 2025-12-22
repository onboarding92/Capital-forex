import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Users, Award, Star, Heart, MessageCircle, Share2, Medal } from "lucide-react";
import { toast } from "sonner";

export default function Leaderboard() {
  const [sortBy, setSortBy] = useState<"rank" | "totalPnL" | "winRate" | "totalTrades" | "followers">("rank");

  const { data: leaderboard } = trpc.social.getLeaderboard.useQuery({ limit: 100, sortBy });
  const { data: myRanking } = trpc.social.getMyRanking.useQuery();
  const { data: myAchievements } = trpc.social.getMyAchievements.useQuery();
  const { data: socialFeed } = trpc.social.getSocialFeed.useQuery({ limit: 50 });
  const { data: profitStats } = trpc.social.getProfitSharingStats.useQuery();

  const likeMutation = trpc.social.likePost.useMutation({
    onSuccess: () => {
      toast.success("Liked!");
    },
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "diamond": return "text-cyan-500";
      case "platinum": return "text-gray-400";
      case "gold": return "text-yellow-500";
      case "silver": return "text-gray-300";
      default: return "text-orange-600";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "diamond": return "💎";
      case "platinum": return "⚪";
      case "gold": return "🥇";
      case "silver": return "🥈";
      default: return "🥉";
    }
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard & Social</h1>
          <p className="text-muted-foreground">Compete with top traders and share your success</p>
        </div>
      </div>

      {/* My Ranking Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Your Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Rank</p>
              <p className="text-2xl font-bold">#{myRanking?.rank || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tier</p>
              <p className={`text-2xl font-bold ${getTierColor(myRanking?.tier || "bronze")}`}>
                {getTierIcon(myRanking?.tier || "bronze")} {myRanking?.tier || "Bronze"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total PnL</p>
              <p className={`text-2xl font-bold ${parseFloat(myRanking?.totalPnL || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${parseFloat(myRanking?.totalPnL || "0").toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">{parseFloat(myRanking?.winRate || "0").toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Points</p>
              <p className="text-2xl font-bold text-blue-600">{myRanking?.points || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit Sharing Stats */}
      {profitStats && (profitStats.totalEarned > 0 || profitStats.totalShared > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Profit Sharing Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${profitStats.totalEarned.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{profitStats.earningsCount} payments received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Profit Sharing Shared
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${profitStats.totalShared.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{profitStats.sharingCount} payments sent</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="social">Social Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Global Leaderboard
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === "rank" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("rank")}
                  >
                    Rank
                  </Button>
                  <Button
                    variant={sortBy === "totalPnL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("totalPnL")}
                  >
                    PnL
                  </Button>
                  <Button
                    variant={sortBy === "winRate" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("winRate")}
                  >
                    Win Rate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard?.map(({ leaderboard: leader, user }) => {
                  const medal = getRankMedal(leader.rank);
                  return (
                    <div
                      key={leader.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        leader.rank <= 3 ? "bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/20" : "hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold w-12 text-center">
                            {medal || `#${leader.rank}`}
                          </div>
                          <Avatar>
                            <AvatarFallback>{user?.name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{user?.name || "Anonymous"}</span>
                              {leader.verified && <Badge variant="default" className="text-xs">✓ Verified</Badge>}
                              <span className={`text-sm ${getTierColor(leader.tier)}`}>
                                {getTierIcon(leader.tier)} {leader.tier}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>{leader.totalTrades} trades</span>
                              <span>{leader.followers} followers</span>
                              <span>🔥 {leader.streak} streak</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total PnL</p>
                            <p className={`text-xl font-bold ${parseFloat(leader.totalPnL) >= 0 ? "text-green-600" : "text-red-600"}`}>
                              ${parseFloat(leader.totalPnL).toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Win Rate</p>
                            <p className="text-xl font-bold">{parseFloat(leader.winRate).toFixed(1)}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Points</p>
                            <p className="text-xl font-bold text-blue-600">{leader.points}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" />
                Your Achievements
              </CardTitle>
              <CardDescription>
                {myAchievements?.length || 0} achievements unlocked • {myAchievements?.reduce((sum, a) => sum + a.points, 0) || 0} total points
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myAchievements && myAchievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="p-4 rounded-lg border bg-gradient-to-r from-purple-500/10 to-purple-600/5 border-purple-500/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-4xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{achievement.title}</h3>
                            <Badge variant="secondary">+{achievement.points} pts</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Unlocked {new Date(achievement.earnedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Medal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No achievements yet. Start trading to unlock badges!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Social Feed
              </CardTitle>
              <CardDescription>See what top traders are sharing</CardDescription>
            </CardHeader>
            <CardContent>
              {socialFeed && socialFeed.length > 0 ? (
                <div className="space-y-4">
                  {socialFeed.map(({ post, user }) => (
                    <div key={post.id} className="p-4 rounded-lg border hover:bg-accent transition-colors">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>{user?.name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{user?.name || "Anonymous"}</span>
                            <Badge variant="outline" className="text-xs">{post.type.replace("_", " ")}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-2 text-sm">{post.content}</p>

                          <div className="flex items-center gap-4 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => likeMutation.mutate({ postId: post.id })}
                              className="gap-1"
                            >
                              <Heart className="h-4 w-4" />
                              {post.likes}
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <MessageCircle className="h-4 w-4" />
                              {post.comments}
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Share2 className="h-4 w-4" />
                              {post.shares}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
