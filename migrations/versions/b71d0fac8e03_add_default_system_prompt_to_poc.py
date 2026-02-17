"""add default_system_prompt to poc

Revision ID: b71d0fac8e03
Revises: eb78023a00e4
Create Date: 2026-02-17 18:11:26.570256

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b71d0fac8e03'
down_revision: Union[str, Sequence[str], None] = 'eb78023a00e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('poc', sa.Column('default_system_prompt', sa.Text(), nullable=True))

def downgrade() -> None:
    op.drop_column('poc', 'default_system_prompt')
