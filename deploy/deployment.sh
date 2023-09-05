#!/bin/bash

# Директория проекта
PROJECT_DIR="/path/to/your/project"
# Имя приложения в pm2
PM2_APP_NAME="newman"

# Переходим в директорию проекта
cd $PROJECT_DIR || { echo "Could not enter the project directory. Exiting."; exit 1; }

# Логи операций
LOG_FILE="./deployment.log"

# Фиксируем начало процесса в лог
echo "Deployment started at $(date)" >> $LOG_FILE

# Подтягиваем изменения из репозитория
git pull origin master >> $LOG_FILE 2>&1 || { echo "git pull failed. Check $LOG_FILE for details." ; exit 1; }

# Устанавливаем зависимости
npm ci >> $LOG_FILE 2>&1 || { echo "npm ci failed. Check $LOG_FILE for details." ; exit 1; }

# Собираем проект
npm run build >> $LOG_FILE 2>&1 || { echo "build failed. Check $LOG_FILE for details." ; exit 1; }

# Проверяем, запущено ли уже приложение с этим именем в pm2
pm2 describe $PM2_APP_NAME > /dev/null

# $? - переменная, хранящая код последней операции. Если 0, то все хорошо
if [ $? != 0 ]; then
  # Если приложение не было запущено ранее, pm2 его запустит
  pm2 start npm --name "$PM2_APP_NAME" -- run start:prod >> $LOG_FILE 2>&1 || { echo "pm2 start failed. Check $LOG_FILE for details."; exit 1; }
else
  # Если приложение было запущено, делаем reload
  pm2 reload $PM2_APP_NAME >> $LOG_FILE 2>&1 || { echo "pm2 reload failed. Check $LOG_FILE for details."; exit 1; }
fi

# Фиксируем успешное завершение в лог
echo "Deployment completed at $(date)" >> $LOG_FILE

echo "Deployment successful. Check $LOG_FILE for logs."
