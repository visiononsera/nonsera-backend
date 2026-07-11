import prisma from './prisma.service.js'

export class EnveloppeService {
  /**
   * Calcule le statut d'éligibilité d'un utilisateur pour les 3 types de roues
   */
  static async getUserEligibility(userId, country) {
    const now = new Date();

    // Définition des dates limites pour les fenêtres glissantes
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Récupération agrégée des dépenses de l'utilisateur (Ex: via une table Transaction / Cadeau)
    // À adapter selon le nom exact de ta table de transactions/dépenses
    const aggregateExpenses = async (sinceDate) => {
      const result = await prisma.purchase.aggregate({
        _sum: { amount: true },
        where: {
          senderId: userId,
          createdAt: { gte: sinceDate }
        }
      });
      return result._sum.amount || 0;
    };

    const dailySpent = await aggregateExpenses(oneDayAgo);
    const monthlySpent = await aggregateExpenses(thirtyDaysAgo);
    const yearlySpent = await aggregateExpenses(oneYearAgo);

    // Vérification si l'utilisateur a déjà tourné la roue aujourd'hui (limite de 1 fois par jour)
    const hasSpunToday = await prisma.envelopeWinner.findFirst({
      where: {
        userId,
        drawnAt: { gte: new Date(now.setHours(0,0,0,0)) }
      }
    });

    return {
      daily: {
        isEligible: dailySpent >= 1 && !hasSpunToday,
        spent: dailySpent,
        required: 1,
        remaining: Math.max(0, 1 - dailySpent),
        reason: hasSpunToday ? "ALREADY_SPUN" : dailySpent < 1 ? "INSUFFICIENT_SPENT" : "OK"
      },
      monthly: {
        isEligible: monthlySpent >= 10,
        spent: monthlySpent,
        required: 10,
        remaining: Math.max(0, 10 - monthlySpent)
      },
      yearly: {
        isEligible: yearlySpent >= 100,
        spent: yearlySpent,
        required: 100,
        remaining: Math.max(0, 100 - yearlySpent)
      }
    };
  }

  /**
   * Déclenche le tirage 100% aléatoire parmi les utilisateurs éligibles du pays
   * Cette méthode est appelée automatiquement dès que le seuil de rentabilité du pays est franchi.
   */
  static async triggerLuckyDraw(envelopeWheelId) {
    return await prisma.$transaction(async (tx) => {
      const wheel = await tx.envelopeWheel.findUnique({
        where: { id: envelopeWheelId }
      });

      if (!wheel || !wheel.isActive) throw new Error("Roue inactive ou introuvable.");

      // 1. Récupérer tous les utilisateurs du pays
      const usersInCountry = await tx.user.findMany({
        where: { country: wheel.country, isOnline: true },
        select: { id: true, city: true }
      });

      // 2. Filtrer les éligibles selon le type de roue
      const eligibleUsers = [];
      for (const user of usersInCountry) {
        const eligibility = await this.getUserEligibility(user.id, wheel.country);
        
        if (wheel.type === "DAILY" && eligibility.daily.isEligible) eligibleUsers.push(user);
        if (wheel.type === "MONTHLY" && eligibility.monthly.isEligible) eligibleUsers.push(user);
        if (wheel.type === "YEARLY" && eligibility.yearly.isEligible) eligibleUsers.push(user);
      }

      if (eligibleUsers.length === 0) {
        return null; // Aucun utilisateur éligible pour ce tirage actuellement
      }

      // 3. Tirage au sort aléatoire
      const luckyWinner = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];

      // 4. Enregistrer le gagnant
      const winnerRecord = await tx.envelopeWinner.create({
        data: {
          envelopeWheelId: wheel.id,
          userId: luckyWinner.id,
          amountWon: wheel.prizeAmount,
          city: luckyWinner.city
        },
        include: { user: { select: { username: true } } }
      });

      // 5. Créditer le compte de l'utilisateur (Solde non retirable)
      await tx.user.update({
        where: { id: luckyWinner.id },
        data: { 
          balanceNonRetirable: { increment: wheel.prizeAmount } 
        }
      });

      return winnerRecord;
    });
  }
}