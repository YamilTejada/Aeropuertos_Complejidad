from pydantic import BaseModel

class Airport (BaseModel):
    iata:str
    name:str
    city:str
    country:str
    latitude:float
    longitude:float

class Route (BaseModel):
    id:int
    source_airport:str
    destination_airport:str 
    distance_km:float
