package tech.buildwithpartha.lifeos.common.error;

import tech.buildwithpartha.lifeos.project.domain.ProjectDomainFixture;

public final class CommonBoundaryFixture {

    private final ProjectDomainFixture forbiddenDependency;

    public CommonBoundaryFixture(ProjectDomainFixture forbiddenDependency) {
        this.forbiddenDependency = forbiddenDependency;
    }

    public ProjectDomainFixture forbiddenDependency() {
        return forbiddenDependency;
    }
}
