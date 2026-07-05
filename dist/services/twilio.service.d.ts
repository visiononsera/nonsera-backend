export declare const twilioService: {
    /**
     * Initie l'envoi d'un code de vérification OTP par SMS via Twilio Verify
     * @param {string} phoneNumber - Le numéro au format international (ex: +229XXXXXXXX)
     * @returns {Promise<{success: boolean, status: string}>}
     */
    sendOtp: (phoneNumber: string) => Promise<{
        success: boolean;
        status: any;
    }>;
    /**
     * Vérifie le code OTP soumis par l'utilisateur auprès de Twilio
     * @param {string} phoneNumber - Le numéro au format international (ex: +229XXXXXXXX)
     * @param {string} code - Le code à 6 chiffres soumis par l'utilisateur
     * @returns {Promise<{success: boolean, status: string}>}
     */
    verifyOtp: (phoneNumber: string, code: string) => Promise<{
        success: boolean;
        status: any;
    }>;
    /**
     * Envoie un SMS avec un contenu textuel personnalisé à un numéro donné
     * @param {string} toPhoneNumber - Le numéro du destinataire au format international (ex: +229XXXXXXXX)
     * @param {string} messageBody - Le contenu texte personnalisé du SMS
     * @returns {Promise<{success: boolean, messageSid: string}>}
     */
    sendCustomSms: (toPhoneNumber: string, messageBody: string) => Promise<{
        success: boolean;
        messageSid: any;
    }>;
};
//# sourceMappingURL=twilio.service.d.ts.map