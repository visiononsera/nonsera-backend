import type { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            tokenPayload?: any;
        }
    }
}
export declare const jwtMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=jwt.middleware.d.ts.map