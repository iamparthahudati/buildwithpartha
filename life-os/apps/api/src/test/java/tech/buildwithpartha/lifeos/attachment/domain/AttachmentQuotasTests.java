package tech.buildwithpartha.lifeos.attachment.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AttachmentQuotasTests {

  @Test
  @DisplayName("AttachmentQuotas constants match ADR-015 limits")
  void constantsMatchADR015() {
    assertThat(AttachmentQuotas.MAX_FILE_SIZE_BYTES).isEqualTo(26_214_400L); // 25 MB
    assertThat(AttachmentQuotas.MAX_ACCOUNT_STORAGE_BYTES).isEqualTo(2_147_483_648L); // 2 GB
    assertThat(AttachmentQuotas.MAX_PER_ENTITY_ATTACHMENTS).isEqualTo(20);
  }
}
