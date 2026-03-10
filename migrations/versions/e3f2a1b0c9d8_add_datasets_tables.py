"""add datasets tables

Revision ID: e3f2a1b0c9d8
Revises: d4a15c50e68a
Create Date: 2026-03-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3f2a1b0c9d8'
down_revision: Union[str, Sequence[str], None] = 'd4a15c50e68a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('datasets',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('conversation_log_datasets',
    sa.Column('log_id', sa.Integer(), nullable=False),
    sa.Column('dataset_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['dataset_id'], ['datasets.id'], ),
    sa.ForeignKeyConstraint(['log_id'], ['conversation_logs.id'], ),
    sa.PrimaryKeyConstraint('log_id', 'dataset_id')
    )


def downgrade() -> None:
    op.drop_table('conversation_log_datasets')
    op.drop_table('datasets')
