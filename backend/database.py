import os #Trabajar con los archivos del SO (Nos servirá para trabajar .env)
from dotenv import load_dotenv #Buscar archivo .env

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Cargar las variables de entorno del archivo .env
load_dotenv()

USER = os.getenv("DB_USER")
PASSWORD = os.getenv("DB_PASSWORD")
HOST = os.getenv("DB_HOST")
PORT = os.getenv("DB_PORT")
DBNAME = os.getenv("DB_NAME")

# 2. Construir la URL de conexión segura
DATABASE_URL = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}?sslmode=require"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



