import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class PostsService {
    constructor(private db: DatabaseService) {}

    /**
     * Извлечь хештеги из текста
     * @param {string} content - Текст поста
     * @returns {string[]} Массив хештегов
     */
    private extractHashtags(content: string): string[] {
        const hashtagRegex = /#[a-zA-Zа-яА-ЯёЁ0-9_]+/g;
        const matches = content.match(hashtagRegex);
        return matches ? matches.map((tag) => tag.toLowerCase()) : [];
    }

    /**
     * Сохранить хештеги и связать их с постом
     * @param {number} postId - ID поста
     * @param {string[]} hashtags - Массив хештегов
     */
    private async saveHashtags(postId: number, hashtags: string[]) {
        const client = await this.db.getClient();

        try {
            await client.query("BEGIN");

            for (const tag of hashtags) {
                let hashtagId: number;

                const existingTag = await client.query(
                    "SELECT id FROM hashtags WHERE tag = $1",
                    [tag]
                );

                if (existingTag.rows.length > 0) {
                    hashtagId = existingTag.rows[0].id;
                } else {
                    const newTag = await client.query(
                        "INSERT INTO hashtags (tag) VALUES ($1) RETURNING id",
                        [tag]
                    );
                    hashtagId = newTag.rows[0].id;
                }

                await client.query(
                    "INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    [postId, hashtagId]
                );
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Создать новый пост
     * @param {number} authorId - ID автора
     * @param {string} content - Содержимое поста
     * @returns {Promise<any>} Созданный пост
     */
    async createPost(authorId: number, content: string) {
        const result = await this.db.query(
            "INSERT INTO posts (author_id, content) VALUES ($1, $2) RETURNING id, author_id, content, created_at, updated_at",
            [authorId, content]
        );

        const post = result.rows[0];
        const hashtags = this.extractHashtags(content);

        if (hashtags.length > 0) {
            await this.saveHashtags(post.id, hashtags);
        }

        return post;
    }

    /**
     * Получить посты пользователя
     * @param {number} userId - ID пользователя
     * @param {number} page - Номер страницы
     * @param {number} limit - Количество постов на странице
     * @param {string} order - Порядок сортировки (asc/desc)
     * @returns {Promise<any>} Список постов
     */
    async getUserPosts(
        userId: number,
        page: number = 1,
        limit: number = 20,
        order: string = "desc"
    ) {
        const offset = (page - 1) * limit;
        const orderClause = order === "asc" ? "ASC" : "DESC";

        const result = await this.db.query(
            `SELECT 
        p.id, 
        p.author_id, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.login as author_login,
        COALESCE(SUM(pr.rating_value), 0) as rating
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      LEFT JOIN post_ratings pr ON pr.post_id = p.id
      WHERE p.author_id = $1
      GROUP BY p.id, u.login
      ORDER BY p.created_at ${orderClause}
      LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countResult = await this.db.query(
            "SELECT COUNT(*) FROM posts WHERE author_id = $1",
            [userId]
        );

        return {
            posts: result.rows,
            total: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
        };
    }

    /**
     * Получить посты пользователя по логину
     * @param {string} login - Логин пользователя
     * @param {number} page - Номер страницы
     * @param {number} limit - Количество постов на странице
     * @param {string} order - Порядок сортировки
     * @param {string} orderBy - Тип сортировки (date/rating)
     * @returns {Promise<any>} Список постов
     */
    async getUserPostsByLogin(
        login: string,
        page: number = 1,
        limit: number = 20,
        order: string = "desc",
        orderBy: string = "date"
    ) {
        const offset = (page - 1) * limit;
        const orderClause = order === "asc" ? "ASC" : "DESC";
        const orderColumn = orderBy === "rating" ? "rating" : "p.created_at";

        const result = await this.db.query(
            `SELECT 
        p.id, 
        p.author_id, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.login as author_login,
        COALESCE(SUM(pr.rating_value), 0) as rating
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      LEFT JOIN post_ratings pr ON pr.post_id = p.id
      WHERE u.login = $1
      GROUP BY p.id, u.login
      ORDER BY ${orderColumn} ${orderClause}
      LIMIT $2 OFFSET $3`,
            [login, limit, offset]
        );

        const countResult = await this.db.query(
            "SELECT COUNT(*) FROM posts p LEFT JOIN users u ON u.id = p.author_id WHERE u.login = $1",
            [login]
        );

        return {
            posts: result.rows,
            total: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
        };
    }

    /**
     * Обновить пост
     * @param {number} postId - ID поста
     * @param {number} userId - ID пользователя
     * @param {string} userRole - Роль пользователя
     * @param {string} content - Новое содержимое
     * @returns {Promise<any>} Обновленный пост
     */
    async updatePost(
        postId: number,
        userId: number,
        userRole: string,
        content: string
    ) {
        const post = await this.db.query(
            "SELECT author_id FROM posts WHERE id = $1",
            [postId]
        );

        if (post.rows.length === 0) {
            throw new NotFoundException("Пост не найден");
        }

        if (
            post.rows[0].author_id !== userId &&
            userRole !== "moderator" &&
            userRole !== "admin"
        ) {
            throw new ForbiddenException(
                "Недостаточно прав для редактирования поста"
            );
        }

        const client = await this.db.getClient();

        try {
            await client.query("BEGIN");

            await client.query("DELETE FROM post_hashtags WHERE post_id = $1", [
                postId,
            ]);

            const result = await client.query(
                "UPDATE posts SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, author_id, content, created_at, updated_at",
                [content, postId]
            );

            const hashtags = this.extractHashtags(content);
            if (hashtags.length > 0) {
                await this.saveHashtags(postId, hashtags);
            }

            await client.query("COMMIT");

            return result.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Удалить пост
     * @param {number} postId - ID поста
     * @param {number} userId - ID пользователя
     * @param {string} userRole - Роль пользователя
     */
    async deletePost(postId: number, userId: number, userRole: string) {
        const post = await this.db.query(
            "SELECT author_id FROM posts WHERE id = $1",
            [postId]
        );

        if (post.rows.length === 0) {
            throw new NotFoundException("Пост не найден");
        }

        if (
            post.rows[0].author_id !== userId &&
            userRole !== "moderator" &&
            userRole !== "admin"
        ) {
            throw new ForbiddenException(
                "Недостаточно прав для удаления поста"
            );
        }

        await this.db.query("DELETE FROM posts WHERE id = $1", [postId]);

        return { message: "Пост успешно удален" };
    }

    /**
     * Получить посты из ленты подписок
     * @param {number} userId - ID пользователя
     * @param {number} page - Номер страницы
     * @param {number} limit - Количество постов
     * @param {string} order - Порядок сортировки
     * @param {string} orderBy - Тип сортировки
     * @returns {Promise<any>} Список постов
     */
    async getSubscriptionsFeed(
        userId: number,
        page: number = 1,
        limit: number = 20,
        order: string = "desc",
        orderBy: string = "date"
    ) {
        const offset = (page - 1) * limit;
        const orderClause = order === "asc" ? "ASC" : "DESC";
        const orderColumn = orderBy === "rating" ? "rating" : "p.created_at";

        const result = await this.db.query(
            `SELECT 
        p.id, 
        p.author_id, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.login as author_login,
        COALESCE(SUM(pr.rating_value), 0) as rating
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      LEFT JOIN post_ratings pr ON pr.post_id = p.id
      WHERE p.author_id IN (
        SELECT subscribed_to_id FROM subscriptions WHERE subscriber_id = $1
      )
      GROUP BY p.id, u.login
      ORDER BY ${orderColumn} ${orderClause}
      LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countResult = await this.db.query(
            `SELECT COUNT(*) FROM posts WHERE author_id IN (
        SELECT subscribed_to_id FROM subscriptions WHERE subscriber_id = $1
      )`,
            [userId]
        );

        return {
            posts: result.rows,
            total: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
        };
    }

    /**
     * Получить посты по хештегу
     * @param {string} hashtag - Хештег
     * @param {number} page - Номер страницы
     * @param {number} limit - Количество постов
     * @param {string} order - Порядок сортировки
     * @param {string} orderBy - Тип сортировки
     * @returns {Promise<any>} Список постов
     */
    async getPostsByHashtag(
        hashtag: string,
        page: number = 1,
        limit: number = 20,
        order: string = "desc",
        orderBy: string = "date"
    ) {
        const offset = (page - 1) * limit;
        const orderClause = order === "asc" ? "ASC" : "DESC";
        const normalizedTag = hashtag.toLowerCase().startsWith("#")
            ? hashtag.toLowerCase()
            : `#${hashtag.toLowerCase()}`;
        const orderColumn = orderBy === "rating" ? "rating" : "p.created_at";

        const result = await this.db.query(
            `SELECT 
        p.id, 
        p.author_id, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.login as author_login,
        COALESCE(SUM(pr.rating_value), 0) as rating
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      LEFT JOIN post_ratings pr ON pr.post_id = p.id
      WHERE p.id IN (
        SELECT ph.post_id FROM post_hashtags ph
        JOIN hashtags h ON h.id = ph.hashtag_id
        WHERE h.tag = $1
      )
      GROUP BY p.id, u.login
      ORDER BY ${orderColumn} ${orderClause}
      LIMIT $2 OFFSET $3`,
            [normalizedTag, limit, offset]
        );

        const countResult = await this.db.query(
            `SELECT COUNT(*) FROM post_hashtags ph
       JOIN hashtags h ON h.id = ph.hashtag_id
       WHERE h.tag = $1`,
            [normalizedTag]
        );

        return {
            posts: result.rows,
            total: parseInt(countResult.rows[0].count, 10),
            page,
            limit,
        };
    }

    /**
     * Поставить оценку посту
     * @param {number} postId - ID поста
     * @param {number} userId - ID пользователя
     * @param {number} ratingValue - Значение оценки (1 или -1)
     * @returns {Promise<any>} Результат операции
     */
    async ratePost(postId: number, userId: number, ratingValue: number) {
        if (ratingValue !== 1 && ratingValue !== -1) {
            throw new ForbiddenException(
                "Значение оценки должно быть 1 или -1"
            );
        }

        const postExists = await this.db.query(
            "SELECT id FROM posts WHERE id = $1",
            [postId]
        );
        if (postExists.rows.length === 0) {
            throw new NotFoundException("Пост не найден");
        }

        await this.db.query(
            `INSERT INTO post_ratings (user_id, post_id, rating_value) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, post_id) 
       DO UPDATE SET rating_value = $3`,
            [userId, postId, ratingValue]
        );

        return { message: "Оценка сохранена" };
    }

    /**
     * Отозвать оценку поста
     * @param {number} postId - ID поста
     * @param {number} userId - ID пользователя
     * @returns {Promise<any>} Результат операции
     */
    async removeRating(postId: number, userId: number) {
        await this.db.query(
            "DELETE FROM post_ratings WHERE user_id = $1 AND post_id = $2",
            [userId, postId]
        );

        return { message: "Оценка отозвана" };
    }
}
