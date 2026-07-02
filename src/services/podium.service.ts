import prisma from "./prisma.service";

const SPECTATORS_PER_PODIUM = 100;

export class PodiumService {
  
  static async generateCountryRounds(country: string, spectatorGender: 'MALE' | 'FEMALE') {
    const starGender = spectatorGender === 'MALE' ? 'FEMALE' : 'MALE';
    const futureTime = new Date(Date.now() + 5 * 60 * 1000);

    const spectators = await prisma.user.findMany({
      where: { country, gender: spectatorGender, isOnline: true, role: 'USER' },
      select: { id: true }
    });

    if (spectators.length === 0) return;

    const totalPodiumsNeeded = Math.ceil(spectators.length / SPECTATORS_PER_PODIUM);
    const starIds = await this.recruitStars(country, starGender, totalPodiumsNeeded);
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

  private static async recruitStars(country: string, gender: 'MALE' | 'FEMALE', countNeeded: number): Promise<number[]> {
    const electedStarIds: number[] = [];

    const level1Stars = await prisma.starpointWallet.findMany({
      where: { user: { country, gender, isOnline: true }, points: { gt: 0 } },
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

    const remainingCount = countNeeded - electedStarIds.length;
    const level2Stars = await prisma.user.findMany({
      where: { country, gender, isOnline: true, id: { notIn: electedStarIds } },
      orderBy: { dmScore: 'desc' },
      take: remainingCount,
      select: { id: true }
    });

    for (const star of level2Stars) {
      electedStarIds.push(star.id);
      if (electedStarIds.length === countNeeded) return electedStarIds;
    }

    if (electedStarIds.length < countNeeded) {
      const fallbackStars = await prisma.user.findMany({
        where: { country, gender, isOnline: true, id: { notIn: electedStarIds } },
        orderBy: { podiumOccurenceCount: 'asc' },
        take: countNeeded - electedStarIds.length,
        select: { id: true }
      });
      fallbackStars.forEach(s => electedStarIds.push(s.id));
    }

    return electedStarIds;
  }

  /**
   * INTERRUPTION DANIELLE OPTIMISÉE
   */
  static async handleDanielleInterruption(podiumStarId: number, matchSenderId: number) {
    const currentRound = await prisma.podiumStar.findUnique({
      where: { id: podiumStarId },
      include: { spectators: true }
    });

    if (!currentRound || !currentRound.isActive) return;

    const starId = currentRound.userId;
    const country = currentRound.country;

    await prisma.podiumStar.update({
      where: { id: podiumStarId },
      data: { isActive: false }
    });

    // Correction Erreur 1 & 2 : Retrait de skipDuplicates sur la transaction create si non supporté ou typé en `never`
    const participantOneId = Math.min(matchSenderId, starId);
    const participantTwoId = Math.max(matchSenderId, starId);

    // On utilise des blocs try/catch internes ou des structures classiques sans skipDuplicates si la clé est unique
    try {
      await prisma.$transaction([
        prisma.match.create({
          data: { fromId: matchSenderId, toId: starId, isConfirmed: true, type: 'BOOST' }
        }),
        prisma.chatRoom.create({
          data: { participantOneId, participantTwoId, lastMessage: "Match Flash Danielle !" }
        })
      ]);
    } catch (e) {
      console.log("[DANIELLE] Le match ou le salon existait déjà, poursuite du flux.");
    }

    io.to(`user_${matchSenderId}`).to(`user_${starId}`).emit('danielle:mode_changed', {
      mode: 'MESSAGE',
      chatTargetId: starId
    });

    io.to(`podium_star_${podiumStarId}`).emit('podium:terminated', {
      reason: 'DANIELLE_TRIGGERED'
    });

    const orphanSpectatorIds = currentRound.spectators.map(s => s.userId);
    if (orphanSpectatorIds.length === 0) return;

    await prisma.podiumSpectator.deleteMany({
      where: { podiumStarId }
    });

    // Correction Erreur 3 : Typage et validation stricte pour exactOptionalPropertyTypes
    const firstOrphanId = orphanSpectatorIds[0];
    if (firstOrphanId === undefined) return;

    const sampleUser = await prisma.user.findUnique({ 
      where: { id: firstOrphanId }, 
      select: { gender: true } 
    });
    
    if (!sampleUser?.gender) return;
    const starGender = sampleUser.gender === 'MALE' ? 'FEMALE' : 'MALE';

    const newPodiumsCount = Math.ceil(orphanSpectatorIds.length / SPECTATORS_PER_PODIUM);
    const newStarIds = await this.recruitStars(country, starGender, newPodiumsCount);
    if (newStarIds.length === 0) return;

    const actualNewPodiumsCount = Math.min(newPodiumsCount, newStarIds.length);
    const futureTime = new Date(Date.now() + 5 * 60 * 1000);

    const flashParentPodium = await prisma.podium.create({
      data: { country, status: 'ACTIVE', category: 'COUNTRY' }
    });

    // Correction Erreur 4 & 5 : Déclaration explicite du type de tableau pour éviter le type 'any[]' implicite
    const newSubRounds: { id: number; spot: number; timeDue: Date; userId: number; country: string }[] = [];
    
    for (let i = 0; i < actualNewPodiumsCount; i++) {
      const starIdToAssign = newStarIds[i];
      if (starIdToAssign === undefined) continue;

      const subRound = await prisma.podiumStar.create({
        data: {
          podiumId: flashParentPodium.id,
          userId: starIdToAssign,
          spot: i + 1,
          timeDue: futureTime,
          country
        }
      });
      newSubRounds.push(subRound);
    }

    const newSpectatorData = orphanSpectatorIds.map((userId, index) => {
      const assignedRound = newSubRounds[index % actualNewPodiumsCount]!;
      return { podiumStarId: assignedRound.id, userId };
    });

    await prisma.podiumSpectator.createMany({
      data: newSpectatorData,
      skipDuplicates: true
    });

    for (const round of newSubRounds) {
      io.to(`podium_star_${round.id}`).emit('podium:started', {
        roundId: round.id,
        spot: round.spot,
        timeDue: round.timeDue,
        starId: round.userId
      });
    }
  }
}