import { Router } from 'express';
import { jwtMiddleware } from '../middlewares/jwt.middleware';
import { loadContext } from '../middlewares/auth.middleware';
import { giftsController } from '../controllers/gifts.controller';

const router = Router();

// ======================================================
// 1. GESTION DU CATALOGUE (ADMIN / AGENT / BACK-OFFICE)
// ======================================================

/**
 * @route   POST /gifts
 * @desc    Créer un nouveau présent dans le catalogue
 */
router.post('/gifts', jwtMiddleware, loadContext, giftsController.create);

/**
 * @route   PUT /gifts/:id
 * @desc    Mettre à jour un présent existant par son ID
 */
router.put('/gifts/:id(\\d+)', jwtMiddleware, loadContext, giftsController.update);

/**
 * @route   DELETE /gifts/:id
 * @desc    Suppression logique (désactivation) d'un présent du catalogue
 */
router.delete('/gifts/:id(\\d+)', jwtMiddleware, loadContext, giftsController.delete);


// ======================================================
// 2. ROUTES PUBLIQUES / CONSULTATION DU CATALOGUE
// ======================================================

/**
 * @route   GET /gifts
 * @desc    Récupérer tous les présents disponibles (Filtres optionnels par Query params)
 */
router.get('/gifts', jwtMiddleware, loadContext, giftsController.getAllAvailable);

/**
 * @route   GET /gifts/:id
 * @desc    Récupérer les détails d'un présent spécifique par son ID
 */
router.get('/gifts/:id(\\d+)', jwtMiddleware, loadContext, giftsController.getById);


// ======================================================
// 3. PRÉFÉRENCES UTILISATEURS & HISTORIQUE DES RÉCEPTIONS
// ======================================================

/**
 * @route   GET /gifts/received
 * @desc    Récupérer l'historique complet des présents reçus (Virtuels et Annonces)
 */
router.get('/gifts/received', jwtMiddleware, loadContext, giftsController.getReceivedGifts);

/**
 * @route   POST /gifts/preferences/preferred
 * @desc    Définir ou modifier le présent virtuel standard préféré du profil connecté
 */
router.post('/gifts/preferences/preferred', jwtMiddleware, loadContext, giftsController.setPreferredGift);

/**
 * @route   POST /gifts/preferences/purpose
 * @desc    Définir ou modifier l'Annonce d'entreprise visée comme objectif/souhait cadeau
 */
router.post('/gifts/preferences/purpose', jwtMiddleware, loadContext, giftsController.setGiftPurposeAnnonce);

export default router;