package tech.buildwithpartha.lifeos.sprint.application;

public record ReviewPrompt(
    String promptKey, String title, String promptText, int stepNumber, boolean optional) {}
