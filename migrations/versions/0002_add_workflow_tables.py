"""add workflow tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'workflows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('poc_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('system_prompt_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.SmallInteger(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.Column('executed_at', sa.TIMESTAMP(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['poc_id'], ['poc.id']),
        sa.ForeignKeyConstraint(['system_prompt_id'], ['system_prompts.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )

    op.create_table(
        'workflow_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('expected_answer', sa.Text(), nullable=True),
        sa.Column('log_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.SmallInteger(), nullable=False, server_default=sa.text('1')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id']),
        sa.ForeignKeyConstraint(['log_id'], ['conversation_logs.id']),
    )


def downgrade() -> None:
    op.drop_table('workflow_questions')
    op.drop_table('workflows')
