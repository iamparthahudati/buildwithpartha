package tech.buildwithpartha.lifeos.architecture;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    JavaClasses fixtures =
        importer.importClasses(ProjectBoundaryFixture.class, TaskDomainFixture.class);

    assertThatThrownBy(() -> PackageBoundaryRules.domainIsolation().check(fixtures))
        .isInstanceOf(AssertionError.class);
  }

  @Test
  void rejectsACommonToDomainDependency() {
    JavaClasses fixtures =
        importer.importClasses(CommonBoundaryFixture.class, ProjectDomainFixture.class);

    assertThatThrownBy(() -> PackageBoundaryRules.commonIsDomainNeutral().check(fixtures))
        .isInstanceOf(AssertionError.class);
  }

  @Test
  void rejectsAnOutwardDomainLayerDependency() {
    JavaClasses fixtures =
        importer.importClasses(ProjectDomainFixture.class, ProjectInfrastructureFixture.class);

    assertThatThrownBy(() -> PackageBoundaryRules.layerDirection().check(fixtures))
        .isInstanceOf(AssertionError.class);
  }

  @Test
  void rejectsAnUnapprovedDomainSubpackage() {
    JavaClasses fixtures = importer.importClasses(ProjectServiceFixture.class);

    assertThatThrownBy(() -> PackageBoundaryRules.approvedDomainLayers().check(fixtures))
        .isInstanceOf(AssertionError.class);
  }
}
