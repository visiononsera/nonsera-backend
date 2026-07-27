import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ======================================================
// CONFIGURATION
// ======================================================
const BCRYPT_ROUNDS = 12;
const DEFAULT_STAFF_PIN = process.env.SEED_STAFF_PIN || "111111";

// BANQUE D'IMAGES REALISTES UNSPLASH (Portraits Afro)
const STAFF_PHOTOS = {
  ADMIN:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
  IT: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
  KYC: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
  FINANCE:
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=80",
  SUPPORT:
    "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=500&q=80",
};

const FEMALE_PHOTOS = [
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=500&q=80",
];

const MALE_PHOTOS = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1504257404162-dd3b96c311f1?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=500&q=80",
];

const ENTERPRISE_BANKS_PHOTOS = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
];

// ======================================================
// HELPERS
// ======================================================
async function hashPin(pin) {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

async function safeTransaction(callback) {
  return prisma.$transaction(callback, {
    timeout: 60000,
    maxWait: 20000,
  });
}

function generateCoordinates(city) {
  switch (city) {
    case "Cotonou":
      return { latitude: 6.370293, longitude: 2.391236 };
    case "Porto-Novo":
      return { latitude: 6.496857, longitude: 2.628852 };
    case "Parakou":
      return { latitude: 9.33716, longitude: 2.63031 };
    case "Abidjan":
      return { latitude: 5.36, longitude: -4.0083 };
    case "Yamoussoukro":
      return { latitude: 6.8276, longitude: -5.2893 };
    case "Lome":
      return { latitude: 6.1342, longitude: 1.2131 };
    case "Kara":
      return { latitude: 9.5501, longitude: 1.1896 };
    default:
      return { latitude: 6.370293, longitude: 2.391236 };
  }
}

// ======================================================
// SYSTEM PERMISSIONS
// ======================================================
const SYSTEM_PERMISSIONS = [
  {
    code: "STAFF_MANAGE",
    name: "Gestion du Personnel",
    description:
      "Créer, modifier, afficher et supprimer les comptes du personnel.",
  },
  {
    code: "PERMISSIONS_ASSIGN",
    name: "Attribution des Permissions",
    description: "Attribuer et révoquer les permissions individuelles.",
  },
  {
    code: "API_KEYS_MANAGE",
    name: "Gestion des Clés API",
    description: "Gérer les jetons d'accès et les clés de sécurité tiers.",
  },
  {
    code: "CLIENTS_LIST",
    name: "Lister les profils Clients",
    description: "Accéder à la liste globale des utilisateurs Nonsera.",
  },
  {
    code: "CLIENTS_VIEW",
    name: "Afficher les détails d'un Client",
    description: "Consulter la fiche complète d'un utilisateur.",
  },
  {
    code: "CLIENTS_UPDATE",
    name: "Mettre à jour un Client",
    description: "Modifier ou corriger administrativement un profil.",
  },
  {
    code: "CLIENTS_MODERATE",
    name: "Modération / Suspension Client",
    description: "Bannir, suspendre ou réactiver un utilisateur.",
  },
  {
    code: "KYC_CALL_VALIDATION",
    name: "Validation Vidéo KYC",
    description: "Prendre en charge et valider les sessions d'appels vidéo.",
  },
  {
    code: "KYC_DOCUMENTS_VERIFY",
    name: "Validation Documentaire KYC",
    description: "Vérifier et approuver les pièces d'identité.",
  },
  {
    code: "COMPANY_MANAGE",
    name: "Gestion des Entreprises Partners",
    description: "Créer, modifier et lister les fiches des entreprises.",
  },
  {
    code: "VALIDATE_COMPANY",
    name: "Validation d'une Entreprise",
    description: "Approuver ou suspendre le statut d'une entreprise.",
  },
  {
    code: "ANNUNCES_MANAGE",
    name: "Gestion des Annonces",
    description: "Modérer, éditer et superviser les annonces.",
  },
  {
    code: "ANNUNCES_TOGGLE",
    name: "Activation/Désactivation d'Annonces",
    description: "Forcer la mise en ligne ou le retrait d'une annonce.",
  },
  {
    code: "TRANSACTIONS_VIEW_ALL",
    name: "Audit des Transactions",
    description: "Consulter l'historique global des flux financiers.",
  },
  {
    code: "WALLET_OVERRIDE",
    name: "Recharge Manuelle Guichet",
    description:
      "Créditer manuellement le compte d'un client venant en agence.",
  },
  {
    code: "RECONCILIATION_EXECUTE",
    name: "Exécution des Réconciliations",
    description: "Lancer les outils de rapprochement financier.",
  },
  {
    code: "DISPUTES_ARBITRATE",
    name: "Arbitrage des Litiges",
    description: "Trancher les plaintes et gérer les annulations.",
  },
  {
    code: "CUSTOMER_SERVICE",
    name: "Support et Service Client",
    description: "Accéder au centre de support pour traiter les demandes.",
  },
  {
    code: "SYSTEM_CONFIG_MUTATE",
    name: "Configuration des Paramètres Système",
    description: "Gérer les pays actifs, devises, commissions, bonus.",
  },
  {
    code: "SYSTEM_MONITORING",
    name: "Maintenance & Monitoring",
    description: "Accéder aux journaux système (logs) et métriques.",
  },
];

const CURRENCY_CONFIGS_SEED = [
  {
    countryCode: "BJ",
    countryName: "Benin",
    currencyCode: "XOF",
    bonusRate: 0.1,
    isActive: true,
  },
  {
    countryCode: "CI",
    countryName: "Cote d'Ivoire",
    currencyCode: "XOF",
    bonusRate: 0.15,
    isActive: true,
  },
  {
    countryCode: "TG",
    countryName: "Togo",
    currencyCode: "XOF",
    bonusRate: 0.05,
    isActive: true,
  },
];

const localizationData = {
  Benin: {
    prefix: "+229",
    cities: ["Cotonou", "Porto-Novo", "Parakou"],
    coordinates: [
      { lat: 6.370293, lng: 2.391236 },
      { lat: 6.496857, lng: 2.628852 },
      { lat: 9.33716, lng: 2.63031 },
    ],
    firstnamesM: [
      "Aurel",
      "Gildas",
      "Sena",
      "Rodrigue",
      "Chabi",
      "Dona",
      "Arnaud",
      "Marcos",
      "Espérand",
      "Flavien",
    ],
    firstnamesF: [
      "Fabiola",
      "Omerence",
      "Sessi",
      "Sika",
      "Sonia",
      "Syntyche",
      "Eudoxie",
      "Pélagie",
      "Gloria",
      "Belinda",
    ],
    lastnames: [
      "BIO",
      "ADANDE",
      "HOUNGBEDJI",
      "SOGLO",
      "TOSSSOU",
      "AGBOSSA",
      "KPADONOU",
      "GNAHOUI",
      "CHABI",
      "ALLADAYE",
    ],
  },
  "Cote d'Ivoire": {
    prefix: "+225",
    cities: ["Abidjan", "Yamoussoukro", "Bouake"],
    coordinates: [
      { lat: 5.36, lng: -4.0083 },
      { lat: 6.8276, lng: -5.2893 },
      { lat: 7.6931, lng: -5.0315 },
    ],
    firstnamesM: [
      "Gnamien",
      "Kouassi",
      "Yao",
      "Arthur",
      "Stéphane",
      "Idriss",
      "Fabrice",
      "Cédric",
      "Ange",
      "Tidiane",
    ],
    firstnamesF: [
      "Awa",
      "Aminata",
      "Murielle",
      "Marie-Reine",
      "Esther",
      "Emmanuelle",
      "Khadija",
      "Grace",
      "Fatou",
      "Ines",
    ],
    lastnames: [
      "KONE",
      "COULIBALY",
      "OUATTARA",
      "BLE",
      "BAKAYOKO",
      "DIOMANDE",
      "GUEDE",
      "TOURE",
      "EBROTTIE",
      "KOFFI",
    ],
  },
  Togo: {
    prefix: "+228",
    cities: ["Lome", "Kara", "Atakpame"],
    coordinates: [
      { lat: 6.1342, lng: 1.2131 },
      { lat: 9.5501, lng: 1.1896 },
      { lat: 7.5312, lng: 1.1241 },
    ],
    firstnamesM: [
      "Koffi",
      "Komla",
      "Folly",
      "Messan",
      "Anani",
      "Yawovi",
      "Edem",
      "Abalo",
      "Kofi",
      "Elom",
    ],
    firstnamesF: [
      "Afi",
      "Essi",
      "Awa",
      "Adjowa",
      "Akossiwa",
      "Sika",
      "Koko",
      "Mansah",
      "Yawa",
      "Ameyo",
    ],
    lastnames: [
      "AYITE",
      "AGBEYOME",
      "ADAM",
      "LAWSON",
      "OLYMPIO",
      "GASSOU",
      "GNASSINGBE",
      "KLOUSSEY",
      "AHOOMEY",
      "MENSAH",
    ],
  },
};

const biographies = [
  "Amoureux de l'art, de la culture et des voyages à travers l'Afrique.",
  "Passionné d'entrepreneuriat numérique et adepte du networking constructif.",
  "Esprit calme, curieux de psychologie humaine et toujours prêt à échanger.",
  "Vivre à 100%, axé sur le sport, le bien-être et le développement personnel.",
  "Créateur de contenus, épicurien et très attaché à nos valeurs africaines.",
];

const passions = [
  "Cinéma, Musique, Lecture",
  "Fitness, Business, Restos",
  "Cuisine, Technologie, Randonnée",
  "Photographie, Art, Écriture",
];

const religions = ["Christian", "Muslim", "Traditional", "None"];

const horoscopes = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const languagesList = [
  ["Français"],
  ["Français", "English"],
  ["Français", "Fon"],
  ["Français", "Baoulé"],
  ["Français", "Ewe"],
];

const cotonouCoordinates = generateCoordinates("Cotonou");

// ======================================================
// SEED CURRENCIES
/// ======================================================
async function seedCurrencies() {
  console.log("Configuration des configurations de devises régionales...");
  for (const conf of CURRENCY_CONFIGS_SEED) {
    await prisma.currencyConfig.upsert({
      where: { countryCode: conf.countryCode },
      update: { bonusRate: conf.bonusRate, symbol: "FCFA" },
      create: {
        countryCode: conf.countryCode,
        currencyCode: conf.currencyCode,
        bonusRate: conf.bonusRate,
        symbol: "FCFA",
      },
    });
  }
  console.log("✔ Devises (BJ, CI, TG) synchronisées.");
}

// ======================================================
// SEED PERMISSIONS
/// ======================================================
async function seedPermissions() {
  const permissions = [];

  for (const permission of SYSTEM_PERMISSIONS) {
    const finalized = await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description,
        type: "SYSTEM",
      },
      create: {
        code: permission.code,
        name: permission.name,
        description: permission.description,
        type: "SYSTEM",
      },
    });
    console.log("Mise en conformité des permissions système...");
    permissions.push(finalized);
  }

  return permissions;
}

