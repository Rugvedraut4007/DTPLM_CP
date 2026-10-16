package com.studymarket.trading;

import com.studymarket.trading.PurchaseEligibilityService.Eligibility;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PurchaseEligibilityController {

	private final PurchaseEligibilityService purchaseEligibilityService;

	public PurchaseEligibilityController(PurchaseEligibilityService purchaseEligibilityService) {
		this.purchaseEligibilityService = purchaseEligibilityService;
	}

	/** what this student still has to study before buying each subject */
	@GetMapping("/api/users/{userId}/purchase-eligibility")
	public List<Eligibility> eligibility(@PathVariable Long userId) {
		return purchaseEligibilityService.forUser(userId);
	}
}
