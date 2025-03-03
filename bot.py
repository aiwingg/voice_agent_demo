import telebot
from langchain_core.messages import AIMessage
import threading


import os
import json
import openai
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from langchain import LLMChain, PromptTemplate
from dotenv import load_dotenv
import requests
from datetime import datetime

########################################
# 1. Тестовые данные (пример из /api/Availability и т.д.)
########################################

data = {
    "model": {
        "id": 87,
        "name": "Aygo",
        "description": "Great choice for small family's",
        "sipp": "EDMV",
        "brand": "Toyota",
        "category": {"id": 1, "order": 0, "name": "Small"},
        "passangers": 4,
        "doors": 5,
        "transmissionType": "Manual",
        "bigLuggage": 3,
        "smallLuggage": 3,
        "hasAirCondition": True,
        "imagePath": "https://rently.blob.core.windows.net/sterling/CarModel/02984b25-ef7e-4713-8406-ecd97afbc0e7.png",
        "franchise": 675,
        "franchiseDamage": 675,
        "franchiseRollover": 675,
        "franchiseTheft": 675
    },
    "supplier": {
        "id": 9,
        "name": "Street",
        "logoPath": "https://rently.blob.core.windows.net/rently-network/operators/street.png",
        "termsAndConditions": "Online payments accepted: Visa, Master, Amex",
        "noShowCharge": 0.1,
        "privacyPolicy": "https://www.streetrentacar.com/privacy-policy",
        "disclaimer": "Example disclaimer",
        "minAgeWithoutDriverFee": 18,
        "maxAgeWithoutDriverFee": 65,
        "minAgeToDrive": 17,
        "maxAgeToDrive": 80
    },
    "fromDate": "2022-03-13 11:00",
    "toDate": "2022-03-23 11:00",
    "deliveryPlace": {
        "id": 1,
        "country": "US",
        "city": "Miami",
        "phone": "+54 11 3582-9237",
        "email": "reservas@streetrentacar.com",
        "supplierId": 9,
        "address": "Miami International Airport",
        "type": "Office",
        "serviceType": "Walking",
        "iata": "EZE"
    },
    "returnPlace": {
        "id": 1,
        "country": "US",
        "city": "Miami",
        "phone": "+54 11 3582-9237",
        "email": "reservas@streetrentacar.com",
        "supplierId": 9,
        "address": "Miami International Airport",
        "type": "Office",
        "serviceType": "Walking",
        "iata": "EZE"
    },
    "totalDaysString": "10 days",
    "price": 272.55,
    "currency": "USD",
    "ilimitedKm": True,
    "bookingId": "mock-booking-123",
    "status": "confirmed",
    "confirmationNumber": "CONF-999999",
    "totalPrice": 272.55,
    "createdAt": "2025-03-01T12:00:00Z",
    "customerId": "cust001",
    "carId": "car123",
    "pickupLocation": "Miami International Airport",
    "dropoffLocation": "Miami International Airport",
    "pickupTime": "2025-03-10T10:00:00Z",
    "dropoffTime": "2025-03-15T10:00:00Z",
    "extras": {"gps": True, "childSeat": False},
}


MOCK_AVAILABILITY_RESPONSE = [
    {
        "model": data["model"],
        "supplier": data["supplier"],
        "fromDate": data['fromDate'],
        "toDate": data["toDate"],
        "deliveryPlace": data['deliveryPlace'],
        "returnPlace": data['returnPlace'],
        "totalDaysString": data['totalDaysString'],
        "price": data["price"],
        "currency": data['currency'],
        "ilimitedKm": data['ilimitedKm']
    }
]

MOCK_CREATE_BOOKING_RESPONSE = {
    "bookingId": data['bookingId'],
    "status": data['status'],
    "confirmationNumber": data['confirmationNumber'],
    "totalPrice": data['totalPrice'],
    "currency": data['currency'],
    "createdAt": data['createdAt']
}