// ======================================================
// SEED STAFF
// ======================================================

async function seedStaff(permissions) {
  const hashedStaffPin = await hashPin(DEFAULT_STAFF_PIN);

  const getPermissionObject = (code) => {
    const target = permissions.find((p) => p.code === code);
    if (!target) {
      throw new Error(`Permission critique introuvable au seed : ${code}`);
    }
    return { id: target.id };
  };

  const allPermissionsConnect = permissions.map((p) => ({ id: p.id }));

  // ------------------------------------------------------
  // 1. ISOLATION DES PERMISSIONS PAR DIVISION AGENT
  // ------------------------------------------------------

  // Division 1 : KYC & Vidéo uniquement
  const agentKycPermissions = [
    getPermissionObject("CLIENTS_LIST"),
    getPermissionObject("CLIENTS_VIEW"),
    getPermissionObject("CLIENTS_MODERATE"),
    getPermissionObject("KYC_CALL_VALIDATION"),
    getPermissionObject("KYC_DOCUMENTS_VERIFY"),
  ];

  // Division 2 : Finance & Partenaires uniquement
  const agentFinancePermissions = [
    getPermissionObject("CLIENTS_LIST"),
    getPermissionObject("CLIENTS_VIEW"),
    getPermissionObject("COMPANY_MANAGE"),
    getPermissionObject("VALIDATE_COMPANY"),
    getPermissionObject("TRANSACTIONS_VIEW_ALL"),
    getPermissionObject("WALLET_OVERRIDE"),
    getPermissionObject("RECONCILIATION_EXECUTE"),
  ];

  // Division 3 : Support & Litiges uniquement
  const agentSupportPermissions = [
    getPermissionObject("CLIENTS_LIST"),
    getPermissionObject("CLIENTS_VIEW"),
    getPermissionObject("DISPUTES_ARBITRATE"),
    getPermissionObject("CUSTOMER_SERVICE"),
  ];

  // Division 4 : Annonces & Modération uniquement
  const agentAnnouncePermissions = [
    getPermissionObject("CLIENTS_LIST"),
    getPermissionObject("CLIENTS_VIEW"),
    getPermissionObject("ANNUNCES_MANAGE"),
    getPermissionObject("ANNUNCES_TOGGLE"),
  ];

  // Permissions Manager : Agrégation de toutes les divisions + Gestion du Personnel
  const rawManagerPermissions = [
    ...agentKycPermissions,
    ...agentFinancePermissions,
    ...agentSupportPermissions,
    ...agentAnnouncePermissions,
    getPermissionObject("STAFF_MANAGE"),
  ];

  // Déduplication par ID pour la relation Prisma
  const managerPermissions = Array.from(
    new Map(rawManagerPermissions.map((p) => [p.id, p])).values()
  );

  // ------------------------------------------------------
  // 2. INJECTION DES COMPTES STAFF
  // ------------------------------------------------------
  await safeTransaction(async (tx) => {
    // --- ADMIN (Accès Total) ---
    console.log("Configuration du profil ADMIN...");
    await tx.user.upsert({
      where: { phoneNumber: "+2290197001089" },
      update: {
        fullname: "NONTCHEDIGBE SERGE AKPAHOU",
        email: "admin@nonsera.com",
        role: "ADMIN",
        passCode: hashedStaffPin,
        permissions: { set: allPermissionsConnect },
        isCompleted: true,
        isPhoneVerified: true,
        isIdentityVerified: true,
      },
      create: {
        phoneNumber: "+2290197001089",
        fullname: "NONTCHEDIGBE SERGE AKPAHOU",
        username: "serge_akpahou",
        email: "admin@nonsera.com",
        passCode: hashedStaffPin,
        role: "ADMIN",
        gender: "MALE",
        biography: "Administrateur principal Nonsera.",
        country: "Benin",
        city: "Cotonou",
        latitude: cotonouCoordinates.latitude,
        longitude: cotonouCoordinates.longitude,
        profilePhoto: STAFF_PHOTOS.ADMIN,
        onboardingStep: "COMPLETED",
        isCompleted: true,
        isPhoneVerified: true,
        isIdentityVerified: true,
        isCertified: true,
        permissions: { connect: allPermissionsConnect },
      },
    });

    // --- MANAGER (Supervision Multi-Divisions) ---
    console.log("Configuration du profil MANAGER...");
    await tx.user.upsert({
      where: { phoneNumber: "+2290111110000" },
      update: {
        role: "MANAGER",
        passCode: hashedStaffPin,
        permissions: { set: managerPermissions },
      },
      create: {
        phoneNumber: "+2290111110000",
        fullname: "Directeur des Opérations MANAGER",
        username: "manager_ops",
        email: "manager@nonsera.com",
        passCode: hashedStaffPin,
        role: "MANAGER",
        gender: "MALE",
        country: "Benin",
        city: "Cotonou",
        latitude: cotonouCoordinates.latitude,
        longitude: cotonouCoordinates.longitude,
        profilePhoto: STAFF_PHOTOS.MANAGER,
        onboardingStep: "COMPLETED",
        isCompleted: true,
        isPhoneVerified: true,
        isIdentityVerified: true,
        permissions: { connect: managerPermissions },
      },
    });

    // --- IT TECH ---
    console.log("Configuration du profil IT Tech...");
    const itPermissions = [
      getPermissionObject("STAFF_MANAGE"),
      getPermissionObject("PERMISSIONS_ASSIGN"),
      getPermissionObject("API_KEYS_MANAGE"),
      getPermissionObject("CLIENTS_LIST"),
      getPermissionObject("CLIENTS_VIEW"),
      getPermissionObject("TRANSACTIONS_VIEW_ALL"),
      getPermissionObject("SYSTEM_CONFIG_MUTATE"),
      getPermissionObject("SYSTEM_MONITORING"),
    ];

    await tx.user.upsert({
      where: { phoneNumber: "+2290190909090" },
      update: {
        role: "IT",
        passCode: hashedStaffPin,
        permissions: { set: itPermissions },
      },
      create: {
        phoneNumber: "+2290190909090",
        fullname: "Responsable Infrastructure",
        username: "it_root",
        email: "tech@nonsera.com",
        passCode: hashedStaffPin,
        role: "IT",
        gender: "MALE",
        country: "Benin",
        city: "Cotonou",
        latitude: cotonouCoordinates.latitude,
        longitude: cotonouCoordinates.longitude,
        profilePhoto: STAFF_PHOTOS.IT,
        onboardingStep: "COMPLETED",
        isCompleted: true,
        isPhoneVerified: true,
        isIdentityVerified: true,
        permissions: { connect: itPermissions },
      },
    });

    // --- AGENT 1 : DIVISION KYC ---
    console.log("Déploiement de l'Agent KYC...");
    await tx.user.upsert({
      where: { phoneNumber: "+2290111110001" },
      update: { permissions: { set: agentKycPermissions } },
      create: {
        phoneNumber: "+2290111110001",
        fullname: "Afiwa Marcelle AGENT KYC",
        username: "marcelle_kyc",
        email: "kyc.marcelle@nonsera.com",
        passCode: hashedStaffPin,
        role: "AGENT",
        gender: "FEMALE",
        country: "Benin",
        city: "Cotonou",
        latitude: cotonouCoordinates.latitude,
        longitude: cotonouCoordinates.longitude,
        profilePhoto: STAFF_PHOTOS.KYC,
        onboardingStep: "COMPLETED",
        isCompleted: true,
        isPhoneVerified: true,
        permissions: { connect: agentKycPermissions },
      },
    });

    // --- AGENT 2 : DIVISION FINANCE ---
    console.log("Déploiement de l'Agent Finance...");
    await tx.user.upsert({
      where: { phoneNumber: "+2290111110002" },
      update: { permissions: { set: agentFinancePermissions } },
      create: {
        phoneNumber: "+2290111110002",
        fullname: "Koffi Gautier AGENT FINANCE",
        username: "gautier_finance",
        email: "finance.gautier@nonsera.com",
        passCode: hashedStaffPin,
        role: "AGENT",
        gender: "MALE",
        country: "Benin",
        city: "Cotonou",
        latitude: cotonouCoordinates.latitude,
        longitude: cotonouCoordinates.longitude,
        profilePhoto: STAFF_PHOTOS.FINANCE,
        onboardingStep: "COMPLETED",
        isCompleted: true,
        isPhoneVerified: true,
        permissions: { connect: agentFinancePermissions },
      },
    });

    // --- AGENT 3 : DIVISION SUPPORT ---
    console.log("Déploiement de l'Agent Support...");
    await tx.user.upsert({
      where: { phoneNumber: "+2290111110003" },
      update: { permissions: { set: agentSupportPermissions } },
      create: {
        phoneNumber: "+2290111110003",
        fullname: "Chantal Lawson AGENT SUPPORT",
        username: "chantal_support",
        email: "support.chantal@nonsera.com",
        passCode: hashedStaffPin,
        role: "AGENT",
        gender: "FEMALE",
        country: "Benin",
        city: "Cotonou",
        latitude: cotonouCoordinates.latitude,
        longitude: cotonouCoordinates.longitude,
        profilePhoto: STAFF_PHOTOS.SUPPORT,
        onboardingStep: "COMPLETED",
        isCompleted: true,
        isPhoneVerified: true,
        permissions: { connect: agentSupportPermissions },
      },
    });

    // --- AGENT 4 : DIVISION ANNONCES ---
    console.log("Déploiement de l'Agent Annonces...");
    await tx.user.upsert({
      where: { phoneNumber: "+2290111110004" },
      update: { permissions: { set: agentAnnouncePermissions } },
      create: {
        phoneNumber: "+2290111110004",
        fullname: "Rodrique Dossou AGENT ANNONCES",
        username: "rodrique_announce",
        email: "annonces.rodrique@nonsera.com",
        passCode: hashedStaffPin,
        role: "AGENT",
        gender: "MALE",
        country: "Benin",
        city: "Cotonou",
        latitude: cotonouCoordinates.latitude,
        longitude: cotonouCoordinates.longitude,
        profilePhoto: STAFF_PHOTOS.ANNOUNCE,
        onboardingStep: "COMPLETED",
        isCompleted: true,
        isPhoneVerified: true,
        permissions: { connect: agentAnnouncePermissions },
      },
    });
  });

  console.log("✔ Déploiement du personnel avec cloisonnement strict terminé.");
}
// ======================================================
// SEED CLIENTS
// ======================================================
async function seedClients() {
  console.log("Génération en masse de 60 profils clients régionaux...");
  const hashedClientPin = await hashPin("123456");

  for (const [countryName, data] of Object.entries(localizationData)) {
    const genders = ["MALE", "FEMALE"];

    for (const gender of genders) {
      for (let i = 0; i < 10; i++) {
        let onboardingStep = "GENERAL_INFO";
        if (i <= 3) onboardingStep = "COMPLETED";
        else if (i === 4 || i === 5) onboardingStep = "CREATE_PIN";
        else if (i >= 6) onboardingStep = "CALL_VALIDATION";

        const phoneNumber = `${data.prefix}${gender === "MALE" ? "90" : "91"}00000${i}`;
        if (countryName === "Benin" && i === 0) onboardingStep = "COMPLETED";

        // Sécurisation des accès aux index via des modulos pour éviter les undefined
        const firstname =
          gender === "MALE"
            ? data.firstnamesM[i % data.firstnamesM.length]
            : data.firstnamesF[i % data.firstnamesF.length];
        const lastname =
          data.lastnames[Math.floor(Math.random() * data.lastnames.length)];
        const fullname = `${firstname} ${lastname}`;
        const username = `${firstname.toLowerCase()}_${lastname.toLowerCase()}_${i}`;

        const cityIndex = Math.floor(Math.random() * data.cities.length);
        const city = data.cities[cityIndex];
        const coords = data.coordinates[cityIndex];

        // Attribution d'une photo Unsplash déterministe et réaliste (Femmes Noires/Métisses & Hommes Noirs/Métisses)
        const profilePhoto =
          gender === "MALE"
            ? MALE_PHOTOS[i % MALE_PHOTOS.length]
            : FEMALE_PHOTOS[i % FEMALE_PHOTOS.length];

        const isCompletedStatus = onboardingStep === "COMPLETED";

        const user = await prisma.user.upsert({
          where: { phoneNumber },
          update: {
            onboardingStep,
            isCompleted: isCompletedStatus,
            isPhoneVerified: true,
            isIdentityVerified: isCompletedStatus,
            isCertified: isCompletedStatus,
          },
          create: {
            phoneNumber,
            fullname,
            username,
            email: `${username}@nonsera.sample`,
            passCode: hashedClientPin,
            role: "USER",
            gender,
            birthday: new Date(
              1995 + (i % 8),
              Math.floor(Math.random() * 11),
              1 + i * 2,
            ),
            biography:
              biographies[Math.floor(Math.random() * biographies.length)],
            passion: passions[Math.floor(Math.random() * passions.length)],
            religion: religions[Math.floor(Math.random() * religions.length)],
            horoscope:
              horoscopes[Math.floor(Math.random() * horoscopes.length)],
            country: countryName,
            city,
            latitude: coords.lat + (Math.random() - 0.5) * 0.02,
            longitude: coords.lng + (Math.random() - 0.5) * 0.02,
            profilePhoto,
            coins: 0,
            dmScore: isCompletedStatus ? 85.5 : 0,
            onboardingStep,
            isCompleted: isCompletedStatus,
            isPhoneVerified: true,
            isIdentityVerified: isCompletedStatus,
            isCertified: isCompletedStatus,
            languages:
              languagesList[Math.floor(Math.random() * languagesList.length)],
            preferences: {
              relationship: Math.random() > 0.4,
              friendship: true,
              networking: Math.random() > 0.3,
            },
            lastProfileUpdated: isCompletedStatus ? new Date() : null,
            lastPhotoUpdated: isCompletedStatus ? new Date() : null,
          },
        });

        if (onboardingStep === "CALL_VALIDATION") {
          await prisma.videoSession.deleteMany({
            where: { userId: user.id },
          });
          await prisma.videoSession.create({
            data: {
              userId: user.id,
              roomId: `room_prod_simulation_${user.id}`,
              status: "AWAITING",
            },
          });
        }
      }
    }
    console.log(
      `✔ 20 profils synchronisés avec succès pour le pays : ${countryName}`,
    );
  }
}

