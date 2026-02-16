"""add server_default to version

Revision ID: eb78023a00e4
Revises: 98edc9de10ea
Create Date: 2026-02-16

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'eb78023a00e4'
down_revision: Union[str, None] = '98edc9de10ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.alter_column('models', 'version',
        existing_type=sa.Integer(),
        server_default=sa.text('1'),
        nullable=False
    )

def downgrade() -> None:
    op.alter_column('models', 'version',
        existing_type=sa.Integer(),
        server_default=None,
        nullable=False
    )
