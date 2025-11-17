import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class UsersService {
    constructor(private db: DatabaseService) {}

    /**
     * Удалить аккаунт пользователя
     * @param {number} userId - ID пользователя
     * @param {number} requesterId - ID пользователя, выполняющего запрос
     * @param {string} requesterRole - Роль пользователя, выполняющего запрос
     * @param {boolean} deletePosts - Удалить посты или нет
     */
    async deleteAccount(
        userId: number,
        requesterId: number,
        requesterRole: string,
        deletePosts: boolean = false
    ) {
        if (
            userId !== requesterId &&
            requesterRole !== "moderator" &&
            requesterRole !== "admin"
        ) {
            throw new ForbiddenException(
                "Недостаточно прав для удаления аккаунта"
            );
        }

        if (deletePosts) {
            await this.db.query("DELETE FROM posts WHERE author_id = $1", [
                userId,
            ]);
        }

        await this.db.query("DELETE FROM users WHERE id = $1", [userId]);

        return { message: "Аккаунт успешно удален" };
    }

    /**
     * Изменить роль пользователя
     * @param {number} userId - ID пользователя, чью роль нужно изменить
     * @param {string} newRole - Новая роль
     * @param {number} adminId - ID администратора
     */
    async changeUserRole(userId: number, newRole: string, adminId: number) {
        if (userId === adminId) {
            throw new ForbiddenException("Нельзя изменить собственную роль");
        }

        const result = await this.db.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, login, role",
            [newRole, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundException("Пользователь не найден");
        }

        return result.rows[0];
    }

    /**
     * Получить информацию о пользователе по логину
     * @param {string} login - Логин пользователя
     * @returns {Promise<any>} Данные пользователя
     */
    async getUserByLogin(login: string) {
        const result = await this.db.query(
            "SELECT id, login, role, created_at FROM users WHERE login = $1",
            [login]
        );

        if (result.rows.length === 0) {
            throw new NotFoundException("Пользователь не найден");
        }

        return result.rows[0];
    }

    /**
     * Получить список пользователей с рейтингом
     * @param {string} orderBy - Тип сортировки (total/average)
     * @param {number} page - Номер страницы
     * @param {number} limit - Количество элементов на странице
     * @returns {Promise<any>} Список пользователей с рейтингом
     */
    async getUsersWithRating(
        orderBy: string = "total",
        page: number = 1,
        limit: number = 20
    ) {
        const offset = (page - 1) * limit;

        const orderColumn =
            orderBy === "average"
                ? "COALESCE(AVG(pr.rating_value), 0)"
                : "COALESCE(SUM(pr.rating_value), 0)";

        const result = await this.db.query(
            `SELECT 
        u.id, 
        u.login, 
        u.role,
        COALESCE(SUM(pr.rating_value), 0) as total_rating,
        COALESCE(AVG(pr.rating_value), 0) as average_rating,
        COUNT(DISTINCT p.id) as posts_count
      FROM users u
      LEFT JOIN posts p ON p.author_id = u.id
      LEFT JOIN post_ratings pr ON pr.post_id = p.id
      GROUP BY u.id
      ORDER BY ${orderColumn} DESC
      LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const countResult = await this.db.query("SELECT COUNT(*) FROM users");

        return {
            users: result.rows,
            total: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
        };
    }
}