// ======================================================
// SEED PAYS
// ======================================================

async function seedCountries() {
  const countries = [
    { code: "BJ", name: "Benin" },
    { code: "TG", name: "Togo" },
    { code: "CI", name: "Côte d'Ivoire" },
    { code: "SN", name: "Sénégal" },
    { code: "BF", name: "Burkina Faso" },
    { code: "NE", name: "Niger" },
  ];

  for (const country of countries) {
    // Utilisation d'un upsert pour éviter les erreurs de duplication si le seed est rejoué
    const upsertedCountry = await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name },
      create: {
        code: country.code,
        name: country.name,
      },
    });
    console.log(
      `✅ Pays configuré : ${upsertedCountry.name} (${upsertedCountry.code})`,
    );
  }

  console.log("Seeding des pays terminé avec succès !");
}

// ======================================================
// SEED PARTENAIRES : ENTREPRISES & ANNONCES
// ======================================================
async function seedCompanies() {
  console.log(
    "Démarrage de l'injection massive des Entreprises et Annonces contextuelles...",
  );
  const activeUsers = await prisma.user.findMany({
    where: { isCompleted: true, role: "USER" },
    take: 20,
  });

  const rawCompanies = [
    // ======================================================
    // 1. RESTAURANTS
    // ======================================================
    {
      name: "Le Patio Cotonou",
      category: "RESTAURANT",
      city: "Cotonou",
      country: "Benin",
      desc: "Restaurant gastronomique avec un espace lounge intime idéal pour les rendez-vous en couple.",
      annonces: [
        {
          name: "Formule Brunch Continental",
          price: 18000,
          desc: "Un assortiment complet de viennoiseries, fruits tropicaux frais, omelette truffée et jus pressés.",
          category: "breakfast",
          image:
            "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
          ambiance: "SALLE_PRINCIPALE",
          isDeliveryAvailable: true,
          hasAnimation: true,
        },
        {
          name: "Double Burger Gourmet & Frites",
          price: 9500,
          desc: "Steak haché de bœuf de pays, fromage cheddar fondu, sauce barbecue fumée artisanale.",
          category: "fastfood",
          image:
            "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
          ambiance: "SALLE_PRINCIPALE",
          isDeliveryAvailable: true,
          hasAnimation: false,
        },
        {
          name: "Duo de Langoustes Grillées",
          price: 24500,
          desc: "Langoustes fraîches grillées au beurre persillé, servies avec de l'alloco et de l'attoukpou.",
          category: "plats",
          image:
            "https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=600&q=80",
          ambiance: "INTIME",
          isDeliveryAvailable: false,
          hasAnimation: true,
        },
        {
          name: "Cocktail Signature 'Nonsera Love'",
          price: 5000,
          desc: "Mélange fruité à base de liqueur locale, fruit de la passion fraîchement écrasé et champagne brut.",
          category: "drinks",
          image:
            "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80",
          ambiance: "SEMI_PRIVE",
          isDeliveryAvailable: false,
          hasAnimation: false,
        },
      ],
    },
    {
      name: "L'Acoustique Abidjan",
      category: "RESTAURANT",
      city: "Abidjan",
      country: "Cote d'Ivoire",
      desc: "L'adresse incontournable d'Abidjan pour la gastronomie ivoirienne modernisée et de grands cocktails.",
      annonces: [
        {
          name: "Kédjénou de Poulet de Brousse",
          price: 12000,
          desc: "Traditionnel poulet mijoté à l'étouffée dans son canari de terre cuite, piment doux et herbes locales.",
          category: "plats",
          image:
            "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=80",
          ambiance: "SEMI_PRIVE",
          isDeliveryAvailable: true,
          hasAnimation: true,
        },
        {
          name: "Brochettes de Filet de Zébu XXL",
          price: 11000,
          desc: "Viande de zébu tendre marinée aux épices kankankan, grillée au feu de bois.",
          category: "fastfood",
          image:
            "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
          ambiance: "SALLE_PRINCIPALE",
          isDeliveryAvailable: true,
          hasAnimation: false,
        },
        {
          name: "Mojito Mangue & Gingembre sauvage",
          price: 4500,
          desc: "Rhum blanc, menthe fraîche, purée de mangue locale et jus de gingembre dynamiqueisant.",
          category: "drinks",
          image:
            "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
          ambiance: "SALLE_PRINCIPALE",
          isDeliveryAvailable: false,
          hasAnimation: true,
        },
      ],
    },

    // ======================================================
    // 2. HÔTELS
    // ======================================================
    {
      name: "Azalaï Hôtel Cotonou",
      category: "HOTEL",
      city: "Cotonou",
      country: "Benin",
      desc: "Hôtel d'affaires de classe internationale offrant des suites luxueuses en bord de mer.",
      annonces: [
        {
          name: "Chambre Executive King-Size",
          price: 85000,
          desc: "Chambre spacieuse avec grand lit King, espace bureau, salle de bain en marbre et vue imprenable.",
          category: "standard",
          image:
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80",
          equipements: ["Wifi", "AC", "TV Canal+", "Coffre-fort", "Bureau"],
          isRomantique: false,
        },
        {
          name: "Suite Présidentielle Lune de Miel",
          price: 185000,
          desc: "Une suite somptueuse avec lit à baldaquin, jacuzzi privé sur le balcon, bouteille de champagne offerte.",
          category: "suite",
          image:
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80",
          equipements: [
            "Wifi",
            "AC",
            "Jacuzzi",
            "Mini-bar",
            "Terrasse",
            "Machine Espresso",
          ],
          isRomantique: true,
        },
      ],
    },
    {
      name: "Sofitel Abidjan Hôtel Ivoire",
      category: "HOTEL",
      city: "Abidjan",
      country: "Cote d'Ivoire",
      desc: "Le joyau architectural surplombant la lagune Ébrié avec sa piscine géante mythique.",
      annonces: [
        {
          name: "Chambre Deluxe Vue Lagune",
          price: 135000,
          desc: "Confort absolu, literie MyBed, baignoire profonde et vue spectaculaire sur la baie de Cocody.",
          category: "standard",
          image:
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
          equipements: [
            "Wifi",
            "AC",
            "Baignoire",
            "Mini-bar",
            "Service d'étage",
          ],
          isRomantique: false,
        },
        {
          name: "Appartement Présidentiel Exclusif",
          price: 320000,
          desc: "Grand salon panoramique, cuisine entièrement équipée, conciergerie privée 24h/24.",
          category: "appartment",
          image:
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
          equipements: [
            "Wifi",
            "AC",
            "Cuisine",
            "Salon VIP",
            "Parking sécurisé",
            "Concierge",
          ],
          isRomantique: true,
        },
      ],
    },

    // ======================================================
    // 3. TRANSPORTS
    // ======================================================
    {
      name: "Benin Borgou Voyage",
      category: "TRANSPORT",
      city: "Parakou",
      country: "Benin",
      desc: "Compagnie de transport interurbain sécurisé de confiance sur l'axe Sud-Nord.",
      annonces: [
        {
          name: "Transfert VVIP Privatisé Cotonou-Parakou",
          price: 120000,
          desc: "Trajet privatisé en Berline premium climatisée avec chauffeur professionnel pour un couple.",
          category: "interurbain",
          image:
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80",
          vehicleType: "VIP",
          nbPlaces: 3,
        },
        {
          name: "Billet Express Climatisé standard",
          price: 9000,
          desc: "Place individuelle à bord de nos minibus modernes de 15 places, avec port USB individuel.",
          category: "bus",
          image:
            "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80",
          vehicleType: "MINIBUS",
          nbPlaces: 15,
        },
      ],
    },

    // ======================================================
    // 4. ACTIVITÉS
    // ======================================================
    {
      name: "Yakro Horizon Tour",
      category: "ACTIVITY",
      city: "Yamoussoukro",
      country: "Cote d'Ivoire",
      desc: "Agence de découverte culturelle et historique de la capitale ivoirienne.",
      annonces: [
        {
          name: "Trek de la Basilique & Lac aux Crocodiles",
          price: 15000,
          desc: "Randonnée pédestre culturelle guidée de 3h, parfaite pour s'instruire en couple.",
          category: "tourisme",
          image:
            "https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=600&q=80",
          activityType: "RANDONNEE",
          hasAnimation: true,
        },
        {
          name: "Vol Privé en Hélicoptère au-dessus de Yakro",
          price: 350000,
          desc: "Survol exceptionnel de la Basilique de Yamoussoukro de 20 minutes pour deux personnes.",
          category: "premium",
          image:
            "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80",
          activityType: "HELICOPTERE",
          hasAnimation: false,
        },
      ],
    },

    // ======================================================
    // 5. CADEAUX & BEAUTÉ (GIFT, BEAUTY)
    // ======================================================
    {
      name: "Les Jardins de Vénus",
      category: "BEAUTY",
      city: "Lome",
      country: "Togo",
      desc: "Spa, hammam, onglerie et espace de massage détente absolue pour couples.",
      annonces: [
        {
          name: "Soin & Massage Duo Intime",
          price: 45000,
          desc: "Massage aux huiles chaudes de coco de 1h15 côte à côte, avec jus de fruits rafraîchissants.",
          category: "bien-etre",
          image:
            "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=600&q=80",
          isRomantique: true,
          hasAnimation: false,
        },
      ],
    },
    {
      name: "Nonsera Sweet Gift Boutique",
      category: "GIFT",
      city: "Cotonou",
      country: "Benin",
      desc: "Boutique partenaire spécialisée dans les coffrets surprises romantiques de Nonsera.",
      annonces: [
        {
          name: "Le Coffret Passion d'Afrique",
          price: 25000,
          desc: "Un panier garni : Chocolats fins locaux, une rose éternelle parfumée, et carte de vœux personnalisée.",
          category: "romantique",
          image:
            "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80",
          isRomantique: true,
          isSpecial: true,
        },
      ],
    },
  ];

  let companyCount = 0;
  let announceCount = 0;

  for (let idx = 0; idx < rawCompanies.length; idx++) {
    const raw = rawCompanies[idx];
    const targetCity = raw.city;

    // Assigner cycliquement un propriétaire issu de la table User
    const owner = activeUsers[idx % activeUsers.length];
    if (!owner) continue;

    const coords = generateCoordinates(targetCity);
    const cleanName = raw.name.toLowerCase().replace(/[^a-z0-9]/g, "");

    const fakePhoneNumber = `+2299800${idx.toString().padStart(4, "0")}`;
    const fakeEmail = `${cleanName}.${idx}@partner.nonsera.com`;
    const fakeUsername = `${cleanName}_${idx}`;

    const enterpriseLogo =
      ENTERPRISE_BANKS_PHOTOS[idx % ENTERPRISE_BANKS_PHOTOS.length];

    try {
      await safeTransaction(async (tx) => {
        // 1. Création de l'entreprise
        const company = await tx.company.create({
          data: {
            name: raw.name,
            username: fakeUsername,
            phoneNumber: fakePhoneNumber,
            email: fakeEmail,
            category: raw.category,
            description: raw.desc,
            city: targetCity,
            country: raw.country,
            latitude: coords.latitude,
            longitude: coords.longitude,
            logo: enterpriseLogo,
            bannerPicture: `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80`,
            isVerified: true,
            isSurplaceAvailable: true,
            status: "ACTIVE",
            balance: 0.0,
            links: {
              website: `https://www.${cleanName}.com`,
              instagram: `https://instagram.com/${cleanName}`,
              facebook: `https://facebook.com/${cleanName}`,
            },
            userCompanies: {
              create: {
                userId: owner.id,
                category: "OWNER",
              },
            },
          },
        });
        
        companyCount++;

        // 2. Création de l'ensemble de ses annonces associées
        for (let aIdx = 0; aIdx < raw.annonces.length; aIdx++) {
          const item = raw.annonces[aIdx];

          await tx.annonce.create({
            data: {
              name: item.name,
              price: item.price,
              points: Math.floor(item.price * 0.001) || 1, 
              image: item.image || enterpriseLogo, 
              description: item.desc || null,
              category: item.category || null,
              isAvailable: true,
              isVerified: true,
              isSpecial: aIdx === 0, 
              expiresIn: 30,
              companyId: company.id,

              // Métadonnées contextuelles
              ambiance: item.ambiance || null,
              hasAnimation: item.hasAnimation || false,
              isDeliveryAvailable: item.isDeliveryAvailable || false,
              isRomantique: item.isRomantique || false,
              equipements: item.equipements || [],

              // Transport spécifique
              vehicleType: item.vehicleType || null,
              nbPlaces: item.nbPlaces || null,

              // Activité spécifique
              activityType: item.activityType || null,
            },
          });
          announceCount++;
        }
      });
    } catch (err) {
      console.error(
        `Echec de l'injection pour l'établissement "${raw.name}":`,
        err.message,
      );
    }
  }

  console.log(
    `Bilan Partenaires : ${companyCount} entreprises injectées sur l'axe BJ-CI-TG.`,
  );
  console.log(`Bilan Annonces : ${announceCount} annonces ciblées publiées.`);
}

