docker_compose("docker-compose.yml")

docker_build(
    "mind-melder-api",
    context=".",
    dockerfile="apps/api/Dockerfile",
    ignore=["**/node_modules", "**/.turbo", "**/.git"],
)

docker_build(
    "mind-melder-web",
    context=".",
    dockerfile="apps/web/Dockerfile",
    ignore=["**/node_modules", "**/.turbo", "**/.git"],
)

dc_resource("postgres", labels=["Database"])
dc_resource("api", labels=["Backend"], resource_deps=["postgres"], links=["http://localhost:3000/health"])
dc_resource("web", labels=["UI"], resource_deps=["api"], links=["http://localhost:8080"])

local_resource(
    "script-clear-db",
    cmd="./scripts/clear-db.sh",
    deps=["scripts/clear-db.sh"],
    trigger_mode=TRIGGER_MODE_MANUAL,
    resource_deps=["postgres"],
    auto_init=False
)

local_resource(
    "script-test-api",
    cmd="./scripts/test-api.sh",
    deps=["scripts/test-api.sh"],
    trigger_mode=TRIGGER_MODE_MANUAL,
    resource_deps=["api"],
    auto_init=False
)

local_resource(
    "script-test-organization",
    cmd="./scripts/test-organization.sh",
    deps=["scripts/test-organization.sh"],
    trigger_mode=TRIGGER_MODE_MANUAL,
    resource_deps=["api"],
    auto_init=False
)

local_resource(
    "script-test-today-sheet-api",
    cmd="./scripts/test-today-sheet-api.sh",
    deps=["scripts/test-today-sheet-api.sh"],
    trigger_mode=TRIGGER_MODE_MANUAL,
    resource_deps=["api"],
    auto_init=False
)
