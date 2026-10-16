package com.studymarket.asset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;

class AssetServiceTest {

	private final AssetRepository assetRepository = mock(AssetRepository.class);
	private final AssetService assetService = new AssetService(assetRepository);

	@Test
	void findAllReturnsAssetsFromRepository() {
		Asset asset = mock(Asset.class);
		when(assetRepository.findAll()).thenReturn(List.of(asset));

		assertThat(assetService.findAll()).containsExactly(asset);
	}
}