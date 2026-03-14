"""create all tables

Revision ID: 0001
Revises: 
Create Date: 2026-03-12

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
    )

    op.create_table(
        'models',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('base_model', sa.String(100), nullable=True),
        sa.Column('trained_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'poc',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('domain', sa.String(100), nullable=False),
        sa.Column('app_name', sa.String(100), nullable=False),
        sa.Column('model_id', sa.Integer(), nullable=True),
        sa.Column('default_system_prompt', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_name'),
        sa.ForeignKeyConstraint(['model_id'], ['models.id']),
    )

    op.create_table(
        'system_prompts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('poc_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('poc_id', 'version', name='uq_system_prompt_poc_version'),
        sa.ForeignKeyConstraint(['poc_id'], ['poc.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )

    op.create_table(
        'sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('poc_id', sa.Integer(), nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('system_prompt_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.Column('ended_at', sa.TIMESTAMP(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['poc_id'], ['poc.id']),
        sa.ForeignKeyConstraint(['system_prompt_id'], ['system_prompts.id']),
    )

    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )

    op.create_table(
        'datasets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )

    op.create_table(
        'conversation_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.SmallInteger(), nullable=False, server_default=sa.text('1')),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('answer', sa.Text(), nullable=True),
        sa.Column('expected_answer', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.Column('evaluation', sa.SmallInteger(), nullable=True),
        sa.Column('correct_parts', sa.Text(), nullable=True),
        sa.Column('incorrect_parts', sa.Text(), nullable=True),
        sa.Column('missing_parts', sa.Text(), nullable=True),
        sa.Column('priority', sa.SmallInteger(), nullable=True),
        sa.Column('training_role', sa.SmallInteger(), nullable=True),
        sa.Column('status', sa.SmallInteger(), nullable=False, server_default=sa.text('1')),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id']),
    )

    op.create_table(
        'conversation_log_datasets',
        sa.Column('log_id', sa.Integer(), nullable=False),
        sa.Column('dataset_id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('log_id', 'dataset_id'),
        sa.ForeignKeyConstraint(['log_id'], ['conversation_logs.id']),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.id']),
    )


def downgrade() -> None:
    op.drop_table('conversation_log_datasets')
    op.drop_table('conversation_logs')
    op.drop_table('datasets')
    op.drop_table('refresh_tokens')
    op.drop_table('sessions')
    op.drop_table('system_prompts')
    op.drop_table('poc')
    op.drop_table('models')
    op.drop_table('users')