MOCK_GET_BOOKING_RESPONSE = {
    "bookingId": data['bookingId'],
    "customerId": data['customerId'],
    "carId": data['model']['id'],
    "pickupLocation": data['deliveryPlace']["address"],
    "dropoffLocation": data['returnPlace']["address"],
    "pickupTime": data['pickupTime'],
    "dropoffTime": data['dropoffTime'],
    "status": data['status'],
    "extras": data['extras'],
    "createdAt": data['createdAt']
}

MOCK_UPDATE_BOOKING_RESPONSE = {"bookingId": data['bookingId'], "status": data['status']}
MOCK_CANCEL_BOOKING_RESPONSE = {"bookingId": data['bookingId'], "status": data['status']}

########################################
# 2. Настройка OpenAI (пустая, т.к. нет реального ключа)
########################################

########################################
# Настройки и ключи
########################################

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

model = ChatOpenAI(
    api_key=OPENAI_API_KEY,  # Указываем фиктивный ключ
    model_name="gpt-4o",
    temperature=0.0
)

########################################
# 3. Инструмент: извлечение параметров (с вызовом LLM)
########################################

@tool
def extract_parameters(user_query: str) -> dict:
    """
    Extract parameters from the user query using an LLM.

    Args:
        user_query (str): The query provided by the user.
    Returns:
        dict: A dictionary containing the extracted parameters (pickupTime, dropoffTime, gps, etc.).
    """
    prompt_template = PromptTemplate(
        input_variables=['user_input'],
        template="""
You're an assistant who extracts parameters for car reservations from user text.
Here is the user text: {user_input}

Output JSON with keys (e.g. pickupTime, dropoffTime, gps, carId, customerId, etc.).
If there is no data, output null or empty fields.
"""
    )
    chain = LLMChain(prompt=prompt_template, llm=model)
    response = chain.run({"user_input": user_query})

    try:
        parsed = json.loads(response)
    except json.JSONDecodeError:
        parsed = {}

    # Преобразуем 'null' → None
    for k, v in parsed.items():
        if v == 'null':
            parsed[k] = None

    return parsed

########################################
# 4. Инструменты (mock) для Rently API
########################################

@tool
def get_available_cars(
    pickupTime: str,
    dropoffTime: str,
    pickupLocation: str = None,
    dropoffLocation: str = None
) -> dict:
    """
    Returns a list of available cars from mock data (simulating Rently /cars/availability).

    Args:
        pickupTime (str): ISO8601 date-time for pickup.
        dropoffTime (str): ISO8601 date-time for dropoff.
        pickupLocation (str, optional): The location/city/office to pick up the car.
        dropoffLocation (str, optional): The location/city/office to drop off the car.

    Returns:
        dict or list: The mock availability data or an error structure.
    """
    # Здесь можно сделать фильтрацию, если хотите сопоставить даты/локации.
    # Для упрощения всегда возвращаем MOCK_AVAILABILITY_RESPONSE.
    return MOCK_AVAILABILITY_RESPONSE

@tool
def create_booking(
    customerId: str,
    carId: str,
    pickupLocation: str,
    dropoffLocation: str,
    pickupTime: str,
    dropoffTime: str,
    gps: bool = False,
    childSeat: bool = False
) -> dict:
    """
    Creates a booking (mock) and returns a synthetic response (simulating POST /bookings).

    Args:
        customerId (str): Unique ID of the customer.
        carId (str): ID of the car to rent.
        pickupLocation (str): The location to pick up the car.
        dropoffLocation (str): The location to drop off the car.
        pickupTime (str): ISO8601 date-time for pickup.
        dropoffTime (str): ISO8601 date-time for dropoff.
        gps (bool, optional): Whether GPS is required.
        childSeat (bool, optional): Whether a child seat is required.

    Returns:
        dict: Mocked booking response with bookingId, status, etc.
    """
    data['pickupLocation'] = pickupLocation
    data['dropoffLocation'] = dropoffLocation
    data['pickupTime'] = pickupTime
    data['dropoffTime'] = dropoffTime
    data['status'] = 'confirmed'
    return MOCK_CREATE_BOOKING_RESPONSE



