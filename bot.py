import os
import pickle
import openai
import telebot
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
import pandas as pd
import json
from pyprojroot import here
from dotenv import load_dotenv
import os
import httpx
import chromadb
from chromadb.utils import embedding_functions
from langchain import LLMChain, PromptTemplate
import numpy as np
import numpy as np
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

########################################
# 1. Тестовые данные (пример из /api/Availability и т.д.)
########################################

MOCK_AVAILABILITY_RESPONSE = [
  {
    "model": {
      "id": 87,
      "name": "Aygo",
      "description": "Great choice for small family's",
      "sipp": "EDMV",
      "brand": "Toyota",
      "category": {
        "id": 1,
        "order": 0,
        "name": "Small"
      },
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
    "ilimitedKm": True
  }
]

MOCK_CREATE_BOOKING_RESPONSE = {
  "bookingId": "mock-booking-123",
  "status": "confirmed",
  "confirmationNumber": "CONF-999999",
  "totalPrice": 272.55,
  "currency": "USD",
  "createdAt": "2025-03-01T12:00:00Z"
}

MOCK_GET_BOOKING_RESPONSE = {
  "bookingId": "mock-booking-123",
  "customerId": "cust001",
  "carId": "car123",
  "pickupLocation": "Miami International Airport",
  "dropoffLocation": "Miami International Airport",
  "pickupTime": "2025-03-10T10:00:00Z",
  "dropoffTime": "2025-03-15T10:00:00Z",
  "status": "confirmed",
  "extras": {
    "gps": True,
    "childSeat": False
  },
  "createdAt": "2025-03-01T12:00:00Z"
}

MOCK_UPDATE_BOOKING_RESPONSE = {
  "bookingId": "mock-booking-123",
  "status": "updated"
}

MOCK_CANCEL_BOOKING_RESPONSE = {
  "bookingId": "mock-booking-123",
  "status": "canceled"
}

########################################
# 2. Настройка OpenAI (пустая, т.к. нет реального ключа)
########################################

load_dotenv()

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
def extract_parameters(user_query: str, jargon_text: str = "") -> dict:
    """
    Extract parameters from the user query using an LLM.

    Args:
        user_query (str): The query provided by the user.
        jargon_text (str): A list of jargon terms or guidelines.

    Returns:
        dict: A dictionary containing the extracted parameters (pickupTime, dropoffTime, gps, etc.).
    """
    prompt_template = PromptTemplate(
        input_variables=['user_input', 'jargon_text'],
        template="""
Ты — помощник, который извлекает параметры для бронирования автомобилей из текста пользователя.
Вот текст пользователя: {user_input}
Вот список возможных полей (jargon): {jargon_text}

Выведи JSON c ключами (например, pickupTime, dropoffTime, gps, carId, customerId, и т.д.).
Если данных нет — выводи null или пустые поля.
"""
    )
    chain = LLMChain(prompt=prompt_template, llm=model)
    response = chain.run({"user_input": user_query, "jargon_text": jargon_text})

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
    # Возвращаем тестовый ответ
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


########################################

def finalize_response(raw_llm_output: str, qna_model) -> str:
    """
    Вторичный вызов LLM, который убирает промежуточную «техническую» информацию (например, JSON,
    системные подсказки, вывод внутренних tools), из ответа, оставляя только
    пользовательски-ориентированное сообщение.

    :param raw_llm_output: "Сырой" текст, который вернул агент (возможно, включает JSON).
    :param qna_model: Объект LLM-модели (например, ChatOpenAI), который будет фильтровать текст.
    :return: Финальный "чистый" текст, предназначенный для пользователя.
    """

    filter_prompt = PromptTemplate(
        input_variables=['assistant_raw_text'],
        template="""
Ты — постпроцессор вывода ассистента. Тебе даётся "сырой" ответ, в котором может быть много технических подробностей 
(JSON, промежуточные инструкции, машинный вид вывода любых tools, вывод внутренних tools (extract_parameters, merge_params и т. д.), отладочные строки).

**Твоя задача**: на выходе должен остаться только связный, понятный пользователю текст на русском языке, без:
- любых упоминаний о JSON, инструментах, ключах, кодах, внутренней "кухне";
- отладочных комментариев и структуры данных в фигурных скобках;
- системных сообщений;
- лишних деталей и промежуточных рассуждений.

Сохрани общий смысл и итоговый вывод. Если надо переформулировать какую-то часть для плавности — сделай это.
Говори вежливо и дружелюбно, но по делу.

Вот сырой текст, который нужно отфильтровать:
"{assistant_raw_text}"

Переформатируй/почисти, чтобы пользователь получил итоговое сообщение:
"""
    )

    # Складываем промпт и модель в "цепочку"
    chain = filter_prompt | model_chat

    # Запрашиваем у модели чистый текст
    response = chain.invoke({"assistant_raw_text": raw_llm_output})

    # Извлекаем текст из объекта AIMessage
    if isinstance(response, AIMessage):
        cleaned_text = response.content
    else:
        raise TypeError(f"Unexpected response type: {type(response)}")

    return cleaned_text.strip()

########################################

system_message = {
    "role": "system",
    "content": """
You are an intelligent assistant helping users find information about products in a database. You always communicate in Russian.

1. Your main goal is to tell the user about the products with their prices found in the database at the user's request that the user needs.
2. Refine the user's request in case you have too many suitable items in between.
3. Inform about replenishment, creation, filling of the user's order cart.

Mandatory rules for using tools to place an order to a user:
1. When a user makes an initial request for a product of interest, always use the 'extract_parameters' tool to normalize the request.
2. ALWAYS use the exact output - dict "params" from the 'extract_parameters' tool without modification when sending it to the 'rag_search_products' tool. This ensures consistency and prevents validation errors. Don't change **None** from the values of output dict from 'extract_parameters' tool to **null**.  
3. When a user makes an initial query about products of interest, the initial semantic search with the 'rag_search_products' tool is performed on 'personal_collection'.
4. If the number of matching results from the 'rag_search_products' tool is 0 in 'personal_collection' or 'temporary_collection', initiate a search with the 'rag_search_products' tool in 'price_list_collection'.
5. If the number of matching results from the 'rag_search_products' tool is 0 in the 'price_list_collection', inform the user that the product is out of stock.
6. If the number of matching results from the 'rag_search_products' tool is between 1 and 5 in any collection where you are searching, use the 'get_prices' tool. Once you have prices for the items found that match the user's query, offer them all to the user.
7. If the number of matching results from the 'rag_search_products' tool is greater than 5 in any collection where you search, ask the user to specify 1 or 2 parameters that are null in the normalized form for the product of interest.
8. After the user has refined some parameters, use the 'extract_parameters' tool to normalize the query again.
9. After the user has refined some parameters and you have normalized them, initiate the 'merge_params' tool to combine the current non-null parameters with the ones the user has just refined.
10. With the updated parameters after refinement, initiate the 'rag_search_products' tool with the 'temporary_collection' string as the second argument.
11. Use the exact output from the 'merge_params' tool without modification when sending it to the 'rag_search_products' tool. This ensures consistency and prevents validation errors.
12. Using 'add_to_cart' and 'calculate_total_price', based on the user's desires, assemble their shopping cart and give the order total.
13. Once the user has added everything they want to the cart, use the 'determine_delivery_days' tool to determine the delivery day for each product in the user's cart based on their region and the current time of interaction.
"""
}

# Define the tools available for the chatbot
tools = [extract_parameters, rag_search_products, merge_params, get_prices, add_to_cart, calculate_total_price, determine_delivery_days]

# Create the ReAct agent using the prebuilt function
graph = create_react_agent(model, tools=tools)

sticky_system_prompt = system_message
chat_history = {}



bot = telebot.TeleBot('7298645829:AAFXEewCSOzxh3Uppi07k-CGiJfsymambaU')

# Функция для поиска релевантных документов
def retrieve(query, top_k=3):
    retrieved_docs = []
    return retrieved_docs


# Обработчик команды /start
@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    welcome_text = (
        "Здравствуйте! Это Кристина, Компания ВТД. Что бы вы хотели заказать?"
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
                bot.reply_to(message, "Минуточку...")
            except Exception as e:
                print(f"DEBUG: Ошибка при отправке промежуточного сообщения: {e}")
    # Запускаем таймер на 2 секунды
    timer = threading.Timer(2.0, send_intermediate)
    timer.start()
    try:
        user_input = message.text
        user_id = message.chat.id
        if user_id not in chat_history.keys():
            chat_history[user_id] = [system_message]
        # Получаем ввод пользователя
        if user_input.lower() in ["завершить", "стоп", "выход"]:
            bot.reply_to(message, "Спасибо за ваш заказ!")

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
        print(f"DEBUG: Ошибка фильтрации ответа: {e}")
        final_reply = "Извините, произошла ошибка при обработке ответа."
        bot.reply_to(message, final_reply)


# Запуск бота
if __name__ == '__main__':
    print("Бот запущен...")
    bot.infinity_polling()