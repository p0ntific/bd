import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import * as bcrypt from "bcrypt";
import { databaseConfig } from "../config/database.config";

async function initDatabase() {
    const pool = new Pool(databaseConfig);

    try {
        console.log("Создание схемы базы данных...");
        const schemaSQL = readFileSync(
            join(__dirname, "../database/schema.sql"),
            "utf-8"
        );
        await pool.query(schemaSQL);
        console.log("Схема создана успешно.");

        console.log("Проверка существования администратора...");
        const existingAdmin = await pool.query(
            "SELECT id FROM users WHERE role = $1 LIMIT 1",
            ["admin"]
        );

        if (existingAdmin.rows.length === 0) {
            console.log("Создание аккаунта администратора...");
            const adminLogin = "admin";
            const adminPassword = "admin123";
            const passwordHash = await bcrypt.hash(adminPassword, 10);

            await pool.query(
                "INSERT INTO users (login, password_hash, role) VALUES ($1, $2, $3)",
                [adminLogin, passwordHash, "admin"]
            );

            console.log("Администратор создан:");
            console.log(`  Логин: ${adminLogin}`);
            console.log(`  Пароль: ${adminPassword}`);
        } else {
            console.log("Администратор уже существует.");
        }

        console.log("Инициализация завершена успешно.");
    } catch (error) {
        console.error("Ошибка при инициализации:", error);
        throw error;
    } finally {
        await pool.end();
    }
}

initDatabase();
