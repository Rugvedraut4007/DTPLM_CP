package com.studymarket.study;

import com.studymarket.asset.Asset;
import com.studymarket.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

	boolean existsByUserAndStatus(User user, String status);

	List<StudySession> findAllByUserAndStatus(User user, String status);

	List<StudySession> findAllByAssetAndStatus(Asset asset, String status);

	List<StudySession> findAllByUserAndAssetAndStatus(User user, Asset asset, String status);

	List<StudySession> findAllByUserOrderByStartedAtDesc(User user);

	Optional<StudySession> findByIdAndUser(Long id, User user);
}