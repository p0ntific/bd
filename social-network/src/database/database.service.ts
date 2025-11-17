import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Pool, PoolClient, QueryResult } from "pg";
import { databaseConfig } from "../config/database.config";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private pool: Pool;

    async onModuleInit() {
        this.pool = new Pool(databaseConfig);
    }

    async onModuleDestroy() {
        await this.pool.end();
    }

    /**
     * Выполнить SQL-запрос с параметрами
     * @param {string} query - SQL запрос с плейсхолдерами $1, $2, ...
     * @param {any[]} params - Параметры для подстановки
     * @returns {Promise<QueryResult>} Результат выполнения запроса
     */
    async query(query: string, params: any[] = []): Promise<QueryResult> {
        return this.pool.query(query, params);
    }

    /**
     * Получить клиента для выполнения транзакций
     * @returns {Promise<PoolClient>} Клиент подключения к БД
     */
    async getClient(): Promise<PoolClient> {
        return this.pool.connect();
    }
}
