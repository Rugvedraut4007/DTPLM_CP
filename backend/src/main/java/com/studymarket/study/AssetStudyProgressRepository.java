package com.studymarket.study;

import com.studymarket.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetStudyProgressRepository extends JpaRepository<AssetStudyProgress, Long> {

	Optional<AssetStudyProgress> findByUserAndAsset(User user, com.studymarket.asset.Asset asset);

	List<AssetStudyProgress> findAllByUserOrderByUpdatedAtDesc(User user);
}