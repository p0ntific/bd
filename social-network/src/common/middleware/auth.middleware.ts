import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../../auth/auth.service";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(private authService: AuthService) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const userId = req.cookies?.userId;

        if (userId) {
            try {
                const user = await this.authService.getUserById(
                    parseInt(userId, 10)
                );
                if (user) {
                    req["user"] = user;
                }
            } catch (error) {
                res.clearCookie("userId");
            }
        }

        next();
    }
}
