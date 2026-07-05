import type { Request, Response } from "express";
export declare const authController: {
    /**
     * USER - Route de checking d'existence (Fonction Pure)
     */
    checkUserNumber: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Connexion utilisateur Nonsera
     */
    loginUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Envoi d'OTP pour inscription
     */
    sendRegisterOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * USER - Validation OTP et Création initiale de compte
     */
    verifyRegisterAndCreate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    checkStaffNumber: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    loginStaff: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    checkPartnerNumber: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    loginPartner: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    logout: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=auth.controller.d.ts.map