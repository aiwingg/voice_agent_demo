import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# Импортируем необходимые функции (инструменты)
from langchain_core.tools import tool
from langchain import LLMChain, PromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import AIMessage

# Загрузка переменных окружения
# load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Инициализируем LLM
model = ChatOpenAI(
    api_key=OPENAI_API_KEY,
    model_name="gpt-4o",
    temperature=0.0
)

# Тестовые данные (mock-ответы)
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

##############################################
# 1. Инструмент: извлечение параметров (LLM)
##############################################
@tool
def extract_parameters(user_query: str, jargon_text: str = "") -> dict:
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

##############################################
# 2. Инструменты для работы с бронированиями (Mock)
##############################################
@tool
def get_available_cars(
    pickupTime: str,
    dropoffTime: str,
    pickupLocation: str = None,
    dropoffLocation: str = None
) -> dict:
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
    return MOCK_CREATE_BOOKING_RESPONSE

@tool
def get_booking(bookingId: str) -> dict:
    return MOCK_GET_BOOKING_RESPONSE

@tool
def update_booking(
    bookingId: str,
    pickupTime: str = None,
    dropoffTime: str = None,
    gps: bool = None,
    childSeat: bool = None
) -> dict:
    return MOCK_UPDATE_BOOKING_RESPONSE

@tool
def cancel_booking(bookingId: str) -> dict:
    return MOCK_CANCEL_BOOKING_RESPONSE

##############################################
# 3. Функция для финализации ответа (очистка вывода)
##############################################
def finalize_response(raw_llm_output: str) -> str:
    filter_prompt = PromptTemplate(
        input_variables=['assistant_raw_text'],
        template="""
Ты — постпроцессор вывода ассистента. Тебе даётся "сырой" ответ, в котором может быть много технических подробностей.
Извлеки только понятное пользователю сообщение на русском языке без технических деталей.

Вот сырой текст: "{assistant_raw_text}"

Выведи итоговый, чистый текст:
"""
    )
    chain = LLMChain(prompt=filter_prompt, llm=model)
    response = chain.run({"assistant_raw_text": raw_llm_output})
    try:
        # Если вывод в формате AIMessage
        if isinstance(response, AIMessage):
            cleaned_text = response.content
        else:
            cleaned_text = response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return cleaned_text.strip()

##############################################
# 4. Создаём FastAPI-сервис
##############################################
app = FastAPI(title="Car Rental Tools API")

# Модели запросов для каждого эндпоинта
class ExtractParametersRequest(BaseModel):
    user_query: str
    jargon_text: str = ""

class GetAvailableCarsRequest(BaseModel):
    pickupTime: str
    dropoffTime: str
    pickupLocation: str = None
    dropoffLocation: str = None

class CreateBookingRequest(BaseModel):
    customerId: str
    carId: str
    pickupLocation: str
    dropoffLocation: str
    pickupTime: str
    dropoffTime: str
    gps: bool = False
    childSeat: bool = False

class GetBookingRequest(BaseModel):
    bookingId: str

class UpdateBookingRequest(BaseModel):
    bookingId: str
    pickupTime: str = None
    dropoffTime: str = None
    gps: bool = None
    childSeat: bool = None

class CancelBookingRequest(BaseModel):
    bookingId: str

# Эндпоинты для каждого инструмента
@app.post("/extract_parameters")
def api_extract_parameters(req: ExtractParametersRequest):
    try:
        result = extract_parameters(req.user_query, req.jargon_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_available_cars")
def api_get_available_cars(req: GetAvailableCarsRequest):
    try:
        result = get_available_cars(
            pickupTime=req.pickupTime,
            dropoffTime=req.dropoffTime,
            pickupLocation=req.pickupLocation,
            dropoffLocation=req.dropoffLocation
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/create_booking")
def api_create_booking(req: CreateBookingRequest):
    try:
        result = create_booking(
            customerId=req.customerId,
            carId=req.carId,
            pickupLocation=req.pickupLocation,
            dropoffLocation=req.dropoffLocation,
            pickupTime=req.pickupTime,
            dropoffTime=req.dropoffTime,
            gps=req.gps,
            childSeat=req.childSeat
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_booking")
def api_get_booking(req: GetBookingRequest):
    try:
        result = get_booking(req.bookingId)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update_booking")
def api_update_booking(req: UpdateBookingRequest):
    try:
        result = update_booking(
            bookingId=req.bookingId,
            pickupTime=req.pickupTime,
            dropoffTime=req.dropoffTime,
            gps=req.gps,
            childSeat=req.childSeat
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cancel_booking")
def api_cancel_booking(req: CancelBookingRequest):
    try:
        result = cancel_booking(req.bookingId)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Пример эндпоинта для финализации ответа
class FinalizeResponseRequest(BaseModel):
    raw_llm_output: str

@app.post("/finalize_response")
def api_finalize_response(req: FinalizeResponseRequest):
    try:
        result = finalize_response(req.raw_llm_output)
        return {"final_response": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Запуск сервиса
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)