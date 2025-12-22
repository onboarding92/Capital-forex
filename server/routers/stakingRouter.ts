import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { stakingPools, userStakes, stakingRewards } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const stakingRouter = router({
  // Get all staking pools
  getPools: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    
    const pools = await db
      .select()
      .from(stakingPools)
      .where(eq(stakingPools.isActive, true));
    
    return pools;
  }),

  // Stake tokens
  stake: protectedProcedure
    .input(
      z.object({
        poolId: z.number(),
        amount: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const userId = ctx.user.id;

      // Get pool details
      const [pool] = await db
        .select()
        .from(stakingPools)
        .where(eq(stakingPools.id, input.poolId))
        .limit(1);

      if (!pool) {
        throw new Error("Staking pool not found");
      }

      if (!pool.isActive) {
        throw new Error("Staking pool is not active");
      }

      const stakeAmount = parseFloat(input.amount);
      if (stakeAmount < parseFloat(pool.minAmount)) {
        throw new Error(`Minimum stake amount is ${pool.minAmount} ${pool.asset}`);
      }

      // Calculate end date for locked staking
      const startDate = new Date();
      const endDate = pool.lockPeriod > 0 
        ? new Date(startDate.getTime() + pool.lockPeriod * 24 * 60 * 60 * 1000)
        : null; // NULL for flexible staking

      // Create stake record
      await db
        .insert(userStakes)
        .values({
          userId,
          poolId: input.poolId,
          amount: input.amount,
          startDate,
          endDate,
          status: "active",
          accumulatedRewards: "0",
          autoCompound: false,
        });

      const stake = { id: 0, poolId: input.poolId, amount: input.amount };

      return {
        success: true,
        stake,
        message: `Successfully staked ${input.amount} ${pool.asset}`,
      };
    }),

  // Unstake tokens
  unstake: protectedProcedure
    .input(z.object({ stakeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const userId = ctx.user.id;

      // Get stake details
      const [stake] = await db
        .select()
        .from(userStakes)
        .where(and(eq(userStakes.id, input.stakeId), eq(userStakes.userId, userId)))
        .limit(1);

      if (!stake) {
        throw new Error("Stake not found");
      }

      if (stake.status !== "active") {
        throw new Error("Stake is not active");
      }

      const now = new Date();
      if (stake.endDate && now < stake.endDate) {
        throw new Error("Stake has not matured yet");
      }

      // Update stake status
      await db
        .update(userStakes)
        .set({ status: "withdrawn" })
        .where(eq(userStakes.id, input.stakeId));

      return {
        success: true,
        message: "Successfully unstaked",
      };
    }),

  // Claim rewards
  claimRewards: protectedProcedure
    .input(z.object({ stakeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const userId = ctx.user.id;

      // Get stake details
      const [stake] = await db
        .select()
        .from(userStakes)
        .where(and(eq(userStakes.id, input.stakeId), eq(userStakes.userId, userId)))
        .limit(1);

      if (!stake) {
        throw new Error("Stake not found");
      }

      // Get rewards for this stake
      const rewards = await db
        .select()
        .from(stakingRewards)
        .where(eq(stakingRewards.stakeId, input.stakeId));

      if (rewards.length === 0) {
        throw new Error("No rewards to claim");
      }

      // Calculate total rewards
      const totalRewards = rewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);

      return {
        success: true,
        totalRewards: totalRewards.toString(),
        message: `Successfully claimed ${totalRewards} rewards`,
      };
    }),

  // Get user staking statistics
  getStakingStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    
    const userId = ctx.user.id;

    // Get active stakes
    const activeStakes = await db
      .select()
      .from(userStakes)
      .where(and(eq(userStakes.userId, userId), eq(userStakes.status, "active")));

    // Get all rewards for user
    const allRewards = await db
      .select()
      .from(stakingRewards)
      .where(eq(stakingRewards.userId, userId));

    const totalStaked = activeStakes.reduce((sum: number, stake: any) => sum + parseFloat(stake.amount), 0);
    const totalRewards = allRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);

    return {
      totalStaked: totalStaked.toString(),
      totalRewards: totalRewards.toString(),
      activeStakesCount: activeStakes.length,
      activeStakes: activeStakes.map((stake: any) => ({
        ...stake,
        startDate: stake.startDate.toISOString(),
        endDate: stake.endDate?.toISOString(),
      })),
    };
  }),

  // Get rewards history
  getRewardsHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    
    const userId = ctx.user.id;

    const rewards = await db
      .select()
      .from(stakingRewards)
      .where(eq(stakingRewards.userId, userId))
      .orderBy(desc(stakingRewards.timestamp))
      .limit(100);

    return rewards.map((reward: any) => ({
      ...reward,
      timestamp: reward.timestamp.toISOString(),
    }));
  }),
});
