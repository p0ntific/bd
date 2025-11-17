import {
    Controller,
    Post,
    Body,
    Res,
    Req,
    HttpCode,
    HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "../common/dto/register.dto";
import { LoginDto } from "../common/dto/login.dto";

@ApiTags("Аутентификация")
@Controller("auth")
export class AuthController {
    constructor(private authService: AuthService) {}

    /**
     * Регистрация нового пользователя
     */
    @Post("register")
    @ApiOperation({ summary: "Регистрация нового пользователя" })
    @ApiResponse({
        status: 201,
        description: "Пользователь успешно зарегистрирован",
    })
    @ApiResponse({ status: 409, description: "Пользователь уже существует" })
    async register(@Body() dto: RegisterDto, @Res() res: Response) {
        const user = await this.authService.register(dto.login, dto.password);
        res.cookie("userId", user.id, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        return res.json(user);
    }

    /**
     * Вход в систему
     */
    @Post("login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Вход в систему" })
    @ApiResponse({ status: 200, description: "Успешный вход" })
    @ApiResponse({ status: 401, description: "Неверные учетные данные" })
    async login(@Body() dto: LoginDto, @Res() res: Response) {
        const user = await this.authService.login(dto.login, dto.password);
        res.cookie("userId", user.id, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        return res.json(user);
    }

    /**
     * Выход из системы
     */
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Выход из системы" })
    @ApiResponse({ status: 200, description: "Успешный выход" })
    async logout(@Res() res: Response) {
        res.clearCookie("userId");
        return res.json({ message: "Выход выполнен успешно" });
    }
}
