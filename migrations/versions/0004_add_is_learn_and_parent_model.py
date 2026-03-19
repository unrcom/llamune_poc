"""add is_learn to users and parent_model_id to models

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-18

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0004'
down_revision: Union[str, Sequence[str], None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users',
        sa.Column('is_learn', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )
    op.add_column('models',
        sa.Column('parent_model_id', sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        'fk_models_parent_model_id',
        'models', 'models',
        ['parent_model_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_models_parent_model_id', 'models', type_='foreignkey')
    op.drop_column('models', 'parent_model_id')
    op.drop_column('users', 'is_learn')
