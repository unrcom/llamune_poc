from sqlalchemy import create_engine, Column, Integer, String, Text, SmallInteger, TIMESTAMP, Boolean
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


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Model(Base):
    __tablename__ = "models"
    id = Column(Integer, primary_key=True)
    model_name = Column(String(100), nullable=False)
    version = Column(Integer, nullable=False, server_default=sa.text("1"), default=1)
    base_model = Column(String(100))
    adapter_path = Column(String(500), nullable=True)
    parent_model_id = Column(Integer, ForeignKey("models.id"), nullable=True)
    trained_at = Column(TIMESTAMP)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Poc(Base):
    __tablename__ = "poc"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    domain = Column(String(100), nullable=False)
    app_name = Column(String(100), nullable=False, unique=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=True)
    default_system_prompt = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    poc_id = Column(Integer, ForeignKey("poc.id"), nullable=False)
    system_prompt = Column(Text)
    started_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    system_prompt_id = Column(Integer, ForeignKey("system_prompts.id"), nullable=True)
    ended_at = Column(TIMESTAMP)


class ConversationLog(Base):
    __tablename__ = "conversation_logs"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    type = Column(SmallInteger, nullable=False, default=1)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    expected_answer = Column(Text, nullable=True)
    timestamp = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    evaluation = Column(SmallInteger, nullable=True)
    correct_parts = Column(Text, nullable=True)
    incorrect_parts = Column(Text, nullable=True)
    missing_parts = Column(Text, nullable=True)
    priority = Column(SmallInteger, nullable=True)
    training_role = Column(SmallInteger, nullable=True)
    status = Column(SmallInteger, nullable=False, default=1)
    memo = Column(Text, nullable=True)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), nullable=False, unique=True)
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_system = Column(Boolean, nullable=False, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class ConversationLogDataset(Base):
    __tablename__ = "conversation_log_datasets"
    log_id = Column(Integer, ForeignKey("conversation_logs.id"), primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), primary_key=True)


class SystemPrompt(Base):
    __tablename__ = "system_prompts"
    id = Column(Integer, primary_key=True)
    poc_id = Column(Integer, ForeignKey("poc.id"), nullable=False)
    content = Column(Text, nullable=False)
    version = Column(Integer, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True)
    poc_id = Column(Integer, ForeignKey("poc.id"), nullable=False)
    name = Column(String(100), nullable=False)
    system_prompt_id = Column(Integer, ForeignKey("system_prompts.id"), nullable=True)
    status = Column(SmallInteger, nullable=False, default=1)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    executed_at = Column(TIMESTAMP, nullable=True)


class WorkflowQuestion(Base):
    __tablename__ = "workflow_questions"
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    order_index = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=True)
    log_id = Column(Integer, ForeignKey("conversation_logs.id"), nullable=True)
    status = Column(SmallInteger, nullable=False, default=1)
