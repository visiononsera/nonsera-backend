import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Permission } from "../generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ======================================================
// CONFIGURATION
// ======================================================
const BCRYPT_ROUNDS = 12;
const DEFAULT_STAFF_PIN = process.env.SEED_STAFF_PIN || "111111";

// BANQUE D'IMAGES REALISTES UNSPLASH (Portraits Afro)
const STAFF_PHOTOS = {
  ADMIN: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
  IT: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
  KYC: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
  FINANCE: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=80",
  SUPPORT: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=500&q=80"
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
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=500&q=80"
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
  "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=500&q=80"
];

const ENTERPRISE_BANKS_PHOTOS = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80"
];

// ======================================================
// HELPERS
// ======================================================
async function hashPin(pin: string) {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

function generateCoordinates(city: string) {
  switch (city) {
    case "Cotonou": return { latitude: 6.370293, longitude: 2.391236 };
    case "Porto-Novo": return { latitude: 6.496857, longitude: 2.628852 };
    case "Parakou": return { latitude: 9.33716, longitude: 2.63031 };
    case "Abidjan": return { latitude: 5.3600, longitude: -4.0083 };
    case "Yamoussoukro": return { latitude: 6.8276, longitude: -5.2893 };
    case "Lome": return { latitude: 6.1342, longitude: 1.2131 };
    case "Kara": return { latitude: 9.5501, longitude: 1.1896 };
    default: return { latitude: 6.370293, longitude: 2.391236 };
  }
}

// ======================================================
// SYSTEM PERMISSIONS
// ======================================================
const SYSTEM_PERMISSIONS = [
  { code: "STAFF_MANAGE", name: "Gestion du Personnel", description: "Créer, modifier, afficher et supprimer les comptes du personnel." },
  { code: "PERMISSIONS_ASSIGN", name: "Attribution des Permissions", description: "Attribuer et révoquer les permissions individuelles." },
  { code: "API_KEYS_MANAGE", name: "Gestion des Clés API", description: "Gérer les jetons d'accès et les clés de sécurité tiers." },
  { code: "CLIENTS_LIST", name: "Lister les profils Clients", description: "Accéder à la liste globale des utilisateurs Nonsera." },
  { code: "CLIENTS_VIEW", name: "Afficher les détails d'un Client", description: "Consulter la fiche complète d'un utilisateur." },
  { code: "CLIENTS_UPDATE", name: "Mettre à jour un Client", description: "Modifier ou corriger administrativement un profil." },
  { code: "CLIENTS_MODERATE", name: "Modération / Suspension Client", description: "Bannir, suspendre ou réactiver un utilisateur." },
  { code: "KYC_CALL_VALIDATION", name: "Validation Vidéo KYC", description: "Prendre en charge et valider les sessions d'appels vidéo." },
  { code: "KYC_DOCUMENTS_VERIFY", name: "Validation Documentaire KYC", description: "Vérifier et approuver les pièces d'identité." },
  { code: "COMPANY_MANAGE", name: "Gestion des Entreprises Partners", description: "Créer, modifier et lister les fiches des entreprises." },
  { code: "VALIDATE_COMPANY", name: "Validation d'une Entreprise", description: "Approuver ou suspendre le statut d'une entreprise." },
  { code: "ANNUNCES_MANAGE", name: "Gestion des Annonces", description: "Modérer, éditer et superviser les annonces." },
  { code: "ANNUNCES_TOGGLE", name: "Activation/Désactivation d'Annonces", description: "Forcer la mise en ligne ou le retrait d'une annonce." },
  { code: "TRANSACTIONS_VIEW_ALL", name: "Audit des Transactions", description: "Consulter l'historique global des flux financiers." },
  { code: "WALLET_OVERRIDE", name: "Recharge Manuelle Guichet", description: "Créditer manuellement le compte d'un client venant en agence." },
  { code: "RECONCILIATION_EXECUTE", name: "Exécution des Réconciliations", description: "Lancer les outils de rapprochement financier." },
  { code: "DISPUTES_ARBITRATE", name: "Arbitrage des Litiges", description: "Trancher les plaintes et gérer les annulations." },
  { code: "CUSTOMER_SERVICE", name: "Support et Service Client", description: "Accéder au centre de support pour traiter les demandes." },
  { code: "SYSTEM_CONFIG_MUTATE", name: "Configuration des Paramètres Système", description: "Gérer les pays actifs, devises, commissions, bonus." },
  { code: "SYSTEM_MONITORING", name: "Maintenance & Monitoring", description: "Accéder aux journaux système (logs) et métriques." },
];

const CURRENCY_CONFIGS_SEED = [
  { countryCode: "BJ", countryName: "Benin", currencyCode: "XOF", bonusRate: 0.10, isActive: true },
  { countryCode: "CI", countryName: "Cote d'Ivoire", currencyCode: "XOF", bonusRate: 0.15, isActive: true },
  { countryCode: "TG", countryName: "Togo", currencyCode: "XOF", bonusRate: 0.05, isActive: true }
];

// ======================================================
// MAIN
// ======================================================
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Le seeding est interdit en production.");
  }

  console.log("========================================");
  console.log("🚀 Début du seeding global (Staff + Clients + Wallets)");
  console.log("========================================");

  const hashedStaffPin = await hashPin(DEFAULT_STAFF_PIN);
  const cotonouCoordinates = generateCoordinates("Cotonou");

  // On exécute l'injection initiale du staff et des clients dans une première transaction globale
  const createdUserIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    // --- INITIALISATION DES DEVISES PAR PAYS ---
    console.log("🪙 Configuration des configurations de devises régionales...");
    for (const conf of CURRENCY_CONFIGS_SEED) {
      await tx.currencyConfig.upsert({
        where: { countryCode: conf.countryCode },
        update: { bonusRate: conf.bonusRate, symbol: 'FCFA' },
        create: {
          countryCode: conf.countryCode,
          currencyCode: conf.currencyCode,
          bonusRate: conf.bonusRate,
          symbol: 'FCFA'
        }
      });
    }
    console.log("✔ Devises (BJ, CI, TG) synchronisées.");

    console.log("Mise en conformité des permissions système...");
    const permissions: Permission[] = [];

    for (const permission of SYSTEM_PERMISSIONS) {
      const finalized = await tx.permission.upsert({
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
      permissions.push(finalized);
    }

    const allPermissionsConnect = permissions.map((p) => ({ id: p.id }));
    console.log(`✔ ${permissions.length} permissions injectées.`);

    const getPermissionObject = (code: string) => {
      const target = permissions.find((p) => p.code === code);
      if (!target) throw new Error(`Permission critique introuvable au seed : ${code}`);
      return { id: target.id };
    };

    // --- ADMIN ---
    console.log("👤 Configuration du profil ADMIN...");
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

    // --- IT ---
    console.log("👤 Configuration du profil IT Tech...");
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

    // --- AGENTS ---
    console.log("👥 Déploiement des agents de succursale...");
    const agentKycPermissions = [
      getPermissionObject("CLIENTS_LIST"),
      getPermissionObject("CLIENTS_VIEW"),
      getPermissionObject("CLIENTS_MODERATE"),
      getPermissionObject("KYC_CALL_VALIDATION"),
      getPermissionObject("KYC_DOCUMENTS_VERIFY"),
    ];
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

    const agentFinancePermissions = [
      getPermissionObject("CLIENTS_LIST"),
      getPermissionObject("CLIENTS_VIEW"),
      getPermissionObject("COMPANY_MANAGE"),
      getPermissionObject("VALIDATE_COMPANY"),
      getPermissionObject("TRANSACTIONS_VIEW_ALL"),
      getPermissionObject("WALLET_OVERRIDE"),
      getPermissionObject("RECONCILIATION_EXECUTE"),
    ];
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

    const agentSupportPermissions = [
      getPermissionObject("CLIENTS_LIST"),
      getPermissionObject("CLIENTS_VIEW"),
      getPermissionObject("ANNUNCES_MANAGE"),
      getPermissionObject("ANNUNCES_TOGGLE"),
      getPermissionObject("DISPUTES_ARBITRATE"),
      getPermissionObject("CUSTOMER_SERVICE"),
    ];
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

    // --- GENERATION CLIENTS ---
    console.log("Génération en masse de 60 profils clients régionaux...");
    const hashedClientPin = await hashPin("123456");

    const localizationData = {
      Benin: {
        prefix: "+229",
        cities: ["Cotonou", "Porto-Novo", "Parakou"],
        coordinates: [{ lat: 6.370293, lng: 2.391236 }, { lat: 6.496857, lng: 2.628852 }, { lat: 9.33716, lng: 2.63031 }],
        firstnamesM: [ "Aurel", "Gildas", "Sena", "Rodrigue", "Chabi", "Dona", "Arnaud", "Marcos", "Espérand", "Flavien" ],
        firstnamesF: [ "Fabiola", "Omerence", "Sessi", "Sika", "Sonia", "Syntyche", "Eudoxie", "Pélagie", "Gloria", "Belinda" ],
        lastnames: [ "BIO", "ADANDE", "HOUNGBEDJI", "SOGLO", "TOSSSOU", "AGBOSSA", "KPADONOU", "GNAHOUI", "CHABI", "ALLADAYE" ],
      },
      "Cote d'Ivoire": {
        prefix: "+225",
        cities: ["Abidjan", "Yamoussoukro", "Bouake"],
        coordinates: [{ lat: 5.36, lng: -4.0083 }, { lat: 6.8276, lng: -5.2893 }, { lat: 7.6931, lng: -5.0315 }],
        firstnamesM: [ "Gnamien", "Kouassi", "Yao", "Arthur", "Stéphane", "Idriss", "Fabrice", "Cédric", "Ange", "Tidiane" ],
        firstnamesF: [ "Awa", "Aminata", "Murielle", "Marie-Reine", "Esther", "Emmanuelle", "Khadija", "Grace", "Fatou", "Ines" ],
        lastnames: [ "KONE", "COULIBALY", "OUATTARA", "BLE", "BAKAYOKO", "DIOMANDE", "GUEDE", "TOURE", "EBROTTIE", "KOFFI" ],
      },
      Togo: {
        prefix: "+228",
        cities: ["Lome", "Kara", "Atakpame"],
        coordinates: [{ lat: 6.1342, lng: 1.2131 }, { lat: 9.5501, lng: 1.1896 }, { lat: 7.5312, lng: 1.1241 }],
        firstnamesM: [ "Koffi", "Komla", "Folly", "Messan", "Anani", "Yawovi", "Edem", "Abalo", "Kofi", "Elom" ],
        firstnamesF: [ "Afi", "Essi", "Awa", "Adjowa", "Akossiwa", "Sika", "Koko", "Mansah", "Yawa", "Ameyo" ],
        lastnames: [ "AYITE", "AGBEYOME", "ADAM", "LAWSON", "OLYMPIO", "GASSOU", "GNASSINGBE", "KLOUSSEY", "AHOOMEY", "MENSAH" ],
      },
    };

    const biographies = [
      "Amoureux de l'art, de la culture et des voyages à travers l'Afrique.",
      "Passionné d'entrepreneuriat numérique et adepte du networking constructif.",
      "Esprit calme, curieux de psychologie humaine et toujours prêt à échanger.",
      "Vivre à 100%, axé sur le sport, le bien-être et le développement personnel.",
      "Créateur de contenus, épicurien et très attaché à nos valeurs africaines.",
    ];

    const passions = ["Cinéma, Musique, Lecture", "Fitness, Business, Restos", "Cuisine, Technologie, Randonnée", "Photographie, Art, Écriture"];
    const religions = ["Christian", "Muslim", "Traditional", "None"];
    const horoscopes = [ "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces" ];
    const languagesList = [["Français"], ["Français", "English"], ["Français", "Fon"], ["Français", "Baoulé"], ["Français", "Ewe"]];

    for (const [countryName, data] of Object.entries(localizationData)) {
      const genders = ["MALE", "FEMALE"] as const;

      for (const gender of genders) {
        for (let i = 0; i < 10; i++) {
          let onboardingStep = "GENERAL_INFO";
          if (i <= 3) onboardingStep = "COMPLETED";
          else if (i === 4 || i === 5) onboardingStep = "CREATE_PIN";
          else if (i >= 6) onboardingStep = "CALL_VALIDATION";

          let phoneNumber = `${data.prefix}${gender === "MALE" ? "90" : "91"}00000${i}`;
          if (countryName === "Benin" && i === 0) onboardingStep = "COMPLETED";

          // Sécurisation des accès aux index via des modulos pour éviter les undefined
          const firstname = gender === "MALE" 
            ? data.firstnamesM[i % data.firstnamesM.length]! 
            : data.firstnamesF[i % data.firstnamesF.length]!;
          const lastname = data.lastnames[Math.floor(Math.random() * data.lastnames.length)]!;
          const fullname = `${firstname} ${lastname}`;
          const username = `${firstname.toLowerCase()}_${lastname.toLowerCase()}_${i}`;

          const cityIndex = Math.floor(Math.random() * data.cities.length);
          const city = data.cities[cityIndex]!;
          const coords = data.coordinates[cityIndex]!;

          // Attribution d'une photo Unsplash déterministe et réaliste (Femmes Noires/Métisses & Hommes Noirs/Métisses)
          const profilePhoto = gender === "MALE"
            ? MALE_PHOTOS[i % MALE_PHOTOS.length]!
            : FEMALE_PHOTOS[i % FEMALE_PHOTOS.length]!;          
            
          const isCompletedStatus = onboardingStep === "COMPLETED";

          const user = await tx.user.upsert({
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
              birthday: new Date(1995 + (i % 8), Math.floor(Math.random() * 11), 1 + i * 2),
              biography: biographies[Math.floor(Math.random() * biographies.length)]!,
              passion: passions[Math.floor(Math.random() * passions.length)]!,
              religion: religions[Math.floor(Math.random() * religions.length)]!,
              horoscope: horoscopes[Math.floor(Math.random() * horoscopes.length)]!,
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
              languages: languagesList[Math.floor(Math.random() * languagesList.length)]!,
              preferences: { relationship: Math.random() > 0.4, friendship: true, networking: Math.random() > 0.3 },
              lastProfileUpdated: isCompletedStatus ? new Date() : null,
              lastPhotoUpdated: isCompletedStatus ? new Date() : null,
            },
          });

          if (onboardingStep === "CALL_VALIDATION") {
            await tx.videoSession.deleteMany({ where: { userId: user.id } });
            await tx.videoSession.create({
              data: {
                userId: user.id,
                roomId: `room_prod_simulation_${user.id}`,
                status: "AWAITING",
              },
            });
          }
        }
      }
      console.log(`✔ 20 profils synchronisés avec succès pour le pays : ${countryName}`);
    }
  });

  // Liste des pays opérationnels (ajoute ceux nécessaires pour ton application)
  const countries = [
    { code: 'BJ', name: 'Bénin' },
    { code: 'TG', name: 'Togo' },
    { code: 'CI', name: 'Côte d\'Ivoire' },
    { code: 'SN', name: 'Sénégal' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'NE', name: 'Niger' }
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
    console.log(`✅ Pays configuré : ${upsertedCountry.name} (${upsertedCountry.code})`);
  }

  console.log('🏁 Seeding des pays terminé avec succès !');


  // ======================================================
  // SEED PARTENAIRES : ENTREPRISES & ANNONCES 
  // ======================================================
  console.log("🏢 Démarrage de l'injection massive des Entreprises et Annonces contextuelles...");

  const activeUsers = await prisma.user.findMany({
    where: { isCompleted: true, role: "USER" },
    take: 20 // On prend un plus grand pool d'utilisateurs pour distribuer les commerces
  });

  type CompanyCategory = "RESTAURANT" | "HOTEL" | "TRANSPORT" | "ACTIVITY";
  type SeedCompany = {
    name: string;
    category: CompanyCategory;
    city: string;
    country: string;
    desc: string;
    priceEstimation: number;
    announcement: {
      title: string;
      desc: string;
    };
  };

  const rawCompanies: SeedCompany[] = [
    // --- BÉNIN ---
    { name: "Le Patio Cotonou", category: "RESTAURANT", city: "Cotonou", country: "Benin", desc: "Restaurant chic & Lounge au cœur de Cotonou.", priceEstimation: 12500, announcement: { title: "Dimanche Brunch & Grillades", desc: "Profitez d'un buffet à volonté avec animation live exclusive à partir de 12h." } },
    { name: "Azalaï Hôtel Cotonou", category: "HOTEL", city: "Cotonou", country: "Benin", desc: "Hôtel d'affaires de classe internationale.", priceEstimation: 85000, announcement: { title: "Offre Week-end Détente", desc: "Bénéficiez de -25% sur toutes nos chambres exécutives ce vendredi et samedi." } },
    { name: "Le Jardin de Porto-Novo", category: "RESTAURANT", city: "Porto-Novo", country: "Benin", desc: "Cadre verdoyant et cuisine afro-fusion.", priceEstimation: 8000, announcement: { title: "Soirée Découverte Culinaire", desc: "Menu dégustation 3 services à prix réduit tous les mercredis soir." } },
    { name: "Hôtel Tata Somba", category: "HOTEL", city: "Natitingou", city_fallback: "Parakou", country: "Benin", desc: "Architecture typique et confort moderne au Nord.", priceEstimation: 45000, announcement: { title: "Étape Safari Pendjari", desc: "Pack nuitée + briefing guide pour votre départ en excursion." } } as any, // Redirigé vers Parakou pour cohérence coords
    { name: "Benin Borgou Voyage", category: "TRANSPORT", city: "Parakou", country: "Benin", desc: "Transport interurbain sécurisé et climatisé.", priceEstimation: 9000, announcement: { title: "Nouvelles Lignes Express", desc: "Départs quotidiens Cotonou-Parakou à 06h00 et 13h00 dans des bus ultra-confort." } },
    
    // --- CÔTE D'IVOIRE ---
    { name: "L'Acoustique Abidjan", category: "RESTAURANT", city: "Abidjan", country: "Cote d'Ivoire", desc: "Gastronomie ivoirienne et cocktails signatures.", priceEstimation: 15000, announcement: { title: "Afterwork Karaoké & Attiéké", desc: "Entrée libre ce jeudi soir, cocktails à moitié prix pour les groupes." } },
    { name: "Sofitel Ivoire Lux", category: "HOTEL", city: "Abidjan", country: "Cote d'Ivoire", desc: "Le joyau de la lagune Ébrié.", priceEstimation: 140000, announcement: { title: "Accès Piscine & Spa VIP", desc: "Profitez d'une journée de relaxation complète avec formule massage incluse." } },
    { name: "Yakro Horizon Tour", category: "ACTIVITY", city: "Yamoussoukro", country: "Cote d'Ivoire", desc: "Visites guidées de la Basilique et des lacs aux crocodiles.", priceEstimation: 5000, announcement: { title: "Excursion Découverte Historique", desc: "Réservez votre guide pour le circuit complet de la capitale ce samedi matin." } },
    { name: "Gouro Transport Express", category: "TRANSPORT", city: "Bouake", country: "Cote d'Ivoire", desc: "Liaisons directes et régulières Centre-Sud.", priceEstimation: 7000, announcement: { title: "Navettes Spéciales Week-end", desc: "Gagnez du temps avec nos trajets directs Bouaké - Abidjan sans escales." } },
    { name: "La Couronne de Bouaké", category: "HOTEL", city: "Bouake", country: "Cote d'Ivoire", desc: "Hôtel calme idéal pour les séjours professionnels.", priceEstimation: 35000, announcement: { title: "Tarif Séminaire Résidentiel", desc: "Réductions appliquées pour les réservations de groupe de plus de 5 chambres." } },

    // --- TOGO ---
    { name: "Le Phénicien Lomé", category: "RESTAURANT", city: "Lome", country: "Togo", desc: "Spécialités méditerranéennes et locales en bord de mer.", priceEstimation: 18000, announcement: { title: "Soirée Fruits de Mer", desc: "Arrivage frais du jour, dégustation de homards cuisinés au feu de bois." } },
    { name: "Hôtel 2 Février", category: "HOTEL", city: "Lome", country: "Togo", desc: "L'emblème du luxe et de l'élégance à Lomé.", priceEstimation: 120000, announcement: { title: "Happy Hour Roof-Top", desc: "Venez admirer le coucher de soleil à 360° avec notre DJ résident." } },
    { name: "Région Kara Expéditions", category: "ACTIVITY", city: "Kara", country: "Togo", desc: "Randonnées et immersion culturelle en pays Tamberma.", priceEstimation: 25000, announcement: { title: "Randonnée Koutammakou Heritage", desc: "Découvrez les Tata Somba avec nos guides certifiés UNESCO." } },
    { name: "Lomé-Atakpamé Inter-Lignes", category: "TRANSPORT", city: "Atakpame", country: "Togo", desc: "Flotte moderne pour vos déplacements régionaux.", priceEstimation: 4500, announcement: { title: "Abonnement Trajet Mensuel", desc: "Simplifiez vos trajets professionnels avec notre nouvelle carte Navigo locale." } },
    { name: "Les Cascades d'Atakpamé", category: "ACTIVITY", city: "Atakpame", country: "Togo", desc: "Écotourisme et découverte des hauteurs du Grand Kloto.", priceEstimation: 7500, announcement: { title: "Circuit Trekking Nature", desc: "Randonnée encadrée de 3 heures avec baignade et pique-nique inclus." } }
  ];

  let companyCount = 0;
  let announceCount = 0;

  for (let idx = 0; idx < rawCompanies.length; idx++) {
    // Nettoyage de la destination si la ville spécifique au seed n'est pas mappée dans generateCoordinates
    const raw = rawCompanies[idx]!;
    const targetCity = (raw as any).city_fallback || raw.city;
    
    const owner = activeUsers[idx % activeUsers.length];
    if (!owner) continue;

    const coords = generateCoordinates(targetCity);
    const cleanName = raw.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Génération d'identifiants uniques pour respecter les contraintes @unique du schéma
    const fakePhoneNumber = `+2289000${idx.toString().padStart(4, '0')}`;
    const fakeEmail = `${cleanName}.${idx}@partner.nonsera.com`;
    const fakeUsername = `${cleanName}_${idx}`;

    const enterpriseLogo = ENTERPRISE_BANKS_PHOTOS[idx % ENTERPRISE_BANKS_PHOTOS.length]!;

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Création de l'entreprise (Company)
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
            balance: 0.00,
            links: {
              website: `https://www.${cleanName}.com`,
              instagram: `https://instagram.com/${cleanName}`,
              facebook: `https://facebook.com/${cleanName}`
            },
            // Table pivot UserCompany
            userCompanies: {
              create: {
                userId: owner.id,
                category: "OWNER"
              }
            }
          }
        });
        companyCount++;

        // 2. Création de l'annonce alignée sur le modèle Annonce
        await tx.annonce.create({
          data: {
            name: raw.announcement.title,               // Requis : String
            price: raw.priceEstimation,                // Requis : Decimal
            points: Math.floor(raw.priceEstimation * 0.001) || 1, // Points de fidélité générés (ex: 1pt par tranche de 1000)
            image: enterpriseLogo, // Requis : String
            description: raw.announcement.desc,        // Optionnel : String
            category: raw.category,                     // Optionnel : String
            isAvailable: true,
            isVerified: true,
            isSpecial: idx % 3 === 0,                   // Une annonce sur trois passe en "En vedette / Spécial"
            expiresIn: 30,                              // Requis : Int (jours restants)
            companyId: company.id,                      // Clé étrangère relationnelle
            
            // Configuration des métadonnées contextuelles selon le type d'activité
            ambiance: raw.category === "RESTAURANT" ? "SALLE_PRINCIPALE" : null,
            hasAnimation: raw.category === "RESTAURANT" || raw.category === "ACTIVITY",
            isDeliveryAvailable: raw.category === "RESTAURANT",
            isRomantique: raw.category === "HOTEL" && idx % 2 === 0,
            equipements: raw.category === "HOTEL" ? ["Wifi", "Piscine", "AC", "Parking"] : [],
            
            // Transport et Activités spécifiques
            vehicleType: raw.category === "TRANSPORT" ? "MINIBUS" : null,
            nbPlaces: raw.category === "TRANSPORT" ? 15 : null
          }
        });
        announceCount++;
      });
    } catch (err) {
      console.error(`Échec transactionnel pour le business ${raw.name}:`, err);
    }
  }

  console.log(`Bilan Partenaires : ${companyCount} entreprises injectées sur l'axe BJ-CI-TG.`);
  console.log(`Bilan Annonces : ${announceCount} annonces ciblées publiées.`);
  // ======================================================
  // SEED COMPLÉMENTAIRE : PORTES-FEUILLES BRUTS
  // ======================================================
  console.log('Démarrage du processus de crédit brut pour les portefeuilles...');

  const users = await prisma.user.findMany({
    where: { isCompleted: true, onboardingStep: 'COMPLETED' },
    select: { id: true, country: true, email: true },
  });

  console.log(`🔍 ${users.length} utilisateurs validés éligibles au portefeuille.`);

  if (users.length > 0) {
    const currencyConfigs = await prisma.currencyConfig.findMany();
    const configMap = new Map(currencyConfigs.map(c => [c.countryCode, c]));

    let totalCredited = 0;
    let totalWithBonusLocked = 0;

    for (const user of users) {
      // Normalisation des clés pays pour s'aligner avec la configuration de devises
      let countryKey = user.country || 'BJ';
      if (countryKey === 'Benin') countryKey = 'BJ';
      if (countryKey === "Cote d'Ivoire") countryKey = 'CI';
      if (countryKey === 'Togo') countryKey = 'TG';

      const config = configMap.get(countryKey) || { currencyCode: 'XOF', bonusRate: 0.10 };
      
      const amount = 25000; 
      const bonusRate = Number(config.bonusRate);
      const bonusGenerated = amount * bonusRate;

      const shouldLockBonus = (totalCredited + 1) % 3 === 0;
      const bonusBloque = shouldLockBonus ? bonusGenerated / 2 : 0;
      const bonusRestant = bonusGenerated - bonusBloque;

      try {
        // Une transaction distincte et atomique par utilisateur ciblé
        await prisma.$transaction(async (tx) => {
          const trancheId = `TRX-SEED-${user.id}-${Date.now()}`;
          
          await tx.walletTranche.create({
            data: {
              userId: user.id,
              trancheId: trancheId,
              type: 'RECHARGE',
              principalInitial: amount,
              principalRestant: amount,
              bonusTotal: bonusGenerated,
              bonusRestant: bonusRestant, 
              bonusDebloque: 0,          
              bonusBloque: bonusBloque,   
              currency: config.currencyCode,
              statut: 'ACTIVE',
              description: 'Recharge initiale via Seeder Brut',
            },
          });

          await tx.starpointWallet.upsert({
            where: { userId: user.id },
            update: { points: { increment: amount } },
            create: { userId: user.id, points: amount },
          });

          if (shouldLockBonus && bonusBloque > 0) {
            await tx.walletTranche.create({
              data: {
                userId: user.id,
                trancheId: `LCK-SEED-${Date.now()}`,
                type: 'AJUSTEMENT',
                principalInitial: 0, principalRestant: 0, bonusTotal: 0, bonusRestant: 0,
                bonusDebloque: 0, bonusBloque: 0,
                statut: 'EPUISE',
                description: `Blocage de sécurité initial (-${bonusBloque} Bonus)`,
              },
            });
            totalWithBonusLocked++;
          }

          await tx.user.update({
            where: { id: user.id },
            data: { coins: amount },
          });
        });

        totalCredited++;
      } catch (err) {
        console.error(`X Échec du crédit portefeuille pour l'utilisateur #${user.id}:`, err);
      }
    }
    console.log(`Portefeuilles : ${totalCredited} comptes alimentés, ${totalWithBonusLocked} avec bonus bloqués.`);
  }

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
  });