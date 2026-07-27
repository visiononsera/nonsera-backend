import { dashboardStatsService } from "../services/dashboardStats.service.js";

export const dashboardStatsController = {
  /**
   * GET /api/admin/dashboard/stats
   * Query params : ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&country=BJ
   */
  getDashboardStats: async (req, res) => {
    try {
      const { startDate, endDate, country, countryCode } = req.query;
      const targetCountry = country || countryCode || null;

      const byCountryStats = await dashboardStatsService.getStats({
        startDate,
        endDate,
        countryCode: targetCountry,
      });

      // Calcul automatique des totaux globaux (Somme de tous les pays retournés)
      const globalSummary = byCountryStats.reduce(
        (acc, curr) => ({
          usersOnline: acc.usersOnline + curr.usersOnline,
          usersValidated: acc.usersValidated + curr.usersValidated,
          usersInCouple: acc.usersInCouple + curr.usersInCouple,
          usersAwaitingValidation: acc.usersAwaitingValidation + curr.usersAwaitingValidation,
          managersCount: acc.managersCount + curr.managersCount,
          agentsCount: acc.agentsCount + curr.agentsCount,
          companiesVerified: acc.companiesVerified + curr.companiesVerified,
          companiesAwaitingValidation: acc.companiesAwaitingValidation + curr.companiesAwaitingValidation,
          caNetRecharge: acc.caNetRecharge + curr.caNetRecharge,
          volumePurchases: acc.volumePurchases + curr.volumePurchases,
          volumeReservations: acc.volumeReservations + curr.volumeReservations,
          volumeCoffrets: acc.volumeCoffrets + curr.volumeCoffrets,
          volumeLumiereTransfers: acc.volumeLumiereTransfers + curr.volumeLumiereTransfers,
          totalInAppCirculation: acc.totalInAppCirculation + curr.totalInAppCirculation,
        }),
        {
          usersOnline: 0,
          usersValidated: 0,
          usersInCouple: 0,
          usersAwaitingValidation: 0,
          managersCount: 0,
          agentsCount: 0,
          companiesVerified: 0,
          companiesAwaitingValidation: 0,
          caNetRecharge: 0,
          volumePurchases: 0,
          volumeReservations: 0,
          volumeCoffrets: 0,
          volumeLumiereTransfers: 0,
          totalInAppCirculation: 0,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Statistiques récupérées avec succès.",
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          country: targetCountry ? targetCountry.toUpperCase() : "ALL",
        },
        data: {
          summary: globalSummary,
          byCountry: byCountryStats,
        },
      });
    } catch (error) {
      console.error("Erreur [getDashboardStats]:", error);

      return res.status(500).json({
        success: false,
        message: "Erreur lors du calcul des statistiques du dashboard.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};