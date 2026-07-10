import prisma from "./prisma.service.js";
import { MatchService } from "./match.service.js";

const SPECTATORS_PER_PODIUM = 100;

export class PodiumService {
  /**
   * CALCULE LA PROCHAINE FRONTIÈRE GMT FIXE (Pour le Cron)
   */
  static getGmtTargetTimeDue() {
    const now = new Date();
    const minutes = now.getUTCMinutes();
    const nextBlockMinutes = Math.floor(minutes / 5) * 5 + 5;

    const target = new Date();
    target.setUTCHours(now.getUTCHours(), nextBlockMinutes, 0, 0);
    return target;
  }

  /**
   * RÉCUPÉRER LA STAR COURANTE POUR UN SPECTATEUR
   */
  static async getLiveStarForUser(userId) {
    console.log(
      `[PODIUM-GET] Recherche de star pour le spectateur ID: ${userId}`,
    );

    const assignment = await prisma.podiumSpectator.findFirst({
      where: {
        userId,
        podiumStar: {
          isActive: true,
          podium: { status: "ACTIVE" },
          user: { role: "USER" },
        },
      },
      include: {
        podiumStar: {
          include: {
            user: {
              select: {
                id: true,
                fullname: true,
                username: true,
                profilePhoto: true,
                birthday: true,
                gender: true,
                country: true,
                city: true,
                religion: true,
                passion: true,
                biography: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    if (
      !assignment ||
      !assignment.podiumStar ||
      !assignment.podiumStar.isActive
    ) {
      return null;
    }

    return {
      roundId: assignment.podiumStar.id,
      timeDue: assignment.podiumStar.timeDue,
      spot: assignment.podiumStar.spot,
      star: assignment.podiumStar.user,
    };
  }

  /**
   * GENERATION INITIALE DES ROUNDS VIA CRON (Alignée GMT)
   */
  static async generateCountryRounds(country, spectatorGender) {
    const starGender = spectatorGender === "MALE" ? "FEMALE" : "MALE";
    const futureTime = this.getGmtTargetTimeDue();

    const spectators = await prisma.user.findMany({
      where: { country, gender: spectatorGender, role: "USER" },
      select: { id: true },
    });

    if (spectators.length === 0) return;

    const totalPodiumsNeeded = Math.ceil(
      spectators.length / SPECTATORS_PER_PODIUM,
    );
    const starIds = await this.#recruitStars(
      country,
      starGender,
      totalPodiumsNeeded,
      [],
    );

    if (starIds.length === 0) return;

    const actualPodiumsCount = Math.min(totalPodiumsNeeded, starIds.length);
    const parentPodium = await prisma.podium.create({
      data: { country, status: "ACTIVE", category: "COUNTRY" },
    });

    const activeSubRounds = [];
    for (let i = 0; i < actualPodiumsCount; i++) {
      const starId = starIds[i];

      const subRound = await prisma.podiumStar.create({
        data: {
          podiumId: parentPodium.id,
          userId: starId,
          spot: i + 1,
          timeDue: futureTime,
          country,
          isActive: true,
        },
      });

      await prisma.user.update({
        where: { id: starId },
        data: { podiumOccurenceCount: { increment: 1 } },
      });

      activeSubRounds.push(subRound);
    }

    const spectatorData = spectators.map((spec, index) => {
      const assignedRound = activeSubRounds[index % actualPodiumsCount];
      return { podiumStarId: assignedRound.id, userId: spec.id };
    });

    const oldSpectatorIds = spectators.map((s) => s.id);
    await prisma.podiumSpectator.deleteMany({
      where: { userId: { in: oldSpectatorIds } },
    });

    await prisma.podiumSpectator.createMany({
      data: spectatorData,
      skipDuplicates: true,
    });
  }

  /**
   * LA STAR ACCEPTE LE PRÉSENT (AVEC REMPLACEMENT INSTANTANÉ SUR LE PODIUM)
   */
  static async acceptDaniellePresent(params) {
    const { podiumStarId, matchSenderId, presentId, annonceId } = params;

    // 1. Désactiver immédiatement le round de la star qui matche
    const updateResult = await prisma.podiumStar.updateMany({
      where: { id: podiumStarId, isActive: true },
      data: { isActive: false },
    });

    if (updateResult.count === 0) {
      throw new Error(
        "Désolé, cette Star a déjà accepté une autre proposition ou le round est terminé.",
      );
    }

    const finishedRound = await prisma.podiumStar.findUnique({
      where: { id: podiumStarId },
      include: { spectators: true },
    });

    if (!finishedRound) throw new Error("Podium introuvable.");
    const starId = finishedRound.userId;

    try {
      // 2. Activer le couple
      await MatchService.acceptDirectGift(
        starId,
        matchSenderId,
        presentId,
        annonceId,
        "BOOST",
      );

      // 3. REMPLACEMENT EN TEMPS RÉEL des spectateurs orphelins avant le prochain Cron
      await this.#replaceStarOnTheFly(finishedRound);
    } catch (error) {
      // Rollback du statut du round en cas d'échec critique du match
      await prisma.podiumStar.update({
        where: { id: podiumStarId },
        data: { isActive: true },
      });
      throw new Error(
        `Échec de la validation du match sur le podium : ${error.message}`,
      );
    }
  }

  /**
   * MÉTHODE INTERNE : Remplace une star à la volée en conservant le même bloc horaire
   */
  static async #replaceStarOnTheFly(finishedRound) {
    const orphanSpectatorIds = finishedRound.spectators.map((s) => s.userId);
    if (orphanSpectatorIds.length === 0) return;

    // Détermination du genre de la nouvelle star
    const sampleUser = await prisma.user.findUnique({
      where: { id: orphanSpectatorIds[0] },
      select: { gender: true },
    });
    if (!sampleUser?.gender) return;
    const starGender = sampleUser.gender === "MALE" ? "FEMALE" : "MALE";

    // Nettoyage des anciennes liaisons spectateurs pour ce sous-round éteint
    await prisma.podiumSpectator.deleteMany({
      where: { podiumStarId: finishedRound.id },
    });

    // Notifier l'ancienne room
    if (typeof io !== "undefined") {
      io.to(`podium_star_${finishedRound.id}`).emit("podium:terminated", {
        reason: "STAR_MATCHED",
      });
    }

    // Trouver les stars actuellement occupées pour les exclure
    const currentlyActiveStars = await prisma.podiumStar.findMany({
      where: { isActive: true },
      select: { userId: true },
    });
    const exclusionList = [
      ...currentlyActiveStars.map((ps) => ps.userId),
      finishedRound.userId,
    ];

    // Recruter 1 nouvelle star respectant les critères
    const nextStarIds = await this.#recruitStars(
      finishedRound.country,
      starGender,
      1,
      exclusionList,
    );

    if (nextStarIds.length === 0) {
      console.warn(
        "[PODIUM-REPLACE] Aucune star disponible pour le remplacement immédiat.",
      );
      return;
    }

    const nextStarId = nextStarIds[0];

    // CRUCIAL : On conserve le même timeDue d'origine du bloc pour rester calé sur le rythme universel
    const nextRound = await prisma.podiumStar.create({
      data: {
        podiumId: finishedRound.podiumId,
        userId: nextStarId,
        spot: finishedRound.spot,
        timeDue: finishedRound.timeDue,
        country: finishedRound.country,
        isActive: true,
      },
    });

    await prisma.user.update({
      where: { id: nextStarId },
      data: { podiumOccurenceCount: { increment: 1 } },
    });

    // Assigner les spectateurs orphelins à la nouvelle star de remplacement
    const replacementSpectators = orphanSpectatorIds.map((userId) => ({
      podiumStarId: nextRound.id,
      userId,
    }));

    await prisma.podiumSpectator.createMany({
      data: replacementSpectators,
      skipDuplicates: true,
    });

    // Déclencher les événements WebSockets en temps réel
    if (typeof io !== "undefined") {
      orphanSpectatorIds.forEach((userId) => {
        io.to(`user_${userId}`).emit("podium:updated", {
          roundId: nextRound.id,
          spot: nextRound.spot,
          timeDue: nextRound.timeDue,
        });
      });
    }
  }

  /**
   * GESTION DE L'EXPIRATION DU BLOC PAR LE CRON (Inchangée)
   */
  static async handleRoundExpiration(podiumStarId) {
    const updateResult = await prisma.podiumStar.updateMany({
      where: { id: podiumStarId, isActive: true },
      data: { isActive: false },
    });

    if (updateResult.count === 0) return;

    const finishedRound = await prisma.podiumStar.findUnique({
      where: { id: podiumStarId },
      include: { spectators: true },
    });

    if (!finishedRound) return;

    // Le cron recrée une session complète en appelant la régénération
    const sampleSpectator = finishedRound.spectators[0];
    if (sampleSpectator) {
      const user = await prisma.user.findUnique({
        where: { id: sampleSpectator.userId },
        select: { gender: true },
      });
      if (user) {
        await this.generateCountryRounds(finishedRound.country, user.gender);
      }
    }
  }

  /**
   * RECRUTEMENT DES STARS NATIVES (Cascade à 4 niveaux)
   */
  static async #recruitStars(country, gender, countNeeded, excludedUserIds) {
    const electedStarIds = [];
    const couples = await prisma.match.findMany({
      where: { status: "ACTIVE", isConfirmed: true },
      select: { fromId: true, toId: true },
    });

    const inlineCoupleIds = couples.flatMap((c) => [c.fromId, c.toId]);
    const baseExclusions = Array.from(
      new Set([...excludedUserIds, ...inlineCoupleIds]),
    );

    // L1: StarpointWallet
    const level1Stars = await prisma.starpointWallet.findMany({
      where: {
        user: { country, gender, role: "USER", id: { notIn: baseExclusions } },
        points: { gt: 0 },
      },
      orderBy: { points: "desc" },
      take: countNeeded,
    });

    for (const star of level1Stars) {
      electedStarIds.push(star.userId);
      await prisma.starpointWallet.update({
        where: { userId: star.userId },
        data: { points: 0 },
      });
      if (electedStarIds.length === countNeeded) return electedStarIds;
    }

    // L2: Score DM
    const remainingCount = countNeeded - electedStarIds.length;
    let combinedExclusions = [...baseExclusions, ...electedStarIds];

    const level2Stars = await prisma.user.findMany({
      where: {
        country,
        gender,
        id: { notIn: combinedExclusions },
        role: "USER",
      },
      orderBy: { dmScore: "desc" },
      take: remainingCount,
      select: { id: true },
    });

    for (const star of level2Stars) {
      electedStarIds.push(star.id);
      if (electedStarIds.length === countNeeded) return electedStarIds;
    }

    // L3: Fallback Occurrence
    if (electedStarIds.length < countNeeded) {
      combinedExclusions = [...baseExclusions, ...electedStarIds];
      const finalRemaining = countNeeded - electedStarIds.length;

      const fallbackStars = await prisma.user.findMany({
        where: {
          country,
          gender,
          id: { notIn: combinedExclusions },
          role: "USER",
        },
        orderBy: { podiumOccurenceCount: "asc" },
        take: finalRemaining,
        select: { id: true },
      });
      fallbackStars.forEach((s) => electedStarIds.push(s.id));
    }

    // L4: Sécurité Ultime
    if (electedStarIds.length < countNeeded) {
      const urgentRemaining = countNeeded - electedStarIds.length;
      const emergencyStars = await prisma.user.findMany({
        where: {
          country,
          gender,
          role: "USER",
          id: {
            notIn: Array.from(new Set([...inlineCoupleIds, ...electedStarIds])),
          },
        },
        orderBy: { podiumOccurenceCount: "asc" },
        take: urgentRemaining,
        select: { id: true },
      });
      emergencyStars.forEach((s) => electedStarIds.push(s.id));
    }

    return electedStarIds;
  }
}
