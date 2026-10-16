package com.studymarket.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studymarket.trading.PurchaseEligibilityService.Eligibility;
import com.studymarket.trading.StudyRequiredException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class ApiExceptionHandlerTest {

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
				.setControllerAdvice(new ApiExceptionHandler())
				.build();
	}

	@Test
	void studyRequiredExplainsHowMuchStudyIsMissing() throws Exception {
		mockMvc.perform(get("/test/study-required"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("STUDY_REQUIRED"))
				.andExpect(jsonPath("$.assetId").value(2))
				.andExpect(jsonPath("$.symbol").value("DSA"))
				.andExpect(jsonPath("$.requiredStudyMinutes").value(15))
				.andExpect(jsonPath("$.studiedMinutes").value(3))
				.andExpect(jsonPath("$.remainingMinutes").value(12))
				.andExpect(jsonPath("$.message", containsString("Study required")));
	}

	@Test
	void illegalArgumentIsABadRequest() throws Exception {
		mockMvc.perform(get("/test/bad-request"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("BAD_REQUEST"))
				.andExpect(jsonPath("$.message").value("quantity must be greater than zero"));
	}

	@Test
	void illegalStateIsAConflict() throws Exception {
		mockMvc.perform(get("/test/conflict"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("CONFLICT"))
				.andExpect(jsonPath("$.message").value("position not found"));
	}

	@RestController
	static class ThrowingController {

		@GetMapping("/test/study-required")
		void studyRequired() {
			throw new StudyRequiredException(
					new Eligibility(2L, "DSA", "Data Structures & Algorithms", 15, 3, 12, false));
		}

		@GetMapping("/test/bad-request")
		void badRequest() {
			throw new IllegalArgumentException("quantity must be greater than zero");
		}

		@GetMapping("/test/conflict")
		void conflict() {
			throw new IllegalStateException("position not found");
		}
	}
}
