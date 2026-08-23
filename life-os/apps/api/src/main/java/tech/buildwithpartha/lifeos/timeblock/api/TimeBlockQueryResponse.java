package tech.buildwithpartha.lifeos.timeblock.api;

import java.util.List;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;

/** Query response containing a list of TimeBlocks. */
public record TimeBlockQueryResponse(List<TimeBlockResponse> timeBlocks, int totalCount) {

  public static TimeBlockQueryResponse fromDomain(List<TimeBlock> domainList) {
    List<TimeBlockResponse> responses =
        domainList.stream().map(TimeBlockResponse::fromDomain).toList();
    return new TimeBlockQueryResponse(responses, responses.size());
  }
}
