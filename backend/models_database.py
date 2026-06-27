from sqlalchemy import Column,Integer,String,Float
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base() #Sirve para crear la tabla de la base de datos

class Airport(Base):

    __tablename__ = "airports"  #Nombre de la tabla de la base de datos

    iata = Column(String,primary_key=True,index=True)
    name = Column(String)
    city = Column(String)
    country = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)

class Route(Base):

    __tablename__ = "routes"  #Nombre de la tabal de la base de datos

    id = Column(Integer,primary_key=True,index=True)
    source_airport = Column(String)
    destination_airport = Column(String) 
    distance_km = Column(Float)
