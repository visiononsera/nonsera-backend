import prisma from "./prisma.service.js";

export class MoreauService {
  /**
   * Point d'entrée pour récupérer le statut dynamique du bouton Moreau
   */
  static async getButtonState(userId) {
    // 1. VÉRIFICATION DU MODE COUPLE ACTIF
    const activeMatch = await prisma.match.findFirst({
      where: {
        status: "ACTIVE",
        isConfirmed: true,
        OR: [{ fromId: userId }, { toId: userId }],
      },
      select: { flameExpiresAt: true, createdAt: true },
    });

    if (activeMatch) {
      return this.#calculateCoupleState(activeMatch);
    }

    // 2. SINON EN MODE CÉLIBATAIRE (Vérification en direct du podium)
    return await this.#calculateSingleState(userId);
  }

  /**
   * MODE 1 : Calcul Célibataire basé sur le bloc en cours et l'assignation live
   */
  static async #calculateSingleState(userId) {
    const now = new Date();

    // Calcul de l'index du Round GMT (1 à 288)
    const totalMinutesGmt =
      now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
    const currentUniversalRound = Math.floor(totalMinutesGmt / 5) + 1;

    const hoursStr = String(now.getUTCHours()).padStart(2, "0");
    const minutesStr = String(now.getUTCMinutes()).padStart(2, "0");

    // On cherche le round actif attribué à ce spectateur
    const assignment = await prisma.podiumSpectator.findFirst({
      where: {
        userId: userId,
        podiumStar: { isActive: true },
      },
      include: { podiumStar: true },
    });

    // Si pas de star active trouvée à la volée (ex: pénurie absolue de profils dans ce pays)
    if (!assignment || !assignment.podiumStar) {
      return {
        mode: "SINGLE",
        status: "EMPTY_FALLBACK",
        data: {
          roundNumber:
            currentUniversalRound > 288 ? 288 : currentUniversalRound,
          gmtTime: `${hoursStr}h${minutesStr}`,
          minutesRemainingInRound: 0,
        },
      };
    }

    // Calcul précis du temps restant dans le bloc horaire de cette Star active
    const timeDue = new Date(assignment.podiumStar.timeDue);
    const msRemaining = timeDue.getTime() - now.getTime();
    const minutesRemaining = Math.max(0, msRemaining / (1000 * 60));

    return {
      mode: "SINGLE",
      status: "LIVE",
      data: {
        roundNumber: currentUniversalRound > 288 ? 288 : currentUniversalRound,
        gmtTime: `${hoursStr}h${minutesStr}`,
        minutesRemainingInRound: parseFloat(minutesRemaining.toFixed(2)),
      },
    };
  }

  /**
   * MODE 2 : Jauge de couple (Prorata sur 15 jours)
   */
  static #calculateCoupleState(match) {
    const now = new Date();
    const expiresAt = match.flameExpiresAt
      ? new Date(match.flameExpiresAt)
      : new Date(match.createdAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    const msRemaining = expiresAt.getTime() - now.getTime();

    if (msRemaining <= 0) {
      return {
        mode: "COUPLE",
        data: {
          daysRemaining: 0,
          flameExpiresAt: expiresAt,
          progressPercentage: 0,
        },
      };
    }

    const msIn15Days = 15 * 24 * 60 * 60 * 1000;
    const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);
    const progressPercentage = (msRemaining / msIn15Days) * 100;

    return {
      mode: "COUPLE",
      data: {
        daysRemaining: parseFloat(daysRemaining.toFixed(2)),
        flameExpiresAt: expiresAt,
        progressPercentage: parseFloat(
          Math.min(progressPercentage, 100).toFixed(2),
        ),
      },
    };
  }
}