@tool
def get_booking(bookingId: str) -> dict:
    """
    Retrieves details of an existing booking (mock) (simulating GET /bookings/{bookingId}).

    Args:
        bookingId (str): The unique ID of the booking.

    Returns:
        dict: A JSON object with booking details or an error structure.
    """
    return MOCK_GET_BOOKING_RESPONSE

@tool
def update_booking(
    bookingId: str,
    pickupTime: str = None,
    dropoffTime: str = None,
    gps: bool = None,
    childSeat: bool = None
) -> dict:
    """
    Updates an existing booking (mock) (simulating PUT /bookings/{bookingId}).

    Args:
        bookingId (str): The unique ID of the booking to update.
        pickupTime (str, optional): New ISO8601 pickup date/time.
        dropoffTime (str, optional): New ISO8601 dropoff date/time.
        gps (bool, optional): Update GPS requirement.
        childSeat (bool, optional): Update child seat requirement.

    Returns:
        dict: Mocked response indicating success or error.
    """
    data['pickupTime'] = pickupTime
    data['dropoffTime'] = dropoffTime
    data['status'] = 'updated'
    return MOCK_UPDATE_BOOKING_RESPONSE

@tool
def cancel_booking(bookingId: str) -> dict:
    """
    Cancels an existing booking (mock) (simulating DELETE /bookings/{bookingId}).

    Args:
        bookingId (str): The unique ID of the booking to cancel.

    Returns:
        dict: Mocked response indicating cancellation or error.
    """
    data['status'] = 'canceled'
    return MOCK_CANCEL_BOOKING_RESPONSE

########################################
# 5. System Prompt (расширенный)
########################################

system_message = {
    "role": "system",
    "content": """
You are a helpful AI assistant for a car rental service. You can call several functions (tools) to fulfill user requests:

1. `get_available_cars`:
   - Use this when the user wants to see which cars are available for specific dates (and possibly locations).
   - Gather: pickupTime, dropoffTime, pickupLocation, dropoffLocation.

2. `create_booking`:
   - Use this when the user wants to make a new booking.
   - Gather: customerId, carId, pickupTime, dropoffTime, pickupLocation, dropoffLocation, and any extras (gps, childSeat, etc.).
   - After calling, if successful, provide the user with the booking ID.

3. `get_booking`:
   - Use this if the user wants to check details or status of an existing booking.
   - Gather: bookingId.

4. `update_booking`:
   - Use this if the user wants to modify an existing booking (change dates, add extras, etc.).
   - Gather: bookingId and any fields that need updating.

5. `cancel_booking`:
   - Use this if the user wants to cancel an existing booking.
   - Gather: bookingId.

6. `extract_parameters`:
   - Use this tool to parse or extract structured data from the user's text if needed.

General Instructions:
- - For the client you are communicating with in the current dialog, you know today's date and his customerId in advance: today's date is 3rd of March (Monday), customerId is "1abcd" 
- If the user’s intent is unclear, politely ask clarifying questions.
- For each function, ensure all required parameters are collected. If any are missing, politely ask the user to provide them.
- After calling a function, wait for the function response:
  - If successful, confirm the result to the user (e.g. 'Your booking is confirmed. The booking ID is X.').
  - If there is an error, politely inform the user and offer to re-check details or connect to a human operator.
- Always confirm user inputs before calling a function if there is any doubt or ambiguity.
- Use natural, conversational language and be polite and concise.
"""
}

########################################

