from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .config import settings

try:
    from neo4j import GraphDatabase
except Exception:  # pragma: no cover - import guard for optional environments
    GraphDatabase = None


@dataclass
class GraphAdapter:
    driver: Any | None
    enabled: bool
    provider: str

    @classmethod
    def from_settings(cls) -> "GraphAdapter":
        if not settings.graph_database_url:
            return cls(driver=None, enabled=False, provider="none")
        if not settings.graph_database_url.startswith(("neo4j://", "bolt://", "neo4j+s://")):
            return cls(driver=None, enabled=False, provider="unsupported")
        if GraphDatabase is None:
            return cls(driver=None, enabled=False, provider="neo4j-driver-missing")
        driver = GraphDatabase.driver(settings.graph_database_url)
        return cls(driver=driver, enabled=True, provider="neo4j")

    def upsert_application_instance(
        self, application_id: str, instance_id: str, environment_type: str, tenant_id: str
    ) -> None:
        if not self.enabled or self.driver is None:
            return
        query = """
        MERGE (a:Application {id: $application_id})
        MERGE (i:Instance {id: $instance_id})
        SET i.environment = $environment_type, i.tenant_id = $tenant_id
        MERGE (a)-[:HAS_INSTANCE]->(i)
        """
        with self.driver.session() as session:
            session.run(
                query,
                application_id=application_id,
                instance_id=instance_id,
                environment_type=environment_type,
                tenant_id=tenant_id,
            )


graph_adapter = GraphAdapter.from_settings()
