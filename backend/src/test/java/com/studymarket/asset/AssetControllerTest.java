package com.studymarket.asset;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AssetControllerTest {

	private MockMvc mockMvc;
	private AssetService assetService;

	@BeforeEach
	void setUp() {
		assetService = mock(AssetService.class);
		mockMvc = MockMvcBuilders.standaloneSetup(new AssetController(assetService)).build();
	}

	@Test
	void getAllAssetsReturnsMarketFields() throws Exception {
		Asset asset = mock(Asset.class);
		when(asset.getGlobalImportance()).thenReturn(10);
		when(asset.getOpeningPrice()).thenReturn(new BigDecimal("0.0500"));
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0500"));
		when(assetService.findAll()).thenReturn(List.of(asset));

		mockMvc.perform(get("/api/assets"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].globalImportance").value(10))
				.andExpect(jsonPath("$[0].openingPrice").value(0.05))
				.andExpect(jsonPath("$[0].currentPrice").value(0.05));
	}
}