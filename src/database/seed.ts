import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';


const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// DEFINITION ENRICHIE DU DICTIONNAIRE DE PERMISSIONS REELLES DE L'APPLICATION
const SYSTEM_PERMISSIONS = [
  // --- MODULE SÉCURITÉ & PERSONNEL ---
  {
    code: "STAFF_MANAGE",
    name: "Gestion du Personnel",
    type: "SECURITY",
    description: "Créer, modifier et gérer les comptes du personnel (Staff)",
  },
  {
    code: "PERMISSIONS_ASSIGN",
    name: "Attribution des Droits",
    type: "SECURITY",
    description: "Attribuer ou révoquer des permissions spécifiques à un agent",
  },

  // --- MODULE VALIDATION & KYC (VIDEO CALL) ---
  {
    code: "CALL_VALIDATION",
    name: "Validation Appels Vidéo",
    type: "KYC",
    description:
      "Accéder à la file d'attente, prendre des appels vidéo et statuer sur les dossiers",
  },
  {
    code: "USER_BAN_UNBAN",
    name: "Modération Utilisateurs",
    type: "KYC",
    description:
      "Suspendre, bannir ou réactiver définitivement un compte utilisateur",
  },
  {
    code: "DOCUMENTS_VERIFY",
    name: "Vérification Documentaire",
    type: "KYC",
    description:
      "Inspecter et valider les pièces justificatives (CNI, Passeport, IFU, etc.)",
  },

  // --- MODULE FINANCIER & TRANSACTIONS ---
  {
    code: "TRANSACTIONS_VIEW_ALL",
    name: "Audit des Transactions",
    type: "FINANCE",
    description:
      "Visualiser l'historique global de toutes les transactions de la plateforme",
  },
  {
    code: "PARTNER_ESCROW_MANAGE",
    name: "Gestion Comptes Séquestres",
    type: "FINANCE",
    description:
      "Ajuster, bloquer ou débloquer les soldes de comptes partenaires (B2B)",
  },
  {
    code: "RECONCILIATION_EXECUTE",
    name: "Réconciliation Opérateurs",
    type: "FINANCE",
    description:
      "Lancer les processus de réconciliation financière avec les opérateurs Mobile Money",
  },

  // --- MODULE MAINTENANCE & CONFIGURATION (IT) ---
  {
    code: "SYSTEM_MAINTENANCE",
    name: "Maintenance Système",
    type: "SYSTEM",
    description:
      "Accéder aux outils de maintenance, logs systèmes et configurations globales",
  },
  {
    code: "API_KEYS_MANAGE",
    name: "Gestion des Clés API",
    type: "SYSTEM",
    description: "Générer, révoquer et superviser les clés API des partenaires",
  },
];

// Configuration des codes PIN de simulation
const DEFAULT_STAFF_PIN = "111111"; // PIN pour la direction et les agents
const DEFAULT_CLIENT_PIN = "123456"; // PIN pour les clients de tests

