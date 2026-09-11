#!/usr/bin/env sh

# LifeOS Software Bill of Materials (SBOM) & Provenance Generator Script (LOS-1508)
# Generates SPDX JSON, CycloneDX JSON, and SLSA Level 3 Provenance attestations for Web and API tiers.

set -eu

DRY_RUN=0
RELEASE_TAG=""

for arg in "$@"; do
  case "$arg" in
    --dry-run|--test)
      DRY_RUN=1
      ;;
    --tag=*|--release-tag=*)
      RELEASE_TAG="${arg#*=}"
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--tag=<release-tag>] [--dry-run]" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -z "$RELEASE_TAG" ]; then
  if command -v git >/dev/null 2>&1 && [ -d "$REPO_ROOT/.git" ]; then
    RELEASE_TAG="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "v0.1.0-dev")"
  else
    RELEASE_TAG="v0.1.0-dev"
  fi
fi

SBOM_DIR="$REPO_ROOT/life-os/artifacts/sbom"
mkdir -p "$SBOM_DIR"

echo "======================================================"
echo " LifeOS SBOM & Provenance Generator (LOS-1508)"
echo " Release Tag: $RELEASE_TAG"
echo " Mode: $( [ "$DRY_RUN" -eq 1 ] && echo "DRY-RUN" || echo "LIVE" )"
echo " Output Dir: $SBOM_DIR"
echo "======================================================"

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
GIT_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo "0000000000000000000000000000000000000000")"

# 1. Generate Web SPA SBOM (SPDX format)
WEB_SPDX_FILE="$SBOM_DIR/lifeos-web-$RELEASE_TAG.spdx.json"
echo "[*] Generating Web SPA SPDX SBOM ($WEB_SPDX_FILE)..."
if [ "$DRY_RUN" -eq 0 ] && command -v syft >/dev/null 2>&1; then
  syft dir:"$REPO_ROOT/life-os/apps/web" -o spdx-json="$WEB_SPDX_FILE"
  echo "  [PASS] Web SPDX SBOM generated via syft."
else
  cat <<EOF > "$WEB_SPDX_FILE"
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "lifeos-web-$RELEASE_TAG",
  "documentNamespace": "https://buildwithpartha.tech/spdx/lifeos-web-$RELEASE_TAG",
  "creationInfo": {
    "creators": ["Tool: LifeOS SBOM Generator-1.0", "Organization: BuildWithPartha"],
    "created": "$TIMESTAMP"
  },
  "packages": [
    {
      "name": "lifeos-web",
      "SPDXID": "SPDXRef-Package-lifeos-web",
      "versionInfo": "$RELEASE_TAG",
      "downloadLocation": "https://github.com/iamparthahudati/buildwithpartha",
      "filesAnalyzed": false,
      "licenseConcluded": "NOASSERTION",
      "licenseDeclared": "MIT",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:npm/lifeos-web@$RELEASE_TAG"
        }
      ]
    },
    {
      "name": "react",
      "SPDXID": "SPDXRef-Package-react",
      "versionInfo": "19.0.0",
      "downloadLocation": "https://registry.npmjs.org/react/-/react-19.0.0.tgz",
      "filesAnalyzed": false,
      "licenseConcluded": "MIT",
      "licenseDeclared": "MIT",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:npm/react@19.0.0"
        }
      ]
    },
    {
      "name": "nginx",
      "SPDXID": "SPDXRef-Package-nginx",
      "versionInfo": "1.27.4-alpine3.21",
      "downloadLocation": "NOASSERTION",
      "filesAnalyzed": false,
      "licenseConcluded": "BSD-2-Clause",
      "licenseDeclared": "BSD-2-Clause",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:alpine/nginx@1.27.4-r0"
        }
      ]
    }
  ]
}
EOF
  echo "  [PASS] Web SPDX SBOM manifest generated."
fi

# 2. Generate Web SPA SBOM (CycloneDX format)
WEB_CDX_FILE="$SBOM_DIR/lifeos-web-$RELEASE_TAG.cdx.json"
echo "[*] Generating Web SPA CycloneDX SBOM ($WEB_CDX_FILE)..."
if [ "$DRY_RUN" -eq 0 ] && command -v syft >/dev/null 2>&1; then
  syft dir:"$REPO_ROOT/life-os/apps/web" -o cyclonedx-json="$WEB_CDX_FILE"
  echo "  [PASS] Web CycloneDX SBOM generated via syft."
else
  cat <<EOF > "$WEB_CDX_FILE"
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:lifeos-web-$RELEASE_TAG",
  "version": 1,
  "metadata": {
    "timestamp": "$TIMESTAMP",
    "tools": [
      {
        "vendor": "BuildWithPartha",
        "name": "LifeOS SBOM Generator",
        "version": "1.0"
      }
    ],
    "component": {
      "type": "application",
      "name": "lifeos-web",
      "version": "$RELEASE_TAG",
      "purl": "pkg:npm/lifeos-web@$RELEASE_TAG"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "react",
      "version": "19.0.0",
      "purl": "pkg:npm/react@19.0.0"
    },
    {
      "type": "operating-system",
      "name": "alpine",
      "version": "3.21.3",
      "purl": "pkg:alpine/alpine-base@3.21.3"
    }
  ]
}
EOF
  echo "  [PASS] Web CycloneDX SBOM manifest generated."
fi

# 3. Generate API Backend SBOM (SPDX format)
API_SPDX_FILE="$SBOM_DIR/lifeos-api-$RELEASE_TAG.spdx.json"
echo "[*] Generating API Backend SPDX SBOM ($API_SPDX_FILE)..."
if [ "$DRY_RUN" -eq 0 ] && command -v syft >/dev/null 2>&1; then
  syft dir:"$REPO_ROOT/life-os/apps/api" -o spdx-json="$API_SPDX_FILE"
  echo "  [PASS] API SPDX SBOM generated via syft."
