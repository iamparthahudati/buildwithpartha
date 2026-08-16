package tech.buildwithpartha.lifeos.project.application;

import tech.buildwithpartha.lifeos.task.domain.TaskDomainFixture;

public final class ProjectBoundaryFixture {

    private final TaskDomainFixture forbiddenDependency;

    public ProjectBoundaryFixture(TaskDomainFixture forbiddenDependency) {
        this.forbiddenDependency = forbiddenDependency;
    }

    public TaskDomainFixture forbiddenDependency() {
        return forbiddenDependency;
    }
}
