import prisma from "./prisma.service";
import { MatchService } from "./match.service";

const SPECTATORS_PER_PODIUM = 100;

export class PodiumService {
  /**
   * RÉCUPÉRER LA STAR COURANTE POUR UN SPECTATEUR
   * BLINDAGE : Strictement role USER et vérification du statut actif du parent podium
   */
  static async getLiveStarForUser(userId: number) {
    console.log(`[PODIUM-GET] Recherche de star pour le spectateur ID: ${userId}`);
    
    // On va chercher l'assignation la plus récente qui pointe vers un round STRICTEMENT actif 
    // et dont le podium parent est aussi au statut ACTIVE
    const assignment = await prisma.podiumSpectator.findFirst({
      where: { 
        userId,
        podiumStar: {
          isActive: true, // Élimine d'office les résidus de rounds passés à false
          podium: {
            status: "ACTIVE" // Filtre sur les podiums globaux valides
          },
          user: {
            role: "USER" // Double sécurité : Seuls les profils USER montent
          }
        }
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
                role: true
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc' // Priorité absolue au rattachement le plus récent
      }
    });

    console.log(`[PODIUM-GET] Résultat de l'assignation trouvée :`, assignment);

    if (!assignment || !assignment.podiumStar || !assignment.podiumStar.isActive) {
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
   * GENERATION INITIALE DES ROUNDS
   */
  static async generateCountryRounds(
    country: string,
    spectatorGender: "MALE" | "FEMALE",
  ) {
    const starGender = spectatorGender === "MALE" ? "FEMALE" : "MALE";
    const futureTime = new Date(Date.now() + 5 * 60 * 1000);

    console.log(`[PODIUM-DEBUG] Démarrage de generateCountryRounds -> Pays: ${country}`);

    const spectators = await prisma.user.findMany({
      where: {
        country,
        gender: spectatorGender,
        role: "USER",
      },
      select: { id: true },
    });

    if (spectators.length === 0) {
      console.warn(`[PODIUM-DEBUG] Aucun spectateur éligible.`);
      return;
    }

    const totalPodiumsNeeded = Math.ceil(spectators.length / SPECTATORS_PER_PODIUM);

    const starIds = await this.recruitStars(
      country,
      starGender,
      totalPodiumsNeeded,
      [],
    );

    if (starIds.length === 0) {
      console.warn(`[PODIUM-DEBUG] Arrêt critique : Aucune star USER célibataire disponible.`);
      return;
    }

    const actualPodiumsCount = Math.min(totalPodiumsNeeded, starIds.length);

    const parentPodium = await prisma.podium.create({
      data: { country, status: "ACTIVE", category: "COUNTRY" },
    });

    const activeSubRounds: any[] = [];
    for (let i = 0; i < actualPodiumsCount; i++) {
      const starId = starIds[i]!;

      const subRound = await prisma.podiumStar.create({
        data: {
          podiumId: parentPodium.id,
          userId: starId,
          spot: i + 1,
          timeDue: futureTime,
          country,
          isActive: true
        },
      });

      await prisma.user.update({
        where: { id: starId },
        data: { podiumOccurenceCount: { increment: 1 } },
      });

      activeSubRounds.push(subRound);
    }

    // Préparation des données d'association
    const spectatorData = spectators.map((spec, index) => {
      const assignedRound = activeSubRounds[index % actualPodiumsCount]!;
      return { podiumStarId: assignedRound.id, userId: spec.id };
    });

    // Nettoyage préventif pour éviter que le spectateur traîne sur d'anciens podiums du pays
    const oldSpectatorIds = spectators.map(s => s.id);
    await prisma.podiumSpectator.deleteMany({
      where: { userId: { in: oldSpectatorIds } }
    });

    const createdSpectators = await prisma.podiumSpectator.createMany({
      data: spectatorData,
      skipDuplicates: true,
    });
    console.log(`[PODIUM-DEBUG] 👥 Association Spectateurs terminée. Confiés au live: ${createdSpectators.count}`);
  }

  /**
   * RECRUTEMENT DES STARS (STRICTEMENT ROLE USER & CÉLIBATAIRE)
   */
  private static async recruitStars(
    country: string,
    gender: "MALE" | "FEMALE",
    countNeeded: number,
    excludedUserIds: number[],
  ): Promise<number[]> {
    const electedStarIds: number[] = [];

    // Étape A : Identification des couples à exclure impérativement
    const couples = await prisma.match.findMany({
      where: { status: "ACTIVE", isConfirmed: true },
      select: { fromId: true, toId: true },
    });

    const inlineCoupleIds = couples.flatMap((c) => [c.fromId, c.toId]);
    const baseExclusions = Array.from(new Set([...excludedUserIds, ...inlineCoupleIds]));

    // ==========================================
    // NIVEAU 1 : StarpointWallet - Role USER strict
    // ==========================================
    const level1Stars = await prisma.starpointWallet.findMany({
      where: {
        user: {
          country,
          gender,
          role: "USER",
          id: { notIn: baseExclusions },
        },
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

    // ==========================================
    // NIVEAU 2 : Score DM - Role USER strict
    // ==========================================
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

    // ==========================================
    // NIVEAU 3 : Fallback par occurrence - Roulement continu & équitable
    // ==========================================
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

    // ==========================================
    // SÉCURITÉ ANTI-VIDE ULTIME : Recyclage Forcé (Uniquement les célibataires)
    // ==========================================
    if (electedStarIds.length < countNeeded) {
      const urgentRemaining = countNeeded - electedStarIds.length;
      
      const emergencyStars = await prisma.user.findMany({
        where: {
          country,
          gender,
          role: "USER",
          id: { notIn: Array.from(new Set([...inlineCoupleIds, ...electedStarIds])) }
        },
        orderBy: { podiumOccurenceCount: "asc" },
        take: urgentRemaining,
        select: { id: true }
      });

      emergencyStars.forEach((s) => electedStarIds.push(s.id));
    }

    return electedStarIds;
  }

  /**
   * LA STAR ACCEPTE LE CADEAU (PASSATION AUTOMATIQUE)
   */
  static async acceptDanielleGift(podiumStarId: number, matchSenderId: number, giftId: number) {
    const updateResult = await prisma.podiumStar.updateMany({
      where: { id: podiumStarId, isActive: true },
      data: { isActive: false },
    });

    if (updateResult.count === 0) {
      throw new Error("Désolé, cette Star a déjà accepté un autre cadeau ou le round est terminé.");
    }

    const currentRound = await prisma.podiumStar.findUnique({
      where: { id: podiumStarId },
      include: { spectators: true },
    });

    if (!currentRound) throw new Error("Podium introuvable.");

    const starId = currentRound.userId;
    const country = currentRound.country;

    try {
      await MatchService.acceptDirectGift(starId, matchSenderId, giftId, "BOOST");
    } catch (error: any) {
      await prisma.podiumStar.update({
        where: { id: podiumStarId },
        data: { isActive: true },
      });
      throw new Error(`Échec de la validation : ${error.message}`);
    }

    if (typeof io !== "undefined") {
      io.to(`podium_star_${podiumStarId}`).emit("podium:terminated", { reason: "STAR_ACCEPTED_MATCH" });
    }

    const orphanSpectatorIds = currentRound.spectators.map((s) => s.userId);
    if (orphanSpectatorIds.length === 0) return;

    // NETTOYAGE CRUCIAL : Supprimer les relations de l'ancien round avant de générer le suivant
    await prisma.podiumSpectator.deleteMany({ where: { podiumStarId } });

    const firstOrphanId = orphanSpectatorIds[0]!;
    const sampleUser = await prisma.user.findUnique({
      where: { id: firstOrphanId },
      select: { gender: true },
    });
    if (!sampleUser?.gender) return;
    const starGender = sampleUser.gender === "MALE" ? "FEMALE" : "MALE";

    const currentlyActiveStars = await prisma.podiumStar.findMany({
      where: { isActive: true },
      select: { userId: true },
    });

    const busyUserIds = currentlyActiveStars.map((ps) => ps.userId);
    const finalExclusionList = [...busyUserIds, starId];

    const newStarIds = await this.recruitStars(country, starGender, 1, finalExclusionList);
    if (newStarIds.length === 0) return;

    const replacementStarId = newStarIds[0]!;

    const nextRound = await prisma.podiumStar.create({
      data: {
        podiumId: currentRound.podiumId,
        userId: replacementStarId,
        spot: currentRound.spot,
        timeDue: currentRound.timeDue,
        country,
        isActive: true
      },
    });

    await prisma.user.update({
      where: { id: replacementStarId },
      data: { podiumOccurenceCount: { increment: 1 } },
    });

    const replacementSpectators = orphanSpectatorIds.map((userId) => ({
      podiumStarId: nextRound.id,
      userId,
    }));

    await prisma.podiumSpectator.createMany({
      data: replacementSpectators,
      skipDuplicates: true,
    });

    if (typeof io !== "undefined") {
      io.to(`podium_star_${nextRound.id}`).emit("podium:started", {
        roundId: nextRound.id,
        spot: nextRound.spot,
        timeDue: nextRound.timeDue,
        starId: nextRound.userId,
      });
    }
  }

  /**
   * GESTION DE L'EXPIRATION D'UN ROUND DE 5 MIN
   */
  static async handleRoundExpiration(podiumStarId: number) {
    console.log(`[PODIUM-AUTOMATION] Passation suite à expiration pour le round #${podiumStarId}`);

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

    const orphanSpectatorIds = finishedRound.spectators.map((s) => s.userId);
    if (orphanSpectatorIds.length === 0) return;

    const country = finishedRound.country;
    const oldStarId = finishedRound.userId;

    const firstOrphanId = orphanSpectatorIds[0]!;
    const sampleUser = await prisma.user.findUnique({
      where: { id: firstOrphanId },
      select: { gender: true },
    });
    if (!sampleUser?.gender) return;
    const starGender = sampleUser.gender === "MALE" ? "FEMALE" : "MALE";

    // NETTOYAGE CRUCIAL : Destruction des liens obsolètes avant réattribution
    await prisma.podiumSpectator.deleteMany({ where: { podiumStarId } });

    if (typeof io !== "undefined") {
      io.to(`podium_star_${podiumStarId}`).emit("podium:terminated", { reason: "ROUND_TIME_EXPIRED" });
    }

    const currentlyActiveStars = await prisma.podiumStar.findMany({
      where: { isActive: true },
      select: { userId: true },
    });
    const busyUserIds = currentlyActiveStars.map((ps) => ps.userId);
    const exclusionList = [...busyUserIds, oldStarId];

    const nextStarIds = await this.recruitStars(country, starGender, 1, exclusionList);

    if (nextStarIds.length === 0) return;

    const nextStarId = nextStarIds[0]!;
    const nextRoundTimeDue = new Date(Date.now() + 5 * 60 * 1000);

    const nextRound = await prisma.podiumStar.create({
      data: {
        podiumId: finishedRound.podiumId,
        userId: nextStarId,
        spot: finishedRound.spot,
        timeDue: nextRoundTimeDue,
        country,
        isActive: true
      },
    });

    await prisma.user.update({
      where: { id: nextStarId },
      data: { podiumOccurenceCount: { increment: 1 } },
    });

    const replacementSpectators = orphanSpectatorIds.map((userId) => ({
      podiumStarId: nextRound.id,
      userId,
    }));

    await prisma.podiumSpectator.createMany({
      data: replacementSpectators,
      skipDuplicates: true,
    });

    if (typeof io !== "undefined") {
      io.to(`podium_star_${nextRound.id}`).emit("podium:started", {
        roundId: nextRound.id,
        spot: nextRound.spot,
        timeDue: nextRound.timeDue,
        starId: nextRound.userId,
      });
    }
  }
}