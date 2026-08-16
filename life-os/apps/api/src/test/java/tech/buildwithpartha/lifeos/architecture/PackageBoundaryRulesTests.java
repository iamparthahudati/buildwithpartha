package tech.buildwithpartha.lifeos.architecture;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.CommonBoundaryFixture;
import tech.buildwithpartha.lifeos.project.application.ProjectBoundaryFixture;
import tech.buildwithpartha.lifeos.project.domain.ProjectDomainFixture;
import tech.buildwithpartha.lifeos.project.infrastructure.ProjectInfrastructureFixture;
import tech.buildwithpartha.lifeos.project.service.ProjectServiceFixture;
import tech.buildwithpartha.lifeos.task.domain.TaskDomainFixture;

class PackageBoundaryRulesTests {

    private final ClassFileImporter importer = new ClassFileImporter();

    @Test
    void rejectsACrossDomainDependency() {
        JavaClasses fixtures = importer.importClasses(
                ProjectBoundaryFixture.class, TaskDomainFixture.class);

        assertThrows(
                AssertionError.class,
                () -> PackageBoundaryRules.domainIsolation().check(fixtures));
    }

    @Test
    void rejectsACommonToDomainDependency() {
        JavaClasses fixtures = importer.importClasses(
                CommonBoundaryFixture.class, ProjectDomainFixture.class);

        assertThrows(
                AssertionError.class,
                () -> PackageBoundaryRules.commonIsDomainNeutral().check(fixtures));
    }

    @Test
    void rejectsAnOutwardDomainLayerDependency() {
        JavaClasses fixtures = importer.importClasses(
                ProjectDomainFixture.class, ProjectInfrastructureFixture.class);

        assertThrows(
                AssertionError.class,
                () -> PackageBoundaryRules.layerDirection().check(fixtures));
    }

    @Test
    void rejectsAnUnapprovedDomainSubpackage() {
        JavaClasses fixtures = importer.importClasses(ProjectServiceFixture.class);

        assertThrows(
                AssertionError.class,
                () -> PackageBoundaryRules.approvedDomainLayers().check(fixtures));
    }
}
