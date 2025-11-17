#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER_USER="doklad"
SERVER_HOST="51.250.19.213"
SERVER_PATH="/var/www/social-network"
APP_NAME="social-network"
APP_PORT="3001"
SSH_KEY="$HOME/.ssh/ssh-key-1760387445742"
IMAGE_TAR="/tmp/${APP_NAME}-image.tar"

SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no"

echo -e "${BLUE}🚀 Начинаем деплой Social Network через Docker...${NC}\n"

echo -e "${BLUE}🐋 Сборка Docker образа локально...${NC}"
docker build -t ${APP_NAME}:latest \
  --platform linux/amd64 \
  .

echo -e "\n${BLUE}💾 Сохранение образа в tar файл...${NC}"
docker save ${APP_NAME}:latest -o ${IMAGE_TAR}
echo -e "${GREEN}✅ Образ сохранен ($(du -h ${IMAGE_TAR} | cut -f1))${NC}"

echo -e "\n${BLUE}🔧 Подготовка сервера (Docker + PostgreSQL + nginx)...${NC}"
ssh $SSH_OPTS $SERVER_USER@$SERVER_HOST << 'SSHEOF'
set -e

if ! command -v docker >/dev/null 2>&1; then
  echo "Установка Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  rm get-docker.sh
  newgrp docker
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Установка PostgreSQL..."
  sudo apt-get update -y
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
fi

echo "Настройка PostgreSQL..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'social_network'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE social_network;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = 'doklad'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER doklad WITH PASSWORD 'doklad123';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE social_network TO doklad;"
sudo -u postgres psql -d social_network -c "GRANT ALL ON SCHEMA public TO doklad;"

echo "Настройка PostgreSQL для Docker контейнеров..."
POSTGRES_VERSION=$(sudo -u postgres psql -V | grep -oP '\d+' | head -1)
PG_HBA="/etc/postgresql/${POSTGRES_VERSION}/main/pg_hba.conf"
POSTGRES_CONF="/etc/postgresql/${POSTGRES_VERSION}/main/postgresql.conf"

if [ -f "$PG_HBA" ]; then
  sudo sed -i '/host.*all.*all.*172.17.0.0\/16/d' "$PG_HBA"
  echo "host all all 172.17.0.0/16 md5" | sudo tee -a "$PG_HBA"
fi

if [ -f "$POSTGRES_CONF" ]; then
  sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$POSTGRES_CONF"
  sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" "$POSTGRES_CONF"
fi

sudo systemctl restart postgresql

if ! command -v nginx >/dev/null 2>&1; then
  echo "Установка nginx..."
  sudo apt-get install -y nginx
fi
SSHEOF

echo -e "\n${BLUE}📤 Передача образа на сервер...${NC}"
scp $SSH_OPTS ${IMAGE_TAR} $SERVER_USER@$SERVER_HOST:/tmp/

echo -e "\n${BLUE}🐋 Загрузка и запуск образа на сервере...${NC}"
ssh $SSH_OPTS $SERVER_USER@$SERVER_HOST << SSHEOF
set -e

echo "Останавливаем старый контейнер..."
docker stop ${APP_NAME} 2>/dev/null || true
docker rm ${APP_NAME} 2>/dev/null || true

echo "Загружаем новый образ..."
docker load -i /tmp/${APP_NAME}-image.tar

DOCKER_HOST_IP=\$(ip -4 addr show docker0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')

echo "Запускаем новый контейнер..."
docker run -d \
  --name ${APP_NAME} \
  --restart unless-stopped \
  -p 127.0.0.1:${APP_PORT}:3000 \
  -e DB_HOST=\${DOCKER_HOST_IP} \
  -e DB_PORT=5432 \
  -e DB_USER=doklad \
  -e DB_PASSWORD=doklad123 \
  -e DB_NAME=social_network \
  -e PORT=3000 \
  ${APP_NAME}:latest

echo "Ожидание запуска контейнера..."
sleep 5

echo "Инициализация базы данных..."
docker exec ${APP_NAME} node dist/scripts/init-db.js || echo "БД уже инициализирована"

echo "Очистка..."
rm -f /tmp/${APP_NAME}-image.tar
docker image prune -f
SSHEOF

echo -e "\n${BLUE}🧹 Очистка локального tar файла...${NC}"
rm -f ${IMAGE_TAR}

echo -e "\n${BLUE}⚙️  Настройка nginx...${NC}"
ssh $SSH_OPTS $SERVER_USER@$SERVER_HOST << 'NGINXEOF'
set -e

sudo tee /etc/nginx/sites-available/social-network > /dev/null << 'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/social-network /etc/nginx/sites-enabled/social-network

sudo nginx -t
sudo systemctl reload nginx
NGINXEOF

echo -e "\n${BLUE}🔍 Проверка доступности...${NC}"
sleep 3
if curl -f -s -o /dev/null http://$SERVER_HOST/; then
  echo -e "${GREEN}✅ API доступно!${NC}"
else
  echo -e "${YELLOW}⚠️  API недоступно, проверяем логи...${NC}"
  ssh $SSH_OPTS $SERVER_USER@$SERVER_HOST "docker logs ${APP_NAME} --tail 50"
fi

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Деплой завершён!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${BLUE}🌐 API: ${GREEN}http://$SERVER_HOST${NC}"
echo -e "${BLUE}📚 Swagger: ${GREEN}http://$SERVER_HOST/api${NC}"
echo -e "\n${BLUE}🔑 Администратор:${NC}"
echo -e "   Логин: ${GREEN}admin${NC}"
echo -e "   Пароль: ${GREEN}admin123${NC}"
echo -e "\n${BLUE}💡 Полезные команды:${NC}"
echo -e "   ${YELLOW}ssh $SSH_OPTS $SERVER_USER@$SERVER_HOST 'docker logs ${APP_NAME} -f'${NC}"
echo -e "   ${YELLOW}ssh $SSH_OPTS $SERVER_USER@$SERVER_HOST 'docker restart ${APP_NAME}'${NC}"
echo -e "   ${YELLOW}ssh $SSH_OPTS $SERVER_USER@$SERVER_HOST 'docker exec -it ${APP_NAME} sh'${NC}"
echo ""