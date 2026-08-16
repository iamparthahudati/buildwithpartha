package tech.buildwithpartha.lifeos.project.domain;

import tech.buildwithpartha.lifeos.project.infrastructure.ProjectInfrastructureFixture;

public final class ProjectDomainFixture {

  private final ProjectInfrastructureFixture forbiddenDependency;

  public ProjectDomainFixture(ProjectInfrastructureFixture forbiddenDependency) {
    this.forbiddenDependency = forbiddenDependency;
  }

  public ProjectInfrastructureFixture forbiddenDependency() {
    return forbiddenDependency;
  }
}
