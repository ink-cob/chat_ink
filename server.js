const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Временное хранилище в памяти сервера (очищается при перезагрузке сервера на Render)
let users = [];
let messages = [];

// Функция генерации уникального 5-значного ID
function generateUniqueId() {
    let id;
    do {
        id = Math.floor(10000 + Math.random() * 90000).toString();
    } while (users.some(u => u.userId === id));
    return id;
}

// Регистрация нового аккаунта
app.post('/api/register', (req, requireResponse) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return requireResponse.status(400).json({ error: 'Имя и пароль обязательны' });
    }

    const userId = generateUniqueId();
    const newUser = {
        userId,
        username,
        password,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    
    // Возвращаем данные без пароля для безопасности
    const { password: _, ...userWithoutPassword } = newUser;
    requireResponse.status(201).json({ user: userWithoutPassword });
});

// Авторизация (Вход)
app.post('/api/login', (req, requireResponse) => {
    const { username, password } = req.body;
    
    // Поиск пользователя с таким именем и паролем
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return requireResponse.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    const { password: _, ...userWithoutPassword } = user;
    requireResponse.json({ user: userWithoutPassword });
});

// Поиск пользователя по уникальному 5-значному ID (для добавления в друзья)
app.get('/api/user/:id', (req, requireResponse) => {
    const user = users.find(u => u.userId === req.params.id);
    if (!user) {
        return requireResponse.status(404).json({ error: 'Пользователь с таким ID не найден' });
    }
    requireResponse.json({ userId: user.userId, username: user.username });
});
// Получение истории сообщений между двумя пользователями
app.get('/api/messages', (req, requireResponse) => {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) {
        return requireResponse.status(400).json({ error: 'Не указаны участники диалога' });
    }

    // Фильтруем сообщения, которые принадлежат только этой паре пользователей
    const chatHistory = messages.filter(m => 
        (m.senderId === user1 && m.receiverId === user2) || 
        (m.senderId === user2 && m.receiverId === user1)
    );
    requireResponse.json(chatHistory);
});

// Отправка нового сообщения
app.post('/api/messages', (req, requireResponse) => {
    const { senderId, receiverId, text } = req.body;
    if (!senderId || !receiverId || !text) {
        return requireResponse.status(400).json({ error: 'Не все поля заполнены' });
    }

    const newMessage = {
        id: Math.random().toString(36).substr(2, 9),
        senderId,
        receiverId,
        text,
        timestamp: new Date().toISOString(),
        edited: false
    };

    messages.push(newMessage);
    requireResponse.status(201).json(newMessage);
});

// Редактирование сообщения по его ID
app.put('/api/messages/:id', (req, requireResponse) => {
    const { text } = req.body;
    const msg = messages.find(m => m.id === req.params.id);
    
    if (!msg) return requireResponse.status(404).json({ error: 'Сообщение не найдено' });
    
    msg.text = text;
    msg.edited = true;
    requireResponse.json(msg);
});

// Удаление сообщения по его ID
app.delete('/api/messages/:id', (req, requireResponse) => {
    messages = messages.filter(m => m.id !== req.params.id);
    requireResponse.json({ success: true });
});

// Обновление данных профиля (Имя / Пароль)
app.put('/api/user/:id', (req, requireResponse) => {
    const { username, password } = req.body;
    const user = users.find(u => u.userId === req.params.id);

    if (!user) return requireResponse.status(404).json({ error: 'Пользователь не найден' });

    if (username) user.username = username;
    if (password) user.password = password;

    const { password: _, ...userWithoutPassword } = user;
    requireResponse.json({ user: userWithoutPassword });
});

// Полное удаление аккаунта
app.delete('/api/user/:id', (req, requireResponse) => {
    const userId = req.params.id;
    
    // Удаляем самого пользователя
    users = users.filter(u => u.userId !== userId);
    // Стираем всю историю его сообщений для конфиденциальности
    messages = messages.filter(m => m.senderId !== userId && m.receiverId !== userId);
    
    requireResponse.json({ success: true });
});

// Запуск Node.js сервера
app.listen(PORT, () => {
    console.log(`Сервер мессенджера Chat Ink успешно запущен на порту ${PORT}`);
});
