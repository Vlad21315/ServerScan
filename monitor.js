// Конфигурация
const MONITOR_SERVER = 'http://localhost:3002'; // URL сервера мониторинга
let userId = null;

// Функция для отправки данных на сервер
async function sendToMonitor(endpoint, data = {}) {
  try {
    const response = await fetch(`${MONITOR_SERVER}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...data, userId })
    });
    const result = await response.json();
    if (!userId && result.userId) {
      userId = result.userId;
    }
    return result;
  } catch (error) {
    console.error('Ошибка отправки данных мониторинга:', error);
  }
}

// Отправляем информацию о посещении при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  sendToMonitor('visit');
});

// Отслеживаем клики
document.addEventListener('click', (event) => {
  const target = event.target;
  const details = {
    element: target.tagName.toLowerCase(),
    id: target.id || 'нет',
    class: target.className || 'нет',
    text: target.textContent?.trim().substring(0, 50) || 'нет'
  };
  sendToMonitor('activity', {
    type: 'click',
    details: JSON.stringify(details)
  });
});

// Отслеживаем ввод в поля
document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    const details = {
      element: target.tagName.toLowerCase(),
      id: target.id || 'нет',
      name: target.name || 'нет',
      type: target.type || 'text',
      length: target.value.length
    };
    sendToMonitor('activity', {
      type: 'input',
      details: JSON.stringify(details)
    });
  }
});

// Отслеживаем прокрутку
let lastScrollTime = 0;
window.addEventListener('scroll', () => {
  const now = Date.now();
  if (now - lastScrollTime > 1000) { // Ограничиваем частоту отправки
    lastScrollTime = now;
    const details = {
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      innerHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight
    };
    sendToMonitor('activity', {
      type: 'scroll',
      details: JSON.stringify(details)
    });
  }
});

// Отслеживаем наведение на элементы
let lastHoverTime = 0;
document.addEventListener('mouseover', (event) => {
  const now = Date.now();
  if (now - lastHoverTime > 500) { // Ограничиваем частоту отправки
    lastHoverTime = now;
    const target = event.target;
    const details = {
      element: target.tagName.toLowerCase(),
      id: target.id || 'нет',
      class: target.className || 'нет'
    };
    sendToMonitor('activity', {
      type: 'hover',
      details: JSON.stringify(details)
    });
  }
});

// Отслеживаем ошибки
window.addEventListener('error', (event) => {
  sendToMonitor('error', {
    error: `${event.message} (${event.filename}:${event.lineno}:${event.colno})`
  });
}); 