// ======================================================
// SEED CADEAUX (GIFT)
// ======================================================
async function seedGifts() {
  console.log("Démarrage de l'injection des Cadeaux (Gifts)...");

  // 1. Récupérer les entreprises de type "GIFT" ou "BEAUTY" générées plus haut pour l'association
  const partnerCompanies = await prisma.company.findMany({
    where: { category: { in: ["GIFT", "BEAUTY"] } },
    select: { id: true, name: true }
  });

  const mainGiftShop = partnerCompanies.find(c => c.name.includes("Nonsera Sweet Gift")) || partnerCompanies[0];
  const beautySpaShop = partnerCompanies.find(c => c.name.includes("Jardins de Vénus")) || partnerCompanies[1];

  const rawGifts = [
    {
      name: "Rose Éternelle Rouge",
      price: 5000,
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
      description: "Une magnifique rose rouge naturelle stabilisée qui ne fane jamais. Symbole d'amour éternel.",
      category: "ROSE",
      companyId: mainGiftShop?.id || null,
    },
    {
      name: "Bouquet de 12 Roses Pastel",
      price: 15000,
      image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80",
      description: "Un assortiment élégant de roses fraîches aux teintes douces et romantiques.",
      category: "ROSE",
      companyId: mainGiftShop?.id || null,
    },
    {
      name: "Parfum Ébène Sensuel (50ml)",
      price: 45000,
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80",
      description: "Notes de fond boisées et musquées, une fragrance envoûtante haut de gamme.",
      category: "MODE_BEAUTE",
      companyId: beautySpaShop?.id || null,
    },
    {
      name: "Rouge à Lèvres Velours Éclat",
      price: 12500,
      image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80",
      description: "Texture crémeuse au fini mat longue tenue pour illuminer les sourires.",
      category: "MODE_BEAUTE",
      companyId: beautySpaShop?.id || null,
    },
    {
      name: "Coffret Macarons Saveurs d'Afrique",
      price: 18000,
      image: "https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=600&q=80",
      description: "12 macarons artisanaux aux parfums uniques : Bissap, Baobab, Citronnelle et Chocolat local.",
      category: "CUISINE_GASTRONOMIE",
      companyId: mainGiftShop?.id || null,
    },
    {
      name: "Bracelet Jonc en Or Laminé",
      price: 35000,
      image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80",
      description: "Bijou fin et ajustable, idéal pour graver un souvenir impérissable.",
      category: "BIJOUX_ACCESSOIRES",
      companyId: mainGiftShop?.id, 
    },
    {
      name: "Écouteurs Sans Fil Pro Sound",
      price: 28000,
      image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80",
      description: "Réduction active du bruit et autonomie longue durée pour s'évader en musique.",
      category: "TECHNOLOGIE_GADGET",
      companyId: mainGiftShop?.id,
    },
    {
      name: "Roman d'Amour Contemporain",
      price: 7500,
      image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
      description: "Une œuvre littéraire captivante qui explore les méandres des relations modernes.",
      category: "LITTERATURE_ECRITURE",
      companyId: beautySpaShop?.id,
    },
    {
    name: "iPhone 15 Pro Max (256 Go)",
    price: 950000,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80",
    description: "Le fleuron de la technologie Apple avec châssis en titane et zoom optique 5x.",
    category: "TECHNOLOGIE_GADGET",
    companyId: mainGiftShop?.id,
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    price: 890000,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80",
    description: "Le summum de l'expérience Android avec stylet S-Pen intégré et IA photo avancée.",
    category: "TECHNOLOGIE_GADGET",
    companyId: mainGiftShop?.id,
  },

  // ======================================================
  // STYLE & TEXTILE (HOMME / FEMME)
  // ======================================================
  {
    name: "Robe de Soirée Haute Couture en Pagne",
    price: 65000,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
    description: "Une tenue de soirée sur-mesure confectionnée par un grand styliste partenaire.",
    category: "MODE_BEAUTE",
    companyId: beautySpaShop?.id,
  },
  {
    name: "Costume Ajusté 3 Pièces Homme",
    price: 95000,
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80",
    description: "Ensemble veste, gilet et pantalon coupe italienne moderne pour les grandes occasions.",
    category: "MODE_BEAUTE",
    companyId: beautySpaShop?.id,
  },

  // ======================================================
  // LIFESTYLE AUTOMOBILE & ROULANT (PREMIUM / RÊVES)
  // ======================================================
  {
    name: "Moto Scooter Haojue 110 (Neuf)",
    price: 750000,
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80",
    description: "Le cadeau utilitaire ultime pour faciliter les déplacements urbains au quotidien.",
    category: "JEUX_LOISIRS", 
    companyId: mainGiftShop?.id,
  },
  {
    name: "Berline Confort (Clés en Main)",
    price: 8500000,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
    description: "Le cadeau d'exception absolu : Une berline d'occasion révisée et garantie.",
    category: "UNCLASSIFIED",
    companyId: mainGiftShop?.id,
  }
  ];

  let giftCount = 0;

  for (const raw of rawGifts) {
    try {
      await safeTransaction(async (tx) => {
        await tx.gift.create({
          data: {
            name: raw.name,
            price: raw.price,
            points: Math.floor(raw.price * 0.001) || 1,
            image: raw.image,
            description: raw.description,
            category: raw.category,
            isAvailable: true,
            expiresIn: 30,
            companyId: raw.companyId 
          },
        });
        giftCount++;
      });
    } catch (err) {
      console.error(`❌ Échec de l'injection du cadeau "${raw.name}":`, err.message);
    }
  }

  console.log(`Bilan Cadeaux : ${giftCount} cadeaux injectés avec succès.`);
}

