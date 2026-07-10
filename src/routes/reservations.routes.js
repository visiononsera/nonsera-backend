import { Router } from "express";
import { loadContext } from "../middlewares/auth.middleware.js";
import { jwtMiddleware } from "../middlewares/jwt.middleware.js";
import { reservationsController } from "../controllers/reservation.controller.js";

const router = Router();
const authStack = [jwtMiddleware, loadContext];

// ==========================================
// --- CONSULTATION & HISTORIQUES ---
// ==========================================

/**
 * @openapi
 * /api/reservations/me:
 * get:
 * summary: Récupérer l'historique complet des réservations standard de l'utilisateur connecté
 * tags:
 * - Reservations
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: status
 * schema:
 * type: string
 * description: Filtrer par statut (PENDING, CONFIRMED, PROCESSED, CANCELLED)
 * - in: query
 * name: page
 * schema:
 * type: integer
 * description: Numéro de la page (pagination)
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * description: Nombre de résultats par page
 * responses:
 * 200:
 * description: Liste paginée des réservations de l'utilisateur.
 * 401:
 * description: Jeton manquant ou expiré.
 */
router.get(
  "/reservations/me",
  ...authStack,
  reservationsController.getMyReservations,
);

/**
 * @openapi
 * /api/reservations/coffrets/me:
 * get:
 * summary: Récupérer l'historique des réservations de coffrets de l'utilisateur connecté
 * tags:
 * - Reservations (Coffrets)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: status
 * schema:
 * type: string
 * description: Filtrer par statut
 * - in: query
 * name: page
 * schema:
 * type: integer
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Liste paginée des réservations de coffrets de l'utilisateur.
 * 401:
 * description: Jeton manquant ou expiré.
 */
router.get(
  "/reservations/coffrets/me",
  ...authStack,
  reservationsController.getMyCoffretsReservations,
);

/**
 * @openapi
 * /api/reservations/{id}:
 * get:
 * summary: Récupérer le détail exhaustif d'une réservation standard
 * tags:
 * - Reservations
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la réservation standard
 * responses:
 * 200:
 * description: Fiche détaillée de la réservation.
 * 404:
 * description: Réservation introuvable.
 */
router.get("/reservations/:id", ...authStack, reservationsController.getDetail);

/**
 * @openapi
 * /api/reservations/coffrets/{id}:
 * get:
 * summary: Récupérer le détail d'une réservation de coffret romantique
 * tags:
 * - Reservations (Coffrets)
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la réservation de coffret
 * responses:
 * 200:
 * description: Fiche détaillée de la réservation du coffret.
 * 404:
 * description: Réservation de coffret introuvable.
 */
router.get(
  "/reservations/coffrets/:id",
  ...authStack,
  reservationsController.getCoffretReservationDetail,
);

// ==========================================
// --- INTERACTION & CYCLE DE VIE ---
// ==========================================

/**
 * @openapi
 * /api/reservations/:
 * post:
 * summary: Initier une nouvelle réservation (Verrouillage des fonds en séquestre)
 * tags:
 * - Reservations
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - companyId
 * - amount
 * properties:
 * companyId:
 * type: integer
 * example: 14
 * amount:
 * type: number
 * example: 7500
 * scheduledAt:
 * type: string
 * format: date-time
 * example: "2026-07-10T14:00:00.000Z"
 * responses:
 * 201:
 * description: Demande de réservation enregistrée et provision bloquée.
 * 400:
 * description: Solde insuffisant ou données d'entrée erronées.
 * 401:
 * description: Jeton manquant ou expiré.
 */
router.post("/reservations/", ...authStack, reservationsController.create);

/**
 * @openapi
 * /api/reservations/{id}/cancel:
 * post:
 * summary: Annuler une réservation active (Application des règles d'indemnisation)
 * tags:
 * - Reservations
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la réservation à résilier
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - actor
 * properties:
 * actor:
 * type: string
 * enum: [CLIENT, PARTNER, ADMIN]
 * description: Entité à l'origine de l'annulation
 * example: "CLIENT"
 * reason:
 * type: string
 * example: "Changement de programme ou contretemps de dernière minute."
 * responses:
 * 200:
 * description: Réservation annulée et traitement des flux de remboursement effectué.
 * 400:
 * description: Acteur non spécifié ou statut de transaction non éligible à l'annulation.
 */
