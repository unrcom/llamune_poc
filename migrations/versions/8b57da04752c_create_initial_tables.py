"""create initial tables

Revision ID: 8b57da04752c
Revises: 
Create Date: 2026-03-06

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '8b57da04752c'
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
        'sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('poc_id', sa.Integer(), nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('started_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.Column('ended_at', sa.TIMESTAMP(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['poc_id'], ['poc.id']),
    )

    op.create_table(
        'conversation_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.Column('evaluation', sa.SmallInteger(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=True),
        sa.Column('priority', sa.SmallInteger(), nullable=True),
        sa.Column('status', sa.SmallInteger(), nullable=False, server_default=sa.text('1')),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id']),
    )


def downgrade() -> None:
    op.drop_table('conversation_logs')
    op.drop_table('sessions')
    op.drop_table('poc')
    op.drop_table('models')
    op.drop_table('users')
