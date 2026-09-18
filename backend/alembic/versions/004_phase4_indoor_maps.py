"""Phase 4 indoor map tables.

Revision ID: 004_phase4
Revises: 003_phase3
Create Date: 2026-09-18
"""

from alembic import op
import sqlalchemy as sa

revision = "004_phase4"
down_revision = "003_phase3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "indoor_nodes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("station_id", sa.String(length=36), sa.ForeignKey("stations.id"), nullable=False),
        sa.Column("level_id", sa.String(length=36), sa.ForeignKey("station_levels.id"), nullable=False),
        sa.Column("node_code", sa.String(length=80), nullable=False),
        sa.Column("node_type", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("x", sa.Float(), nullable=True),
        sa.Column("y", sa.Float(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("accessible", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("data_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("verification_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("last_verified_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_id", sa.String(length=36), sa.ForeignKey("sources.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("station_id", "node_code", name="uq_indoor_nodes_station_code"),
    )
    op.create_index("ix_indoor_nodes_station", "indoor_nodes", ["station_id"])
    op.create_index("ix_indoor_nodes_level", "indoor_nodes", ["level_id"])

    op.create_table(
        "indoor_edges",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("station_id", sa.String(length=36), sa.ForeignKey("stations.id"), nullable=False),
        sa.Column("from_node_id", sa.String(length=36), sa.ForeignKey("indoor_nodes.id"), nullable=False),
        sa.Column("to_node_id", sa.String(length=36), sa.ForeignKey("indoor_nodes.id"), nullable=False),
        sa.Column("connection_type", sa.String(length=40), nullable=False),
        sa.Column("distance_m", sa.Float(), nullable=True),
        sa.Column("estimated_time_sec", sa.Integer(), nullable=True),
        sa.Column("accessible", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("bidirectional", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("data_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("verification_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("last_verified_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_id", sa.String(length=36), sa.ForeignKey("sources.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("station_id", "from_node_id", "to_node_id", "connection_type", name="uq_indoor_edge"),
        sa.CheckConstraint("from_node_id != to_node_id", name="ck_indoor_edge_not_self"),
    )
    op.create_index("ix_indoor_edges_station", "indoor_edges", ["station_id"])
    op.create_index("ix_indoor_edges_from", "indoor_edges", ["from_node_id"])
    op.create_index("ix_indoor_edges_to", "indoor_edges", ["to_node_id"])

    op.create_table(
        "map_metadata",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("station_id", sa.String(length=36), sa.ForeignKey("stations.id"), nullable=False),
        sa.Column("level_id", sa.String(length=36), sa.ForeignKey("station_levels.id"), nullable=False),
        sa.Column("map_type", sa.String(length=40), nullable=False, server_default="SCHEMATIC"),
        sa.Column("map_width", sa.Float(), nullable=False, server_default="100"),
        sa.Column("map_height", sa.Float(), nullable=False, server_default="100"),
        sa.Column("coordinate_system", sa.String(length=40), nullable=False, server_default="NORMALIZED_0_100"),
        sa.Column("map_version", sa.String(length=40), nullable=False, server_default="1"),
        sa.Column("data_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("verification_status", sa.String(length=40), nullable=False, server_default="DEVELOPMENT"),
        sa.Column("last_verified_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_id", sa.String(length=36), sa.ForeignKey("sources.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("station_id", "level_id", "map_type", name="uq_map_metadata_level"),
    )
    op.create_index("ix_map_metadata_station", "map_metadata", ["station_id"])


def downgrade() -> None:
    op.drop_index("ix_map_metadata_station", table_name="map_metadata")
    op.drop_table("map_metadata")
    op.drop_index("ix_indoor_edges_to", table_name="indoor_edges")
    op.drop_index("ix_indoor_edges_from", table_name="indoor_edges")
    op.drop_index("ix_indoor_edges_station", table_name="indoor_edges")
    op.drop_table("indoor_edges")
    op.drop_index("ix_indoor_nodes_level", table_name="indoor_nodes")
    op.drop_index("ix_indoor_nodes_station", table_name="indoor_nodes")
    op.drop_table("indoor_nodes")
