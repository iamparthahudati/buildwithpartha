package tech.buildwithpartha.lifeos.common.export;

import java.util.UUID;

/**
 * Port implemented by domain modules to contribute machine-readable files to an account's data
 * export archive (LOS-0517).
 *
 * <p>Each domain is responsible for serializing only its own aggregate data and excluding any
 * sensitive authentication secrets, token hashes, or cross-account data per
 * {@code 31-PRIVACY-DATA-LIFECYCLE.md}.
 */
public interface UserDataExportContributor {

  /**
   * Relative filename within the root of the ZIP archive (e.g. {@code "account.json"},
   * {@code "preferences.json"}).
   */
  String exportFileName();

  /**
   * Generates the serialized byte array (typically UTF-8 JSON) representing the user's data.
   *
   * @param userId the user id
   * @return byte array containing the file content
   */
  byte[] exportDataForUser(UUID userId);
}
