package tech.buildwithpartha.lifeos.auth.application;

import java.util.ArrayList;
import java.util.List;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

final class FakeUserRepository implements UserRepository {

  private final List<User> saved = new ArrayList<>();

  @Override
  public boolean existsByEmailNormalized(String emailNormalized) {
    return saved.stream().anyMatch(user -> user.email().normalized().equals(emailNormalized));
  }

  @Override
  public User save(User user) {
    saved.add(user);
    return user;
  }

  List<User> all() {
    return List.copyOf(saved);
  }
}
