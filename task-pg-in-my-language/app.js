const { Pool } = require("pg");
const dbConfig = require("./config");

const db = new Pool(dbConfig);

const createTable = async () => {
    console.log("Creating users table...");

    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        age INTEGER NOT NULL,
        city VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log("Table created successfully");
    } catch (error) {
        console.error("Error creating table:", error.message);
    }
};

const insertUsers = async () => {
    console.log("Inserting users...");

    const users = [
        { name: "Иван Петров", email: "ivan@mail.ru", age: 25, city: "Москва" },
        {
            name: "Анна Сидорова",
            email: "anna@gmail.com",
            age: 30,
            city: "Санкт-Петербург",
        },
        {
            name: "Алексей Козлов",
            email: "alex@yandex.ru",
            age: 28,
            city: "Москва",
        },
        {
            name: "Мария Новикова",
            email: "maria@outlook.com",
            age: 22,
            city: "Казань",
        },
        {
            name: "Дмитрий Волков",
            email: "dmitry@rambler.ru",
            age: 35,
            city: "Екатеринбург",
        },
    ];

    for (const user of users) {
        try {
            await db.query(
                "INSERT INTO users (name, email, age, city) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
                [user.name, user.email, user.age, user.city]
            );
            console.log(`User ${user.name} inserted`);
        } catch (error) {
            console.error(`Error inserting user ${user.name}:`, error.message);
        }
    }
};

const getAllUsers = async () => {
    console.log("\nAll users:");
    console.log("=".repeat(50));

    try {
        const result = await db.query("SELECT * FROM users ORDER BY id");

        result.rows.forEach((user) => {
            console.log(
                `ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Age: ${user.age}, City: ${user.city}`
            );
        });
    } catch (error) {
        console.error("Error fetching users:", error.message);
    }
};

const getUsersByCity = async (city) => {
    console.log(`\nUsers from ${city}:`);
    console.log("=".repeat(30));

    try {
        const result = await db.query("SELECT * FROM users WHERE city = $1", [
            city,
        ]);

        if (result.rows.length > 0) {
            result.rows.forEach((user) => {
                console.log(
                    `${user.name} (${user.email}) - ${user.age} years old`
                );
            });
        } else {
            console.log(`No users found in ${city}`);
        }
    } catch (error) {
        console.error("Error fetching users by city:", error.message);
    }
};

const updateUserAge = async (email, newAge) => {
    console.log(`\nUpdating age for ${email}...`);

    try {
        const result = await db.query(
            "UPDATE users SET age = $1 WHERE email = $2 RETURNING *",
            [newAge, email]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log(
                `Age updated: ${user.name} is now ${user.age} years old`
            );
        } else {
            console.log(`User with email ${email} not found`);
        }
    } catch (error) {
        console.error("Error updating age:", error.message);
    }
};

const getAgeStatistics = async () => {
    console.log("\nAge statistics:");
    console.log("=".repeat(40));

    try {
        const result = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        AVG(age) as average_age,
        MIN(age) as min_age,
        MAX(age) as max_age
      FROM users
    `);

        const stats = result.rows[0];
        console.log(`Total users: ${stats.total_users}`);
        console.log(`Average age: ${Math.round(stats.average_age)} years`);
        console.log(`Youngest: ${stats.min_age} years`);
        console.log(`Oldest: ${stats.max_age} years`);
    } catch (error) {
        console.error("Error getting statistics:", error.message);
    }
};

const getUsersByGroups = async () => {
    console.log("\nUsers by cities:");
    console.log("=".repeat(40));

    try {
        const result = await db.query(`
      SELECT 
        city, 
        COUNT(*) as user_count,
        AVG(age) as avg_age
      FROM users 
      GROUP BY city 
      ORDER BY user_count DESC
    `);

        result.rows.forEach((row) => {
            console.log(
                `${row.city}: ${row.user_count} users (avg age: ${Math.round(row.avg_age)})`
            );
        });
    } catch (error) {
        console.error("Error grouping users:", error.message);
    }
};

const deleteUser = async (email) => {
    console.log(`\nDeleting user: ${email}`);

    try {
        const result = await db.query(
            "DELETE FROM users WHERE email = $1 RETURNING *",
            [email]
        );

        if (result.rows.length > 0) {
            console.log(`User ${result.rows[0].name} deleted`);
        } else {
            console.log(`User with email ${email} not found`);
        }
    } catch (error) {
        console.error("Error deleting user:", error.message);
    }
};

const main = async () => {
    console.log("Starting Node.js + PostgreSQL application\n");

    try {
        await createTable();
        await insertUsers();
        await getAllUsers();
        await getUsersByCity("Москва");
        await updateUserAge("ivan@mail.ru", 26);
        await getAgeStatistics();
        await getUsersByGroups();
        await deleteUser("alex@yandex.ru");
        await getAllUsers();

        console.log("\nAll operations completed successfully!");
    } catch (error) {
        console.error("Critical error:", error.message);
    } finally {
        await db.end();
        console.log("\nDatabase connection closed");
    }
};

main();