router.post(
  "/reservations/:id/cancel",
  ...authStack,
  reservationsController.cancel,
);

/**
 * @openapi
 * /api/reservations/{id}/confirm:
 * patch:
 * summary: Accepter et confirmer la réservation par l'établissement ou le prestataire
 * tags:
 * - Reservations
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la réservation à valider
 * responses:
 * 200:
 * description: Réservation validée. Selon les cas, transfert immédiat ou planification du déblocage post-prestation.
 * 400:
 * description: Réservation introuvable ou déjà traitée.
 */
router.patch(
  "/reservations/:id/confirm",
  ...authStack,
  reservationsController.confirm,
);

/**
 * @openapi
 * /api/reservations/{id}/start-trip:
 * patch:
 * summary: Déclarer le début officiel de la prestation ou de la prise en charge
 * tags:
 * - Reservations
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la réservation associée au trajet/service
 * responses:
 * 200:
 * description: Changement d'état validé. Prestation officiellement en cours.
 * 400:
 * description: Transition d'état invalide.
 */
router.patch(
  "/reservations/:id/start-trip",
  ...authStack,
  reservationsController.startTrip,
);

/**
 * @openapi
 * /api/reservations/{id}/complete:
 * patch:
 * summary: Finaliser la course et débloquer les fonds du séquestre vers le prestataire
 * tags:
 * - Reservations
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la réservation menée à son terme
 * responses:
 * 200:
 * description: Mission accomplie. Balance du partenaire créditée des fonds séquestrés.
 * 400:
 * description: Échec du traitement financier ou ordre d'achèvement hors contexte.
 */
router.patch(
  "/reservations/:id/complete",
  ...authStack,
  reservationsController.completeOrProcess,
);

/**
 * @openapi
 * /api/reservations/{id}/dispute:
 * post:
 * summary: Suspendre la transaction et ouvrir un litige administratif (Gel des fonds)
 * tags:
 * - Reservations
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la réservation conflictuelle
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - actor
 * - reason
 * properties:
 * actor:
 * type: string
 * enum: [CLIENT, PARTNER]
 * description: Partie plaignante signalant l'anomalie
 * example: "PARTNER"
 * reason:
 * type: string
 * example: "Le client ne s'est pas présenté après 30 minutes d'attente."
 * responses:
 * 200:
 * description: Litige ouvert. Verrouillage de la provision en attente d'arbitrage.
 * 400:
 * description: Corps de requête incomplet ou invalide.
 */
router.post(
  "/reservations/:id/dispute",
  ...authStack,
  reservationsController.openDispute,
);

// ==========================================
// --- ROUTE ADMIN PRIVILÉGIÉE ---
// ==========================================

/**
 * @openapi
 * /api/reservations/{id}/resolve-dispute:
 * patch:
 * summary: Arbitrer et clore un litige (Répartition manuelle des fonds par un admin)
 * tags:
 * - Administration
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: ID de la réservation litigieuse à résoudre
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - decision
 * - adminNotes
 * properties:
 * decision:
 * type: string
 * enum: [REFUND_CLIENT, PAY_PARTNER, SPLIT_50_50]
 * description: Directive d'exécution pour le traitement comptable du solde séquestré
 * example: "PAY_PARTNER"
 * adminNotes:
 * type: string
 * example: "Après vérification des traces GPS, le prestataire était bien sur les lieux. Paiement honoré."
 * responses:
 * 200:
 * description: Arbitrage enregistré. Clôture définitive du dossier de litige.
 * 400:
 * description: Paramètres de décision invalides.
 * 403:
 * description: Accès refusé. Rôle d'administration requis.
 */
router.patch(
  "/reservations/:id/resolve-dispute",
  ...authStack,
  reservationsController.resolveDispute,
);

export default router;
