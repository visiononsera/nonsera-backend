import { walletService } from "../services/wallet.service.js";

export const walletController = {
  /**
   * GET /api/wallet/summary
   */
  getSummary: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Utilisateur non authentifié." });
      }

      const summary = await walletService.getWalletSummary(userId);
      return res.status(200).json({ success: true, data: summary });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération du résumé du wallet.",
        error: error.message,
      });
    }
  },

  /**
   * GET /api/wallet/history
   */
  getHistory: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Utilisateur non authentifié." });
      }

      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const page = req.query.page ? Number(req.query.page) : 1;

      const historyData = await walletService.getClientHistory(
        userId,
        limit,
        page,
      );
      return res.status(200).json({ success: true, data: historyData });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/wallet/debit
   */
  debit: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Utilisateur non authentifié." });
      }

      const { amount, description } = req.body;

      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Le montant doit être supérieur à 0.",
        });
      }

      const result = await walletService.debitWallet(
        userId,
        Number(amount),
        description || "Achat de services",
      );
      return res.status(200).json({
        success: true,
        message: "Débit effectué avec succès.",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/wallet/lumiere-transfer
   */
  transferLumiere: async (req, res) => {
    try {
      const senderId = req.user?.id;
      if (!senderId) {
        return res
          .status(401)
          .json({ success: false, message: "Utilisateur non authentifié." });
      }

      const { receiverId, amount } = req.body;

      if (!receiverId || Number(receiverId) === senderId) {
        return res
          .status(400)
          .json({ success: false, message: "Destinataire invalide." });
      }
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Montant du transfert invalide." });
      }

      const result = await walletService.transferLumiere(
        senderId,
        Number(receiverId),
        Number(amount),
      );
      return res.status(200).json({
        success: true,
        message: "Transfert Lumière envoyé avec succès.",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/wallet/refund
   * Gestion des remboursements (restreint au support/admin)
   */
  refundWallet: async (req, res) => {
    try {
      const { userId, originalTrancheId, amountToRefund, reason } = req.body;

      if (
        !userId ||
        !originalTrancheId ||
        !amountToRefund ||
        Number(amountToRefund) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Données de remboursement invalides.",
        });
      }

      const result = await walletService.refundWallet(
        Number(userId),
        originalTrancheId,
        Number(amountToRefund),
        reason || "Remboursement client",
      );
      return res.status(200).json({
        success: true,
        message: "Remboursement traité avec succès.",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/wallet/bonus/lock
   * Gel de sécurité sur un bonus disponible
   */
  lockBonus: async (req, res) => {
    try {
      const userId = req.user?.id;
      const targetUserId = req.body.userId ? Number(req.body.userId) : userId;

      if (!targetUserId) {
        return res
          .status(401)
          .json({ success: false, message: "Utilisateur non identifié." });
      }

      const { amountToLock, reason } = req.body;

      if (!amountToLock || isNaN(amountToLock) || Number(amountToLock) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Le montant à geler doit être supérieur à 0.",
        });
      }

      await walletService.lockBonus(
        targetUserId,
        Number(amountToLock),
        reason || "Blocage de sécurité",
      );
      return res
        .status(200)
        .json({ success: true, message: "Bonus gelé avec succès." });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/wallet/bonus/unlock
   * Déblocage d'un bonus gelé
   */
  unlockBonus: async (req, res) => {
    try {
      const userId = req.user?.id;
      const targetUserId = req.body.userId ? Number(req.body.userId) : userId;

      if (!targetUserId) {
        return res
          .status(401)
          .json({ success: false, message: "Utilisateur non identifié." });
      }

      const { amountToUnlock, reason } = req.body;

      if (
        !amountToUnlock ||
        isNaN(amountToUnlock) ||
        Number(amountToUnlock) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Le montant à débloquer doit être supérieur à 0.",
        });
      }

      await walletService.unlockBonus(
        targetUserId,
        Number(amountToUnlock),
        reason || "Libération de bonus",
      );
      return res
        .status(200)
        .json({ success: true, message: "Bonus débloqué avec succès." });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/wallet/bonus/trigger-expiration
   * Déclenchement de la purge des bonus obsolètes
   */
  expireOldBonus: async (req, res) => {
    try {
      await walletService.expireOldBonus();
      return res.status(200).json({
        success: true,
        message: "Traitement des bonus expirés terminé.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Échec du traitement des expirations.",
        error: error.message,
      });
    }
  },

  /**
   * POST /api/wallet/webhook/kkiapay (PROD)
   */
  handleKkiapayWebhook: async (req, res) => {
    try {
      const { status, amount, transactionId, metadata } = req.body;

      if (status !== "SUCCESS") {
        return res
          .status(200)
          .json({ success: false, message: "Transaction ignorée." });
      }

      if (!metadata || !metadata.userId) {
        return res.status(400).json({
          success: false,
          message: "userId manquant dans les métadonnées.",
        });
      }

      const tranche = await walletService.creditWallet(
        Number(metadata.userId),
        Number(amount),
        "KKIAPAY",
        transactionId || `KKIA-${Date.now()}`,
        metadata.countryCode || null,
      );

      return res.status(201).json({ success: true, data: tranche });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/wallet/test-sandbox-recharge (BAC À SABLE SIMULATION)
   */
  simulateTestRecharge: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Utilisateur non authentifié." });
      }

      const { amount, method, testIdentifier } = req.body;

      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Montant invalide." });
      }

      const formattedProvider = method?.toUpperCase();
      const allowedProviders = ["MTN", "MOOV", "CELTIS", "CB", "PAYPAL"];

      if (!formattedProvider || !allowedProviders.includes(formattedProvider)) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Méthode de paiement non supportée.",
          });
      }

      // Validation Plan Bénin à 10 chiffres (01XXXXXXXX)
      if (["MTN", "MOOV", "CELTIS"].includes(formattedProvider)) {
        if (
          !testIdentifier ||
          !testIdentifier.startsWith("01") ||
          testIdentifier.length !== 10
        ) {
          return res.status(400).json({
            success: false,
            message: `Numéro de test ${formattedProvider} invalide. Format attendu : 01XXXXXXXX (10 chiffres).`,
          });
        }
      }

      if (formattedProvider === "CB") {
        const cleanCard = testIdentifier?.replace(/\s/g, "");
        if (!cleanCard || cleanCard.length < 16) {
          return res.status(400).json({
            success: false,
            message:
              "Numéro de Carte Bancaire de test invalide (16 chiffres requis).",
          });
        }
      }

      const rechargeAmount = Number(amount); // Correction ici : Déclaration explicite

      const tranche = await walletService.creditWallet(
        userId,
        rechargeAmount,
        formattedProvider,
        `SANDBOX-${formattedProvider}-${Date.now()}`,
        "BJ",
      );

      return res.status(201).json({
        success: true,
        message: `[SANDBOX] Simulation réussie via ${method}.`,
        data: tranche,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};
