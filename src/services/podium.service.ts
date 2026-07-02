import prisma from "./prisma.service";
import { MatchService } from "./match.service";

const SPECTATORS_PER_PODIUM = 100;

export class PodiumService {
  
  /**
   * 1. GENERATION INITIALE DES ROUNDS
   */
  static async generateCountryRounds(country: string, spectatorGender: 'MALE' | 'FEMALE') {
    const starGender = spectatorGender === 'MALE' ? 'FEMALE' : 'MALE';
    const futureTime = new Date(Date.now() + 5 * 60 * 1000);

    const spectators = await prisma.user.findMany({
      where: { country, gender: spectatorGender, isOnline: true, role: 'USER' },
      select: { id: true }
    });

    if (spectators.length === 0) return;

    const totalPodiumsNeeded = Math.ceil(spectators.length / SPECTATORS_PER_PODIUM);
    
    // Récupération des stars disponibles (Exclusion des personnes déjà en couple ou sur un podium)
    const starIds = await this.recruitStars(country, starGender, totalPodiumsNeeded, []);
    if (starIds.length === 0) return;

    const actualPodiumsCount = Math.min(totalPodiumsNeeded, starIds.length);

    const parentPodium = await prisma.podium.create({
      data: { country, status: 'ACTIVE', category: 'COUNTRY' }
    });

    const activeSubRounds: { id: number; spot: number; timeDue: Date; userId: number; country: string }[] = [];
    for (let i = 0; i < actualPodiumsCount; i++) {
      const subRound = await prisma.podiumStar.create({
        data: {
          podiumId: parentPodium.id,
          userId: starIds[i]!,
          spot: i + 1,
          timeDue: futureTime,
          country
        }
      });
      activeSubRounds.push(subRound);
    }

    const spectatorData = spectators.map((spec, index) => {
      const assignedRound = activeSubRounds[index % actualPodiumsCount]!;
      return { podiumStarId: assignedRound.id, userId: spec.id };
    });

    await prisma.podiumSpectator.createMany({
      data: spectatorData,
      skipDuplicates: true
    });

    for (const round of activeSubRounds) {
      io.to(`podium_star_${round.id}`).emit('podium:started', {
        roundId: round.id,
        spot: round.spot,
        timeDue: round.timeDue,
        starId: round.userId
      });
    }
  }

  /**
   * 2. RECRUTEMENT DES STARS AVEC EXCLUSION DES GENS EN COUPLE
   */
  private static async recruitStars(
    country: string, 
    gender: 'MALE' | 'FEMALE', 
    countNeeded: number,
    excludedUserIds: number[]
  ): Promise<number[]> {
    const electedStarIds: number[] = [];
    
    // Étape critique : On va chercher tous les IDs des utilisateurs en couple actifs pour les exclure d'office
    const couples = await prisma.match.findMany({
      where: { status: 'ACTIVE', isConfirmed: true },
      select: { fromId: true, toId: true }
    });
    
    const inlineCoupleIds = couples.flatMap(c => [c.fromId, c.toId]);
    const baseExclusions = Array.from(new Set([...excludedUserIds, ...inlineCoupleIds]));

    // Niveau 1 : Portefeuille de points
    const level1Stars = await prisma.starpointWallet.findMany({
      where: { 
        user: { country, gender, isOnline: true, id: { notIn: baseExclusions } }, 
        points: { gt: 0 } 
      },
      orderBy: { points: 'desc' },
      take: countNeeded,
      select: { userId: true }
    });

    for (const star of level1Stars) {
      electedStarIds.push(star.userId);
      await prisma.starpointWallet.update({
        where: { userId: star.userId },
        data: { points: 0 }
      });
      if (electedStarIds.length === countNeeded) return electedStarIds;
    }

    // Niveau 2 : Score DM
    const remainingCount = countNeeded - electedStarIds.length;
    const combinedExclusions = [...baseExclusions, ...electedStarIds];
    
    const level2Stars = await prisma.user.findMany({
      where: { country, gender, isOnline: true, id: { notIn: combinedExclusions } },
      orderBy: { dmScore: 'desc' },
      take: remainingCount,
      select: { id: true }
    });

    for (const star of level2Stars) {
      electedStarIds.push(star.id);
      if (electedStarIds.length === countNeeded) return electedStarIds;
    }

    // Niveau 3 : Fallback par occurrence
    if (electedStarIds.length < countNeeded) {
      const finalExclusions = [...baseExclusions, ...electedStarIds];
      const fallbackStars = await prisma.user.findMany({
        where: { country, gender, isOnline: true, id: { notIn: finalExclusions } },
        orderBy: { podiumOccurenceCount: 'asc' },
        take: countNeeded - electedStarIds.length,
        select: { id: true }
      });
      fallbackStars.forEach(s => electedStarIds.push(s.id));
    }

    return electedStarIds;
  }