async function main() {
  console.log("=== Début du Seeding Généralisé ===");

  // 1. Insertion ou mise à jour de TOUTES les permissions du dictionnaire
  console.log(" Enregistrement du dictionnaire de permissions...");
  const createdPermissions: { id: number; code: string }[] = [];

  for (const perm of SYSTEM_PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
      },
      create: {
        code: perm.code,
        name: perm.name,
        description: perm.description,
      },
    });
    createdPermissions.push(p);
  }
  console.log(
    `> ${createdPermissions.length} permissions système synchronisées.`,
  );

  // 2. Récupération des IDs pour les assignations ciblées
  const getPermId = (code: string) => {
    const found = createdPermissions.find((p) => p.code === code);
    if (!found) throw new Error(`Permission critique manquante : ${code}`);
    return { id: found.id };
  };

  // 3. Création des profils à privilèges totaux (ADMIN & IT)
  console.log(" Configuration des profils de direction (ADMIN / IT)...");

  await prisma.user.upsert({
    where: { phoneNumber: "+2290100000001" },
    update: { role: "ADMIN", passCode: DEFAULT_STAFF_PIN },
    create: {
      phoneNumber: "+2290100000001",
      fullname: "Directeur des Opérations",
      role: "ADMIN",
      passCode: DEFAULT_STAFF_PIN,
      onboardingStep: "COMPLETED",
      isCompleted: true,
      permissions: { connect: createdPermissions.map((p) => ({ id: p.id })) },
    },
  });

  await prisma.user.upsert({
    where: { phoneNumber: "+2290100000002" },
    update: { role: "IT", passCode: DEFAULT_STAFF_PIN },
    create: {
      phoneNumber: "+2290100000002",
      fullname: "Lead DevOps / SecOps",
      role: "IT",
      passCode: DEFAULT_STAFF_PIN,
      onboardingStep: "COMPLETED",
      isCompleted: true,
      permissions: { connect: createdPermissions.map((p) => ({ id: p.id })) },
    },
  });

  // 4. Création des Agents de Validation Spécialisés (Pool Backoffice)
  console.log(" Création des agents spécialisés...");

  const kycPermissions = [
    getPermId("CALL_VALIDATION"),
    getPermId("DOCUMENTS_VERIFY"),
    getPermId("USER_BAN_UNBAN"),
  ];

  for (let i = 1; i <= 3; i++) {
    await prisma.user.upsert({
      where: { phoneNumber: `+22901111110${i}` },
      update: { passCode: DEFAULT_STAFF_PIN },
      create: {
        phoneNumber: `+22901111110${i}`,
        fullname: `Agent KYC Niveau ${i}`,
        role: "AGENT",
        passCode: DEFAULT_STAFF_PIN,
        onboardingStep: "COMPLETED",
        isCompleted: true,
        permissions: { connect: kycPermissions },
      },
    });
  }

  const financePermissions = [
    getPermId("TRANSACTIONS_VIEW_ALL"),
    getPermId("PARTNER_ESCROW_MANAGE"),
    getPermId("RECONCILIATION_EXECUTE"),
  ];

  await prisma.user.upsert({
    where: { phoneNumber: "+229011111199" },
    update: { passCode: DEFAULT_STAFF_PIN },
    create: {
      phoneNumber: "+229011111199",
      fullname: "Responsable Financier Backoffice",
      role: "AGENT",
      passCode: DEFAULT_STAFF_PIN,
      onboardingStep: "COMPLETED",
      isCompleted: true,
      permissions: { connect: financePermissions },
    },
  });

  // 5. Pool de Clients Tests pour alimenter les files d'attente ($N$ demandes)
  console.log(" Génération des comptes clients de test...");
  for (let i = 1; i <= 15; i++) {
    const isAwaitingCall = i <= 5;
    const step = isAwaitingCall ? "AWAITING_VIDEO_CALL" : "GENERAL_INFO";

    const user = await prisma.user.upsert({
      where: { phoneNumber: `+2290122222${i.toString().padStart(2, "0")}` },
      update: { passCode: DEFAULT_CLIENT_PIN },
      create: {
        phoneNumber: `+2290122222${i.toString().padStart(2, "0")}`,
        fullname: `Client Standard ${i}`,
        username: `client_username_${i}`,
        role: "USER",
        passCode: DEFAULT_CLIENT_PIN,
        onboardingStep: step,
        isCompleted: false,
      },
    });

    if (isAwaitingCall) {
      await prisma.videoSession.upsert({
        where: { userId: user.id },
        update: { status: "AWAITING" },
        create: {
          userId: user.id,
          status: "AWAITING",
          roomId: `room_live_sim_user_${user.id}`,
        },
      });
    }
  }

  console.log("=== Seeding Terminé avec Succès ! ===");
}

main()
  .catch((e) => {
    console.error("Erreur lors du seeding :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
