import {
    Injectable,
    ConflictException,
    NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class SubscriptionsService {
    constructor(private db: DatabaseService) {}

    /**
     * Подписаться на пользователя
     * @param {number} subscriberId - ID подписчика
     * @param {number} subscribedToId - ID пользователя, на которого подписываемся
     * @returns {Promise<any>} Результат операции
     */
    async subscribe(subscriberId: number, subscribedToId: number) {
        if (subscriberId === subscribedToId) {
            throw new ConflictException("Нельзя подписаться на самого себя");
        }

        const userExists = await this.db.query(
            "SELECT id FROM users WHERE id = $1",
            [subscribedToId]
        );

        if (userExists.rows.length === 0) {
            throw new NotFoundException("Пользователь не найден");
        }

        const existingSubscription = await this.db.query(
            "SELECT * FROM subscriptions WHERE subscriber_id = $1 AND subscribed_to_id = $2",
            [subscriberId, subscribedToId]
        );

        if (existingSubscription.rows.length > 0) {
            throw new ConflictException(
                "Вы уже подписаны на этого пользователя"
            );
        }

        await this.db.query(
            "INSERT INTO subscriptions (subscriber_id, subscribed_to_id) VALUES ($1, $2)",
            [subscriberId, subscribedToId]
        );

        return { message: "Подписка оформлена" };
    }

    /**
     * Отписаться от пользователя
     * @param {number} subscriberId - ID подписчика
     * @param {number} subscribedToId - ID пользователя, от которого отписываемся
     * @returns {Promise<any>} Результат операции
     */
    async unsubscribe(subscriberId: number, subscribedToId: number) {
        const result = await this.db.query(
            "DELETE FROM subscriptions WHERE subscriber_id = $1 AND subscribed_to_id = $2",
            [subscriberId, subscribedToId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundException("Подписка не найдена");
        }

        return { message: "Вы отписались от пользователя" };
    }

    /**
     * Получить список подписок пользователя
     * @param {number} userId - ID пользователя
     * @returns {Promise<any>} Список пользователей, на которых подписан
     */
    async getSubscriptions(userId: number) {
        const result = await this.db.query(
            `SELECT u.id, u.login, u.role, s.created_at as subscribed_at
       FROM subscriptions s
       JOIN users u ON u.id = s.subscribed_to_id
       WHERE s.subscriber_id = $1
       ORDER BY s.created_at DESC`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Получить список подписчиков пользователя
     * @param {number} userId - ID пользователя
     * @returns {Promise<any>} Список подписчиков
     */
    async getSubscribers(userId: number) {
        const result = await this.db.query(
            `SELECT u.id, u.login, u.role, s.created_at as subscribed_at
       FROM subscriptions s
       JOIN users u ON u.id = s.subscriber_id
       WHERE s.subscribed_to_id = $1
       ORDER BY s.created_at DESC`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Получить список взаимных подписок
     * @param {number} userId - ID пользователя
     * @returns {Promise<any>} Список взаимных подписок
     */
    async getMutualSubscriptions(userId: number) {
        const result = await this.db.query(
            `SELECT u.id, u.login, u.role
       FROM users u
       WHERE u.id IN (
         SELECT s1.subscribed_to_id
         FROM subscriptions s1
         WHERE s1.subscriber_id = $1
         AND EXISTS (
           SELECT 1 FROM subscriptions s2
           WHERE s2.subscriber_id = s1.subscribed_to_id
           AND s2.subscribed_to_id = $1
         )
       )
       ORDER BY u.login`,
            [userId]
        );

        return result.rows;
    }
}
