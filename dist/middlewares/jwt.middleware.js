import * as jwtUtils from "../utils/jwt.utils";
export const jwtMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "En-tête d'authentification manquant ou mal formé. Format attendu: Bearer <token>",
        });
    }
    const token = authHeader.split(" ")[1];
    const decodedToken = jwtUtils.verifyToken(token);
    if (!decodedToken) {
        return res
            .status(401)
            .json({ success: false, msg: "Invalid or expired token" });
    }
    req.tokenPayload = decodedToken;
    next();
};
//# sourceMappingURL=jwt.middleware.js.map