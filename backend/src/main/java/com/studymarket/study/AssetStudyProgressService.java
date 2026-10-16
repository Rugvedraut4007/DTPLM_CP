package com.studymarket.study;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AssetStudyProgressService {

	private final AssetStudyProgressRepository progressRepository;
	private final UserRepository userRepository;
	private final AssetRepository assetRepository;

	public AssetStudyProgressService(AssetStudyProgressRepository progressRepository, UserRepository userRepository,
			AssetRepository assetRepository) {
		this.progressRepository = progressRepository;
		this.userRepository = userRepository;
		this.assetRepository = assetRepository;
	}

	public AssetStudyProgress recordCompletedSession(StudySession session) {
		User user = session.getUser();
		Asset asset = session.getAsset();
		AssetStudyProgress progress = progressRepository.findByUserAndAsset(user, asset)
				.orElseGet(() -> new AssetStudyProgress(user, asset));
		progress.addCompletedMinutes((int) (session.getDurationSeconds() / 60));
		return progressRepository.save(progress);
	}

	public List<AssetStudyProgress> getUserProgress(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		return progressRepository.findAllByUserOrderByUpdatedAtDesc(user);
	}

	public AssetStudyProgress getUserAssetProgress(Long userId, Long assetId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		Asset asset = assetRepository.findById(assetId)
				.orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetId));
		return progressRepository.findByUserAndAsset(user, asset)
				.orElseThrow(() -> new IllegalArgumentException("Asset study progress not found"));
	}
}