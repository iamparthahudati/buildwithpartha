package tech.buildwithpartha.lifeos.sprint.api;

public record ReviewPromptResponse(
    String promptKey, String title, String promptText, int stepNumber, boolean optional) {}
