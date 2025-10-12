const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const dbConfig = require("./config");

const db = new Pool(dbConfig);

const SALT_ROUNDS = 10;

const createUsersTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS auth_users (
                id SERIAL PRIMARY KEY,
                login VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (error) {
        throw error;
    }
};

/**
 * Регистрация нового пользователя
 * @param {string} login - Имя пользователя
 * @param {string} password - Пароль в открытом виде
 * @returns {Promise<Object|null>} Данные созданного пользователя или null
 */
const registerUser = async (login, password) => {
    try {
        if (!login || !password) {
            console.log(" Ошибка: логин и пароль не могут быть пустыми");
            return null;
        }

        // Хеширование пароля с солью и итерациями
        // bcrypt автоматически:
        // - Генерирует случайную соль
        // - Выполняет указанное количество итераций (SALT_ROUNDS)
        // - Сохраняет соль внутри хеша
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Использование параметризованного запроса ($1, $2)
        // для защиты от SQL-инъекций
        const result = await db.query(
            `INSERT INTO auth_users (login, password_hash) 
             VALUES ($1, $2) 
             RETURNING id, login, created_at`,
            [login, passwordHash]
        );

        const user = result.rows[0];
        console.log(`  Пользователь успешно зарегистрирован`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Логин: ${user.login}`);
        console.log(`  Создан: ${user.created_at}`);

        return user;
    } catch (error) {
        if (error.code === "23505") {
            // Код ошибки PostgreSQL для нарушения уникальности
            console.log(` Пользователь с логином "${login}" уже существует`);
        } else {
            console.error(" Ошибка при регистрации:", error.message);
        }
        return null;
    }
};

/**
 * Аутентификация пользователя
 * @param {string} login - Имя пользователя
 * @param {string} password - Пароль в открытом виде
 * @returns {Promise<boolean>} true если аутентификация успешна, false в противном случае
 */
const authenticateUser = async (login, password) => {
    console.log("-".repeat(50));

    try {
        // Проверка на пустые значения
        if (!login || !password) {
            console.log(" Ошибка: логин и пароль не могут быть пустыми");
            return false;
        }

        // Использование параметризованного запроса для защиты от SQL-инъекций
        // $1 заменяется на значение login безопасным способом
        const result = await db.query(
            `SELECT id, login, password_hash, created_at 
             FROM auth_users 
             WHERE login = $1`,
            [login]
        );

        if (result.rows.length === 0) {
            console.log(" Пользователь не найден");
            return false;
        }

        const user = result.rows[0];

        // bcrypt.compare автоматически:
        // - Извлекает соль из сохраненного хеша
        // - Хеширует введенный пароль с той же солью
        // - Сравнивает результаты
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (isPasswordValid) {
            console.log("  Аутентификация успешна!");
            console.log(`  ID пользователя: ${user.id}`);
            console.log(`  Логин: ${user.login}`);
            console.log(`  Зарегистрирован: ${user.created_at}`);
            return true;
        } else {
            console.log("  Неверный пароль");
            return false;
        }
    } catch (error) {
        console.error("  Ошибка при аутентификации:", error.message);
        return false;
    }
};

/**
 * Вывод всех пользователей (без паролей)
 */
const listAllUsers = async () => {
    console.log("\n" + "=".repeat(50));
    console.log("СПИСОК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ");
    console.log("=".repeat(50));

    try {
        const result = await db.query(
            `SELECT id, login, created_at 
             FROM auth_users 
             ORDER BY id`
        );

        if (result.rows.length === 0) {
            console.log("Пользователи не найдены");
        } else {
            result.rows.forEach((user) => {
                console.log(
                    `ID: ${user.id} | Логин: ${user.login} | Создан: ${user.created_at}`
                );
            });
        }
    } catch (error) {
        console.error(
            "Ошибка при получении списка пользователей:",
            error.message
        );
    }
};

/**
 * Демонстрация защиты от SQL-инъекций
 */
const demonstrateSqlInjectionProtection = async () => {
    // Попытка SQL-инъекции
    const maliciousLogin = "admin' OR '1'='1";
    const maliciousPassword = "anything";

    const result = await authenticateUser(maliciousLogin, maliciousPassword);

    if (!result) {
        console.log("\n Инъекция заблокирована");
    }
};

/**
 * Основная функция демонстрации
 */
const main = async () => {
    try {
        // 1. Создание таблицы
        await createUsersTable();

        // 2. Регистрация пользователей
        console.log("=".repeat(50));
        console.log("РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ");
        console.log("=".repeat(50));

        await registerUser("admin", "AdminPass123!");
        await registerUser("user1", "SecurePass456");
        await registerUser("maria", "Пароль789");
        await registerUser("admin", "AnotherPassword"); // Попытка дублирования

        // 3. Вывод списка пользователей
        await listAllUsers();

        // 4. Успешная аутентификация
        console.log("\n" + "=".repeat(50));
        console.log("ТЕСТИРОВАНИЕ АУТЕНТИФИКАЦИИ");
        console.log("=".repeat(50));

        await authenticateUser("admin", "AdminPass123!");
        await authenticateUser("user1", "SecurePass456");
        await authenticateUser("maria", "Пароль789");

        // 5. Неуспешные попытки аутентификации
        console.log("\n" + "=".repeat(50));
        console.log("ТЕСТИРОВАНИЕ НЕВЕРНЫХ ПАРОЛЕЙ");
        console.log("=".repeat(50));

        await authenticateUser("admin", "WrongPassword");
        await authenticateUser("user1", "wrongpass");
        await authenticateUser("nonexistent", "anypassword");

        // 6. Демонстрация защиты от SQL-инъекций
        await demonstrateSqlInjectionProtection();

        console.log("\n" + "=".repeat(50));
        console.log("  ВСЕ ОПЕРАЦИИ ВЫПОЛНЕНЫ УСПЕШНО!");
        console.log("=".repeat(50));
    } catch (error) {
        console.error("\n  Критическая ошибка:", error.message);
    } finally {
        await db.end();
        console.log("\n  Соединение с базой данных закрыто");
    }
};

// Запуск приложения
main();
