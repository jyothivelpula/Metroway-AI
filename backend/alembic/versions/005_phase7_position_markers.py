"""Phase 7 indoor position markers.

Revision ID: 005_phase7
Revises: 004_phase4
Create Date: 2026-09-19
"""

from alembic import op
import sqlalchemy as sa

revision = "005_phase7"
down_revision = "004_phase4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "position_markers",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("station_id", sa.String(length=36), sa.ForeignKey("stations.id"), nullable=False),
        sa.Column("level_id", sa.String(length=36), sa.ForeignKey("station_levels.id"), nullable=False),
        sa.Column("node_id", sa.String(length=36), sa.ForeignKey("indoor_nodes.id"), nullable=False),
        sa.Column("marker_type", sa.String(length=40), nullable=False, server_default="QR"),
        sa.Column("marker_code", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="ACTIVE"),
        sa.Column("data_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("verification_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("last_verified_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_id", sa.String(length=36), sa.ForeignKey("sources.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("marker_code", name="uq_position_marker_code"),
        sa.UniqueConstraint("station_id", "node_id", "marker_type", name="uq_position_marker_node_type"),
    )
    op.create_index("ix_position_markers_station", "position_markers", ["station_id"])
    op.create_index("ix_position_markers_node", "position_markers", ["node_id"])


def downgrade() -> None:
    op.drop_index("ix_position_markers_node", table_name="position_markers")
    op.drop_index("ix_position_markers_station", table_name="position_markers")
    op.drop_table("position_markers")
