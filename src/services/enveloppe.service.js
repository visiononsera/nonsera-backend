import prisma from './prisma.service.js';
import { broadcastEnvelopeWinner } from './socket.service.js';

export class EnveloppeService {
  /**
   * Arrondit une date au début de son heure (ex: 14:23:45 -> 14:00:00)
   */
  static getStartOfHour(date = new Date()) {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    d.setMilliseconds(0);
    return d;
  }

  /**
   * Enregistre l'activité active (Heartbeat) de l'utilisateur
   */
  static async recordHeartbeat(userId, country) {
    const now = new Date();
    const currentHourStart = this.getStartOfHour(now);
    const uId = Number(userId);

    const existingMetric = await prisma.userEnvelopeMetric.findUnique({
      where: { userId_hourStart: { userId: uId, hourStart: currentHourStart } }
    });

    if (existingMetric) {
      const secondsSinceLast = (now.getTime() - new Date(existingMetric.lastHeartbeatAt).getTime()) / 1000;
      
      // On accepte l'incrémentation (sécurité anti-spam de 25s)
      if (secondsSinceLast >= 25) {
        return await prisma.userEnvelopeMetric.update({
          where: { id: existingMetric.id },
          data: {
            activeSeconds: { increment: 30 },
            lastHeartbeatAt: now
          }
        });
      }
      return existingMetric;
    } else {
      return await prisma.userEnvelopeMetric.create({
        data: {
          userId: uId,
          country: country.toUpperCase(),
          hourStart: currentHourStart,
          activeSeconds: 30,
          lastHeartbeatAt: now
        }
      });
    }
  }

  /**
   * Calcule l'éligibilité horaire de l'utilisateur
   */
  static async getUserEligibility(userId, country) {
    const now = new Date();
    const currentHourStart = this.getStartOfHour(now);
    const previousHourStart = new Date(currentHourStart.getTime() - 60 * 60 * 1000);
    const uId = Number(userId);
    const normalizedCountry = country.toUpperCase();

    // 1. Récupérer ou créer la session d'enveloppe de l'heure en cours
    let currentSession = await prisma.envelopeWheel.findUnique({
      where: { country_hourStart: { country: normalizedCountry, hourStart: currentHourStart } }
    });

    if (!currentSession) {
      currentSession = await this.createNewHourlySession(normalizedCountry, currentHourStart, previousHourStart);
    }

    // 2. Récupérer l'activité accumulée sur l'heure EN COURS
    const currentMetrics = await prisma.userEnvelopeMetric.findUnique({
      where: { userId_hourStart: { userId: uId, hourStart: currentHourStart } }
    });

    // 3. Récupérer l'activité sur l'heure PRÉCÉDENTE (qui valide l'essai actuel)
    const previousMetrics = await prisma.userEnvelopeMetric.findUnique({
      where: { userId_hourStart: { userId: uId, hourStart: previousHourStart } }
    });

    const activeSecondsPrev = previousMetrics?.activeSeconds || 0;
    const spentPrev = previousMetrics?.spentAmount ? Number(previousMetrics.spentAmount) : 0;

    // Conditions cumulatives d'accès : 10 minutes (600s) et 5$ dépensés au cours de l'heure passée
    const meetsConditions = activeSecondsPrev >= 600 && spentPrev >= 5;
    const hasSpun = previousMetrics?.hasSpun || false;

    return {
      jackpotPool: currentSession.prizeAmount,
      isWon: !currentSession.isActive, // Si inactif, l'enveloppe a été gagnée[cite: 1]
      hasSpun,
      canSpinNow: meetsConditions && !hasSpun && currentSession.isActive,
      currentHourProgress: {
        activeSeconds: currentMetrics?.activeSeconds || 0,
        spentAmount: currentMetrics?.spentAmount ? Number(currentMetrics.spentAmount) : 0,
        requiredSeconds: 600,
        requiredSpent: 5
      },
      previousHourMetrics: {
        activeSeconds: activeSecondsPrev,
        spentAmount: spentPrev,
        meetsConditions
      }
    };
  }

