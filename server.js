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


const testersData = {
  "201157649": {
    name: "Туминов Максим Сергеевич",
    client: "9054980373",
    clientName: "Беляева Алла Викторовна ИП г. Элиста",
    purchase_history: [
      '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]',
      '- Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]',
      '- Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]',
      '- 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]',
      '- 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
    ].join('\n')
  },
  "5165051544": {
    name: "Сидоренко Ксения",
    client: "9624446829",
    clientName: "Шевякин Михаил Иванович ИП",
    purchase_history: [
      '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]',
      '- Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]',
      '- Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]',
      '- 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]',
      '- 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
    ].join('\n')
  },
  "5538169978": {
    name: "Кожина Ирина",
    client: "9189034330",
    clientName: "Туйсузьян Гасмик Агоповна ИП",
    purchase_history: [
      '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]',
      '- Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]',
      '- Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]',
      '- 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]',
      '- 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
    ].join('\n')
  },
  "7866328750": {
    name: "Боровкова Светлана",
    client: "9044182553",
    clientName: "Шелкова Ирина Александровна ИП",
    purchase_history: [
      '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]',
      '- Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]',
      '- Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]',
      '- 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]',
      '- 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
    ].join('\n')
  },
  "95696985": {
    name: "Федорова Ирина",
    client: "9518240401",
    clientName: "Салинская Наталья Григорьевна ИП",
    purchase_history: [
      '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]',
      '- Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]',
      '- Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]',
      '- 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]',
      '- 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
    ].join('\n')
  },
  "806522150": {
    name: "Даня Акопян",
    client: "9188695640",
    clientName: "Конотопцева Светлана Владимировна ИП",
    purchase_history: [
      '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]',
      '- Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]',
      '- Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]',
      '- 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]',
      '- 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
    ].join('\n')
  },
  "1107788698": {
    name: "Дима Ширяев",
    client: "9188695640",
    clientName: "Конотопцева Светлана Владимировна ИП",
    purchase_history: [
      '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]',
      '- Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]',
      '- Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]',
      '- 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]',
      '- 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
    ].join('\n')
  }
};

app.post('/api/create-web-call', async (req, res) => {
  try {
    // Extract Telegram ID from request body
    const telegramId = req.body.telegramId || '9280291870';
    
    // Look up client number from testersData dictionary using the telegramId
    let clientNumber = telegramId;  // Default to telegramId if not found
    let userName = 'Крокус ООО';    // Default name
    
    if (testersData[telegramId]) {
      clientNumber = testersData[telegramId].client;
      userName = testersData[telegramId].clientName;
      console.log(`Found user ${userName} with client number ${clientNumber}`);
    } else {
      console.log(`User with Telegram ID ${telegramId} not found in testersData. Using default values.`);
    }

    const retellClient = new Retell({ apiKey: API_KEY });
    const webCallResponse = await retellClient.call.createWebCall({
      agent_id: AGENT_ID,
      metadata: { demo: true },
      retell_llm_dynamic_variables: {
        user_number: clientNumber,  // Use the mapped client number instead of telegramId
        name: userName,             // Use the user's name from the dictionary if available
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
