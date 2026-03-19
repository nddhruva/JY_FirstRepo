"""branding dashboard and reports

Revision ID: 0002_branding_dashboard_reports
Revises: 0001_initial_schema
Create Date: 2026-03-19 00:15:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_branding_dashboard_reports"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "branding_configs",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("brand_name", sa.String(length=255), nullable=True),
        sa.Column("color_palette", sa.JSON(), nullable=False),
        sa.Column("fonts", sa.JSON(), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("background_image_url", sa.Text(), nullable=True),
        sa.Column("custom_css", sa.Text(), nullable=True),
        sa.Column("assets", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("tenant_id"),
    )

    op.create_table(
        "dashboard_configs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("layout", sa.JSON(), nullable=False),
        sa.Column("widgets", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_dashboard_configs_tenant_id"), "dashboard_configs", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_dashboard_configs_user_id"), "dashboard_configs", ["user_id"], unique=False)

    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("mode", sa.String(length=64), nullable=False),
        sa.Column("request_payload", sa.JSON(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("visualizations", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reports_tenant_id"), "reports", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reports_tenant_id"), table_name="reports")
    op.drop_table("reports")
    op.drop_index(op.f("ix_dashboard_configs_user_id"), table_name="dashboard_configs")
    op.drop_index(op.f("ix_dashboard_configs_tenant_id"), table_name="dashboard_configs")
    op.drop_table("dashboard_configs")
    op.drop_table("branding_configs")