// ======================================================
// SEED COMPLÉMENTAIRE : PORTES-FEUILLES BRUTS
// ======================================================
async function seedWallets() {
  console.log(
    "Démarrage du processus de crédit brut pour les portefeuilles...",
  );

  const users = await prisma.user.findMany({
    where: { isCompleted: true, onboardingStep: "COMPLETED" },
    select: { id: true, country: true, email: true },
  });

  console.log(
    `🔍 ${users.length} utilisateurs validés éligibles au portefeuille.`,
  );

  if (users.length > 0) {
    const currencyConfigs = await prisma.currencyConfig.findMany();
    const configMap = new Map(currencyConfigs.map((c) => [c.countryCode, c]));

    let totalCredited = 0;
    let totalWithBonusLocked = 0;

    for (const user of users) {
      // Normalisation des clés pays pour s'aligner avec la configuration de devises
      let countryKey = user.country || "BJ";
      if (countryKey === "Benin") countryKey = "BJ";
      if (countryKey === "Cote d'Ivoire") countryKey = "CI";
      if (countryKey === "Togo") countryKey = "TG";

      const config = configMap.get(countryKey) || {
        currencyCode: "XOF",
        bonusRate: 0.1,
      };

      const amount = 25000;
      const bonusRate = Number(config.bonusRate);
      const bonusGenerated = amount * bonusRate;

      const shouldLockBonus = (totalCredited + 1) % 3 === 0;
      const bonusBloque = shouldLockBonus ? bonusGenerated / 2 : 0;
      const bonusRestant = bonusGenerated - bonusBloque;

      try {
        // Une transaction distincte et atomique par utilisateur ciblé
        await prisma.$transaction(async (prisma) => {
          const trancheId = `TRX-SEED-${user.id}-${Date.now()}`;

          await prisma.walletTranche.create({
            data: {
              userId: user.id,
              trancheId: trancheId,
              type: "RECHARGE",
              principalInitial: amount,
              principalRestant: amount,
              bonusTotal: bonusGenerated,
              bonusRestant: bonusRestant,
              bonusDebloque: 0,
              bonusBloque: bonusBloque,
              currency: config.currencyCode,
              statut: "ACTIVE",
              description: "Recharge initiale via Seeder Brut",
            },
          });

          await prisma.starpointWallet.upsert({
            where: { userId: user.id },
            update: { points: { increment: amount } },
            create: { userId: user.id, points: amount },
          });

          if (shouldLockBonus && bonusBloque > 0) {
            await prisma.walletTranche.create({
              data: {
                userId: user.id,
                trancheId: `LCK-SEED-${Date.now()}`,
                type: "AJUSTEMENT",
                principalInitial: 0,
                principalRestant: 0,
                bonusTotal: 0,
                bonusRestant: 0,
                bonusDebloque: 0,
                bonusBloque: 0,
                statut: "EPUISE",
                description: `Blocage de sécurité initial (-${bonusBloque} Bonus)`,
              },
            });
            totalWithBonusLocked++;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { coins: amount },
          });
        });

        totalCredited++;
      } catch (err) {
        console.error(
          `X Échec du crédit portefeuille pour l'utilisateur #${user.id}:`,
          err,
        );
      }
    }
    console.log(
      `Portefeuilles : ${totalCredited} comptes alimentés, ${totalWithBonusLocked} avec bonus bloqués.`,
    );
  }
}

