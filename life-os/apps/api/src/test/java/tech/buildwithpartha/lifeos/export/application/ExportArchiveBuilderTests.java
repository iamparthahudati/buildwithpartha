package tech.buildwithpartha.lifeos.export.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;

class ExportArchiveBuilderTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final UUID USER_ID = UUID.randomUUID();

  @Test
  void buildArchive_assemblesZipWithContributorsManifestAndReadme() throws IOException {
    UserDataExportContributor contributor1 =
        new UserDataExportContributor() {
          @Override
          public String exportFileName() {
            return "section1.json";
          }

          @Override
          public byte[] exportDataForUser(UUID userId) {
            return "{\"key\":\"value1\"}".getBytes(StandardCharsets.UTF_8);
          }
        };

    ExportArchiveBuilder builder = new ExportArchiveBuilder(List.of(contributor1));
    byte[] zipBytes = builder.buildArchive(USER_ID, NOW);

    assertThat(zipBytes).isNotEmpty();

    boolean hasSection1 = false;
    boolean hasReadme = false;
    boolean hasManifest = false;

    try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
      ZipEntry entry;
      while ((entry = zip.getNextEntry()) != null) {
        String name = entry.getName();
        byte[] content = zip.readAllBytes();

        switch (name) {
          case "section1.json" -> {
            hasSection1 = true;
            assertThat(new String(content, StandardCharsets.UTF_8)).contains("value1");
          }
          case "README.md" -> {
            hasReadme = true;
            assertThat(new String(content, StandardCharsets.UTF_8))
                .contains("LifeOS Personal Data Export");
          }
          case "manifest.json" -> {
            hasManifest = true;
            assertThat(new String(content, StandardCharsets.UTF_8))
                .contains("1.0.0")
                .contains("section1.json");
          }
          default -> {}
        }
      }
    }

    assertThat(hasSection1).isTrue();
    assertThat(hasReadme).isTrue();
    assertThat(hasManifest).isTrue();
  }
}
