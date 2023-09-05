import * as fs from 'fs';

import { getCurrentUTCDate } from './date.util';
import { TGameType } from 'src/module/casino/types/game-type.type';

export const updateUserInFile = (
  chatId: number,
  userId: number,
  gameType: TGameType,
) => {
  const path = `src/resources/${chatId}.csv`;

  if (!fs.existsSync(path)) {
    console.error('Файл не найден');
    return;
  }

  const user = readUserFromFile(chatId, userId);
  if (!user) return; // В readUserFromFile уже логируется ошибка

  const newDate = getCurrentUTCDate();

  // Обновляем нужную дату
  user[`${gameType}date`] = newDate;

  // Формируем новую строку для пользователя
  const newUserLine = `${user.userId},${user.username},${user.slotmachinedate},${user.blackjackdate},${user.spindate}\n`;
  let fileContent = fs.readFileSync(path, 'utf8');
  const lines = fileContent.split('\n');

  const userIndex = lines.findIndex((line) =>
    line.startsWith(userId.toString()),
  );
  if (userIndex === -1) {
    // Пользователь не найден, добавляем его
    lines.push(newUserLine.trim());
  } else {
    // Заменяем существующую строку пользователя
    lines[userIndex] = newUserLine.trim();
  }

  // Записываем обновлённые данные обратно в файл
  fs.writeFileSync(path, lines.join('\n'));
};

// Функция для записи информации о пользователе в CSV-файл
export const writeUserToFile = (
  chatId: number,
  userId: number,
  username: string = 'N/A',
) => {
  const path = `src/resources/${chatId}.csv`;
  const newUserLine = `${userId},${username},\n`;

  if (fs.existsSync(path)) {
    const user = readUserFromFile(chatId, userId);

    if (user) {
      return; // Пользователь уже существует
    }

    fs.appendFileSync(path, newUserLine);
  } else {
    fs.writeFileSync(
      path,
      'USER_ID,USERNAME,SLOTMACHINEDATE,BLACKJACKDATE,SPINDATE\n' + newUserLine,
    );
  }
};

// Функция для чтения пользователей из файла по chatId
export const readUsersFromFile = (chatId: string): string => {
  const path = `src/resources/${chatId}.csv`;

  if (fs.existsSync(path)) {
    return fs.readFileSync(path, 'utf8');
  }

  console.error('Файл не найден');
};

export const readUserFromFile = (
  chatId: number,
  userId: number,
): Record<string, string> => {
  const path = `src/resources/${chatId}.csv`;

  if (fs.existsSync(path)) {
    const fileContent = fs.readFileSync(path, 'utf8');
    // Разбиваем файл на строки
    const lines = fileContent.split('\n');

    // Ищем строку с указанным userId
    const userLine = lines.find((line) => line.startsWith(`${userId},`));

    if (userLine) {
      const [id, username, slotmachinedate, blackjackdate, spindate] =
        userLine.split(',');
      return {
        userId: id,
        username,
        slotmachinedate,
        blackjackdate,
        spindate,
      }; // Возвращаем объект с информацией о пользователе
    } else {
      console.error('Пользователь не найден');
    }
  }

  console.error('Файл не найден');
};
