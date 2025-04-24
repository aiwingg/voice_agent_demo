const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Retell = require('retell-sdk'); // Using the Node SDK for Retell

const app = express();

// Enable CORS if needed for API endpoints
app.use(cors());
app.use(bodyParser.json());

// Your API endpoint to create a web call
const API_KEY = 'key_7335fefc4661ce2fd9f790780ad5';
const AGENT_ID = 'agent_838c0e063de92ecdacfa548307';

// Словарь тестировщиков и их клиентов
const testersData = {
  // По telegram_id
  "201157649": {
    name: "Туминов Максим Сергеевич",
    number: "89282794623",
    clients: ["9054980373", "9525751940"]
  },
  "516505154": {
    name: "Сидоренко Ксения",
    number: "89281848491",
    clients: ["", "9624446829"]
  },
  "553816997": {
    name: "Кожина Ирина",
    number: "89889973248",
    clients: ["9189034330"]
  },
  "786632875": {
    name: "Боровкова Светлана",
    number: "89275238382",
    clients: ["9044182553", "9033733406"]
  },
  "95696985": {
    name: "Федорова Ирина",
    number: "89286005531",
    clients: ["9518240401"]
  },
  "80652215": {
    name: "Даня Акопян",
    number: "+79998576189",
    clients: ["9185864488", "9280291870", "9186695640"]
  }
};

// Обратный словарь для поиска по номеру телефона тестировщика
const phoneNumberToTgId = {};
Object.entries(testersData).forEach(([tgId, data]) => {
  phoneNumberToTgId[data.number] = tgId;
});

app.post('/api/create-web-call', async (req, res) => {
  try {
    // Extract Telegram ID from request body
    const telegramId = req.body.telegramId || '9280291870';
    
    // Определяем клиентский номер для использования
    let clientNumber = '9280291870'; // Значение по умолчанию
    
    if (testersData[telegramId] && testersData[telegramId].clients.length > 0) {
      // Используем первый доступный номер клиента этого тестировщика
      const availableNumbers = testersData[telegramId].clients.filter(num => num && num.length > 0);
      if (availableNumbers.length > 0) {
        // Выбираем случайный номер из списка доступных
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        clientNumber = availableNumbers[randomIndex];
      }
    }
    
    console.log(`Using Telegram ID: ${telegramId}, Client Number: ${clientNumber}`);

    const retellClient = new Retell({ apiKey: API_KEY });
    const webCallResponse = await retellClient.call.createWebCall({
      agent_id: AGENT_ID,
      metadata: { demo: true },
      retell_llm_dynamic_variables: {
        user_number: clientNumber,
        name: testersData[telegramId]?.name || 'Крокус ООО',
        purchase_history: [
          '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]',
          '- Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]',
          '- Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]',
          '- 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]',
          '- 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
        ].join('\n')
      },
    });

    res.status(201).json(webCallResponse);
  } catch (error) {
    console.error('Error creating web call:', error);
    res.status(500).json({ error: 'Error creating web call' });
  }
});

// Serve React build
app.use(express.static(path.join(__dirname, 'client', 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