// ======================================================
// SEED COFFRETS ROMANTIQUES (WITH ITEMS)
// ======================================================
async function seedCoffrets() {
  console.log("Démarrage de l'injection des Coffrets Romantiques et de leurs sous-éléments...");

  // 1. Récupération des entreprises créées pour lier les coffrets de manière cohérente
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, city: true }
  });

  if (companies.length === 0) {
    console.error("Impossible d'injecter les coffrets : aucune entreprise trouvée en base.");
    return;
  }

  const patioCotonou = companies.find(c => c.name.includes("Patio Cotonou"));
  const acoustiqueAbidjan = companies.find(c => c.name.includes("Acoustique Abidjan"));
  const azalaiCotonou = companies.find(c => c.name.includes("Azalaï Hôtel"));
  const sofitelAbidjan = companies.find(c => c.name.includes("Sofitel Abidjan"));
  const borgouParakou = companies.find(c => c.name.includes("Benin Borgou Voyage"));

  const rawCoffrets = [
    // ------------------------------------------------------
    // COFFRET 1 : Évasion Royale à Cotonou (Azalaï Hôtel)
    // ------------------------------------------------------
    {
      name: "Évasion Royale & Volupté",
      description: "Un week-end d'exception conçu pour raviver l'étincelle. Logement haut de gamme, dîner aux chandelles et transfert privé inclus.",
      price: 145000.00, // Prix unitaire global par personne
      durationDays: 2,
      isAvailable: true,
      isVerified: true, // Directement validé pour le seed
      isSpecial: true,
      companyId: azalaiCotonou?.id || companies[0].id,
      images: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80"
      ],
      items: [
        {
          category: "HOTEL",
          name: "Nuit en Suite Présidentielle Lune de Miel",
          description: "Dormez dans un confort absolu avec lit à baldaquin et jacuzzi privatif sur le balcon.",
          durationHours: 24
        },
        {
          category: "RESTAURANT",
          name: "Dîner Gastronomique Duo",
          description: "Menu dégustation en 4 services avec bouteille de champagne incluse, servi sur table intimiste.",
          durationHours: 3
        },
        {
          category: "TRANSPORT",
          name: "Chauffeur Privé Premium",
          description: "Prise en charge à votre domicile en berline noire VIP climatisée pour le trajet aller-retour.",
          durationHours: 2
        }
      ]
    },

    // ------------------------------------------------------
    // COFFRET 2 : Sérénité Lagunaire à Abidjan (Sofitel)
    // ------------------------------------------------------
    {
      name: "Sérénité & Romance Ébrié",
      description: "Prenez de la hauteur au-dessus de la lagune. Le luxe ultime d'Abidjan réuni dans une expérience mémorable de 3 jours.",
      price: 210000.00,
      durationDays: 3,
      isAvailable: true,
      isVerified: true,
      isSpecial: false,
      companyId: sofitelAbidjan?.id || companies[0].id,
      images: [
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=800&q=80"
      ],
      items: [
        {
          category: "HOTEL",
          name: "Chambre Deluxe Vue Lagune",
          description: "Baignoire profonde, literie signature et vue panoramique spectaculaire sur la baie de Cocody.",
          durationHours: 48
        },
        {
          category: "RESTAURANT",
          name: "Dîner aux chandelles à L'Acoustique",
          description: "Mise en avant des saveurs ivoiriennes revisitées par un chef étoilé.",
          durationHours: 4
        },
        {
          category: "ACTIVITY",
          name: "Accès VIP Espace Spa & Bien-être",
          description: "Massage relaxant d'une heure en cabine duo suivi d'un accès libre au hammam et à la piscine olympique.",
          durationHours: 3
        }
      ]
    },

    // ------------------------------------------------------
    // COFFRET 3 : Douceur Gastronomique à Cotonou (Le Patio)
    // ------------------------------------------------------
    {
      name: "Instants Secrets & Gastronomie",
      description: "Une journée et une soirée dédiées aux couples épicuriens à la recherche d'une intimité gourmande.",
      price: 45000.00,
      durationDays: 1,
      isAvailable: true,
      isVerified: true,
      isSpecial: true,
      companyId: patioCotonou?.id || companies[0].id,
      images: [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80"
      ],
      items: [
        {
          category: "RESTAURANT",
          name: "Dégustation Premium Duo de Langoustes",
          description: "Service exclusif en zone d'ambiance INTIME avec cocktail signature 'Nonsera Love' offert.",
          durationHours: 3
        },
        {
          category: "GIFT",
          name: "Boîte Surprise de douceurs fines",
          description: "Remise d'un écrin de chocolats fins et macarons artisanaux en fin de repas.",
          durationHours: 1
        }
      ]
    }
  ];

  let coffretCount = 0;
  let itemCount = 0;

  for (const raw of rawCoffrets) {
    try {
      await safeTransaction(async (tx) => {
        const createdCoffret = await tx.coffret.create({
          data: {
            name: raw.name,
            description: raw.description,
            price: raw.price,
            durationDays: raw.durationDays,
            isAvailable: raw.isAvailable,
            isVerified: raw.isVerified,
            isSpecial: raw.isSpecial,
            images: raw.images, 
            companyId: raw.companyId,
            items: {
              create: raw.items.map(item => ({
                category: item.category,
                name: item.name,
                description: item.description,
                durationHours: item.durationHours
              }))
            }
          }
        });

        coffretCount++;
        itemCount += raw.items.length;
      });
    } catch (err) {
      console.error(`Échec de l'injection du coffret "${raw.name}":`, err.message);
    }
  }

  console.log(`Bilan Coffrets : ${coffretCount} coffrets autonomes insérés.`);
  console.log(`Bilan Éléments de Coffrets : ${itemCount} sous-items associés configurés.`);
}

// ======================================================
// MAIN
// ======================================================
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Le seeding est interdit en production.");
  }

  console.log("========================================");
  console.log("Début du seeding global");
  console.log("========================================");

  await seedCurrencies();
  const permissions = await seedPermissions();
  await seedStaff(permissions);
  await seedClients();
  await seedCountries();
  await seedCompanies();
  await seedWallets();
  await seedGifts();
  await seedCoffrets();
  console.log("========================================");
  console.log("Fin complète et réussie du processus de seeding");
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error("Erreur critique lors du seeding :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
