package tech.buildwithpartha.lifeos.auth.api;

import java.util.List;

public record SessionListResponse(List<SessionResponse> sessions) {

  public static SessionListResponse of(List<SessionResponse> sessions) {
    return new SessionListResponse(sessions);
  }
}
