package tech.buildwithpartha.lifeos.auth.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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

  @Override
  public Optional<User> findById(UUID id) {
    // Last write wins, matching a real row's current state after repeated saves.
    User latest = null;
    for (User user : saved) {
      if (user.id().equals(id)) {
        latest = user;
      }
    }
    return Optional.ofNullable(latest);
  }

  @Override
  public Optional<User> findByEmailNormalized(String emailNormalized) {
    User latest = null;
    for (User user : saved) {
      if (user.email().normalized().equals(emailNormalized)) {
        latest = user;
      }
    }
    return Optional.ofNullable(latest);
  }

  @Override
  public void deleteById(UUID id) {
    saved.removeIf(user -> user.id().equals(id));
  }

  List<User> all() {
    return List.copyOf(saved);
  }
}