  /**
   * Crée la session d'enveloppe horaire pour un pays en calculant 0.2% du CAH précédent
   */
  static async createNewHourlySession(country, hourStart, previousHourStart) {
    // Calcul du CAH réel (total cumulé de la table Purchase avec statut RECEIVED)[cite: 1]
    const aggregateRevenue = await prisma.purchase.aggregate({
      _sum: { totalPrice: true }, 
      where: {
        status: "RECEIVED", 
        sender: { country: country },
        createdAt: {
          gte: previousHourStart,
          lt: hourStart
        }
      }
    });

    const cahAmount = aggregateRevenue._sum.totalPrice ? Number(aggregateRevenue._sum.totalPrice) : 0;
    const prizeAmount = cahAmount * 0.002; // 0.2% du CAH réel

    return await prisma.envelopeWheel.create({
      data: {
        country,
        hourStart,
        cahAmount,
        prizeAmount: prizeAmount > 0 ? prizeAmount : 100, // Dotation par défaut de 100 s'il n'y a pas de ventes
        isActive: true
      }
    });
  }

  /**
   * Exécute le tirage interactif initié par l'utilisateur
   */
  static async spinWheel(userId, country, io) {
    const now = new Date();
    const currentHourStart = this.getStartOfHour(now);
    const previousHourStart = new Date(currentHourStart.getTime() - 60 * 60 * 1000);
    const uId = Number(userId);
    const normalizedCountry = country.toUpperCase();

    return await prisma.$transaction(async (tx) => {
      // 1. Verrouillage de la session d'enveloppe horaire (Sécurité concurrence)
      const session = await tx.envelopeWheel.findUnique({
        where: { country_hourStart: { country: normalizedCountry, hourStart: currentHourStart } }
      });

      if (!session) throw new Error("Aucune enveloppe active pour cette période.");
      if (!session.isActive) throw new Error("Désolé ! L'enveloppe de cette heure a déjà été remportée.");

      // 2. Vérification de l'éligibilité et du double-clic
      const userMetric = await tx.userEnvelopeMetric.findUnique({
        where: { userId_hourStart: { userId: uId, hourStart: previousHourStart } }
      });

      if (!userMetric || userMetric.hasSpun) {
        throw new Error("Vous avez déjà fait tourner la roue pour cette période.");
      }

      const spentAmount = userMetric.spentAmount ? Number(userMetric.spentAmount) : 0;
      const isEligible = userMetric.activeSeconds >= 600 && spentAmount >= 5;
      if (!isEligible) {
        throw new Error("Vos critères de l'heure précédente sont insuffisants.");
      }

      // Marquer immédiatement la tentative de l'utilisateur comme consommée
      await tx.userEnvelopeMetric.update({
        where: { id: userMetric.id },
        data: { hasSpun: true }
      });

      // 3. Algorithme de chance unitaire de gain (ex : 8% de probabilité)
      const winProbability = 0.08;
      const isWinner = Math.random() < winProbability;

      if (isWinner) {
        // Désactiver la session de roulette
        await tx.envelopeWheel.update({
          where: { id: session.id },
          data: { isActive: false }
        });

        // Enregistrer le vainqueur
        const winnerRecord = await tx.envelopeWinner.create({
          data: {
            envelopeWheelId: session.id, 
            userId: uId, 
            amountWon: session.prizeAmount, 
            city: (await tx.user.findUnique({ where: { id: uId } })).city || "Benin"
          }
        });

        await tx.user.update({
          where: { id: uId },
          data: {
            coins: { increment: session.prizeAmount } 
          }
        });

        // Déclencher la notification Socket temps réel à l'utilisateur et au pays[cite: 2]
        if (io) {
          broadcastEnvelopeWinner(io, winnerRecord, normalizedCountry, session.prizeAmount); //[cite: 2]
        }

        return {
          victory: true,
          amountWon: session.prizeAmount,
          wheelStopIndex: 0 // Index gagnant sur l'interface graphique de votre roulette
        };
      }

      return {
        victory: false,
        amountWon: 0,
        wheelStopIndex: 1 // Index perdant standard
      };
    });
  }
}