def finalize_response(raw_llm_output: str, qna_model) -> str:
    """
    A secondary LLM call that removes intermediate “technical” information (e.g., JSON,
    system hints, internal tools output), from the response, leaving only the
    user-oriented message.

    :param raw_llm_output: The “raw” text that the agent returned (possibly including JSON).
    :param qna_model: The LLM model object (e.g. ChatOpenAI) that will filter the text.
    :return: The final “raw” text intended for the user.
    """

    filter_prompt = PromptTemplate(
        input_variables=['assistant_raw_text'],
        template="""
You are the post-processor of an assistant's output. You are given a “raw” answer, which may contain a lot of technical details 
(JSON, intermediate instructions, machine view of any tools output, internal tools output, debug lines).

**Your task**: the output should leave only coherent, user-understandable text in English, without:
- any mention of JSON, tools, keys, codes, internal “kitchen”;
- debugging comments and data structure in curly braces;
- system messages;
- unnecessary details and intermediate reasoning.

Keep the overall meaning and bottom line. If you need to restate some part for smoothness, do so.
Speak in a polite and friendly manner, but to the point.

Here's the raw text that needs to be filtered:
“{assistant_raw_text}”.

Reformat/clean it up so the user gets the final message:
"""
    )

    # Складываем промпт и модель в "цепочку"
    chain = filter_prompt | model

    # Запрашиваем у модели чистый текст
    response = chain.invoke({"assistant_raw_text": raw_llm_output})

    # Извлекаем текст из объекта AIMessage
    if isinstance(response, AIMessage):
        cleaned_text = response.content
    else:
        raise TypeError(f"Unexpected response type: {type(response)}")

    return cleaned_text.strip()

########################################
# 6. Создаём ReAct-агента
########################################

tools = [
    extract_parameters,
    get_available_cars,
    create_booking,
    get_booking,
    update_booking,
    cancel_booking
]

graph = create_react_agent(
    model,
    tools=tools
)

sticky_system_prompt = system_message
chat_history = {}

TELEGRAM_TOKEN = '7298645829:AAFXEewCSOzxh3Uppi07k-CGiJfsymambaU'

bot = telebot.TeleBot(TELEGRAM_TOKEN)

# Обработчик команды /start
@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    welcome_text = (
        "Welcome to the car reservation chat! What city would you like to rent a car in and on what dates?"
    )
    bot.reply_to(message, welcome_text)

# Обработчик текстовых сообщений
@bot.message_handler(func=lambda message: True, content_types=['text'])
def handle_message(message):
    # Флаг для отслеживания завершения обработки
    processing_done = threading.Event()

    # Функция для отправки промежуточного сообщения
    def send_intermediate():
        if not processing_done.is_set():
            try:
                bot.reply_to(message, "Wait a second...")
            except Exception as e:
                print(f"DEBUG: Error when sending an intermediate message: {e}")
    # Запускаем таймер на 2 секунды
    timer = threading.Timer(2.0, send_intermediate)
    timer.start()
    try:
        user_input = message.text
        user_id = message.chat.id
        if user_id not in chat_history.keys():
            chat_history[user_id] = [system_message]
        # Получаем ввод пользователя
        if user_input.lower() in ["end", "thx", "thank you"]:
            bot.reply_to(message, "Thank you! Bye!")

        # Добавляем сообщение пользователя в историю чата
        chat_history[user_id].append({"role": "user", "content": user_input})
        chat_history[user_id].insert(0, sticky_system_prompt)

        # Передаем историю чата агенту
        inputs = {"messages": chat_history[user_id]}

        # Получаем ответ от агента
        response = graph.stream(inputs, stream_mode="values")

        raw_agent_reply = ""  # Накопление "сырого" ответа агента

        for s in response:
            raw_reply = s["messages"][-1].content

            # Проверяем, если ответ пустой
            if not raw_reply.strip():
                # print("DEBUG: Empty reply from the agent.")
                continue

            raw_agent_reply += raw_reply

        # Добавляем "сырой" ответ агента в историю чата
        chat_history[user_id].append({"role": "assistant", "content": raw_agent_reply})

        # Используем finalize_response для фильтрации ответа перед отображением пользователю
        final_reply = finalize_response(raw_agent_reply, model)
        # Показываем пользователю только очищенный ответ
        timer.cancel()
        print(f"Агент: {final_reply}")
        bot.reply_to(message, final_reply)
    except Exception as e:
        processing_done.set()
        timer.cancel()
        print(f"DEBUG: Response filtering error: {e}")
        final_reply = "Sorry, there was an error processing the reply."
        bot.reply_to(message, final_reply)


# Запуск бота
if __name__ == '__main__':
    print("Бот запущен...")
    bot.infinity_polling()