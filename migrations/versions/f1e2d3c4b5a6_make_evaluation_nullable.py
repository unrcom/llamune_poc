"""make evaluation nullable

Revision ID: f1e2d3c4b5a6
Revises: e3f2a1b0c9d8
Create Date: 2026-03-10 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f1e2d3c4b5a6'
down_revision: Union[str, Sequence[str], None] = 'e3f2a1b0c9d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('conversation_logs', 'evaluation',
        existing_type=sa.SmallInteger(),
        nullable=True
    )
    # 既存の evaluation=1 (デフォルト値として入っていたもの) を null に更新
    op.execute("UPDATE conversation_logs SET evaluation = NULL WHERE evaluation = 1")


def downgrade() -> None:
    op.execute("UPDATE conversation_logs SET evaluation = 1 WHERE evaluation IS NULL")
    op.alter_column('conversation_logs', 'evaluation',
        existing_type=sa.SmallInteger(),
        nullable=False
    )
