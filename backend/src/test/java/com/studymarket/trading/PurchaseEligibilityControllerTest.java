package com.studymarket.trading;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studymarket.controller.ApiExceptionHandler;
import com.studymarket.trading.PurchaseEligibilityService.Eligibility;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PurchaseEligibilityControllerTest {

	private MockMvc mockMvc;
	private PurchaseEligibilityService purchaseEligibilityService;

	@BeforeEach
	void setUp() {
		purchaseEligibilityService = mock(PurchaseEligibilityService.class);
		mockMvc = MockMvcBuilders.standaloneSetup(new PurchaseEligibilityController(purchaseEligibilityService))
				.setControllerAdvice(new ApiExceptionHandler())
				.build();
	}

	@Test
	void listsWhatEverySubjectStillNeeds() throws Exception {
		when(purchaseEligibilityService.forUser(1L)).thenReturn(List.of(
				new Eligibility(2L, "DSA", "Data Structures & Algorithms", 15, 3, 12, false),
				new Eligibility(1L, "DBMS", "Database Management Systems", 14, 20, 0, true)));

		mockMvc.perform(get("/api/users/1/purchase-eligibility"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].assetId").value(2))
				.andExpect(jsonPath("$[0].symbol").value("DSA"))
				.andExpect(jsonPath("$[0].requiredStudyMinutes").value(15))
				.andExpect(jsonPath("$[0].studiedMinutes").value(3))
				.andExpect(jsonPath("$[0].remainingMinutes").value(12))
				.andExpect(jsonPath("$[0].unlocked").value(false))
				.andExpect(jsonPath("$[1].unlocked").value(true))
				.andExpect(jsonPath("$[1].remainingMinutes").value(0));
	}

	@Test
	void unknownUserIsReportedAsABadRequest() throws Exception {
		when(purchaseEligibilityService.forUser(9L)).thenThrow(new IllegalArgumentException("User not found: 9"));

		mockMvc.perform(get("/api/users/9/purchase-eligibility"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("BAD_REQUEST"))
				.andExpect(jsonPath("$.message").value("User not found: 9"));
	}
}
