"""Phase 3 network connection graph.

Revision ID: 002_phase3
Revises: 001_phase2
Create Date: 2026-09-17
"""

from alembic import op
import sqlalchemy as sa

revision = "002_phase3"
down_revision = "001_phase2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "station_connections",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("from_station_id", sa.String(length=36), sa.ForeignKey("stations.id"), nullable=False),
        sa.Column("to_station_id", sa.String(length=36), sa.ForeignKey("stations.id"), nullable=False),
        sa.Column("line_id", sa.String(length=36), sa.ForeignKey("lines.id"), nullable=False),
        sa.Column("sequence_from", sa.Integer(), nullable=False),
        sa.Column("sequence_to", sa.Integer(), nullable=False),
        sa.Column("connection_type", sa.String(length=40), nullable=False, server_default="NEXT_STATION"),
        sa.Column("distance", sa.Float(), nullable=True),
        sa.Column("distance_unit", sa.String(length=20), nullable=True),
        sa.Column("estimated_travel_time", sa.Integer(), nullable=True),
        sa.Column("direction", sa.String(length=120), nullable=True),
        sa.Column("is_interchange", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_terminal", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verification_status", sa.String(length=40), nullable=False, server_default="DEMO"),
        sa.Column("source_id", sa.String(length=36), sa.ForeignKey("sources.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("from_station_id", "to_station_id", "line_id", name="uq_station_connection"),
    )
    op.create_index("ix_station_connections_from", "station_connections", ["from_station_id"])
    op.create_index("ix_station_connections_to", "station_connections", ["to_station_id"])
    op.create_index("ix_station_connections_line", "station_connections", ["line_id"])
    op.create_index("ix_station_lines_line_sequence", "station_lines", ["line_id", "sequence_number"])
    op.create_index("ix_station_lines_station", "station_lines", ["station_id"])


def downgrade() -> None:
    op.drop_index("ix_station_lines_station", table_name="station_lines")
    op.drop_index("ix_station_lines_line_sequence", table_name="station_lines")
    op.drop_index("ix_station_connections_line", table_name="station_connections")
    op.drop_index("ix_station_connections_to", table_name="station_connections")
    op.drop_index("ix_station_connections_from", table_name="station_connections")
    op.drop_table("station_connections")
