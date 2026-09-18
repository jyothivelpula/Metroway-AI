"""Phase 3 connection metadata.

Revision ID: 003_phase3
Revises: 002_phase3
Create Date: 2026-09-18
"""

from alembic import op
import sqlalchemy as sa

revision = "003_phase3"
down_revision = "002_phase3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("station_connections") as batch:
        batch.add_column(sa.Column("sequence_order", sa.Integer(), nullable=True))
        batch.add_column(
            sa.Column("is_bidirectional", sa.Boolean(), nullable=False, server_default=sa.true())
        )
        batch.add_column(
            sa.Column("data_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT")
        )
        batch.add_column(sa.Column("last_verified_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("station_connections") as batch:
        batch.drop_column("notes")
        batch.drop_column("last_verified_date")
        batch.drop_column("data_status")
        batch.drop_column("is_bidirectional")
        batch.drop_column("sequence_order")
