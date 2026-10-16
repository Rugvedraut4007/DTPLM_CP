package com.studymarket.trading;

import com.studymarket.trading.PurchaseEligibilityService.Eligibility;

/**
 * Raised when a student tries to buy a subject they have not studied enough yet.
 * Carries the whole eligibility record so the API can tell the client exactly
 * how many minutes are still missing and which subject to study.
 */
public class StudyRequiredException extends IllegalStateException {

	private final transient Eligibility eligibility;

	public StudyRequiredException(Eligibility eligibility) {
		super(message(eligibility));
		this.eligibility = eligibility;
	}

	public Eligibility getEligibility() {
		return eligibility;
	}

	private static String message(Eligibility eligibility) {
		return "Study required before buying " + eligibility.symbol() + " — " + eligibility.studiedMinutes() + " of "
				+ eligibility.requiredStudyMinutes() + " minutes done ("
				+ eligibility.remainingMinutes() + " more to unlock).";
	}
}
