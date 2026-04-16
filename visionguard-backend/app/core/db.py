import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/visionguard")

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    # This creates the tables based on the models above
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session