  /**
   * 3. ACTION : LA STAR ACCEPTE LE CADEAU (DÉLÉGATION AU MATCHSERVICE)
   */
  static async acceptDanielleGift(podiumStarId: number, matchSenderId: number, giftId: number) {
    // A. VERROU CONCURRENTIEL DIRECT SUR LE PODIUM
    const updateResult = await prisma.podiumStar.updateMany({
      where: { id: podiumStarId, isActive: true },
      data: { isActive: false }
    });

    if (updateResult.count === 0) {
      throw new Error("Désolé, cette Star a déjà accepté un autre cadeau ou le round est terminé.");
    }

    // B. Récupération des métadonnées du round
    const currentRound = await prisma.podiumStar.findUnique({
      where: { id: podiumStarId },
      include: { spectators: true }
    });

    if (!currentRound) throw new Error("Podium introuvable.");

    const starId = currentRound.userId; // Le récepteur du cadeau (La Star sur le podium)
    const country = currentRound.country;

    try {
      // C. DÉLÉGATION AU MATCHSERVICE (Gère le Débit Portefeuille + Vérifs Couples + Création Match BOOST & Chat)
      await MatchService.acceptDirectGift(starId, matchSenderId, giftId, 'BOOST');
      
    } catch (error: any) {
      // En cas de solde insuffisant ou problème transactionnel, on réactive le round
      await prisma.podiumStar.update({ where: { id: podiumStarId }, data: { isActive: true } });
      throw new Error(`Échec de la validation : ${error.message}`);
    }

    // D. NOTIFICATION AUX SPECTATEURS DU PODIUM TERMINÉ
    io.to(`podium_star_${podiumStarId}`).emit('podium:terminated', {
      reason: 'STAR_ACCEPTED_MATCH'
    });

    // E. PROCESSUS DE PASSATION / SPECTATEURS ORPHELINS
    const orphanSpectatorIds = currentRound.spectators.map(s => s.userId);
    if (orphanSpectatorIds.length === 0) return;

    // Suppression des spectateurs du salon actuel
    await prisma.podiumSpectator.deleteMany({ where: { podiumStarId } });

    const firstOrphanId = orphanSpectatorIds[0]!;
    const sampleUser = await prisma.user.findUnique({ 
      where: { id: firstOrphanId }, 
      select: { gender: true } 
    });
    if (!sampleUser?.gender) return;
    const starGender = sampleUser.gender === 'MALE' ? 'FEMALE' : 'MALE';

    // F. RÉSOLUTION ET RECRUTEMENT DE LA STAR DE REMPLACEMENT
    const currentlyActiveStars = await prisma.podiumStar.findMany({
      where: { isActive: true },
      select: { userId: true }
    });
    
    const busyUserIds = currentlyActiveStars.map(ps => ps.userId);
    const finalExclusionList = [...busyUserIds, starId];

    // Recrutement de la star suivante
    const newStarIds = await this.recruitStars(country, starGender, 1, finalExclusionList);
    if (newStarIds.length === 0) return; // Personne de dispo

    const replacementStarId = newStarIds[0]!;

    // Attribution du nouveau sous-round avec le temps restant
    const nextRound = await prisma.podiumStar.create({
      data: {
        podiumId: currentRound.podiumId,
        userId: replacementStarId,
        spot: currentRound.spot,
        timeDue: currentRound.timeDue,
        country
      }
    });

    const replacementSpectators = orphanSpectatorIds.map(userId => ({
      podiumStarId: nextRound.id,
      userId
    }));

    await prisma.podiumSpectator.createMany({
      data: replacementSpectators,
      skipDuplicates: true
    });

    io.to(`podium_star_${nextRound.id}`).emit('podium:started', {
      roundId: nextRound.id,
      spot: nextRound.spot,
      timeDue: nextRound.timeDue,
      starId: nextRound.userId
    });
  }
}