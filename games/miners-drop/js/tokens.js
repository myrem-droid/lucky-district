
const STORAGE_KEY = "lucky_district_tokens";

const DEFAULT_BALANCE = 500;
const MAX_BALANCE = 999999999;
const MAX_SAVED_EXPEDITIONS = 200;

export function roundTokens(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.round(number / 10) * 10);
}

export class TokenManager {
  constructor(options = {}) {
    this.storageKey = options.storageKey || STORAGE_KEY;
    this.defaultBalance = roundTokens(
      options.defaultBalance ?? DEFAULT_BALANCE
    );

    this.maxBalance = MAX_BALANCE;
    this.balance = this.defaultBalance;
    this.claimedExpeditions = new Set();

    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);

      if (!saved) {
        this.balance = this.defaultBalance;
        this.save();
        return this.balance;
      }

      const data = JSON.parse(saved);

      // Compatibilidad con versiones antiguas que guardaban
      // únicamente el saldo como número.
      if (typeof data === "number") {
        this.balance = roundTokens(data);
        this.save();
        return this.balance;
      }

      if (typeof data === "string" && !Number.isNaN(Number(data))) {
        this.balance = roundTokens(Number(data));
        this.save();
        return this.balance;
      }

      if (data && typeof data === "object") {
        this.balance = roundTokens(
          data.balance ?? this.defaultBalance
        );

        if (Array.isArray(data.claimedExpeditions)) {
          this.claimedExpeditions = new Set(
            data.claimedExpeditions.map(String)
          );
        }
      }

      this.balance = Math.min(
        this.balance,
        this.maxBalance
      );

      return this.balance;
    } catch (error) {
      console.warn("No se pudieron cargar los DT:", error);
      this.balance = this.defaultBalance;
      return this.balance;
    }
  }

  save() {
    try {
      const data = {
        version: 2,
        balance: this.balance,
        claimedExpeditions: Array.from(
          this.claimedExpeditions
        ).slice(-MAX_SAVED_EXPEDITIONS)
      };

      localStorage.setItem(
        this.storageKey,
        JSON.stringify(data)
      );

      return true;
    } catch (error) {
      console.warn("No se pudieron guardar los DT:", error);
      return false;
    }
  }

  getBalance() {
    return this.balance;
  }

  addTokens(amount) {
    const safeAmount = roundTokens(amount);

    if (safeAmount <= 0) {
      return this.balance;
    }

    this.balance = Math.min(
      this.maxBalance,
      this.balance + safeAmount
    );

    this.balance = roundTokens(this.balance);

    this.save();

    return this.balance;
  }

  calculateReward(score, depth, targetScore = 200) {
    const safeScore = Math.max(0, Number(score) || 0);
    const safeDepth = Math.max(0, Number(depth) || 0);
    const safeTarget = Math.max(
      100,
      Number(targetScore) || 200
    );

    const scoreReward = roundTokens(
      Math.floor(safeScore / 50) * 10
    );

    const depthReward = roundTokens(
      Math.floor(safeDepth / 200) * 10
    );

    const objectiveBonus =
      safeScore >= safeTarget ? 50 : 0;

    const total = roundTokens(
      scoreReward + depthReward + objectiveBonus
    );

    return {
      scoreReward,
      depthReward,
      objectiveBonus,
      total
    };
  }

  claimReward(
    expeditionId,
    score,
    depth,
    targetScore = 200
  ) {
    const id = String(
      expeditionId || `expedition-${Date.now()}`
    );

    if (this.claimedExpeditions.has(id)) {
      return {
        amount: 0,
        duplicate: true,
        balance: this.balance,
        breakdown: {
          scoreReward: 0,
          depthReward: 0,
          objectiveBonus: 0,
          total: 0
        }
      };
    }

    const breakdown = this.calculateReward(
      score,
      depth,
      targetScore
    );

    const amount = breakdown.total;

    this.claimedExpeditions.add(id);

    if (this.claimedExpeditions.size > MAX_SAVED_EXPEDITIONS) {
      const oldest = this.claimedExpeditions.values().next().value;
      this.claimedExpeditions.delete(oldest);
    }

    if (amount > 0) {
      this.addTokens(amount);
    } else {
      this.save();
    }

    return {
      amount,
      duplicate: false,
      balance: this.balance,
      breakdown
    };
  }

  format(value = this.balance) {
    const safeValue = roundTokens(value);

    return `${safeValue.toLocaleString("es-CL")} DT`;
  }

  getInfo() {
    return {
      balance: this.balance,
      formattedBalance: this.format(),
      claimedExpeditions: this.claimedExpeditions.size,
      maximumBalance: this.maxBalance
    };
  }
}
