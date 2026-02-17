from sqlalchemy import create_engine, Column, Integer, String, Text, SmallInteger, TIMESTAMP
import sqlalchemy as sa
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from sqlalchemy import ForeignKey
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Base = declarative_base()


class Poc(Base):
    __tablename__ = "poc"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    domain = Column(String(100), nullable=False)
    default_system_prompt = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), nullable=False, unique=True)
    api_key = Column(String(64), nullable=False, unique=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Model(Base):
    __tablename__ = "models"
    id = Column(Integer, primary_key=True)
    model_name = Column(String(100), nullable=False)
    version = Column(Integer, nullable=False, server_default=sa.text("1"), default=1)
    base_model = Column(String(100))
    trained_at = Column(TIMESTAMP)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    poc_id = Column(Integer, ForeignKey("poc.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    system_prompt = Column(Text)
    started_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    ended_at = Column(TIMESTAMP)


class ConversationLog(Base):
    __tablename__ = "conversation_logs"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    evaluation = Column(SmallInteger, nullable=False)
    reason = Column(Text)
    correct_answer = Column(Text)
    priority = Column(SmallInteger)
    status = Column(SmallInteger, nullable=False, default=1)
    memo = Column(Text)
