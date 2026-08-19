package tech.buildwithpartha.lifeos.export.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.export.UserDataExportContributor;

/**
 * Assembles personal data export files from all registered domain contributors into a secure ZIP
 * archive (LOS-1405, LOS-0517).
 */
@Component
public class ExportArchiveBuilder {

  private static final String EXPORT_VERSION = "1.0.0";
  private final List<UserDataExportContributor> contributors;
  private final ObjectMapper objectMapper;

  public ExportArchiveBuilder(List<UserDataExportContributor> contributors) {
    this.contributors = List.copyOf(contributors);
    this.objectMapper =
        new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .enable(SerializationFeature.INDENT_OUTPUT);
  }

  /**
   * Generates a complete ZIP archive byte array for the specified user.
   *
   * @param userId the user id
   * @param now the generation instant
   * @return byte array of the assembled ZIP file
   */
  public byte[] buildArchive(UUID userId, Instant now) {
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    List<String> includedFiles = new ArrayList<>();

    try (ZipOutputStream zip = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {
      // Write all contributor files
      for (UserDataExportContributor contributor : contributors) {
        String fileName = contributor.exportFileName();
        byte[] fileBytes = contributor.exportDataForUser(userId);
        writeZipEntry(zip, fileName, fileBytes);
        includedFiles.add(fileName);
      }

      // Write README.md
      String readme =
          """
          # LifeOS Personal Data Export

          - Export Version: 1.0.0
          - Generated At: %s
          - Account ID: %s

          ## Contents
          This archive contains your personal data exported from LifeOS in machine-readable JSON
          format.

          Security note: No passwords, session cookies, or cryptographic secrets are exported.
          """
              .formatted(DateTimeFormatter.ISO_INSTANT.format(now), userId);
      writeZipEntry(zip, "README.md", readme.getBytes(StandardCharsets.UTF_8));
      includedFiles.add("README.md");

      // Write manifest.json
      Map<String, Object> manifest = new LinkedHashMap<>();
      manifest.put("exportVersion", EXPORT_VERSION);
      manifest.put("accountId", userId.toString());
      manifest.put("generatedAt", DateTimeFormatter.ISO_INSTANT.format(now));
      manifest.put("files", includedFiles);
      writeZipEntry(zip, "manifest.json", objectMapper.writeValueAsBytes(manifest));

      zip.finish();
    } catch (IOException e) {
      throw new IllegalStateException("Failed to assemble export archive", e);
    }

    return baos.toByteArray();
  }

  private static void writeZipEntry(ZipOutputStream zip, String filename, byte[] content)
      throws IOException {
    ZipEntry entry = new ZipEntry(filename);
    zip.putNextEntry(entry);
    zip.write(content);
    zip.closeEntry();
  }
}
