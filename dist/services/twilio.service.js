import twilio from "twilio";
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, VERIFICATION_SID, } from "../config/env";
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Les identifiants Twilio sont manquants dans les variables d'environnement.");
}
// Initialisation du client Twilio avec les variables d'environnement
const accountSid = TWILIO_ACCOUNT_SID;
const authToken = TWILIO_AUTH_TOKEN;
const verifyServiceSid = VERIFICATION_SID;
const twilioPhoneNumber = TWILIO_PHONE_NUMBER;
// Mode sandbox / de test pour le développement local ou l'environnement de staging
const IS_DEV = process.env.NODE_ENV === "development" || !accountSid;
let client = null;
if (!IS_DEV) {
    client = twilio(accountSid, authToken);
}
export const twilioService = {
    /**
     * Initie l'envoi d'un code de vérification OTP par SMS via Twilio Verify
     * @param {string} phoneNumber - Le numéro au format international (ex: +229XXXXXXXX)
     * @returns {Promise<{success: boolean, status: string}>}
     */
    sendOtp: async (phoneNumber) => {
        if (!phoneNumber) {
            throw new Error("Le numéro de téléphone est requis pour l'envoi de l'OTP.");
        }
        // Comportement en mode Développement / Test (Évite de consommer des crédits)
        if (IS_DEV) {
            console.log(`[TWILIO DEV MODE] OTP simulé envoyé avec succès au : ${phoneNumber}`);
            return { success: true, status: "pending_mock" };
        }
        try {
            const verification = await client.verify.v2
                .services(verifyServiceSid)
                .verifications.create({ to: phoneNumber, channel: "sms" });
            return { success: true, status: verification.status };
        }
        catch (error) {
            console.error("Erreur Twilio Send OTP :", error);
            throw new Error(`Échec de l'envoi du SMS de vérification : ${error.message}`);
        }
    },
    /**
     * Vérifie le code OTP soumis par l'utilisateur auprès de Twilio
     * @param {string} phoneNumber - Le numéro au format international (ex: +229XXXXXXXX)
     * @param {string} code - Le code à 6 chiffres soumis par l'utilisateur
     * @returns {Promise<{success: boolean, status: string}>}
     */
    verifyOtp: async (phoneNumber, code) => {
        if (!phoneNumber || !code) {
            throw new Error("Le numéro de téléphone et le code de vérification sont requis.");
        }
        // Validation de test pour le mode Développement
        if (IS_DEV) {
            // On définit un code universel pour les tests en local : "001089"
            if (code === "001089") {
                console.log(`[TWILIO DEV MODE] Code de test validé avec succès pour : ${phoneNumber}`);
                return { success: true, status: "approved" };
            }
            throw new Error("Le code de vérification soumis est invalide (Mode Test).");
        }
        try {
            const verificationCheck = await client.verify.v2
                .services(verifyServiceSid)
                .verificationChecks.create({ to: phoneNumber, code: code });
            if (verificationCheck.status !== "approved") {
                throw new Error("Le code de vérification est incorrect ou a expiré.");
            }
            return { success: true, status: verificationCheck.status };
        }
        catch (error) {
            console.error("Erreur Twilio Verify OTP :", error);
            throw new Error(error.message || "Impossible de valider le code de vérification.");
        }
    },
    /**
     * Envoie un SMS avec un contenu textuel personnalisé à un numéro donné
     * @param {string} toPhoneNumber - Le numéro du destinataire au format international (ex: +229XXXXXXXX)
     * @param {string} messageBody - Le contenu texte personnalisé du SMS
     * @returns {Promise<{success: boolean, messageSid: string}>}
     */
    sendCustomSms: async (toPhoneNumber, messageBody) => {
        if (!toPhoneNumber || !messageBody) {
            throw new Error("Le numéro de téléphone destinataire et le corps du message sont requis.");
        }
        // Comportement en mode Développement / Test local
        if (IS_DEV) {
            console.log(`\n--- [TWILIO DEV MODE - SIMULATION SMS] ---`);
            console.log(`Pour : ${toPhoneNumber}`);
            console.log(`Message : ${messageBody}`);
            console.log(`-----------------------------------------\n`);
            return { success: true, messageSid: "SM_MOCK_SID_12345" };
        }
        try {
            const message = await client.messages.create({
                body: messageBody,
                from: twilioPhoneNumber,
                to: toPhoneNumber,
            });
            return { success: true, messageSid: message.sid };
        }
        catch (error) {
            console.error("Erreur d'envoi SMS via Twilio :", error);
            throw new Error(`Échec de l'envoi du SMS personnalisé : ${error.message}`);
        }
    },
};
//# sourceMappingURL=twilio.service.js.map