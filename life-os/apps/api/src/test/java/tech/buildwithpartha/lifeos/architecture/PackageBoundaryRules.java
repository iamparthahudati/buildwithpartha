package tech.buildwithpartha.lifeos.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.CompositeArchRule;
import java.util.Arrays;
import java.util.List;

final class PackageBoundaryRules {

    static final String BASE_PACKAGE = "tech.buildwithpartha.lifeos";

    private static final List<String> DOMAIN_PACKAGES = List.of(
            "auth",
            "user",
            "project",
            "task",
            "calendar",
            "timeblock",
            "focus",
            "sprint",
            "goal",
            "note",
            "braindump",
            "habit",
            "report",
            "search",
            "notification",
            "audit");

    private static final List<String> DOMAIN_LAYERS =
            List.of("api", "application", "domain", "infrastructure");

    private PackageBoundaryRules() {
    }

    static ArchRule approvedTopLevelPackages() {
        String[] approvedPackages = concat(
                new String[] {BASE_PACKAGE, BASE_PACKAGE + ".common..", BASE_PACKAGE + ".config.."},
                domainPackages());

        return classes()
                .that()
                .resideInAPackage(BASE_PACKAGE + "..")
                .should()
                .resideInAnyPackage(approvedPackages)
                .because("backend code must stay in the application root, common, config, "
                        + "or an approved domain package");
    }

    static ArchRule domainIsolation() {
        CompositeArchRule result = null;

        for (String domain : DOMAIN_PACKAGES) {
            String ownPackage = domainPackage(domain);
            String[] otherDomainPackages = DOMAIN_PACKAGES.stream()
                    .filter(candidate -> !candidate.equals(domain))
                    .map(PackageBoundaryRules::domainPackage)
                    .toArray(String[]::new);

            ArchRule rule = noClasses()
                    .that()
                    .resideInAPackage(ownPackage)
                    .should()
                    .dependOnClassesThat()
                    .resideInAnyPackage(otherDomainPackages)
                    .because(domain + " must collaborate through domain-neutral contracts "
                            + "instead of another domain's internals")
                    .allowEmptyShould(true);

            result = result == null ? CompositeArchRule.of(rule) : result.and(rule);
        }

        return result;
    }

    static ArchRule commonIsDomainNeutral() {
        return noClasses()
                .that()
                .resideInAPackage(BASE_PACKAGE + ".common..")
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(concat(
                        domainPackages(), new String[] {BASE_PACKAGE + ".config.."}))
                .because("common is the stable inward dependency and must not point to domains "
                        + "or configuration");
    }

    static ArchRule approvedDomainLayers() {
        CompositeArchRule result = null;

        for (String domain : DOMAIN_PACKAGES) {
            String root = BASE_PACKAGE + "." + domain;
            String[] approvedPackages = concat(
                    new String[] {root},
                    DOMAIN_LAYERS.stream()
                            .map(layer -> root + "." + layer + "..")
                            .toArray(String[]::new));

            ArchRule rule = classes()
                    .that()
                    .resideInAPackage(root + "..")
                    .should()
                    .resideInAnyPackage(approvedPackages)
                    .because(domain + " may use only api, application, domain, "
                            + "and infrastructure subpackages")
                    .allowEmptyShould(true);

            result = result == null ? CompositeArchRule.of(rule) : result.and(rule);
        }

        return result;
    }

    static ArchRule layerDirection() {
        ArchRule domainRule = noClasses()
                .that()
                .resideInAnyPackage(domainLayerPackages("domain"))
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(concat(
                        domainLayerPackages("application"),
                        domainLayerPackages("api"),
                        domainLayerPackages("infrastructure"),
                        new String[] {
                            BASE_PACKAGE + ".config..",
                            "org.springframework..",
                            "jakarta.persistence..",
                            "org.hibernate.."
                        }))
                .because("domain code must remain independent from delivery, orchestration, "
                        + "Spring, and JPA")
                .allowEmptyShould(true);

        ArchRule applicationRule = noClasses()
                .that()
                .resideInAnyPackage(domainLayerPackages("application"))
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(concat(
                        domainLayerPackages("api"), domainLayerPackages("infrastructure")))
                .because("application code may depend inward on domain contracts, not on adapters")
                .allowEmptyShould(true);

        ArchRule apiRule = noClasses()
                .that()
                .resideInAnyPackage(domainLayerPackages("api"))
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(domainLayerPackages("infrastructure"))
                .because("API adapters must reach persistence and providers through "
                        + "application contracts")
                .allowEmptyShould(true);

        ArchRule infrastructureRule = noClasses()
                .that()
                .resideInAnyPackage(domainLayerPackages("infrastructure"))
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(domainLayerPackages("api"))
                .because("infrastructure adapters must not depend on delivery adapters")
                .allowEmptyShould(true);

        return CompositeArchRule.of(domainRule)
                .and(applicationRule)
                .and(apiRule)
                .and(infrastructureRule);
    }

    private static String domainPackage(String domain) {
        return BASE_PACKAGE + "." + domain + "..";
    }

    private static String[] domainPackages() {
        return DOMAIN_PACKAGES.stream()
                .map(PackageBoundaryRules::domainPackage)
                .toArray(String[]::new);
    }

    private static String[] domainLayerPackages(String layer) {
        return DOMAIN_PACKAGES.stream()
                .map(domain -> BASE_PACKAGE + "." + domain + "." + layer + "..")
                .toArray(String[]::new);
    }

    private static String[] concat(String[]... groups) {
        int length = Arrays.stream(groups).mapToInt(group -> group.length).sum();
        String[] combined = new String[length];
        int offset = 0;
        for (String[] group : groups) {
            System.arraycopy(group, 0, combined, offset, group.length);
            offset += group.length;
        }
        return combined;
    }
}
