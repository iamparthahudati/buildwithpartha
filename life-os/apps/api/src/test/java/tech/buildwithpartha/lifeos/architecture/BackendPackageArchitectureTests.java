package tech.buildwithpartha.lifeos.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

class BackendPackageArchitectureTests {

    private static final JavaClasses PRODUCTION_CLASSES = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages(PackageBoundaryRules.BASE_PACKAGE);

    @Test
    void usesOnlyApprovedTopLevelPackages() {
        PackageBoundaryRules.approvedTopLevelPackages().check(PRODUCTION_CLASSES);
    }

    @Test
    void keepsProductDomainsIndependent() {
        PackageBoundaryRules.domainIsolation().check(PRODUCTION_CLASSES);
    }

    @Test
    void keepsCommonTypesDomainNeutral() {
        PackageBoundaryRules.commonIsDomainNeutral().check(PRODUCTION_CLASSES);
    }

    @Test
    void usesOnlyApprovedLayersInsideDomains() {
        PackageBoundaryRules.approvedDomainLayers().check(PRODUCTION_CLASSES);
    }

    @Test
    void keepsDependenciesPointingInward() {
        PackageBoundaryRules.layerDirection().check(PRODUCTION_CLASSES);
    }
}
