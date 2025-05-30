// Убираем dotenv
// require('dotenv').config();

const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require('cors');
const app = express();
const PORT = 3002; // Фиксированный порт

// === КОНФИГУРАЦИЯ ===
// Значения для Telegram бота мониторинга
const TELEGRAM_TOKEN = '7064290258:AAE0isSFrNtVvVT39hrTjnUwfMNRko6idqM'; // Токен бота мониторинга
const TELEGRAM_CHAT_ID = '-1002583264850'; // ID чата мониторинга

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Простой кэш для хранения последних IP-адресов и их первого посещения
const ipCache = new Map();
const CACHE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 часа

// Очистка старых записей из кэша
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipCache.entries()) {
    if (now - data.timestamp > CACHE_TIMEOUT) {
      ipCache.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Проверка каждый час

function getUserId(ip) {
  const cached = ipCache.get(ip);
  if (cached) {
    cached.timestamp = Date.now();
    return {
      userId: cached.userId,
      isFirstVisit: false
    };
  }
  
  const userId = (ipCache.size + 1).toString();
  ipCache.set(ip, { 
    userId, 
    timestamp: Date.now(),
    firstVisitTime: Date.now()
  });
  
  return {
    userId,
    isFirstVisit: true
  };
}

async function sendToTelegram(message) {
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML"
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`Ошибка отправки в Telegram: ${response.status}`);
      return false;
    }

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Ошибка при отправке в Telegram:', error.message);
    return false;
  }
}

// Вспомогательные функции
function formatIP(ip) {
  return ip.replace('::ffff:', '');
}

function getMoscowTime() {
  return new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// === ОБРАБОТЧИКИ ЗАПРОСОВ ===

// Обработчик посещения страницы
app.post('/visit', (req, res) => {
  const ip = formatIP(req.ip);
  const { userId, isFirstVisit } = getUserId(ip);
  
  // Отправляем сообщение только при первом посещении
  if (isFirstVisit) {
    const msg = `🆕 Первый заход на сайт\n👤 Пользователь #${userId}\n🌐 IP: ${ip}\n⏰ Время: ${getMoscowTime()}`;
    sendToTelegram(msg);
  }
  
  res.json({ userId, isFirstVisit });
});

// Обработчик активности на странице (только клики)
app.post('/activity', (req, res) => {
  const { type, details, userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'No userId' });
  
  // Обрабатываем только клики
  if (type !== 'click') {
    return res.json({ ok: true });
  }

  const ip = formatIP(req.ip);
  const msg = `🖱️ Нажатие на кнопку\n👤 Пользователь #${userId}\n🌐 IP: ${ip}\n📌 Кнопка: ${details}\n⏰ Время: ${getMoscowTime()}`;
  sendToTelegram(msg);
  res.json({ ok: true });
});

// Обработчик ошибок
app.post('/error', (req, res) => {
  const { error, userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'No userId' });

  const ip = formatIP(req.ip);
  const msg = `⚠️ Ошибка на index.html\n👤 Пользователь #${userId}\n🌐 IP: ${ip}\n❌ Ошибка: ${error}\n⏰ Время: ${getMoscowTime()}`;
  sendToTelegram(msg);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Сервер мониторинга запущен на порту ${PORT}`);
}); 