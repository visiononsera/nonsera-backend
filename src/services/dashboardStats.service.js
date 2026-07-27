import prisma from "./prisma.service.js";

export const dashboardStatsService = {
  /**
   * Récupère les statistiques filtrées par dates et par pays
   * @param {Object} filters
   * @param {string|null} filters.startDate - ISO string / YYYY-MM-DD
   * @param {string|null} filters.endDate - ISO string / YYYY-MM-DD
   * @param {string|null} filters.countryCode - Code pays (ex: 'BJ', 'CI', 'ALL' ou null)
   */
  getStats: async ({ startDate = null, endDate = null, countryCode = null } = {}) => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const country = (countryCode && countryCode.toUpperCase() !== "ALL") 
      ? countryCode.toUpperCase() 
      : null;

    const stats = await prisma.$queryRaw`
      WITH 
      -- 1. UTILISATEURS & ROLES
      UserStats AS (
        SELECT 
          COALESCE(country, 'NON_SPECIFIE') AS country_code,
          COUNT(CASE WHEN "isOnline" = true THEN 1 END) AS online_users,
          COUNT(CASE WHEN role = 'USER' AND "isCompleted" = true THEN 1 END) AS validated_users,
          COUNT(CASE WHEN role = 'USER' AND "isCompleted" = true 
                     AND "onboardingStep" IN ('AWAITING_VIDEO_CALL', 'CALL_VALIDATION') THEN 1 END) AS awaiting_validation_users,
          COUNT(CASE WHEN role = 'AGENT' THEN 1 END) AS agent_count,
          COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) AS manager_count
        FROM "User"
        WHERE (${start}::timestamp IS NULL OR "createdAt" >= ${start}::timestamp)
          AND (${end}::timestamp IS NULL OR "createdAt" <= ${end}::timestamp)
          AND (${country}::text IS NULL OR country = ${country}::text)
        GROUP BY COALESCE(country, 'NON_SPECIFIE')
      ),

      -- 2. COUPLES (MATCHS ACTIFS)
      CoupleStats AS (
        SELECT 
          COALESCE(u.country, 'NON_SPECIFIE') AS country_code,
          COUNT(DISTINCT u.id) AS users_in_couple
        FROM "Match" m
        JOIN "User" u ON u.id = m."fromId" OR u.id = m."toId"
        WHERE m.status = 'ACTIVE'
          AND (${start}::timestamp IS NULL OR m."createdAt" >= ${start}::timestamp)
          AND (${end}::timestamp IS NULL OR m."createdAt" <= ${end}::timestamp)
          AND (${country}::text IS NULL OR u.country = ${country}::text)
        GROUP BY COALESCE(u.country, 'NON_SPECIFIE')
      ),

      -- 3. ENTREPRISES / PARTENAIRES
      CompanyStats AS (
        SELECT 
          COALESCE(country, 'NON_SPECIFIE') AS country_code,
          COUNT(CASE WHEN "isVerified" = true THEN 1 END) AS verified_companies,
          COUNT(CASE WHEN "isVerified" = false THEN 1 END) AS unverified_companies
        FROM "Company"
        WHERE "deletedAt" IS NULL
          AND (${start}::timestamp IS NULL OR "createdAt" >= ${start}::timestamp)
          AND (${end}::timestamp IS NULL OR "createdAt" <= ${end}::timestamp)
          AND (${country}::text IS NULL OR country = ${country}::text)
        GROUP BY COALESCE(country, 'NON_SPECIFIE')
      ),

      -- 4. CA NET RECHARGES
      RechargeCA AS (
        SELECT 
          COALESCE(u.country, 'NON_SPECIFIE') AS country_code,
          COALESCE(SUM(wt."principalInitial"), 0) AS ca_net_recharge
        FROM "WalletTranche" wt
        JOIN "User" u ON u.id = wt."userId"
        WHERE wt.type = 'RECHARGE'
          AND (${start}::timestamp IS NULL OR wt."createdAt" >= ${start}::timestamp)
          AND (${end}::timestamp IS NULL OR wt."createdAt" <= ${end}::timestamp)
          AND (${country}::text IS NULL OR u.country = ${country}::text)
        GROUP BY COALESCE(u.country, 'NON_SPECIFIE')
      ),

      -- 5. ACHATS & CADEAUX
      PurchaseVolume AS (
        SELECT 
          COALESCE(u.country, 'NON_SPECIFIE') AS country_code,
          COALESCE(SUM(p."totalPrice"), 0) AS total_purchases
        FROM "Purchase" p
        JOIN "User" u ON u.id = p."senderId"
        WHERE p.status != 'CANCELLED'
          AND (${start}::timestamp IS NULL OR p."createdAt" >= ${start}::timestamp)
          AND (${end}::timestamp IS NULL OR p."createdAt" <= ${end}::timestamp)
          AND (${country}::text IS NULL OR u.country = ${country}::text)
        GROUP BY COALESCE(u.country, 'NON_SPECIFIE')
      ),

      -- 6. RÉSERVATIONS & COFFRETS
      ReservationVolume AS (
        SELECT 
          COALESCE(u.country, 'NON_SPECIFIE') AS country_code,
          COALESCE(SUM(r."totalPrice"), 0) AS total_reservations
        FROM "Reservation" r
        JOIN "User" u ON u.id = r."userId"
        WHERE r.status != 'CANCELLED'
          AND (${start}::timestamp IS NULL OR r."createdAt" >= ${start}::timestamp)
          AND (${end}::timestamp IS NULL OR r."createdAt" <= ${end}::timestamp)
          AND (${country}::text IS NULL OR u.country = ${country}::text)
        GROUP BY COALESCE(u.country, 'NON_SPECIFIE')
      ),

      CoffretVolume AS (
        SELECT 
          COALESCE(u.country, 'NON_SPECIFIE') AS country_code,
          COALESCE(SUM(cr."totalPrice"), 0) AS total_coffrets
        FROM "CoffretReservation" cr
        JOIN "User" u ON u.id = cr."userId"
        WHERE cr.status != 'CANCELLED'
          AND (${start}::timestamp IS NULL OR cr."createdAt" >= ${start}::timestamp)
          AND (${end}::timestamp IS NULL OR cr."createdAt" <= ${end}::timestamp)
          AND (${country}::text IS NULL OR u.country = ${country}::text)
        GROUP BY COALESCE(u.country, 'NON_SPECIFIE')
      ),

      -- 7. TRANSFERS LUMIÈRE (P2P)
      LumiereVolume AS (
        SELECT 
          COALESCE(u.country, 'NON_SPECIFIE') AS country_code,
          COALESCE(SUM(wt."principalInitial"), 0) AS total_lumiere_sent
        FROM "WalletTranche" wt
        JOIN "User" u ON u.id = wt."userId"
        WHERE wt.type = 'LUMIERE_ENVOI'
          AND (${start}::timestamp IS NULL OR wt."createdAt" >= ${start}::timestamp)
          AND (${end}::timestamp IS NULL OR wt."createdAt" <= ${end}::timestamp)
          AND (${country}::text IS NULL OR u.country = ${country}::text)
        GROUP BY COALESCE(u.country, 'NON_SPECIFIE')
      ),

      -- 8. UNIVERSE DES PAYS PRÉSENTS
      AllCountries AS (
        SELECT country_code FROM UserStats
        UNION SELECT country_code FROM CompanyStats
        UNION SELECT country_code FROM RechargeCA
      )

      SELECT 
        c.country_code AS "country",
        COALESCE(us.online_users, 0)::INT AS "usersOnline",
        COALESCE(us.validated_users, 0)::INT AS "usersValidated",
        COALESCE(cs.users_in_couple, 0)::INT AS "usersInCouple",
        COALESCE(us.awaiting_validation_users, 0)::INT AS "usersAwaitingValidation",
        COALESCE(us.manager_count, 0)::INT AS "managersCount",
        COALESCE(us.agent_count, 0)::INT AS "agentsCount",
        COALESCE(cmp.verified_companies, 0)::INT AS "companiesVerified",
        COALESCE(cmp.unverified_companies, 0)::INT AS "companiesAwaitingValidation",
        COALESCE(rc.ca_net_recharge, 0)::FLOAT AS "caNetRecharge",
        COALESCE(pv.total_purchases, 0)::FLOAT AS "volumePurchases",
        COALESCE(rv.total_reservations, 0)::FLOAT AS "volumeReservations",
        COALESCE(cv.total_coffrets, 0)::FLOAT AS "volumeCoffrets",
        COALESCE(lv.total_lumiere_sent, 0)::FLOAT AS "volumeLumiereTransfers",
        (
          COALESCE(pv.total_purchases, 0) + 
          COALESCE(rv.total_reservations, 0) + 
          COALESCE(cv.total_coffrets, 0) + 
          COALESCE(lv.total_lumiere_sent, 0)
        )::FLOAT AS "totalInAppCirculation"
      FROM AllCountries c
      LEFT JOIN UserStats us ON c.country_code = us.country_code
      LEFT JOIN CoupleStats cs ON c.country_code = cs.country_code
      LEFT JOIN CompanyStats cmp ON c.country_code = cmp.country_code
      LEFT JOIN RechargeCA rc ON c.country_code = rc.country_code
      LEFT JOIN PurchaseVolume pv ON c.country_code = pv.country_code
      LEFT JOIN ReservationVolume rv ON c.country_code = rv.country_code
      LEFT JOIN CoffretVolume cv ON c.country_code = cv.country_code
      LEFT JOIN LumiereVolume lv ON c.country_code = lv.country_code
      ORDER BY "caNetRecharge" DESC;
    `;

    return stats;
  },
};