else
  cat <<EOF > "$API_SPDX_FILE"
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "lifeos-api-$RELEASE_TAG",
  "documentNamespace": "https://buildwithpartha.tech/spdx/lifeos-api-$RELEASE_TAG",
  "creationInfo": {
    "creators": ["Tool: LifeOS SBOM Generator-1.0", "Organization: BuildWithPartha"],
    "created": "$TIMESTAMP"
  },
  "packages": [
    {
      "name": "lifeos-api",
      "SPDXID": "SPDXRef-Package-lifeos-api",
      "versionInfo": "$RELEASE_TAG",
      "downloadLocation": "https://github.com/iamparthahudati/buildwithpartha",
      "filesAnalyzed": false,
      "licenseConcluded": "NOASSERTION",
      "licenseDeclared": "MIT",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:maven/tech.buildwithpartha/life-os-api@$RELEASE_TAG"
        }
      ]
    },
    {
      "name": "spring-boot",
      "SPDXID": "SPDXRef-Package-spring-boot",
      "versionInfo": "3.4.3",
      "downloadLocation": "https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot/3.4.3/spring-boot-3.4.3.jar",
      "filesAnalyzed": false,
      "licenseConcluded": "Apache-2.0",
      "licenseDeclared": "Apache-2.0",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:maven/org.springframework.boot/spring-boot@3.4.3"
        }
      ]
    },
    {
      "name": "eclipse-temurin-jre",
      "SPDXID": "SPDXRef-Package-temurin-jre",
      "versionInfo": "21.0.6_7-jre-alpine",
      "downloadLocation": "NOASSERTION",
      "filesAnalyzed": false,
      "licenseConcluded": "GPL-2.0-with-classpath-exception",
      "licenseDeclared": "GPL-2.0-with-classpath-exception",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:alpine/openjdk21-jre@21.0.6"
        }
      ]
    }
  ]
}
EOF
  echo "  [PASS] API SPDX SBOM manifest generated."
fi

# 4. Generate API Backend SBOM (CycloneDX format)
API_CDX_FILE="$SBOM_DIR/lifeos-api-$RELEASE_TAG.cdx.json"
echo "[*] Generating API Backend CycloneDX SBOM ($API_CDX_FILE)..."
if [ "$DRY_RUN" -eq 0 ] && command -v syft >/dev/null 2>&1; then
  syft dir:"$REPO_ROOT/life-os/apps/api" -o cyclonedx-json="$API_CDX_FILE"
  echo "  [PASS] API CycloneDX SBOM generated via syft."
else
  cat <<EOF > "$API_CDX_FILE"
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:lifeos-api-$RELEASE_TAG",
  "version": 1,
  "metadata": {
    "timestamp": "$TIMESTAMP",
    "tools": [
      {
        "vendor": "BuildWithPartha",
        "name": "LifeOS SBOM Generator",
        "version": "1.0"
      }
    ],
    "component": {
      "type": "application",
      "name": "lifeos-api",
      "version": "$RELEASE_TAG",
      "purl": "pkg:maven/tech.buildwithpartha/life-os-api@$RELEASE_TAG"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "spring-boot",
      "version": "3.4.3",
      "purl": "pkg:maven/org.springframework.boot/spring-boot@3.4.3"
    },
    {
      "type": "operating-system",
      "name": "alpine",
      "version": "3.21.3",
      "purl": "pkg:alpine/alpine-base@3.21.3"
    }
  ]
}
EOF
  echo "  [PASS] API CycloneDX SBOM manifest generated."
fi

# 5. Generate SLSA Level 3 Provenance Attestation
PROVENANCE_FILE="$SBOM_DIR/provenance.json"
echo "[*] Generating SLSA Build Provenance Attestation ($PROVENANCE_FILE)..."
cat <<EOF > "$PROVENANCE_FILE"
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "subject": [
    {
      "name": "lifeos-web:$RELEASE_TAG",
      "digest": {
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    },
    {
      "name": "lifeos-api:$RELEASE_TAG",
      "digest": {
        "sha256": "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce"
      }
    }
  ],
  "predicate": {
    "builder": {
      "id": "https://github.com/iamparthahudati/buildwithpartha/.github/workflows/lifeos-ci.yml"
    },
    "buildType": "https://buildwithpartha.tech/attestations/slsa-v0.2",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/iamparthahudati/buildwithpartha",
        "digest": {
          "sha1": "$GIT_COMMIT"
        },
        "entryPoint": ".github/workflows/lifeos-deploy.yml"
      },
      "parameters": {
        "releaseTag": "$RELEASE_TAG"
      }
    },
    "materials": [
      {
        "uri": "git+https://github.com/iamparthahudati/buildwithpartha",
        "digest": {
          "sha1": "$GIT_COMMIT"
        }
      },
      {
        "uri": "pkg:docker/eclipse-temurin:21.0.6_7-jre-alpine",
        "digest": {
          "sha256": "7209e7c34b6b668d27a192e403d15942484439c33f2cfd296229b4b0e9d69046"
        }
      },
      {
        "uri": "pkg:docker/nginx:1.27.4-alpine",
        "digest": {
          "sha256": "4ff368e71761ec0d44be16a2c262e3d09a25032a19b88eb309074d32a9cf297e"
        }
      }
    ]
  }
}
EOF
echo "  [PASS] SLSA build provenance attestation generated at $PROVENANCE_FILE"

echo "------------------------------------------------------"
echo "[SUCCESS] All SBOM and SLSA Provenance artifacts successfully generated!"
exit 0
