package tech.buildwithpartha.lifeos.comment.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class CommentBodyPolicyTests {

  private final CommentBodyPolicy policy = new CommentBodyPolicy();

  @Test
  void plainTextNormalizesLineEndingsWithoutInterpretingMarkup() {
    String result =
        policy.sanitize("  <script>alert('x')</script>\r\nnext  ", CommentFormat.PLAIN_TEXT);

    assertThat(result).isEqualTo("<script>alert('x')</script>\nnext");
  }

  @Test
  void markdownEscapesHtmlEntitiesAndEncodedTagAttempts() {
    String result =
        policy.sanitize(
            "**safe** <script>alert(1)</script> &#x3C;img src=x onerror=alert(2)>",
            CommentFormat.MARKDOWN);

    assertThat(result)
        .isEqualTo(
            "**safe** &lt;script&gt;alert(1)&lt;/script&gt; "
                + "&amp;#x3C;img src=x onerror=alert(2)&gt;")
        .doesNotContain("<script>");
  }

  @Test
  void markdownFlattensImagesAndUnsafeLinksButKeepsHttpLinks() {
    String result =
        policy.sanitize(
            "![tracking](https://tracker.example/pixel) "
                + "[run](javascript:alert(1)) [data](data:text/html,bad) "
                + "[docs](https://example.test/path?q=1&safe=1)",
            CommentFormat.MARKDOWN);

    assertThat(result)
        .isEqualTo("tracking run data [docs](https://example.test/path?q=1&amp;safe=1)")
        .doesNotContain("javascript:", "data:text", "![");
  }

  @Test
  void markdownNeutralizesReferenceAndShortcutLinksAndImages() {
    String result =
        policy.sanitize(
            "![pixel][tracker] [run][unsafe] [shortcut]\n"
                + "[tracker]: https://tracker.example/pixel\n"
                + "[unsafe]: javascript:alert(1)",
            CommentFormat.MARKDOWN);

    assertThat(result)
        .isEqualTo(
            "\\[pixel]\\[tracker] \\[run]\\[unsafe] \\[shortcut]\n"
                + "\\[tracker]: https://tracker.example/pixel\n"
                + "\\[unsafe]: javascript:alert(1)")
        .doesNotContain("![");
  }

  @Test
  void rejectsBlankOversizedAndControlCharacterBodies() {
    assertThatThrownBy(() -> policy.sanitize("  \n ", CommentFormat.PLAIN_TEXT))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(
            () ->
                policy.sanitize(
                    "x".repeat(CommentBodyPolicy.MAX_INPUT_LENGTH + 1), CommentFormat.PLAIN_TEXT))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> policy.sanitize("safe\u0000unsafe", CommentFormat.PLAIN_TEXT))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
