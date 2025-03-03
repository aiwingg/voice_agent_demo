import os
import json
from datetime import datetime
from typing import Optional, List, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


# ---------------------------
# 1. Тестовые данные (Mock)
# ---------------------------
MOCK_AVAILABILITY_RESPONSE = [
    {
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
    "extras": {"gps": True, "childSeat": False},
    "createdAt": "2025-03-01T12:00:00Z"
}

MOCK_UPDATE_BOOKING_RESPONSE = {"bookingId": "mock-booking-123", "status": "updated"}
MOCK_CANCEL_BOOKING_RESPONSE = {"bookingId": "mock-booking-123", "status": "canceled"}

# ---------------------------
# 2. Модели запросов и ответов
# ---------------------------
class ExtractParametersRequest(BaseModel):
    user_query: str

class GetAvailableCarsRequest(BaseModel):
    pickupTime: str
    dropoffTime: str
    pickupLocation: Optional[str] = None
    dropoffLocation: Optional[str] = None

class CreateBookingRequest(BaseModel):
    customerId: str
    carId: str
    pickupLocation: str
    dropoffLocation: str
    pickupTime: str
    dropoffTime: str
    gps: Optional[bool] = False
    childSeat: Optional[bool] = False

class GetBookingRequest(BaseModel):
    bookingId: str

class UpdateBookingRequest(BaseModel):
    bookingId: str
    pickupTime: Optional[str] = None
    dropoffTime: Optional[str] = None
    gps: Optional[bool] = None
    childSeat: Optional[bool] = None

class CancelBookingRequest(BaseModel):
    bookingId: str

class FinalizeResponseRequest(BaseModel):
    raw_llm_output: str

# ---------------------------
# 3. Реализация инструментов
# ---------------------------
# Функция имитации извлечения параметров (использование LLM не реализовано, возвращается тестовый JSON)
def extract_parameters_logic(user_query: str) -> dict:
    # Здесь может быть вызов LLM через модель
    try:
        parsed = json.loads(user_query)
    except json.JSONDecodeError:
        parsed = {"user_query": user_query}
    # Преобразуем 'null' в None
    for k, v in parsed.items():
        if v == 'null':
            parsed[k] = None
    return parsed

def get_available_cars_logic(
    pickupTime: str,
    dropoffTime: str,
    pickupLocation: Optional[str] = None,
    dropoffLocation: Optional[str] = None
) -> Any:
    # Для упрощения возвращаем всегда тестовые данные
    return MOCK_AVAILABILITY_RESPONSE

def create_booking_logic(
    customerId: str,
    carId: str,
    pickupLocation: str,
    dropoffLocation: str,
    pickupTime: str,
    dropoffTime: str,
    gps: bool = False,
    childSeat: bool = False
) -> Any:
    return MOCK_CREATE_BOOKING_RESPONSE

def get_booking_logic(bookingId: str) -> Any:
    return MOCK_GET_BOOKING_RESPONSE

def update_booking_logic(
    bookingId: str,
    pickupTime: Optional[str] = None,
    dropoffTime: Optional[str] = None,
    gps: Optional[bool] = None,
    childSeat: Optional[bool] = None
) -> Any:
    return MOCK_UPDATE_BOOKING_RESPONSE

def cancel_booking_logic(bookingId: str) -> Any:
    return MOCK_CANCEL_BOOKING_RESPONSE

# Функция для постобработки ответа LLM (здесь реализована имитация)
def finalize_response_logic(raw_llm_output: str) -> str:
    # Здесь можно добавить фильтрацию технических деталей
    # Для примера просто убираем фигурные скобки
    cleaned = raw_llm_output.replace("{", "").replace("}", "")
    return cleaned.strip()

# ---------------------------
# 4. Создание FastAPI приложения и маршрутов
# ---------------------------
app = FastAPI(title="Car Rental Tools API")

@app.post("/extract_parameters")
def extract_parameters_endpoint(req: ExtractParametersRequest):
    result = extract_parameters_logic(req.user_query)
    return result

@app.post("/get_available_cars")
def get_available_cars_endpoint(req: GetAvailableCarsRequest):
    result = get_available_cars_logic(
        pickupTime=req.pickupTime,
        dropoffTime=req.dropoffTime,
        pickupLocation=req.pickupLocation,
        dropoffLocation=req.dropoffLocation
    )
    return result

@app.post("/create_booking")
def create_booking_endpoint(req: CreateBookingRequest):
    result = create_booking_logic(
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

@app.post("/get_booking")
def get_booking_endpoint(req: GetBookingRequest):
    result = get_booking_logic(req.bookingId)
    return result

@app.post("/update_booking")
def update_booking_endpoint(req: UpdateBookingRequest):
    result = update_booking_logic(
        bookingId=req.bookingId,
        pickupTime=req.pickupTime,
        dropoffTime=req.dropoffTime,
        gps=req.gps,
        childSeat=req.childSeat
    )
    return result

@app.post("/cancel_booking")
def cancel_booking_endpoint(req: CancelBookingRequest):
    result = cancel_booking_logic(req.bookingId)
    return result

@app.post("/finalize_response")
def finalize_response_endpoint(req: FinalizeResponseRequest):
    result = finalize_response_logic(req.raw_llm_output)
    return {"final_message": result}

# ---------------------------
# 5. Точка входа
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
