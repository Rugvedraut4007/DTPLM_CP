package com.studymarket.asset;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AssetService {

	private final AssetRepository assetRepository;

	public AssetService(AssetRepository assetRepository) {
		this.assetRepository = assetRepository;
	}

	public List<Asset> findAll() {
		return assetRepository.findAll();
	}
}