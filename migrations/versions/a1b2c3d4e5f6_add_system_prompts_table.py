"""add system_prompts table

Revision ID: a1b2c3d4e5f6
Revises: f1e2d3c4b5a6
Create Date: 2026-03-10 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f1e2d3c4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('system_prompts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('poc_id', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['poc_id'], ['poc.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('poc_id', 'version', name='uq_system_prompt_poc_version')
    )
    op.add_column('sessions',
        sa.Column('system_prompt_id', sa.Integer(), sa.ForeignKey('system_prompts.id'), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('sessions', 'system_prompt_id')
    op.drop_table('system_prompts')
