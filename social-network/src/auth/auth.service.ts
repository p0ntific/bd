import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class AuthService {
    constructor(private db: DatabaseService) {}

    /**
     * Регистрация нового пользователя
     * @param {string} login - Логин пользователя
     * @param {string} password - Пароль в открытом виде
     * @returns {Promise<any>} Данные созданного пользователя
     */
    async register(login: string, password: string) {
        const existingUser = await this.db.query(
            "SELECT id FROM users WHERE login = $1",
            [login]
        );

        if (existingUser.rows.length > 0) {
            throw new ConflictException(
                "Пользователь с таким логином уже существует"
            );
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await this.db.query(
            "INSERT INTO users (login, password_hash, role) VALUES ($1, $2, $3) RETURNING id, login, role, created_at",
            [login, passwordHash, "user"]
        );

        return result.rows[0];
    }

    /**
     * Вход в систему
     * @param {string} login - Логин пользователя
     * @param {string} password - Пароль в открытом виде
     * @returns {Promise<any>} Данные пользователя
     */
    async login(login: string, password: string) {
        const result = await this.db.query(
            "SELECT id, login, password_hash, role, created_at FROM users WHERE login = $1",
            [login]
        );

        if (result.rows.length === 0) {
            throw new UnauthorizedException("Неверный логин или пароль");
        }

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException("Неверный логин или пароль");
        }

        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    /**
     * Получить данные пользователя по ID
     * @param {number} userId - ID пользователя
     * @returns {Promise<any>} Данные пользователя
     */
    async getUserById(userId: number) {
        const result = await this.db.query(
            "SELECT id, login, role, created_at FROM users WHERE id = $1",
            [userId]
        );

        return result.rows[0];
    }
}
